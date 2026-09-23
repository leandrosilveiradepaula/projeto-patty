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
