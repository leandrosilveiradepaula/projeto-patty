# Assessment definition configuration preparation

Last updated: 2026-10-02.

## Objective

Prepare HR-008 so the required contents of an assessment are data-driven rather than permanently encoded in runtime TypeScript.

## Confirmed current baselines represented only in golden tests

Basic assessment:
- weight;
- waist;
- abdomen;
- hip.

Complete assessment:
- weight;
- waist;
- abdomen;
- thigh;
- biceps;
- bust/chest;
- hip;
- shoulders;
- calves;
- at least one linked photo.

The runtime preparation itself does not contain those professional lists.

## Configurable contract

Each assessment definition provides:
- logical kind key;
- ordered required measurements;
- display label per requirement;
- accepted aliases per requirement;
- optional photo requirement with minimum count.

The evaluator:
- normalizes accents/case/spacing generically;
- fails closed on duplicate/ambiguous aliases;
- does not assume Basic/Complete;
- does not assume any particular measurement;
- does not infer scheduling/cadence.

## Deliberately not switched yet

The existing operational finalization path remains on the historical readiness helper until versioned assessment templates and a typed server-side resolver exist.

This preparation does not alter:
- historical internal codes fortnightly/monthly;
- assessment schema/RLS;
- calendar rules;
- finalization immutability;
- any professional progression decision.
