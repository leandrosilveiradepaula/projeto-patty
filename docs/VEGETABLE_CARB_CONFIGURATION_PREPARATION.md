# Vegetable carbohydrate conversion preparation

Last updated: 2026-10-02.

## Objective

Prepare the confirmed vegetable-dose equivalence for versioned professional configuration without expanding the still-open carbohydrate/fat redistribution rules.

## Confirmed rule represented

For total protocol counting:

- 2 vegetable doses count as 1 carbohydrate dose.

This preparation models only that equivalence.

## Scope

The runtime helper receives a method_engine_v1 configuration with:
- input vegetable_doses in dose;
- configurable ratio vegetable_doses_per_carbohydrate_dose;
- output carbohydrate_dose_equivalent in dose.

The current coefficient 2 exists only in golden tests.

## Deliberately not represented

- how remaining carbohydrate doses convert to fat doses;
- whether lunch and dinner always receive vegetable allocations;
- phase-specific exceptions;
- catalog quantities or vegetable grams from historical Excel;
- automatic meal construction.

## Next gates

1. create a versioned template after the production migration queue is clear;
2. resolve the active version server-side;
3. snapshot the exact conversion used when a future plan is generated;
4. wire only consumers whose professional behavior is already confirmed;
5. keep unresolved carbohydrate/fat redistribution outside this template.
