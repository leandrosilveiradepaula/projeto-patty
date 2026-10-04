create policy "client_training_requests_select_own_client"
  on public.client_training_requests
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.clients
      where clients.id = client_training_requests.client_id
        and clients.profile_id = (select auth.uid())
    )
  );

create policy "client_training_requests_insert_own_client"
  on public.client_training_requests
  for insert
  to authenticated
  with check (
    recorded_by_profile_id = (select auth.uid())
    and exists (
      select 1
      from public.clients
      where clients.id = client_training_requests.client_id
        and clients.profile_id = (select auth.uid())
    )
  );
