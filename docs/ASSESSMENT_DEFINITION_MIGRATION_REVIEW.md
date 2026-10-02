# Assessment definition migration review

Last updated: 2026-10-02.

## Status

PROPOSAL ONLY - NOT AN OFFICIAL MIGRATION - NOT APPLIED.

## Goal

Persist the already confirmed Basic/Complete required-item catalogs as versioned professional configuration after the earlier production migration queue is cleared.

## Compatibility

Historical internal assessment_kind values remain unchanged:
- fortnightly;
- monthly.

The proposed templates use semantic template keys:
- assessment.basic;
- assessment.complete.

The operational mapping from historical code to template must be explicit and versioned in application/domain logic during the migration period. This proposal does not change the existing CHECK constraint.

## Confirmed content represented

Basic:
- weight;
- waist;
- abdomen;
- hip.

Complete:
- weight;
- waist;
- abdomen;
- thigh;
- biceps;
- bust/chest;
- hip;
- shoulders;
- calves;
- at least one photo.

Aliases in the proposed baseline preserve the normalization already accepted by the current application and do not create new professional measurements.

## Intentionally unresolved

No exact required measurement units are introduced here because the currently documented professional rule confirms the required measurements, not a definitive unit policy for every key.

The following also remain out of scope:
- cadence/calendar behavior, including month anchors 29/30/31;
- automatic scheduling;
- professional interpretation of results;
- progression decisions.

## Required gates before official migration

1. Earlier pending production migrations must be applied/reconciled first.
2. Generate an official migration filename with Supabase CLI.
3. Validate both JSON documents through assessment_definition_v1.
4. Add pgTAP for template/version provenance and active-version uniqueness.
5. Run db reset, lint and complete CI.
6. Run transactional SaaS dry-run with rollback.
7. Use the official deployment workflow dry-run and apply.
8. Only after application, wire a typed server-side resolver and snapshot the definition used for finalization.
