create extension if not exists pgcrypto;

create table public.license_plans (
  id text primary key,
  name text not null,
  price_inr integer not null check (price_inr >= 0),
  max_devices integer not null check (max_devices between 1 and 10),
  annual_transfer_limit integer check (annual_transfer_limit is null or annual_transfer_limit >= 0),
  lemon_variant_id text unique,
  active boolean not null default true
);

insert into public.license_plans (id, name, price_inr, max_devices, annual_transfer_limit)
values
  ('free', 'Launch Free', 0, 1, 0),
  ('single', 'Single / Casual', 1500, 1, 2),
  ('pro', 'Pro / Multi-Device', 2999, 2, 5),
  ('power', 'Power / Freelancer', 4999, 3, null)
on conflict (id) do update set
  name = excluded.name, price_inr = excluded.price_inr,
  max_devices = excluded.max_devices,
  annual_transfer_limit = excluded.annual_transfer_limit;

create table public.licenses (
  id uuid primary key default gen_random_uuid(),
  key_hash char(64) not null unique,
  key_ciphertext text not null,
  owner_id uuid not null references auth.users(id) on delete restrict,
  owner_email text not null,
  plan_id text not null references public.license_plans(id),
  status text not null default 'active' check (status in ('active', 'suspended', 'refunded', 'expired')),
  max_devices integer not null,
  annual_transfer_limit integer,
  transfer_year integer not null default extract(year from now())::integer,
  transfers_used integer not null default 0 check (transfers_used >= 0),
  provider text not null default 'manual',
  provider_order_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index licenses_owner_idx on public.licenses(owner_id, created_at desc);
create unique index one_free_license_per_owner_idx on public.licenses(owner_id) where plan_id = 'free';

create table public.license_devices (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.licenses(id) on delete cascade,
  hwid_hash char(64) not null,
  device_name text,
  active boolean not null default true,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  deactivated_at timestamptz,
  unique (license_id, hwid_hash)
);

create index license_devices_active_idx on public.license_devices(license_id, active);

create table public.trials (
  hwid_hash char(64) primary key,
  allocated_seconds integer not null default 1800,
  remaining_seconds integer not null default 1800 check (remaining_seconds between 0 and 1800),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table public.trial_sessions (
  hwid_hash char(64) primary key references public.trials(hwid_hash) on delete cascade,
  token_hash char(64) not null,
  last_heartbeat_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.webhook_events (
  provider text not null,
  event_id text not null,
  event_type text not null,
  received_at timestamptz not null default now(),
  primary key (provider, event_id)
);

alter table public.license_plans enable row level security;
alter table public.licenses enable row level security;
alter table public.license_devices enable row level security;
alter table public.trials enable row level security;
alter table public.trial_sessions enable row level security;
alter table public.webhook_events enable row level security;

create policy "plans are public" on public.license_plans for select using (active);

create or replace function public.start_trial(p_hwid_hash text, p_token_hash text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_trial public.trials;
  v_previous public.trial_sessions;
  v_elapsed integer;
begin
  if p_hwid_hash !~ '^[a-fA-F0-9]{64}$' or p_token_hash !~ '^[a-fA-F0-9]{64}$' then
    raise exception 'invalid trial identity';
  end if;
  insert into public.trials(hwid_hash) values (lower(p_hwid_hash)) on conflict do nothing;
  select * into v_trial from public.trials where hwid_hash = lower(p_hwid_hash) for update;
  select * into v_previous from public.trial_sessions where hwid_hash = lower(p_hwid_hash) for update;
  if found then
    v_elapsed := least(45, greatest(0, extract(epoch from (now() - v_previous.last_heartbeat_at))::integer));
    update public.trials set remaining_seconds = greatest(0, remaining_seconds - v_elapsed), last_seen_at = now()
      where hwid_hash = lower(p_hwid_hash) returning * into v_trial;
  end if;
  insert into public.trial_sessions(hwid_hash, token_hash, last_heartbeat_at, updated_at)
    values (lower(p_hwid_hash), lower(p_token_hash), now(), now())
    on conflict (hwid_hash) do update set token_hash = excluded.token_hash, last_heartbeat_at = now(), updated_at = now();
  return jsonb_build_object('remaining_seconds', v_trial.remaining_seconds, 'expired', v_trial.remaining_seconds <= 0);
end $$;

create or replace function public.heartbeat_trial(p_hwid_hash text, p_token_hash text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_session public.trial_sessions;
  v_remaining integer;
  v_elapsed integer;
begin
  select * into v_session from public.trial_sessions where hwid_hash = lower(p_hwid_hash) for update;
  if not found or v_session.token_hash <> lower(p_token_hash) then raise exception 'invalid trial session'; end if;
  v_elapsed := least(45, greatest(0, extract(epoch from (now() - v_session.last_heartbeat_at))::integer));
  update public.trials set remaining_seconds = greatest(0, remaining_seconds - v_elapsed), last_seen_at = now()
    where hwid_hash = lower(p_hwid_hash) returning remaining_seconds into v_remaining;
  update public.trial_sessions set last_heartbeat_at = now(), updated_at = now() where hwid_hash = lower(p_hwid_hash);
  return jsonb_build_object('remaining_seconds', v_remaining, 'expired', v_remaining <= 0);
end $$;

create or replace function public.activate_license(p_key_hash text, p_hwid_hash text, p_device_name text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_license public.licenses;
  v_device public.license_devices;
  v_active_count integer;
  v_seen_count integer;
  v_limit integer;
  v_used integer;
  v_device_found boolean;
begin
  select * into v_license from public.licenses where key_hash = lower(p_key_hash) for update;
  if not found then return jsonb_build_object('valid', false, 'code', 'invalid_key', 'message', 'This license key is not valid.'); end if;
  if v_license.status <> 'active' then return jsonb_build_object('valid', false, 'code', v_license.status, 'message', 'This license is not active.'); end if;
  if v_license.transfer_year <> extract(year from now())::integer then
    update public.licenses set transfer_year = extract(year from now())::integer, transfers_used = 0, updated_at = now()
      where id = v_license.id returning * into v_license;
  end if;
  select * into v_device from public.license_devices where license_id = v_license.id and hwid_hash = lower(p_hwid_hash) for update;
  v_device_found := found;
  select count(*) into v_active_count from public.license_devices where license_id = v_license.id and active;
  if v_device_found then
    if not v_device.active and v_active_count >= v_license.max_devices then
      return jsonb_build_object('valid', false, 'code', 'device_limit', 'message', 'All device slots are in use. Unbind a device in your account.');
    end if;
    update public.license_devices set active = true, last_seen_at = now(), deactivated_at = null,
      device_name = coalesce(nullif(p_device_name, ''), device_name) where id = v_device.id;
  else
    if v_active_count >= v_license.max_devices then
      return jsonb_build_object('valid', false, 'code', 'device_limit', 'message', 'All device slots are in use. Unbind a device in your account.');
    end if;
    select count(*) into v_seen_count from public.license_devices where license_id = v_license.id;
    if v_seen_count > 0 and v_license.annual_transfer_limit is not null and v_license.transfers_used >= v_license.annual_transfer_limit then
      return jsonb_build_object('valid', false, 'code', 'transfer_limit', 'message', 'The annual transfer allowance has been used.');
    end if;
    insert into public.license_devices(license_id, hwid_hash, device_name) values (v_license.id, lower(p_hwid_hash), nullif(p_device_name, ''));
    if v_seen_count > 0 then update public.licenses set transfers_used = transfers_used + 1, updated_at = now() where id = v_license.id returning transfers_used into v_used;
    else v_used := v_license.transfers_used; end if;
  end if;
  if v_used is null then v_used := v_license.transfers_used; end if;
  return jsonb_build_object('valid', true, 'license_id', v_license.id, 'tier', v_license.plan_id,
    'max_devices', v_license.max_devices, 'transfers_remaining', case when v_license.annual_transfer_limit is null then null else greatest(0, v_license.annual_transfer_limit - v_used) end);
end $$;

create or replace function public.unbind_license_device(p_license_id uuid, p_device_id uuid, p_owner_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.license_devices d set active = false, deactivated_at = now()
    from public.licenses l where d.id = p_device_id and d.license_id = p_license_id
      and l.id = p_license_id and l.owner_id = p_owner_id and d.active;
  return found;
end $$;

create or replace function public.deactivate_license_device(p_key_hash text, p_hwid_hash text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.license_devices d set active = false, deactivated_at = now()
    from public.licenses l where l.key_hash = lower(p_key_hash) and l.id = d.license_id
      and d.hwid_hash = lower(p_hwid_hash) and d.active;
  return found;
end $$;

revoke all on function public.start_trial(text, text) from public, anon, authenticated;
revoke all on function public.heartbeat_trial(text, text) from public, anon, authenticated;
revoke all on function public.activate_license(text, text, text) from public, anon, authenticated;
revoke all on function public.unbind_license_device(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.deactivate_license_device(text, text) from public, anon, authenticated;
grant execute on function public.start_trial(text, text) to service_role;
grant execute on function public.heartbeat_trial(text, text) to service_role;
grant execute on function public.activate_license(text, text, text) to service_role;
grant execute on function public.unbind_license_device(uuid, uuid, uuid) to service_role;
grant execute on function public.deactivate_license_device(text, text) to service_role;
