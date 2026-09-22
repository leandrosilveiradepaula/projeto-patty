revoke execute on function public.current_user_is_assigned_admin() from public, anon, authenticated;
revoke execute on function public.meal_plan_version_is_draft(uuid) from public, anon, authenticated;
revoke execute on function public.meal_plan_version_is_published_for_current_client(uuid) from public, anon, authenticated;

grant execute on function public.current_user_is_assigned_admin() to authenticated;
grant execute on function public.meal_plan_version_is_draft(uuid) to authenticated;
grant execute on function public.meal_plan_version_is_published_for_current_client(uuid) to authenticated;

revoke execute on function public.reject_food_equivalent_mutation_when_referenced_by_frozen_protocol() from public, anon, authenticated;
revoke execute on function public.reject_meal_plan_mutation_after_protocol_review() from public, anon, authenticated;
revoke execute on function public.reject_protocol_version_mutation_after_review() from public, anon, authenticated;
revoke execute on function public.reject_published_educational_content_version_mutation() from public, anon, authenticated;
revoke execute on function public.reject_published_exercise_version_mutation() from public, anon, authenticated;
revoke execute on function public.require_published_educational_content_version_for_release() from public, anon, authenticated;
revoke execute on function public.require_submitted_protocol_version_for_approval() from public, anon, authenticated;
