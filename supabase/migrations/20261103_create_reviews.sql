-- Applied to the gurgaon-flat-finder Supabase project.
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  sector_id text not null check (char_length(sector_id) between 1 and 20),
  name text not null default 'Anonymous' check (char_length(name) between 1 and 40),
  rating smallint not null check (rating between 1 and 5),
  tags text[] not null default '{}' check (cardinality(tags) <= 6),
  body text not null check (char_length(body) between 10 and 1000),
  created_at timestamptz not null default now()
);

create index reviews_sector_created_idx on public.reviews (sector_id, created_at desc);

-- Clients can't backdate reviews: always stamp the server time.
create or replace function public.reviews_set_created_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.created_at := now();
  return new;
end $$;

create trigger reviews_created_at before insert on public.reviews
for each row execute function public.reviews_set_created_at();

alter table public.reviews enable row level security;

create policy "Anyone can read reviews" on public.reviews
  for select to anon, authenticated using (true);

create policy "Anyone can post a review" on public.reviews
  for insert to anon, authenticated with check (true);
-- No update/delete policies: reviews can't be edited or removed from the client.
