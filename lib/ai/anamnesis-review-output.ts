import { isUuid } from "../validation/uuid.ts";

export type AnamnesisReviewFindingType =
  | "possible_contradiction"
  | "clarification_needed"
  | "missing_answer";

export type AnamnesisReviewFinding = {
  type: AnamnesisReviewFindingType;
  source_answer_ids: string[];
  target_question_id?: string;
  explanation: string;
  suggested_follow_up_question?: string;
};

export type AnamnesisReviewOutput = {
  findings: AnamnesisReviewFinding[];
};

export type AnamnesisReviewOutputValidationErrorCode =
  | "invalid_top_level"
  | "invalid_top_level_properties"
  | "invalid_findings"
  | "invalid_finding"
  | "invalid_finding_properties"
  | "invalid_finding_type"
  | "invalid_source_answer_ids"
  | "source_answer_not_allowed"
  | "invalid_target_question_id"
  | "target_question_not_missing_or_applicable"
  | "insufficient_sources"
  | "invalid_explanation"
  | "invalid_follow_up_question";

export type AnamnesisReviewOutputValidationResult =
  | {
      ok: true;
      value: AnamnesisReviewOutput;
    }
  | {
      ok: false;
      error: AnamnesisReviewOutputValidationErrorCode;
    };

const TOP_LEVEL_KEYS = new Set(["findings"]);
const FINDING_KEYS = new Set([
  "type",
  "source_answer_ids",
  "target_question_id",
  "explanation",
  "suggested_follow_up_question",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
) {
  return Object.keys(value).every((key) => allowed.has(key));
}

function isFindingType(value: unknown): value is AnamnesisReviewFindingType {
  return (
    value === "possible_contradiction" ||
    value === "clarification_needed" ||
    value === "missing_answer"
  );
}

function normalizeNonBlankText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function validateAnamnesisReviewOutput(input: {
  allowedMissingTargetQuestionIds?: ReadonlySet<string>;
  allowedSourceAnswerIds: ReadonlySet<string>;
  value: unknown;
}): AnamnesisReviewOutputValidationResult {
  if (!isRecord(input.value)) {
    return { ok: false, error: "invalid_top_level" };
  }

  if (!hasOnlyKeys(input.value, TOP_LEVEL_KEYS)) {
    return { ok: false, error: "invalid_top_level_properties" };
  }

  if (!Array.isArray(input.value.findings)) {
    return { ok: false, error: "invalid_findings" };
  }

  const findings: AnamnesisReviewFinding[] = [];

  for (const rawFinding of input.value.findings) {
    if (!isRecord(rawFinding)) {
      return { ok: false, error: "invalid_finding" };
    }

    if (!hasOnlyKeys(rawFinding, FINDING_KEYS)) {
      return { ok: false, error: "invalid_finding_properties" };
    }

    if (!isFindingType(rawFinding.type)) {
      return { ok: false, error: "invalid_finding_type" };
    }

    if (
      !Array.isArray(rawFinding.source_answer_ids) ||
      !rawFinding.source_answer_ids.every(
        (value): value is string => typeof value === "string" && isUuid(value),
      )
    ) {
      return { ok: false, error: "invalid_source_answer_ids" };
    }

    const sourceAnswerIds = [...new Set(rawFinding.source_answer_ids)];

    if (sourceAnswerIds.length !== rawFinding.source_answer_ids.length) {
      return { ok: false, error: "invalid_source_answer_ids" };
    }

    if (
      sourceAnswerIds.some(
        (answerId) => !input.allowedSourceAnswerIds.has(answerId),
      )
    ) {
      return { ok: false, error: "source_answer_not_allowed" };
    }

    const minimumSources =
      rawFinding.type === "possible_contradiction"
        ? 2
        : rawFinding.type === "clarification_needed"
          ? 1
          : 0;

    if (sourceAnswerIds.length < minimumSources) {
      return { ok: false, error: "insufficient_sources" };
    }

    let targetQuestionId: string | undefined;

    if (rawFinding.type === "missing_answer") {
      if (
        typeof rawFinding.target_question_id !== "string" ||
        !isUuid(rawFinding.target_question_id)
      ) {
        return { ok: false, error: "invalid_target_question_id" };
      }

      if (
        !input.allowedMissingTargetQuestionIds?.has(
          rawFinding.target_question_id,
        )
      ) {
        return {
          ok: false,
          error: "target_question_not_missing_or_applicable",
        };
      }

      targetQuestionId = rawFinding.target_question_id;
    } else if ("target_question_id" in rawFinding) {
      return { ok: false, error: "invalid_target_question_id" };
    }

    const explanation = normalizeNonBlankText(rawFinding.explanation);

    if (!explanation) {
      return { ok: false, error: "invalid_explanation" };
    }

    let suggestedFollowUpQuestion: string | undefined;

    if ("suggested_follow_up_question" in rawFinding) {
      const normalized = normalizeNonBlankText(
        rawFinding.suggested_follow_up_question,
      );

      if (!normalized) {
        return { ok: false, error: "invalid_follow_up_question" };
      }

      suggestedFollowUpQuestion = normalized;
    }

    findings.push({
      type: rawFinding.type,
      source_answer_ids: sourceAnswerIds,
      ...(targetQuestionId ? { target_question_id: targetQuestionId } : {}),
      explanation,
      ...(suggestedFollowUpQuestion
        ? { suggested_follow_up_question: suggestedFollowUpQuestion }
        : {}),
    });
  }

  return {
    ok: true,
    value: { findings },
  };
}
