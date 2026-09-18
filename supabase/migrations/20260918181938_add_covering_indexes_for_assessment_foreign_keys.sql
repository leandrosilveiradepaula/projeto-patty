create index assessment_files_assessment_client_id_idx
  on public.assessment_files (assessment_id, client_id);

create index assessment_files_client_file_client_id_idx
  on public.assessment_files (client_file_id, client_id);

create index professional_follow_ups_assessment_client_id_idx
  on public.professional_follow_ups (assessment_id, client_id);
