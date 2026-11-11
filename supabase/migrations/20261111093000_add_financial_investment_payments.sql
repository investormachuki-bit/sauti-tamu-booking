-- Track contributions to investment targets separately from operating expenses.
create table if not exists public.financial_investment_payments (
  id uuid primary key default gen_random_uuid(),
  investment_id uuid not null references public.financial_investments(id) on delete cascade,
  payment_date date not null default current_date,
  amount numeric(14,2) not null check (amount > 0),
  payment_method text not null default 'other',
  reference text,
  created_at timestamptz not null default now()
);

create index if not exists financial_investment_payments_investment_date_idx
  on public.financial_investment_payments (investment_id, payment_date desc);

alter table public.financial_investment_payments enable row level security;

drop policy if exists "Authenticated users can read investment payments" on public.financial_investment_payments;
create policy "Authenticated users can read investment payments"
  on public.financial_investment_payments for select to authenticated using (true);

drop policy if exists "Authenticated users can record investment payments" on public.financial_investment_payments;
create policy "Authenticated users can record investment payments"
  on public.financial_investment_payments for insert to authenticated with check (true);

grant select, insert on public.financial_investment_payments to authenticated;
