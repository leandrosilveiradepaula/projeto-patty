begin;

select plan(12);

select has_table('public', 'educational_content_assets');
select ok(
  (select relrowsecurity
   from pg_class
   where oid = 'public.educational_content_assets'::regclass),
  'educational content assets has RLS enabled'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('a1000000-0000-4000-8000-000000000001', 'asset-client-a@example.test', '{}'),
  ('a1000000-0000-4000-8000-000000000002', 'asset-client-b@example.test', '{}'),
  ('a1000000-0000-4000-8000-000000000003', 'asset-admin@example.test', '{}');

insert into public.profiles (id, display_name)
values
  ('a1000000-0000-4000-8000-000000000001', 'Asset Client A'),
  ('a1000000-0000-4000-8000-000000000002', 'Asset Client B'),
  ('a1000000-0000-4000-8000-000000000003', 'Asset Admin');

insert into public.user_roles (profile_id, role)
values
  ('a1000000-0000-4000-8000-000000000001', 'client'),
  ('a1000000-0000-4000-8000-000000000002', 'client'),
  ('a1000000-0000-4000-8000-000000000003', 'admin');

insert into public.clients (id, profile_id)
values
  ('a2000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001'),
  ('a2000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002');

insert into public.educational_contents (id)
values ('a3000000-0000-4000-8000-000000000001');

insert into public.educational_content_versions (
  id,
  educational_content_id,
  version_number,
  title,
  display_order
)
values (
  'a4000000-0000-4000-8000-000000000001',
  'a3000000-0000-4000-8000-000000000001',
  1,
  'Synthetic media content',
  1
);

insert into public.educational_content_assets (
  id,
  educational_content_version_id,
  asset_key,
  storage_provider,
  storage_path,
  content_type,
  byte_size,
  sha256_hex
)
values (
  'a5000000-0000-4000-8000-000000000001',
  'a4000000-0000-4000-8000-000000000001',
  'primary',
  'vercel_blob',
  'educational/a3000000/v1/primary.mp4',
  'video/mp4',
  123262796,
  repeat('a', 64)
);

select is(
  (select storage_provider
   from public.educational_content_assets
   where id = 'a5000000-0000-4000-8000-000000000001'),
  'vercel_blob',
  'draft version accepts Vercel Blob asset metadata'
);

update public.educational_content_versions
set published_at = now()
where id = 'a4000000-0000-4000-8000-000000000001';

select throws_ok(
  $$update public.educational_content_assets
    set byte_size = byte_size + 1
    where id = 'a5000000-0000-4000-8000-000000000001'$$,
  '55000',
  null,
  'published version asset is immutable'
);

select throws_ok(
  $$delete from public.educational_content_assets
    where id = 'a5000000-0000-4000-8000-000000000001'$$,
  '55000',
  null,
  'published version asset cannot be deleted'
);

insert into public.client_content_releases (
  id,
  client_id,
  educational_content_version_id,
  released_by_profile_id
)
values (
  'a6000000-0000-4000-8000-000000000001',
  'a2000000-0000-4000-8000-000000000001',
  'a4000000-0000-4000-8000-000000000001',
  'a1000000-0000-4000-8000-000000000003'
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-4000-8000-000000000001","aal":"aal1"}',
  true
);
select is(
  (select count(*) from public.educational_content_assets),
  1::bigint,
  'released client reads asset metadata for released version'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-4000-8000-000000000002","aal":"aal1"}',
  true
);
select is(
  (select count(*) from public.educational_content_assets),
  0::bigint,
  'other client cannot read unreleased asset metadata'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-4000-8000-000000000003","aal":"aal1"}',
  true
);
select is(
  (select count(*) from public.educational_content_assets),
  0::bigint,
  'admin at aal1 is blocked by restrictive MFA policy'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-4000-8000-000000000003","aal":"aal2"}',
  true
);
select is(
  (select count(*) from public.educational_content_assets),
  1::bigint,
  'admin at aal2 reads educational asset metadata'
);

select throws_ok(
  $$insert into public.educational_content_assets (
      educational_content_version_id,
      storage_provider,
      storage_path,
      content_type,
      byte_size,
      sha256_hex
    ) values (
      'a4000000-0000-4000-8000-000000000001',
      'vercel_blob',
      'educational/a3000000/v1/other.mp4',
      'video/mp4',
      1,
      repeat('b', 64)
    )$$,
  '55000',
  null,
  'cannot attach a new asset after publication'
);

reset role;
set local role anon;
select throws_ok(
  $$select * from public.educational_content_assets$$,
  '42501',
  null,
  'anon cannot read educational asset metadata'
);

reset role;

select throws_ok(
  $$insert into public.educational_content_assets (
      educational_content_version_id,
      storage_provider,
      storage_path,
      content_type,
      byte_size,
      sha256_hex
    ) values (
      'a4000000-0000-4000-8000-000000000001',
      'other_provider',
      'x',
      'video/mp4',
      1,
      repeat('c', 64)
    )$$,
  '23514',
  null,
  'v1 asset provider is explicitly Vercel Blob'
);

select * from finish();
rollback;
