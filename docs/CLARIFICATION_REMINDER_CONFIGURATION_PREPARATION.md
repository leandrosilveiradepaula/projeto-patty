# Clarification reminder configuration preparation

Last updated: 2026-10-02.

## Objective

Prepare the confirmed clarification-reminder interval for versioned configuration without changing the current operational notification behavior.

## Confirmed professional rule

While a clarification request is waiting for the client's response, the confirmed current interval is 24 hours.

The notification channel and actual recurring delivery mechanism remain open and are not inferred here.

## Scope

This slice adds a deterministic unit-aware helper that receives an explicit scalar configuration:

- value;
- unit = hour.

Golden tests reproduce the current 24-hour reference and prove that a changed interval can be evaluated without editing runtime code.

## Deliberately not switched yet

The existing pending-items runtime still contains its historical 24-hour constant. It is not replaced in this preparation because the active template resolver is not yet wired into application data access.

There is no silent fallback from configuration to 24 hours.

## Next gates

1. Create a versioned template such as workflow.anamnesis_clarification_reminder.
2. Resolve the active version server-side.
3. Pass the resolved interval explicitly to the operational pending builder.
4. Replace visible text that embeds 24h with text derived from the resolved interval where appropriate.
5. Keep channel execution separate from the due-date calculation.
6. Preserve the rule that due does not mean a message was sent.
