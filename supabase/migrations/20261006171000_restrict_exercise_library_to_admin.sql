-- Patty confirmed on 2026-10-06 that the exercise library is an admin catalog.
-- A client may see only exercises selected for her own published training plan.
-- The client-specific training prescription model is not implemented yet, so
-- global published exercise versions must not be readable by clients.

drop policy if exists "exercise_versions_select_published_authenticated"
  on public.exercise_versions;
