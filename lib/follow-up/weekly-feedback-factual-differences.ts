import type { Json } from "../supabase/database.types";
import {
  readWeeklyFeedbackAnswer,
  type WeeklyFeedbackQuestion,
} from "../weekly-feedback/definition.ts";
import { weeklyFeedbackComparisonHref } from "./weekly-feedback-comparison.ts";

export type FactualWeeklyFeedbackDifference = {
  question: WeeklyFeedbackQuestion;
  previous: string;
  current: string;
  different: boolean;
};

export type FactualWeeklyFeedbackComparison = {
  rows: FactualWeeklyFeedbackDifference[];
  differentCount: number;
  equalCount: number;
};

/**
 * Only compare answers from the exact same version of a questionnaire.
 * The caller has already checked the submitted pair through authenticated
 * RLS. Equal/different means equal/different original answer text, NEVER
 * an improvement, adherence score, judgment or clinical recommendation.
 * No values are placed in a URL, log, or external provider request.
 */
export function compareSameVersionWeeklyFeedbackAnswers(input: {
  currentVersionId: string;
  previousVersionId: string;
  questions: readonly WeeklyFeedbackQuestion[];
  currentAnswers: Json;
  previousAnswers: Json;
}): FactualWeeklyFeedbackComparison | null {
  if (!input.currentVersionId ||
      input.currentVersionId !== input.previousVersionId) return null;
  const rows = input.questions.map((question) => {
    const previous = readWeeklyFeedbackAnswer(input.previousAnswers, question.key);
    const current = readWeeklyFeedbackAnswer(input.currentAnswers, question.key);
    return { question, previous, current, different: previous !== current };
  });
  const differentCount = rows.filter((row) => row.different).length;
  return { rows, differentCount, equalCount: rows.length - differentCount };
}

export type WeeklyFeedbackAnswerView = "todas" | "diferentes";

export function readWeeklyFeedbackAnswerView(raw: unknown): {
  view: WeeklyFeedbackAnswerView;
  invalid: boolean;
} {
  if (raw === undefined || raw === "todas") return { view: "todas", invalid: false };
  if (raw === "diferentes") return { view: "diferentes", invalid: false };
  return { view: "todas", invalid: true };
}

/** Navigational identifiers only; NEVER include the original health answers. */
export function weeklyFeedbackAnswerViewHref(
  clientId: string,
  currentId: string,
  previousId: string,
  view: WeeklyFeedbackAnswerView,
): string {
  return weeklyFeedbackComparisonHref(clientId, currentId, previousId) +
    (view === "diferentes" ? "&visao=diferentes" : "") +
    "#respostas-comparadas";
}
