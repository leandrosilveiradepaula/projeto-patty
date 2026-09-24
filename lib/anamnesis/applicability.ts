export type AnamnesisApplicabilityRule = {
  sourceQuestionId: string;
  expectedAnswer: unknown;
};

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([key, item]) =>
        `${JSON.stringify(key)}:${stableJson(item)}`,
    );

  return `{${entries.join(",")}}`;
}

export function isAnamnesisQuestionApplicable(
  rule: AnamnesisApplicabilityRule | null,
  answersByQuestionId: ReadonlyMap<string, unknown>,
): boolean {
  if (!rule) {
    return true;
  }

  if (!answersByQuestionId.has(rule.sourceQuestionId)) {
    return false;
  }

  const actualAnswer = answersByQuestionId.get(rule.sourceQuestionId);

  return stableJson(actualAnswer) === stableJson(rule.expectedAnswer);
}
