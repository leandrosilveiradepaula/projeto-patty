import { parseWeeklyFeedbackDefinition, readWeeklyFeedbackAnswer, summarizeWeeklyFeedbackRequiredProgress } from "./definition.ts";
import type { Json } from "@/lib/supabase/database.types";

/** UI-only projection of the already authorized, versioned feedback. */
export function prepareClientPendingFeedback(
  version: { definition: Json } | null,
  answers: Json,
) {
  const definition = version ? parseWeeklyFeedbackDefinition(version.definition) : null;
  if (!definition) {
    return { definition: null, initialValues: {}, progress: null };
  }
  const initialValues = Object.fromEntries(
    definition.questions.map((question) => [
      question.key,
      readWeeklyFeedbackAnswer(answers, question.key),
    ]),
  );
  return {
    definition,
    initialValues,
    progress: summarizeWeeklyFeedbackRequiredProgress(definition.questions, initialValues),
  };
}
