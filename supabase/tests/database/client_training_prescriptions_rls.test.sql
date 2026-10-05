begin;

select plan(32);

select has_table('public', 'client_training_plans');
select has_table('public', 'client_training_plan_versions');
select has_table('public', 'client_training_plan_items');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.client_training_plans'::regclass),
  'training plans have RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.client_training_plan_versions'::regclass),
  'training plan versions have RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.client_training_plan_items'::regclass),
  'training plan items have RLS enabled'
);

select is(
  (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'client_training_plan_items'
      and column_name in ('load', 'load_text', 'weight', 'weight_text')
  ),
  0::bigint,
  'training prescription does not invent a fixed load field'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('a1000000-0000-0000-0000-000000000001', 'training-admin@example.test', '{}'),
  ('a1000000-0000-0000-0000-000000000002', 'training-client@example.test', '{}');

insert into public.profiles (id, display_name)
values
  ('a1000000-0000-0000-0000-000000000001', 'Training Admin'),
  ('a1000000-0000-0000-0000-000000000002', 'Training Client');

insert into public.user_roles (profile_id, role)
values
  ('a1000000-0000-0000-0000-000000000001', 'admin'),
  ('a1000000-0000-0000-0000-000000000002', 'client');

insert into public.clients (id, profile_id)
values (
  'a2000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000002'
);

insert into public.client_assignments (client_id, staff_profile_id)
values (
  'a2000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001'
);

insert into public.exercises (id)
values
  ('a3000000-0000-0000-0000-000000000001'),
  ('a3000000-0000-0000-0000-000000000002');

insert into public.exercise_versions (
  id,
  exercise_id,
  version_number,
  name,
  published_at
)
values
  (
    'a4000000-0000-0000-0000-000000000001',
    'a3000000-0000-0000-0000-000000000001',
    1,
    'Agachamento sintético',
    now()
  ),
  (
    'a4000000-0000-0000-0000-000000000002',
    'a3000000-0000-0000-0000-000000000002',
    1,
    'Exercício não publicado',
    null
  );

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'a1000000-0000-0000-0000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-0000-0000-000000000001","aal":"aal2","role":"authenticated"}',
  true
);

select throws_ok(
  $sql$
    select public.create_client_training_plan_draft(
      'a2000000-0000-0000-0000-000000000001',
      'Treino inicial',
      null
    )
  $sql$,
  '23514',
  'training request is required before prescription',
  'training prescription cannot start before a request'
);

reset role;

insert into public.client_training_requests (
  client_id,
  recorded_by_profile_id,
  note
)
values (
  'a2000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000002',
  'Solicitação sintética'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'a1000000-0000-0000-0000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-0000-0000-000000000001","aal":"aal2","role":"authenticated"}',
  true
);

select isnt(
  public.create_client_training_plan_draft(
    'a2000000-0000-0000-0000-000000000001',
    'Treino inicial',
    'Rascunho profissional'
  ),
  null::uuid,
  'assigned AAL2 admin can create training draft after request'
);

select is(
  (
    select count(*)
    from public.client_training_plans
    where client_id = 'a2000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'one client-scoped training plan root is created'
);

select is(
  (
    select version_number
    from public.client_training_plan_versions
    where training_plan_id = (
      select id
      from public.client_training_plans
      where client_id = 'a2000000-0000-0000-0000-000000000001'
    )
  ),
  1,
  'first training draft is version 1'
);

select throws_ok(
  $sql$
    select public.create_client_training_plan_draft(
      'a2000000-0000-0000-0000-000000000001',
      'Outro rascunho',
      null
    )
  $sql$,
  '23505',
  'an open training plan draft already exists',
  'only one open training draft is allowed'
);

select throws_ok(
  $sql$
    select public.review_client_training_plan_version(
      (
        select id
        from public.client_training_plan_versions
        where training_plan_id = (
          select id
          from public.client_training_plans
          where client_id = 'a2000000-0000-0000-0000-000000000001'
        )
          and published_at is null
      )
    )
  $sql$,
  '23514',
  'training plan must contain at least one exercise before review',
  'empty training draft cannot be reviewed'
);

select throws_ok(
  $sql$
    insert into public.client_training_plan_items (
      training_plan_version_id,
      position,
      exercise_version_id,
      exercise_name,
      sets_text,
      repetitions_text
    )
    values (
      (
        select id
        from public.client_training_plan_versions
        where training_plan_id = (
          select id
          from public.client_training_plans
          where client_id = 'a2000000-0000-0000-0000-000000000001'
        )
          and published_at is null
      ),
      1,
      'a4000000-0000-0000-0000-000000000002',
      'Exercício não publicado',
      '3',
      '10'
    )
  $sql$,
  '23514',
  'referenced exercise version must be published',
  'unpublished library exercise cannot be referenced'
);

select lives_ok(
  $sql$
    insert into public.client_training_plan_items (
      training_plan_version_id,
      position,
      exercise_version_id,
      exercise_name,
      sets_text,
      repetitions_text,
      rest_text,
      execution_notes
    )
    values (
      (
        select id
        from public.client_training_plan_versions
        where training_plan_id = (
          select id
          from public.client_training_plans
          where client_id = 'a2000000-0000-0000-0000-000000000001'
        )
          and published_at is null
      ),
      1,
      'a4000000-0000-0000-0000-000000000001',
      'Agachamento sintético',
      '3',
      '8-12',
      '60-90 s',
      'Orientação sintética'
    )
  $sql$,
  'published library exercise can be referenced in draft'
);

select lives_ok(
  $sql$
    insert into public.client_training_plan_items (
      training_plan_version_id,
      position,
      exercise_name,
      sets_text,
      repetitions_text
    )
    values (
      (
        select id
        from public.client_training_plan_versions
        where training_plan_id = (
          select id
          from public.client_training_plans
          where client_id = 'a2000000-0000-0000-0000-000000000001'
        )
          and published_at is null
      ),
      2,
      'Exercício manual sintético',
      '2',
      '12'
    )
  $sql$,
  'free-text exercise is allowed without library dependency'
);

select is(
  (
    select count(*)
    from public.client_training_plan_items
    where training_plan_version_id = (
      select id
      from public.client_training_plan_versions
      where training_plan_id = (
        select id
        from public.client_training_plans
        where client_id = 'a2000000-0000-0000-0000-000000000001'
      )
        and published_at is null
    )
  ),
  2::bigint,
  'draft keeps ordered exercise items'
);

select isnt(
  public.review_client_training_plan_version(
    (
      select id
      from public.client_training_plan_versions
      where training_plan_id = (
        select id
        from public.client_training_plans
        where client_id = 'a2000000-0000-0000-0000-000000000001'
      )
        and published_at is null
    )
  ),
  null::uuid,
  'admin explicitly reviews non-empty training draft'
);

select throws_ok(
  $sql$
    update public.client_training_plan_items
    set repetitions_text = '99'
    where training_plan_version_id = (
      select id
      from public.client_training_plan_versions
      where training_plan_id = (
        select id
        from public.client_training_plans
        where client_id = 'a2000000-0000-0000-0000-000000000001'
      )
        and published_at is null
    )
  $sql$,
  '55000',
  'reviewed or published training plan items are immutable',
  'review freezes training exercise items'
);

select isnt(
  public.publish_client_training_plan_version(
    (
      select id
      from public.client_training_plan_versions
      where training_plan_id = (
        select id
        from public.client_training_plans
        where client_id = 'a2000000-0000-0000-0000-000000000001'
      )
        and published_at is null
    )
  ),
  null::uuid,
  'admin explicitly publishes reviewed training version'
);

select is(
  (
    select count(*)
    from public.client_training_plan_versions
    where training_plan_id = (
      select id
      from public.client_training_plans
      where client_id = 'a2000000-0000-0000-0000-000000000001'
    )
      and published_at is not null
  ),
  1::bigint,
  'one immutable published training version exists'
);

select throws_ok(
  $sql$
    update public.client_training_plan_versions
    set title = 'Tentativa de reescrita'
    where training_plan_id = (
      select id
      from public.client_training_plans
      where client_id = 'a2000000-0000-0000-0000-000000000001'
    )
      and published_at is not null
  $sql$,
  '55000',
  'published training plan version is immutable',
  'published training version cannot be rewritten'
);

select isnt(
  public.create_client_training_plan_draft(
    'a2000000-0000-0000-0000-000000000001',
    'Treino ajustado',
    null
  ),
  null::uuid,
  'new draft can be created after previous version is published'
);

select is(
  (
    select max(version_number)
    from public.client_training_plan_versions
    where training_plan_id = (
      select id
      from public.client_training_plans
      where client_id = 'a2000000-0000-0000-0000-000000000001'
    )
  ),
  2,
  'new draft increments version number without rewriting history'
);

reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'a1000000-0000-0000-0000-000000000002',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-0000-0000-000000000002","aal":"aal1","role":"authenticated"}',
  true
);

select is(
  (
    select count(*)
    from public.client_training_plans
    where client_id = 'a2000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'client can see own training plan root'
);

select is(
  (
    select count(*)
    from public.client_training_plan_versions
    where training_plan_id = (
      select id
      from public.client_training_plans
      where client_id = 'a2000000-0000-0000-0000-000000000001'
    )
  ),
  1::bigint,
  'client sees only the published version and not the new draft'
);

select is(
  (
    select count(*)
    from public.client_training_plan_items
  ),
  2::bigint,
  'client sees only items from the published training version'
);

select throws_ok(
  $sql$
    select public.create_client_training_plan_draft(
      'a2000000-0000-0000-0000-000000000001',
      'Cliente tentando prescrever',
      null
    )
  $sql$,
  '42501',
  'active admin assignment is required',
  'client cannot create own prescription'
);

select throws_ok(
  $sql$
    insert into public.client_training_plan_items (
      training_plan_version_id,
      position,
      exercise_name,
      sets_text,
      repetitions_text
    )
    values (
      (
        select id
        from public.client_training_plan_versions
        limit 1
      ),
      99,
      'Tentativa da cliente',
      '1',
      '1'
    )
  $sql$,
  '42501',
  null,
  'client cannot insert prescription items'
);

reset role;

set local role anon;
select throws_ok(
  $sql$
    select * from public.client_training_plans
  $sql$,
  '42501',
  null,
  'anon cannot read training prescriptions'
);
reset role;

select is(
  (
    select count(*)
    from public.client_training_plan_versions
    where training_plan_id = (
      select id
      from public.client_training_plans
      where client_id = 'a2000000-0000-0000-0000-000000000001'
    )
  ),
  2::bigint,
  'database history preserves published version and later draft together'
);

select is(
  (
    select count(*)
    from public.client_training_plan_items
    where exercise_version_id is null
  ),
  1::bigint,
  'manual exercise remains valid without forcing library linkage'
);

select * from finish();
rollback;
