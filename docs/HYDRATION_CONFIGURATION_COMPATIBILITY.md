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

The database now exposes `create_hydration_target_from_method_snapshot(...)` as a transactionally atomic persistence boundary with `EXECUTE` revoked from `PUBLIC`, `anon` and `authenticated` and granted only to `service_role`. The application still needs a server-only resolver that validates the active template/client override with `method_engine_v1` before calling this boundary. The function does not choose a professional value or evaluate arbitrary configuration.
