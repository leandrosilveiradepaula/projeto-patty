# Carb Cycle configuration preparation

Last updated: 2026-10-02.

## Objective

Remove the runtime assumption that Carb Cycle is permanently three hardcoded phases with exactly Low1/Low2/High coefficients.

## Scope

This preparation slice changes only the deterministic TypeScript contract:
- phase identity comes from configuration;
- ordered steps come from configuration;
- carbohydrate/protein coefficients live in configuration;
- the set of steps used in the Linear average lives in configuration;
- the divisor is derived from the configured average-step collection;
- current phase 1/2/3 values remain only in golden-test fixtures.

## Confirmed source boundary

The current phase 1/2/3 coefficients are preserved as the current spreadsheet-derived baseline already represented in the repository.

This slice does not add phase 4/5/6 values, does not infer Cutting-to-phase mapping, and does not automate phase progression.

## Out of scope

- database seed/template migration;
- snapshots;
- UI;
- protocol publication;
- phase 4/5/6 details;
- bulking/consolidation;
- automatic selection of phase.

## Acceptance criteria

- no professional phase coefficient remains in runtime code;
- runtime does not require exactly three steps;
- Linear average derives from configured step keys;
- current phase 1/2/3 golden behavior remains equivalent;
- changed coefficients work without code changes;
- invalid config fails closed;
- application CI remains green.

## Risk

A database schema for `carb_cycle_v1` still needs to be materialized and validated before this contract can become an active professional template. Until then this is a runtime preparation only and must not be treated as applied configuration.
