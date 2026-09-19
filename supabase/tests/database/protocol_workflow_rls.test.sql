begin;

select plan(34);

select has_table('public', 'protocols');
select has_table('public', 'protocol_versions');
select has_table('public', 'protocol_version_approvals');
select has_table('public', 'protocol_publications');
select has_table('public', 'meal_plan_versions');
select has_table('public', 'meal_plan_variants');
select has_table('public', 'meal_plan_cycles');
select has_table('public', 'meal_plan_cycle_steps');
select has_table('public', 'meals');
select has_table('public', 'meal_dose_allocations');
select has_table('public', 'food_equivalent_catalog_versions');
select ok((select relrowsecurity from pg_class where oid = 'public.protocols'::regclass));
select ok((select relrowsecurity from pg_class where oid = 'public.meal_plan_versions'::regclass));
select ok((select relrowsecurity from pg_class where oid = 'public.food_equivalent_catalogs'::regclass));

insert into auth.users (id, email, raw_user_meta_data)
values
  ('51000000-0000-0000-0000-000000000001', 'protocol-client-a@example.test', '{}'),
  ('51000000-0000-0000-0000-000000000002', 'protocol-client-b@example.test', '{}'),
  ('51000000-0000-0000-0000-000000000003', 'protocol-admin-a@example.test', '{}'),
  ('51000000-0000-0000-0000-000000000004', 'protocol-admin-unassigned@example.test', '{}'),
  ('51000000-0000-0000-0000-000000000005', 'protocol-admin-ended@example.test', '{}');
insert into public.profiles (id, display_name)
select id, 'Synthetic ' || id::text from auth.users where email like 'protocol-%@example.test';
insert into public.user_roles (profile_id, role)
values
  ('51000000-0000-0000-0000-000000000001', 'client'),
  ('51000000-0000-0000-0000-000000000002', 'client'),
  ('51000000-0000-0000-0000-000000000003', 'admin'),
  ('51000000-0000-0000-0000-000000000004', 'admin'),
  ('51000000-0000-0000-0000-000000000005', 'admin');
insert into public.clients (id, profile_id)
values
  ('52000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001'),
  ('52000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000002');
insert into public.client_assignments (client_id, staff_profile_id, ended_at)
values
  ('52000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000003', null),
  ('52000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000005', now());

insert into public.protocols (id, client_id)
values ('53000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001');
insert into public.protocol_versions (id, protocol_id, client_id, version_number, created_by_profile_id)
values ('54000000-0000-0000-0000-000000000001', '53000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', 1, '51000000-0000-0000-0000-000000000003');
insert into public.food_equivalent_catalogs (id, catalog_key)
values ('55000000-0000-0000-0000-000000000001', 'synthetic-catalog');
insert into public.food_equivalent_catalog_versions (id, catalog_id, version_number)
values ('56000000-0000-0000-0000-000000000001', '55000000-0000-0000-0000-000000000001', 1);
insert into public.food_equivalent_groups (id, catalog_version_id, group_key, label, position)
values ('57000000-0000-0000-0000-000000000001', '56000000-0000-0000-0000-000000000001', 'synthetic-group', 'Synthetic group', 1);
insert into public.food_equivalent_items (group_id, item_key, label, position)
values ('57000000-0000-0000-0000-000000000001', 'synthetic-item', 'Synthetic item', 1);
insert into public.meal_plan_versions (id, protocol_version_id, client_id, food_equivalent_catalog_version_id)
values ('58000000-0000-0000-0000-000000000001', '54000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', '56000000-0000-0000-0000-000000000001');
insert into public.meal_plan_variants (id, meal_plan_version_id, client_id, variant_key)
values
  ('59000000-0000-0000-0000-000000000001', '58000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', 'linear'),
  ('59000000-0000-0000-0000-000000000002', '58000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', 'day_1'),
  ('59000000-0000-0000-0000-000000000003', '58000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', 'day_2'),
  ('59000000-0000-0000-0000-000000000004', '58000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', 'low'),
  ('59000000-0000-0000-0000-000000000005', '58000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', 'high');
insert into public.meals (id, meal_plan_variant_id, position)
values
  ('60000000-0000-0000-0000-000000000001', '59000000-0000-0000-0000-000000000001', 1),
  ('60000000-0000-0000-0000-000000000002', '59000000-0000-0000-0000-000000000001', 2),
  ('60000000-0000-0000-0000-000000000003', '59000000-0000-0000-0000-000000000002', 1),
  ('60000000-0000-0000-0000-000000000004', '59000000-0000-0000-0000-000000000003', 1),
  ('60000000-0000-0000-0000-000000000005', '59000000-0000-0000-0000-000000000003', 2);
insert into public.meal_dose_allocations (meal_id, dose_type, dose_quantity)
values
  ('60000000-0000-0000-0000-000000000001', 'protein', 1.5),
  ('60000000-0000-0000-0000-000000000001', 'carbohydrate', 2.25),
  ('60000000-0000-0000-0000-000000000001', 'fat', 0.5);
insert into public.meal_plan_cycles (id, meal_plan_version_id, client_id)
values ('61000000-0000-0000-0000-000000000001', '58000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001');
insert into public.meal_plan_cycle_steps (cycle_id, meal_plan_version_id, variant_id, position)
values
  ('61000000-0000-0000-0000-000000000001', '58000000-0000-0000-0000-000000000001', '59000000-0000-0000-0000-000000000004', 1),
  ('61000000-0000-0000-0000-000000000001', '58000000-0000-0000-0000-000000000001', '59000000-0000-0000-0000-000000000004', 2),
  ('61000000-0000-0000-0000-000000000001', '58000000-0000-0000-0000-000000000001', '59000000-0000-0000-0000-000000000005', 3);
select is((select dose_quantity from public.meal_dose_allocations where meal_id = '60000000-0000-0000-0000-000000000001' and dose_type = 'carbohydrate'), 2.25::numeric, 'fractional dose is exact');
select is((select count(*) from public.meals where meal_plan_variant_id = '59000000-0000-0000-0000-000000000002'), 1::bigint, 'day_1 may have a different meal count');
select is((select array_agg(variant_key order by position) from public.meal_plan_cycle_steps s join public.meal_plan_variants v on v.id = s.variant_id), array['low', 'low', 'high'], 'cycle order is explicit');

set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000001', true);
select is((select count(*) from public.protocol_versions), 0::bigint, 'client A cannot read draft');
select throws_ok($$insert into public.protocols (client_id) values ('52000000-0000-0000-0000-000000000001')$$, '42501', null, 'client cannot create protocol');
select throws_ok($$insert into public.meal_dose_allocations (meal_id, dose_type, dose_quantity) values ('60000000-0000-0000-0000-000000000001', 'protein', 1)$$, '42501', null, 'client cannot write dose');
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000003', true);
select is((select count(*) from public.protocol_versions), 1::bigint, 'assigned admin reads draft');
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000004', true);
select is((select count(*) from public.protocol_versions), 0::bigint, 'unassigned admin cannot read draft');
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000005', true);
select is((select count(*) from public.protocol_versions), 0::bigint, 'ended assignment cannot read draft');
reset role;

select throws_ok(
  $$insert into public.protocol_publications (protocol_version_id, client_id, approval_id, published_by_profile_id) values ('54000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000003')$$,
  '23503', null, 'publication requires approval structurally'
);
update public.protocol_versions set submitted_for_review_at = now() where id = '54000000-0000-0000-0000-000000000001';
select throws_ok($$update public.protocol_versions set submitted_for_review_at = null where id = '54000000-0000-0000-0000-000000000001'$$, '55000', null, 'reviewed version cannot return to draft');
select throws_ok($$update public.meals set label = 'changed' where id = '60000000-0000-0000-0000-000000000001'$$, '55000', null, 'meal is frozen after review');
select throws_ok($$insert into public.meal_dose_allocations (meal_id, dose_type, dose_quantity) values ('60000000-0000-0000-0000-000000000002', 'protein', 1)$$, '55000', null, 'dose is frozen after review');
select throws_ok($$delete from public.meal_plan_variants where id = '59000000-0000-0000-0000-000000000001'$$, '55000', null, 'variant is frozen after review');
insert into public.protocol_version_approvals (id, protocol_version_id, client_id, approved_by_profile_id)
values ('62000000-0000-0000-0000-000000000001', '54000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000003');
insert into public.protocol_publications (protocol_version_id, client_id, approval_id, published_by_profile_id)
values ('54000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000003');
set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000001', true);
select is((select count(*) from public.protocol_versions), 1::bigint, 'client A reads its published version');
select is((select count(*) from public.meal_plan_variants), 5::bigint, 'client A reads published plan structure');
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000002', true);
select is((select count(*) from public.protocol_versions), 0::bigint, 'client B cannot read A publication');
reset role;
insert into public.protocol_versions (id, protocol_id, client_id, version_number, created_by_profile_id, based_on_version_id)
values ('54000000-0000-0000-0000-000000000002', '53000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', 2, '51000000-0000-0000-0000-000000000003', '54000000-0000-0000-0000-000000000001');
select is((select count(*) from public.protocol_versions where protocol_id = '53000000-0000-0000-0000-000000000001'), 2::bigint, 'new version preserves v1');
insert into public.food_equivalent_catalog_versions (id, catalog_id, version_number)
values ('56000000-0000-0000-0000-000000000002', '55000000-0000-0000-0000-000000000001', 2);
select is((select food_equivalent_catalog_version_id from public.meal_plan_versions where id = '58000000-0000-0000-0000-000000000001'), '56000000-0000-0000-0000-000000000001'::uuid, 'published protocol retains catalog v1 reference');
select throws_ok($$update public.food_equivalent_groups set label = 'changed' where id = '57000000-0000-0000-0000-000000000001'$$, '55000', null, 'catalog content is frozen when referenced by reviewed protocol');

select * from finish();
rollback;
