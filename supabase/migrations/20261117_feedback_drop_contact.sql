-- Applied to production as "feedback_drop_contact": feedback no longer collects an email or phone.
create or replace function private.feedback_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_ip text := private.request_ip_hash(); v_dev text := private.request_device_id();
begin
  new.ip_hash := v_ip; new.device_id := v_dev; new.status := 'new'; new.created_at := now();
  new.message := btrim(new.message);
  if (select count(*) from public.feedback f
      where f.created_at > now() - interval '24 hours'
        and ((v_ip is not null and f.ip_hash = v_ip) or (v_dev is not null and f.device_id = v_dev))) >= 3 then
    raise exception 'rate_limited: daily feedback limit reached, thank you for the feedback so far' using errcode = 'P0001';
  end if;
  return new;
end $$;
alter table public.feedback drop column contact;
