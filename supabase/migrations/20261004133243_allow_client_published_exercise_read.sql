create policy "exercise_versions_select_published_authenticated"
  on public.exercise_versions
  for select
  to authenticated
  using (published_at is not null);
