-- Create a private bucket for documents attached to individual investment records.
insert into storage.buckets (id, name, public)
values ('investment-documents', 'investment-documents', false)
on conflict (id) do update set public = false;

drop policy if exists "Investment documents upload" on storage.objects;
create policy "Investment documents upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'investment-documents'
  and exists (
    select 1 from public.financial_investments investment
    where investment.id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "Investment documents read" on storage.objects;
create policy "Investment documents read"
on storage.objects for select to authenticated
using (
  bucket_id = 'investment-documents'
  and exists (
    select 1 from public.financial_investments investment
    where investment.id::text = (storage.foldername(name))[1]
  )
);

-- Existing recorded values become zero paid, while the full investment target is preserved.
update public.financial_investments
set target_amount = greatest(target_amount, contribution_amount),
    contribution_amount = 0;
