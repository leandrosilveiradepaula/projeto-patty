# Clarification reminder configuration preparation

Last updated: 2026-10-07.

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

## Runtime status reconciled on 2026-10-07

The preparation described above has already advanced into runtime:
- `workflow.anamnesis_clarification_reminder` exists as a versioned `scalar_parameter_v1` template;
- the active SaaS version resolves to 24 hours;
- `loadClarificationReminderInterval()` resolves the active version server-side and fails closed if the template/version is missing or ambiguous;
- the operational pending builder receives the resolved interval explicitly;
- visible pending text derives the interval from the resolved value;
- there is no silent fallback to a hardcoded 24-hour runtime constant.

The remaining gap is deliberately separate: the notification channel and recurring delivery mechanism for clarification reminders are still open. A due reminder must not be represented as a delivered message.

## Next gates

1. Confirm the notification channel/lifecycle for clarification reminders.
2. Only then implement recurring delivery and its auditable delivery state.
3. Preserve the distinction between `due`, `attempted`, `delivered` and `failed/blocked`.
4. Do not reuse the Weekly Feedback channel rules automatically; that would be a new product/professional decision.
