# Hydration configuration compatibility slice

Last updated: 2026-10-02.

## Objective

Move the confirmed hydration target baseline out of future runtime behavior and into versioned method configuration while preserving every legacy hydration target unchanged.

## Confirmed professional rule

The current baseline is 60 mL/kg/day. The coefficient is an initial template value, not a permanent code constant, and may be individualized through the method-configuration override chain.

Open hydration questions remain open: minimum pure-water proportion, automatic recalculation after weight change, reminder cadence, professional correction powers, and editing of previous check-ins.

## Scope

This slice:
- seeds `hydration.daily_target` as `method_engine_v1`;
- keeps rounding explicit in configuration;
- adds an optional snapshot-set FK to `client_hydration_targets`;
- adds `resolved_target_ml` for new configured rows;
- preserves the historical generated `target_ml = round(weight_kg * 60)` column untouched;
- keeps historical `method_key = patty_60_ml_per_kg` readable;
- introduces `method_configuration_snapshot` only for the new path;
- adds database compatibility tests and deterministic runtime tests;
- adds an atomic persistence boundary restricted to `service_role` for snapshot set + snapshot + override provenance + hydration target creation.

## Files allowed in this slice

- `lib/method/hydration.ts`
- `lib/method/hydration.test.ts`
- `supabase/migrations/20261002005720_hydrate_client_targets_from_configuration.sql`
- `supabase/tests/database/method_configuration_hydration.test.sql`
- `.github/workflows/validate-method-configuration-foundation.yml`
- this document

## Out of scope

- applying any pending migration to SaaS;
- changing legacy migration `20260930132221_create_client_checkins.sql`;
- switching the live admin action to the configured path;
- building template/override editing UI;
- inventing any open hydration rule;
- recalculating historical targets;
- changing liquid-kind taxonomy;
- changing reminders.

## Compatibility model

Legacy row:
`method_key = patty_60_ml_per_kg`
`method_configuration_snapshot_set_id = null`
`resolved_target_ml = null`
The existing generated `target_ml` remains authoritative for that historical row.

Configured row:
`method_key = method_configuration_snapshot`
`method_configuration_snapshot_set_id != null`
`resolved_target_ml > 0`
The future application path must read `resolved_target_ml` and the linked immutable snapshot instead of treating the legacy generated column as the configured result.

This intentionally permits both representations during migration. There is no silent fallback from a failed required configuration to 60.

## Acceptance criteria

- baseline template is versioned with system provenance;
- runtime helper reproduces 60 mL/kg with explicit round behavior;
- a changed coefficient works without code changes;
- old hydration rows remain valid and readable;
- configured rows require a client-matching snapshot set and positive resolved result;
- applied historical migrations are untouched;
- local Supabase reset/lint/pgTAP remains green;
- application validation remains green;
- PR remains draft until the preceding higher-fat-protein migration is applied and verified.

## Risks

The legacy generated `target_ml` column still exists and will continue calculating 60 mL/kg even on a future configured row. Therefore the operational switch must not happen until data access explicitly distinguishes legacy `target_ml` from configured `resolved_target_ml`. This is deliberate compatibility debt, not the final state.

The database proposal exposes `create_hydration_target_from_method_snapshot(...)` as a transactionally atomic persistence boundary with `EXECUTE` revoked from `PUBLIC`, `anon` and `authenticated` and granted only to `service_role`. The application preparation now includes a typed server-only loader that reads the exact active `hydration.daily_target` template version, applies at most one active client-scoped override through the validated hydration resolver, and fails closed on inaccessible clients or ambiguous active state. The function does not choose a professional value or evaluate arbitrary configuration.


## Security hardening and SaaS dry-run - 2026-10-02

The atomic persistence boundary now rejects creation unless the supplied actor is an admin with an active assignment to the target client. This is defense in depth on top of the server-only service-role caller; it prevents a server bug from persisting a hydration snapshot under an unrelated profile.

Validation status for commit `ba6916ae9e546af9fa1734311f3f1553207563ac`:

- Validate application: PASS;
- Validate method configuration foundation: PASS;
- local db reset/lint/pgTAP path: PASS in CI;
- transactional execution of `20261002005720_hydrate_client_targets_from_configuration.sql` against the real Supabase SaaS schema: PASS;
- in-transaction checks: hydration template = 1, compatibility columns = 2, atomic function = 1;
- transaction ended with `ROLLBACK`;
- post-rollback verification: hydration template = 0, compatibility columns = 0, atomic function = 0, migration history row = 0.

Therefore the hydration migration is compatible with the current production schema but remains unapplied. The prior pending migration `20261001235018_seed_higher_fat_protein_limit_template.sql` must still be applied first through the official deployment workflow.


## Typed server-side loader contract

The operational loader must be implemented only after the repository typegen contains the already-applied method-configuration tables.

Required resolution query rules:

- identify template by exact template_key = hydration.daily_target;
- require config_schema_key = method_engine_v1;
- require exactly one active, non-retired template version;
- for client scope, consider only overrides with:
  - matching client_id;
  - matching template_id;
  - based_on_template_version_id equal to the selected active version;
  - protocol_version_id IS NULL;
  - activated_at IS NOT NULL;
  - retired_at IS NULL;
- zero active client overrides means template-only resolution;
- more than one matching active override is an integrity failure and must fail closed;
- protocol-scoped overrides are not silently applied to a hydration target created outside a protocol context;
- no fallback to 60 exists if the template/version cannot be resolved;
- after resolution, the JSON is validated again by the hydration resolver and method_engine_v1 before persistence.

The database persistence boundary remains responsible for rechecking the active template version, optional override identity, client scope, actor role, and active assignment before writing snapshots.


## Runtime preparation status - 2026-10-02

Implemented in this draft:

- `hydrationDailyTargetMl(...)`: deterministic `method_engine_v1` evaluator;
- strict client-override parser for `daily_ml_per_kg`;
- typed authenticated server-side loader for the active template/version and client override;
- explicit client accessibility check before template-only resolution;
- exact-base-version matching for client overrides;
- no protocol-scoped override is applied outside protocol context;
- ambiguity (`>1` active version or override) fails closed;
- no fallback to 60 when configuration resolution fails.

Still intentionally disconnected:

- creation of new configured hydration targets from the admin action;
- use of the service-role atomic persistence RPC;
- UI display of configured coefficient/source;
- migration/application of the compatibility schema.

Those remain blocked until the pending migration chain is applied through the official deployment workflow.
