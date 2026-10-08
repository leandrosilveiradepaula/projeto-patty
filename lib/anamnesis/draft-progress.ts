/**
 * UI-only reading aid for a client Anamnesis draft.
 * A saved answer is not proof of a valid final submission: the database
 * remains responsible for applicability and final completeness checks.
 */
export type AnamnesisDraftQuestionForProgress = {
  id: string;
  required: boolean;
  section_id: string;
};

export type AnamnesisDraftAnswerForProgress = {
  answer_value: unknown;
  question_id: string;
};

export type AnamnesisDraftSectionProgress = {
  answered: number;
  required: number;
};

export type AnamnesisDraftProgress = {
  answered: number;
  required: number;
  firstMissingQuestionId: string | null;
  bySection: Map<string, AnamnesisDraftSectionProgress>;
};

function hasSavedValue(value: unknown) {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true; // Zero and false are meaningful persisted answers.
}

export function summarizeAnamnesisDraftRequiredAnswers(
  visibleQuestions: readonly AnamnesisDraftQuestionForProgress[],
  savedAnswers: readonly AnamnesisDraftAnswerForProgress[],
): AnamnesisDraftProgress {
  const values = new Map(
    savedAnswers.map((answer) => [answer.question_id, answer.answer_value]),
  );
  const bySection = new Map<string, AnamnesisDraftSectionProgress>();
  let answered = 0;
  let required = 0;
  let firstMissingQuestionId: string | null = null;

  for (const question of visibleQuestions) {
    if (!question.required) continue;
    const section = bySection.get(question.section_id) ?? { answered: 0, required: 0 };
    required += 1;
    section.required += 1;
    if (hasSavedValue(values.get(question.id))) {
      answered += 1;
      section.answered += 1;
    } else if (!firstMissingQuestionId) {
      firstMissingQuestionId = question.id;
    }
    bySection.set(question.section_id, section);
  }

  return { answered, required, firstMissingQuestionId, bySection };
}
