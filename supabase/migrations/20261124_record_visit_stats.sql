-- Applied to production as "record_visit_stats".
-- Returns {unique, views}. "views" = total visits: a browser's first visit plus each return after 30+ minutes (not raw page loads).
create or replace function public.record_visit_stats(p_visitor uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u bigint; v bigint;
begin
  perform public.record_visit(p_visitor);
  select count(*), coalesce(sum(visits), 0) into u, v from public.visitors;
  return jsonb_build_object('unique', u, 'views', v);
end $$;
revoke all on function public.record_visit_stats(uuid) from public;
grant execute on function public.record_visit_stats(uuid) to anon, authenticated;
