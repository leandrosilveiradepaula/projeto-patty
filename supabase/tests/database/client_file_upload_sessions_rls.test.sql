begin;

select plan(15);

select has_table('public', 'client_file_upload_sessions');

select ok(
  (select relrowsecurity
   from pg_class
   where oid = 'public.client_file_upload_sessions'::regclass),
  'client_file_upload_sessions has RLS enabled'
);

select is(
  (select count(*) from pg_policies
   where schemaname = 'public'
     and tablename = 'client_file_upload_sessions'
     and policyname = 'client_file_upload_sessions_select_own_or_admin'),
  1::bigint,
  'upload session select policy exists'
);

select is(
  (select count(*) from pg_policies
   where schemaname = 'public'
     and tablename = 'client_file_upload_sessions'
     and policyname = 'client_file_upload_sessions_insert_client_self'),
  1::bigint,
  'upload session client insert policy exists'
);

select is(
  (select count(*) from pg_policies
   where schemaname = 'storage'
     and tablename = 'objects'
     and policyname = 'client_private_storage_objects_insert_authorized_pending'),
  1::bigint,
  'temporary Storage insert policy exists'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('61000000-0000-0000-0000-000000000001', 'upload-client-a@example.test', '{}'),
  ('61000000-0000-0000-0000-000000000002', 'upload-client-b@example.test', '{}'),
  ('61000000-0000-0000-0000-000000000003', 'upload-admin@example.test', '{}');

insert into public.profiles (id, display_name)
values
  ('61000000-0000-0000-0000-000000000001', 'Synthetic upload client A'),
  ('61000000-0000-0000-0000-000000000002', 'Synthetic upload client B'),
  ('61000000-0000-0000-0000-000000000003', 'Synthetic upload admin');

insert into public.user_roles (profile_id, role)
values
  ('61000000-0000-0000-0000-000000000001', 'client'),
  ('61000000-0000-0000-0000-000000000002', 'client'),
  ('61000000-0000-0000-0000-000000000003', 'admin');

insert into public.clients (id, profile_id)
values
  ('62000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001'),
  ('62000000-0000-0000-0000-000000000002', '61000000-0000-0000-0000-000000000002');

select throws_ok(
  $$insert into public.client_file_upload_sessions (
      client_id, requester_profile_id, file_kind, original_filename,
      file_extension, claimed_mime_type, declared_byte_size
    ) values (
      '62000000-0000-0000-0000-000000000001',
      '61000000-0000-0000-0000-000000000001',
      'photo', 'bad.pdf', 'pdf', 'application/pdf', 100
    )$$,
  '23514',
  null,
  'photo cannot declare PDF'
);

select throws_ok(
  $$insert into public.client_file_upload_sessions (
      client_id, requester_profile_id, file_kind, original_filename,
      file_extension, claimed_mime_type, declared_byte_size
    ) values (
      '62000000-0000-0000-0000-000000000001',
      '61000000-0000-0000-0000-000000000001',
      'photo', 'large.jpg', 'jpg', 'image/jpeg', 10485761
    )$$,
  '23514',
  null,
  'photo over 10 MB is rejected'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '61000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$insert into public.client_file_upload_sessions (
      client_id, requester_profile_id, file_kind, original_filename,
      file_extension, claimed_mime_type, declared_byte_size
    ) values (
      '62000000-0000-0000-0000-000000000001',
      '61000000-0000-0000-0000-000000000001',
      'photo', 'synthetic.jpg', 'jpg', 'image/jpeg', 1024
    )$$,
  'client can create own valid upload session'
);

select is(
  (select count(*) from public.client_file_upload_sessions),
  1::bigint,
  'client reads own upload session'
);

select like(
  (select temp_object_path from public.client_file_upload_sessions limit 1),
  'pending/62000000-0000-0000-0000-000000000001/%.jpg',
  'temporary object path is generated in own client namespace'
);

select throws_ok(
  $$insert into public.client_file_upload_sessions (
      client_id, requester_profile_id, file_kind, original_filename,
      file_extension, claimed_mime_type, declared_byte_size
    ) values (
      '62000000-0000-0000-0000-000000000002',
      '61000000-0000-0000-0000-000000000001',
      'document', 'other.pdf', 'pdf', 'application/pdf', 1024
    )$$,
  '42501',
  null,
  'client cannot create session for another client'
);

select throws_ok(
  $$update public.client_file_upload_sessions set status = 'accepted'$$,
  '42501',
  null,
  'client cannot update upload session lifecycle'
);

select throws_ok(
  $$delete from public.client_file_upload_sessions$$,
  '42501',
  null,
  'client cannot delete upload session'
);

select set_config('request.jwt.claim.sub', '61000000-0000-0000-0000-000000000003', true);

select is(
  (select count(*) from public.client_file_upload_sessions),
  1::bigint,
  'admin can inspect upload sessions'
);

select throws_ok(
  $$insert into public.client_file_upload_sessions (
      client_id, requester_profile_id, file_kind, original_filename,
      file_extension, claimed_mime_type, declared_byte_size
    ) values (
      '62000000-0000-0000-0000-000000000001',
      '61000000-0000-0000-0000-000000000003',
      'document', 'admin.pdf', 'pdf', 'application/pdf', 1024
    )$$,
  '42501',
  null,
  'admin browser session cannot create client upload authorization'
);

reset role;
set local role anon;

select throws_ok(
  $$select * from public.client_file_upload_sessions$$,
  '42501',
  null,
  'anon cannot read upload sessions'
);

select * from finish();
rollback;
