-- Adds five women-safety poll questions to poll_votes (applied to production).
alter table public.poll_votes drop constraint poll_votes_question_check;
alter table public.poll_votes add constraint poll_votes_question_check check (question = any (array['water','power','night_safe','flood','clean','late_cab','single_friendly','lit_streets','harass_rare','patrol','metro_walk','guards_cctv','no_deserted']));
