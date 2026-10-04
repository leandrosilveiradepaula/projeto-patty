create policy "client_assessments_select_own_finalized"
  on public.client_assessments
  for select
  to authenticated
  using (
    finalized_at is not null
    and exists (
      select 1
      from public.clients
      where clients.id = client_assessments.client_id
        and clients.profile_id = (select auth.uid())
    )
  );

create policy "assessment_measurements_select_own_finalized"
  on public.assessment_measurements
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.client_assessments
      join public.clients
        on clients.id = client_assessments.client_id
      where client_assessments.id = assessment_measurements.assessment_id
        and client_assessments.finalized_at is not null
        and clients.profile_id = (select auth.uid())
    )
  );

create policy "assessment_measurement_corrections_select_own_finalized"
  on public.assessment_measurement_corrections
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.assessment_measurements
      join public.client_assessments
        on client_assessments.id = assessment_measurements.assessment_id
      join public.clients
        on clients.id = client_assessments.client_id
      where assessment_measurements.id =
        assessment_measurement_corrections.assessment_measurement_id
        and client_assessments.finalized_at is not null
        and clients.profile_id = (select auth.uid())
    )
  );
