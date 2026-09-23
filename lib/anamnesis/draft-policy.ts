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
