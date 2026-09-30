alter table public.ai_finding_actions
  add constraint ai_finding_actions_one_human_decision_per_finding
  unique (execution_id, finding_index);
