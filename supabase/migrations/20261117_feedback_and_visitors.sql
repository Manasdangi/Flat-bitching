-- Applied to production as "feedback_and_visitors".
-- feedback: free-text feedback from the home card. Insert-only for anon (no select policy), RLS on.
--   Only message/contact/page are writable by clients; ip_hash/device_id/status/created_at are set by a trigger.
--   Limit: 3 per day per IP hash or device.
-- visitors: one row per browser (random id kept in localStorage), used only to count unique visitors.
--   No direct table access; clients call record_visit(), which returns the unique count.
--   New visitor rows are capped at 25 per IP hash per day so the count cannot be inflated by scripts easily.

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  message text not null check (char_length(btrim(message)) between 5 and 1000),
  contact text check (contact is null or char_length(contact) <= 120),
  page text check (page is null or char_length(page) <= 200),
  ip_hash text,
  device_id text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
create policy "Anyone can send feedback" on public.feedback for insert to anon, authenticated with check (true);
revoke all on public.feedback from anon, authenticated;
grant insert (message, contact, page) on public.feedback to anon, authenticated;

create or replace function private.feedback_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_ip text := private.request_ip_hash(); v_dev text := private.request_device_id();
begin
  new.ip_hash := v_ip; new.device_id := v_dev; new.status := 'new'; new.created_at := now();
  new.message := btrim(new.message);
  new.contact := nullif(btrim(coalesce(new.contact, '')), '');
  if (select count(*) from public.feedback f
      where f.created_at > now() - interval '24 hours'
        and ((v_ip is not null and f.ip_hash = v_ip) or (v_dev is not null and f.device_id = v_dev))) >= 3 then
    raise exception 'rate_limited: daily feedback limit reached, thank you for the feedback so far' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger feedback_before_insert before insert on public.feedback for each row execute function private.feedback_before_insert();

create table public.visitors (
  visitor_id uuid primary key,
  ip_hash text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  visits integer not null default 1
);
alter table public.visitors enable row level security;
revoke all on public.visitors from anon, authenticated;

create or replace function public.record_visit(p_visitor uuid) returns bigint
language plpgsql security definer set search_path = '' as $$
declare v_ip text := private.request_ip_hash(); n bigint;
begin
  if p_visitor is not null then
    if exists (select 1 from public.visitors where visitor_id = p_visitor) then
      -- a returning browser counts as one more visit only after 30 minutes
      update public.visitors set last_seen = now(), visits = visits + 1
        where visitor_id = p_visitor and last_seen < now() - interval '30 minutes';
    elsif v_ip is null or (select count(*) from public.visitors where ip_hash = v_ip and first_seen > now() - interval '24 hours') < 25 then
      insert into public.visitors (visitor_id, ip_hash) values (p_visitor, v_ip) on conflict (visitor_id) do nothing;
    end if;
  end if;
  select count(*) into n from public.visitors;
  return n;
end $$;
revoke all on function public.record_visit(uuid) from public;
grant execute on function public.record_visit(uuid) to anon, authenticated;
