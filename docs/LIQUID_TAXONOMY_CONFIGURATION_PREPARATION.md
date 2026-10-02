# Liquid taxonomy configuration preparation

Last updated: 2026-10-02.

## Objective

Prepare HR-010 for versioned method configuration without changing the historical check-in schema or operational write path.

## Confirmed rule represented

The current method distinguishes:
- pure water;
- other zero-calorie liquids that may complement the daily target in a smaller amount.

The exact minimum proportion of pure water remains open and is not represented as a numeric rule.

## Scope

This slice adds a fail-closed runtime parser for an explicit liquid-kind catalog. Each entry has:
- stable key;
- display label;
- hydration class: pure_water or zero_calorie_other.

The current historical keys water and zero_calorie_other exist only in golden tests.

## Deliberately unchanged

- the applied CHECK constraint in 20260930132221_create_client_checkins.sql;
- app/cliente/checkins/actions.ts;
- persisted historical liquid_kind values;
- hydration target calculation;
- reminder behavior;
- any minimum pure-water ratio.

## Next gates

Before switching the operational path:
1. define a versioned template/catalog schema;
2. preserve historical keys and add compatibility mapping;
3. create a new migration if the database CHECK must be relaxed;
4. resolve the active catalog server-side;
5. validate a submitted kind against the resolved catalog;
6. snapshot/catalog-version the meaning used by a check-in if needed for auditability;
7. keep any future pure-water ratio rule separate until Patty confirms it.
