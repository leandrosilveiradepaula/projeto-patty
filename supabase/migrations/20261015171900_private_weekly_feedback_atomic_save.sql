-- J2: do not put sensitive weekly feedback answers in PostgREST URL filters.
-- RPC arguments travel in the authenticated POST body. The compare-and-swap
-- remains atomic inside PostgreSQL and still obeys the client's UPDATE RLS.
-- Existing lifecycle/submission triggers continue to validate submitted data.
create function public.save_client_weekly_feedback_if_unchanged(
  p_client_id uuid,
  p_feedback_id uuid,
  p_expected_answers jsonb,
  p_answers jsonb,
  p_submit boolean
)
returns setof public.client_weekly_feedbacks
language sql
security invoker
set search_path = pg_catalog
as $function$
  update public.client_weekly_feedbacks as feedback
  set
    answers = p_answers,
    submitted_at = case when p_submit then now() else null end
  where feedback.id = p_feedback_id
    and feedback.client_id = p_client_id
    and feedback.submitted_at is null
    and feedback.answers = p_expected_answers
    and exists (
      select 1
      from public.clients as client
      where client.id = feedback.client_id
        and client.profile_id = (select auth.uid())
    )
  returning feedback.*;
$function$;

-- Supabase/PostgreSQL new functions can otherwise default to PUBLIC EXECUTE.
revoke all on function public.save_client_weekly_feedback_if_unchanged(
  uuid, uuid, jsonb, jsonb, boolean
) from public, anon;
grant execute on function public.save_client_weekly_feedback_if_unchanged(
  uuid, uuid, jsonb, jsonb, boolean
) to authenticated;
