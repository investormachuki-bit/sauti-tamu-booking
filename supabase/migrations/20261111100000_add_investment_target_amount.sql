alter table public.financial_investments
  add column if not exists target_amount numeric(14,2);

update public.financial_investments
set target_amount = contribution_amount
where target_amount is null;

alter table public.financial_investments
  alter column target_amount set not null;

alter table public.financial_investments
  add constraint financial_investments_target_amount_check
  check (target_amount >= contribution_amount and target_amount > 0);
