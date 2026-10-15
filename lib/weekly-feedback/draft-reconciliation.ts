/**
 * Reconcile drafts only after the client explicitly checks a newer server
 * snapshot. This is a UI calculation, NOT permission to write: PostgreSQL CAS,
 * authentication and RLS remain the authority for every attempted save.
 *
 * Input values remain exclusively in the authenticated client component.
 * Never put them in URLs, telemetry, logs or persistent browser storage.
 */
export type WeeklyFeedbackDraftValues = Readonly<Record<string, string>>;
export type WeeklyFeedbackCollisionChoice = "mine" | "saved";

export type WeeklyFeedbackDraftDifference = {
  key: string;
  mineChanged: boolean;
  savedChanged: boolean;
  collision: boolean;
};

export function compareWeeklyFeedbackDrafts(
  questionKeys: readonly string[],
  baseline: WeeklyFeedbackDraftValues,
  mine: WeeklyFeedbackDraftValues,
  saved: WeeklyFeedbackDraftValues,
): WeeklyFeedbackDraftDifference[] {
  return questionKeys.flatMap((key) => {
    const initialValue = baseline[key] ?? "";
    const mineValue = mine[key] ?? "";
    const savedValue = saved[key] ?? "";
    const mineChanged = mineValue !== initialValue;
    const savedChanged = savedValue !== initialValue;
    return !mineChanged && !savedChanged ? [] : [{
      key,
      mineChanged,
      savedChanged,
      collision: mineChanged && savedChanged && mineValue !== savedValue,
    }];
  });
}

/**
 * Fields changed only in this tab keep local edits; fields changed only in
 * another session keep the saved version. An overlapping field NEVER has an
 * implicit winner, even when one side is blank. Missing decisions block merge.
 */
export function reconcileWeeklyFeedbackDrafts(
  questionKeys: readonly string[],
  baseline: WeeklyFeedbackDraftValues,
  mine: WeeklyFeedbackDraftValues,
  saved: WeeklyFeedbackDraftValues,
  choices: Readonly<Record<string, WeeklyFeedbackCollisionChoice>>,
): Record<string, string> | null {
  const differences = new Map(
    compareWeeklyFeedbackDrafts(questionKeys, baseline, mine, saved)
      .map((difference) => [difference.key, difference]),
  );
  const entries: [string, string][] = [];

  for (const key of questionKeys) {
    const difference = differences.get(key);
    const local = mine[key] ?? "";
    const server = saved[key] ?? "";
    if (difference?.collision) {
      const choice = choices[key];
      if (choice !== "mine" && choice !== "saved") return null;
      entries.push([key, choice === "mine" ? local : server]);
    } else {
      entries.push([key, difference?.mineChanged ? local : server]);
    }
  }

  // Object.fromEntries never treats a question key as a prototype setter.
  return Object.fromEntries(entries);
}
