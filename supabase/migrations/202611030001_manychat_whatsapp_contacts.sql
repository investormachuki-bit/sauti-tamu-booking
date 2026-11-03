-- ManyChat WhatsApp contact synchronization for Sauti Tamu.
-- Contacts are kept separate from leads, trials and students.
create table if not exists public.manychat_whatsapp_contacts (
  id uuid primary key default gen_random_uuid(),
  manychat_contact_id text not null unique,
  phone_e164 text not null,
  first_name text,
  last_name text,
  full_name text,
  tags text[] not null default '{}',
  whatsapp_opted_in boolean not null default false,
  sms_marketing_opt_in boolean not null default false,
  sms_consent_at timestamptz,
  sms_consent_source text,
  raw_payload jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint manychat_whatsapp_contacts_phone_check
    check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$')
);

create index if not exists manychat_whatsapp_contacts_phone_idx
  on public.manychat_whatsapp_contacts (phone_e164);
create index if not exists manychat_whatsapp_contacts_tags_idx
  on public.manychat_whatsapp_contacts using gin (tags);
create index if not exists manychat_whatsapp_contacts_sms_optin_idx
  on public.manychat_whatsapp_contacts (sms_marketing_opt_in, synced_at desc);

alter table public.manychat_whatsapp_contacts enable row level security;
-- Intentionally no anon/authenticated policies. All reads and writes go through
-- authenticated server routes using the server-only service-role Supabase client.
