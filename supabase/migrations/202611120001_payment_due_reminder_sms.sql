-- Editable SMS reminders driven strictly by Payment Schedule due_date.
-- The scheduled processor runs every five minutes and enforces the Nairobi 08:00–18:00 send window.

create table if not exists public.payment_due_reminder_sms_templates (
  id uuid primary key default gen_random_uuid(),
  reminder_key text not null unique check (reminder_key in ('payment_due_7d','payment_due_3d','payment_due_today')),
  name text not null,
  message text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.payment_due_reminder_sms_templates enable row level security;
revoke all on public.payment_due_reminder_sms_templates from anon, authenticated;
grant all on public.payment_due_reminder_sms_templates to service_role;

insert into public.payment_due_reminder_sms_templates (reminder_key,name,message,enabled)
values
('payment_due_7d','Payment due in 7 days','Hello {{full_name}}, a friendly reminder that your next Sauti Tamu payment of KSh {{amount_due}} is due on {{due_date}}. Your remaining course balance is KSh {{balance}}. Thank you.',true),
('payment_due_3d','Payment due in 3 days','Hello {{full_name}}, your Sauti Tamu payment of KSh {{amount_due}} is due in 3 days on {{due_date}}. Your remaining course balance is KSh {{balance}}. Kindly plan your payment.',true),
('payment_due_today','Payment due today','Hello {{full_name}}, this is a reminder that your Sauti Tamu payment of KSh {{amount_due}} is due today ({{due_date}}). Your remaining course balance is KSh {{balance}}. Thank you.',true)
on conflict (reminder_key) do nothing;

create table if not exists public.payment_due_reminder_sms_log (
  id uuid primary key default gen_random_uuid(),
  payment_schedule_id uuid not null references public.payment_schedule(id) on delete cascade,
  reminder_key text not null check (reminder_key in ('payment_due_7d','payment_due_3d','payment_due_today')),
  due_date date not null,
  student_id uuid not null references public.students(id) on delete cascade,
  recipient_phone text not null,
  message text,
  status text not null default 'processing' check (status in ('processing','accepted','failed')),
  provider_response text,
  error text,
  attempt_count integer not null default 1,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(payment_schedule_id, reminder_key, due_date)
);

alter table public.payment_due_reminder_sms_log enable row level security;
revoke all on public.payment_due_reminder_sms_log from anon, authenticated;
grant all on public.payment_due_reminder_sms_log to service_role;
