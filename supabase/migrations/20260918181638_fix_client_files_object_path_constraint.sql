alter table public.client_files
  drop constraint client_files_object_path_matches_namespace;

alter table public.client_files
  add constraint client_files_object_path_matches_namespace check (
    object_path ~ (
      '^clients/' || client_id::text || '/' || file_kind::text ||
      '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[A-Za-z0-9]+$'
    )
  );
