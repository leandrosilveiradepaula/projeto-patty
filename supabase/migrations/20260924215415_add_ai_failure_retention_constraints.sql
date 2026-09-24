alter table public.ai_execution_failure_responses
  add constraint ai_execution_failure_responses_content_size_check
  check (octet_length(content) <= 131072);

alter table public.ai_executions
  add constraint ai_executions_failure_message_size_check
  check (failure_message is null or char_length(failure_message) <= 1024);
