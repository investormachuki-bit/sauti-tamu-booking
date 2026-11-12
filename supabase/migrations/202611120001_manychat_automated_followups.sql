-- Editable ManyChat post-join SMS sequence and durable send queue.
create table if not exists public.manychat_followup_templates (
  id uuid primary key default gen_random_uuid(),
  day_offset integer not null unique check (day_offset in (1,3,7,21,30,60,90)),
  name text not null,
  message text not null check (char_length(message) between 1 and 480),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.manychat_followup_queue (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.manychat_whatsapp_contacts(id) on delete cascade,
  template_id uuid not null references public.manychat_followup_templates(id) on delete restrict,
  day_offset integer not null check (day_offset in (1,3,7,21,30,60,90)),
  due_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','processing','sent','cancelled','failed')),
  attempts integer not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(contact_id, day_offset)
);

create index if not exists manychat_followup_queue_due_idx
  on public.manychat_followup_queue(status, due_at);

alter table public.manychat_followup_templates enable row level security;
alter table public.manychat_followup_queue enable row level security;

insert into public.manychat_followup_templates(day_offset,name,message) values
(1,'Day 1 – Welcome','Hello {{full_name}}, welcome to Sauti Tamu Piano Center! We are glad to connect with you. We offer piano and guitar lessons for beginners and continuing learners. Reply to this message if you would like help choosing your next step.'),
(3,'Day 3 – Getting started','Hello {{full_name}}, have you had a chance to explore our piano and guitar lessons? We would be happy to guide you on the best starting point. Reply here and our team will assist. – Sauti Tamu'),
(7,'Day 7 – Lesson invitation','Hello {{full_name}}, learning music can start with one simple step. If you are interested in piano or guitar lessons, speak to our team about booking a free trial lesson at Sauti Tamu.'),
(21,'Day 21 – Keep the momentum','Hello {{full_name}}, just checking in. Is learning piano or guitar still on your plans? We can help you understand the lessons, schedule and how to get started. Reply to us anytime. – Sauti Tamu'),
(30,'Day 30 – One month check-in','Hello {{full_name}}, it has been a month since we connected. If music lessons are still on your mind, Sauti Tamu is ready to help you take the next step. Reply and let us know whether piano or guitar interests you.'),
(60,'Day 60 – Reconnect','Hello {{full_name}}, greetings from Sauti Tamu! We would love to know if you are still considering piano or guitar lessons. If the timing is right, reply and we will help you plan your first step.'),
(90,'Day 90 – Final check-in','Hello {{full_name}}, it has been a while since we connected. If you would still like to learn piano or guitar, our team at Sauti Tamu Piano Center would be delighted to help. Reply whenever you are ready.')
on conflict(day_offset) do nothing;
