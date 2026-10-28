-- Financial dashboard foundation: auditable obligation payments and investments.
-- This migration is staged on the feature branch; it has not been applied to production.

create table if not exists public.financial_obligation_payments (
  id uuid primary key default gen_random_uuid(),
  obligation_id uuid not null references public.financial_obligations(id) on delete restrict,
  payment_date date not null default current_date,
  amount numeric(12,2) not null check (amount > 0),
  payment_method public.payment_method not null default 'mpesa',
  reference text,
  notes text,
  expense_id uuid unique references public.expenses(id) on delete restrict,
  idempotency_key uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create index if not exists financial_obligation_payments_obligation_date_idx
  on public.financial_obligation_payments (obligation_id, payment_date desc);

alter table public.financial_obligation_payments enable row level security;

drop policy if exists financial_obligation_payments_select_authenticated on public.financial_obligation_payments;
create policy financial_obligation_payments_select_authenticated
  on public.financial_obligation_payments for select to authenticated using (true);

drop policy if exists financial_obligation_payments_insert_authenticated on public.financial_obligation_payments;
create policy financial_obligation_payments_insert_authenticated
  on public.financial_obligation_payments for insert to authenticated with check (true);

-- Investments are separate from expenses and obligations: contributions affect cash,
-- but the portfolio value is tracked separately for net-worth reporting.
create table if not exists public.financial_investments (
  id uuid primary key default gen_random_uuid(),
  institution text not null,
  investment_type text not null default 'Other',
  contribution_amount numeric(12,2) not null default 0 check (contribution_amount >= 0),
  current_value numeric(12,2) not null default 0 check (current_value >= 0),
  contribution_frequency text not null default 'One-time',
  start_date date not null default current_date,
  next_due_date date,
  expected_annual_return numeric(7,3),
  status text not null default 'active' check (status in ('active','matured','closed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.financial_investments enable row level security;

drop policy if exists financial_investments_select_authenticated on public.financial_investments;
create policy financial_investments_select_authenticated
  on public.financial_investments for select to authenticated using (true);

drop policy if exists financial_investments_insert_authenticated on public.financial_investments;
create policy financial_investments_insert_authenticated
  on public.financial_investments for insert to authenticated with check (true);

drop policy if exists financial_investments_update_authenticated on public.financial_investments;
create policy financial_investments_update_authenticated
  on public.financial_investments for update to authenticated using (true) with check (true);

drop policy if exists financial_investments_delete_authenticated on public.financial_investments;
create policy financial_investments_delete_authenticated
  on public.financial_investments for delete to authenticated using (true);

-- Atomically records a payment, reduces the obligation, and creates exactly one
-- expense row. Repeating the same idempotency key returns the original payment.
create or replace function public.record_financial_obligation_payment(
  p_obligation_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_payment_method public.payment_method,
  p_reference text default null,
  p_notes text default null,
  p_idempotency_key uuid default gen_random_uuid()
)
returns public.financial_obligation_payments
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_obligation public.financial_obligations%rowtype;
  v_payment public.financial_obligation_payments%rowtype;
  v_expense_id uuid;
  v_category text;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  select * into v_payment
    from public.financial_obligation_payments
    where idempotency_key = p_idempotency_key;

  if found then
    return v_payment;
  end if;

  select * into v_obligation
    from public.financial_obligations
    where id = p_obligation_id
    for update;

  if not found then
    raise exception 'Financial obligation not found';
  end if;

  if v_obligation.status <> 'active' then
    raise exception 'Only active obligations can be paid';
  end if;

  if p_amount > coalesce(v_obligation.outstanding_balance, 0) then
    raise exception 'Payment exceeds outstanding balance';
  end if;

  v_category := case
    when lower(coalesce(v_obligation.category, '')) like '%loan%' then 'Loans'
    else coalesce(nullif(trim(v_obligation.category), ''), 'Financial Obligations')
  end;

  insert into public.expenses (
    expense_date, category, description, amount, payment_method, reference, vendor, notes
  ) values (
    coalesce(p_payment_date, current_date),
    v_category,
    'Obligation payment — ' || v_obligation.name,
    p_amount,
    coalesce(p_payment_method, 'mpesa'::public.payment_method),
    nullif(trim(p_reference), ''),
    v_obligation.name,
    nullif(trim(p_notes), '')
  ) returning id into v_expense_id;

  update public.financial_obligations
    set outstanding_balance = greatest(0, coalesce(outstanding_balance, 0) - p_amount),
        status = case when greatest(0, coalesce(outstanding_balance, 0) - p_amount) = 0
                      then 'completed' else status end,
        updated_at = now()
    where id = p_obligation_id;

  insert into public.financial_obligation_payments (
    obligation_id, payment_date, amount, payment_method, reference, notes, expense_id, idempotency_key
  ) values (
    p_obligation_id, coalesce(p_payment_date, current_date), p_amount, coalesce(p_payment_method, 'mpesa'::public.payment_method),
    nullif(trim(p_reference), ''), nullif(trim(p_notes), ''), v_expense_id, p_idempotency_key
  ) returning * into v_payment;

  return v_payment;
end;
$$;

revoke all on function public.record_financial_obligation_payment(uuid,numeric,date,public.payment_method,text,text,uuid) from public, anon;
grant execute on function public.record_financial_obligation_payment(uuid,numeric,date,public.payment_method,text,text,uuid) to authenticated;
