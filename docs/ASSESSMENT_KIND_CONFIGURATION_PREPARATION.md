# Assessment kind catalog configuration preparation

Last updated: 2026-10-02.

## Objective

Prepare HR-007 for versioned configuration while preserving historical assessment_kind values already stored in the SaaS database.

## Compatibility boundary

Historical codes remain:
- fortnightly;
- monthly.

This preparation does not reinterpret those codes as calendar rules. It only maps a historical code to:
- semantic key;
- visible label.

The current baseline mapping lives only in golden tests:
- fortnightly -> basic -> Básica;
- monthly -> complete -> Completa.

## Deliberately unchanged

- the applied assessment_kind CHECK;
- RLS policies;
- assessment draft/finalization lifecycle;
- scheduling or cadence;
- month-anchor behavior;
- historical rows.

## Next gates

1. persist a versioned catalog/template after the production migration queue is clear;
2. explicitly map the historical codes to active semantic definitions;
3. resolve the catalog server-side;
4. migrate the UI/domain consumers;
5. only relax the database CHECK through a new migration if a real new kind is approved;
6. preserve historical codes indefinitely for existing rows.
