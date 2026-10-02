# Historical food source validation references

Last updated: 2026-10-02.

## Objective

Stop the historical Excel-source validator from embedding professional/current reconciliation numbers in runtime code.

## Scope

The validator now receives an explicit reconciliation reference containing:
- macro dose reference values;
- vegetable-dose to carbohydrate-dose conversion reference;
- historical non-free item dose marker.

The historical source remains fail-closed and non-publishable.

## Important classification boundary

The values currently present in the historical source are not promoted to global professional rules by this change.

In particular:
- the known protein/carbohydrate/fat dose references can later be sourced from their versioned templates;
- the confirmed rule 2 vegetable doses = 1 carbohydrate dose can later receive its own versioned template;
- `vegetable_grams` and the item dose-marker convention remain historical-source reconciliation inputs unless separately confirmed;
- the catalog stays `publishable: false`.

## Out of scope

- publishing the historical catalog;
- creating active food-equivalent catalog rows;
- deciding whether vegetable grams are a current global rule;
- inferring carbohydrate↔fat redistribution;
- changing any food quantity from the Excel source.

## Acceptance criteria

- validator contains no embedded macro-dose or vegetable-conversion numeric baseline;
- current source passes when the current reference is supplied explicitly;
- a different reference can be validated without runtime-code edits;
- invalid references fail closed;
- publication remains impossible from this validator.
