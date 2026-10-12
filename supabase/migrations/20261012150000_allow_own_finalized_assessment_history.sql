-- Restore only the client's own finalized assessment headers.
-- The effective measurements reader remains the sole client measurement path.
create policy "client_assessments_select_own_finalized"
  on public.client_assessments
  for select
  to authenticated
  using (
    finalized_at is not null
    and exists (
      select 1 from public.clients
      where clients.id = client_assessments.client_id
        and clients.profile_id = (select auth.uid())
    )
  );
