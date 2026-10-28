-- Correct the financial dashboard registration count.
-- Registration is based on enrollment creation date in Africa/Nairobi, not hardcoded zero.
create or replace view public.financial_student_activity as
with activity_month as (
  select
    date_trunc('month', ls.starts_at at time zone 'Africa/Nairobi')::date as month_start,
    count(*) filter (where b.status = 'completed'::booking_status or b.attended_at is not null)::integer as attended,
    count(b.id)::integer as booked,
    count(*) filter (where b.status = 'cancelled'::booking_status)::integer as cancelled,
    count(*) filter (where b.status = 'no_show'::booking_status)::integer as missed
  from public.lesson_slots ls
  left join public.bookings b on b.slot_id = ls.id
  group by date_trunc('month', ls.starts_at at time zone 'Africa/Nairobi')::date
),
registration_month as (
  select
    date_trunc('month', se.created_at at time zone 'Africa/Nairobi')::date as month_start,
    count(*)::integer as registered
  from public.student_enrollments se
  group by date_trunc('month', se.created_at at time zone 'Africa/Nairobi')::date
),
months as (
  select month_start from activity_month
  union
  select month_start from registration_month
)
select
  m.month_start,
  coalesce(a.attended, 0)::integer as attended,
  coalesce(a.booked, 0)::integer as booked,
  coalesce(r.registered, 0)::integer as registered,
  coalesce(a.cancelled, 0)::integer as cancelled,
  coalesce(a.missed, 0)::integer as missed
from months m
left join activity_month a using (month_start)
left join registration_month r using (month_start);