export type DraftCreationMode = "create" | "reuse";
export type DraftAnswerWriteMode = "insert" | "update";

export function getDraftCreationMode(
  existingDraftId: string | null,
): DraftCreationMode {
  return existingDraftId ? "reuse" : "create";
}

export function getDraftAnswerWriteMode(
  existingAnswerId: string | null,
): DraftAnswerWriteMode {
  return existingAnswerId ? "update" : "insert";
}

export function isUniqueViolationCode(code: string | undefined) {
  return code === "23505";
}


export function canEditDraftTextAnswer(input: {
  answerType: string;
  answerValue: unknown;
  hasAnswer: boolean;
  submittedAt: string | null;
}) {
  return (
    input.submittedAt === null &&
    input.answerType === "text" &&
    (!input.hasAnswer || typeof input.answerValue === "string")
  );
}

export function getDraftSingleChoiceOptions(options: unknown) {
  if (!Array.isArray(options) || options.length < 2) {
    return null;
  }

  if (
    !options.every(
      (option) => typeof option === "string" && option.trim().length > 0,
    )
  ) {
    return null;
  }

  const values = options as string[];

  if (new Set(values).size !== values.length) {
    return null;
  }

  return values;
}

export function canEditDraftSingleChoiceAnswer(input: {
  answerType: string;
  answerValue: unknown;
  hasAnswer: boolean;
  options: unknown;
  submittedAt: string | null;
}) {
  const options = getDraftSingleChoiceOptions(input.options);

  return (
    input.submittedAt === null &&
    input.answerType === "single_choice" &&
    options !== null &&
    (!input.hasAnswer ||
      (typeof input.answerValue === "string" &&
        options.includes(input.answerValue)))
  );
}
