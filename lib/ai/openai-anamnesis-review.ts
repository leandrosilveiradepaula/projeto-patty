import type { AnamnesisReviewContext } from "./anamnesis-review-context.ts";
import {
  type AnamnesisReviewOutput,
  validateAnamnesisReviewOutput,
} from "./anamnesis-review-output.ts";
import type { Json } from "@/lib/supabase/database.types";

export const OPENAI_PROVIDER_KEY = "openai";

export type AnamnesisReviewPromptContent = {
  instructions: string;
  schema_version: 1;
};

export type OpenAiAnamnesisReviewAliases = {
  sourceRefToAnswerId: ReadonlyMap<string, string>;
  targetRefToQuestionId: ReadonlyMap<string, string>;
};

export type OpenAiStructuredExtractionResult =
  | { ok: true; value: unknown }
  | {
      ok: false;
      code:
        | "response_not_completed"
        | "refusal"
        | "missing_output_text"
        | "invalid_json";
      message: string;
    };

export function parseAnamnesisReviewPromptContent(
  value: Json,
): AnamnesisReviewPromptContent | null {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return null;
  }

  const schemaVersion = value.schema_version;
  const instructions = value.instructions;

  if (
    schemaVersion !== 1 ||
    typeof instructions !== "string" ||
    !instructions.trim()
  ) {
    return null;
  }

  return {
    instructions: instructions.trim(),
    schema_version: 1,
  };
}

export function buildOpenAiAnamnesisReviewRequest(input: {
  context: AnamnesisReviewContext;
  instructions: string;
  model: string;
}) {
  const sourceRefToAnswerId = new Map<string, string>();
  const targetRefToQuestionId = new Map<string, string>();

  const sources = input.context.sources.map((source, index) => {
    const sourceRef = `A${index + 1}`;
    sourceRefToAnswerId.set(sourceRef, source.source_answer_id);

    return {
      answer: source.answer_value,
      question: source.label,
      question_key: source.question_key,
      source_ref: sourceRef,
    };
  });

  const missingTargets = input.context.missingTargets.map((target, index) => {
    const targetRef = `Q${index + 1}`;
    targetRefToQuestionId.set(targetRef, target.question_id);

    return {
      question: target.label,
      question_key: target.question_key,
      target_ref: targetRef,
    };
  });

  return {
    aliases: {
      sourceRefToAnswerId,
      targetRefToQuestionId,
    } satisfies OpenAiAnamnesisReviewAliases,
    body: {
      model: input.model,
      store: false,
      instructions: input.instructions,
      input: JSON.stringify({
        missing_targets: missingTargets,
        sources,
      }),
      text: {
        format: {
          type: "json_schema",
          name: "anamnesis_review_findings",
          strict: true,
          schema: {
            type: "object",
            properties: {
              findings: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: {
                      type: "string",
                      enum: [
                        "possible_contradiction",
                        "clarification_needed",
                        "missing_answer",
                      ],
                    },
                    source_refs: {
                      type: "array",
                      items: { type: "string" },
                    },
                    target_ref: {
                      anyOf: [{ type: "string" }, { type: "null" }],
                    },
                    explanation: { type: "string" },
                    suggested_follow_up_question: {
                      anyOf: [{ type: "string" }, { type: "null" }],
                    },
                  },
                  required: [
                    "type",
                    "source_refs",
                    "target_ref",
                    "explanation",
                    "suggested_follow_up_question",
                  ],
                  additionalProperties: false,
                },
              },
            },
            required: ["findings"],
            additionalProperties: false,
          },
        },
      },
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function extractOpenAiStructuredOutput(
  response: unknown,
): OpenAiStructuredExtractionResult {
  if (!isRecord(response)) {
    return {
      ok: false,
      code: "missing_output_text",
      message: "OpenAI response is not an object.",
    };
  }

  if (response.status !== "completed") {
    const reason =
      isRecord(response.incomplete_details) &&
      typeof response.incomplete_details.reason === "string"
        ? response.incomplete_details.reason
        : String(response.status ?? "unknown");

    return {
      ok: false,
      code: "response_not_completed",
      message: `OpenAI response was not completed: ${reason}.`,
    };
  }

  if (!Array.isArray(response.output)) {
    return {
      ok: false,
      code: "missing_output_text",
      message: "OpenAI response did not include output items.",
    };
  }

  let outputText: string | null = null;

  for (const item of response.output) {
    if (!isRecord(item) || item.type !== "message" || !Array.isArray(item.content)) {
      continue;
    }

    for (const content of item.content) {
      if (!isRecord(content)) {
        continue;
      }

      if (content.type === "refusal" && typeof content.refusal === "string") {
        return {
          ok: false,
          code: "refusal",
          message: "OpenAI refused the Anamnese review request.",
        };
      }

      if (content.type === "output_text" && typeof content.text === "string") {
        outputText = content.text;
      }
    }
  }

  if (!outputText) {
    return {
      ok: false,
      code: "missing_output_text",
      message: "OpenAI response did not include structured output text.",
    };
  }

  try {
    return { ok: true, value: JSON.parse(outputText) };
  } catch {
    return {
      ok: false,
      code: "invalid_json",
      message: "OpenAI structured output was not valid JSON.",
    };
  }
}

export function mapOpenAiReviewOutputToCanonical(input: {
  aliases: OpenAiAnamnesisReviewAliases;
  context: AnamnesisReviewContext;
  value: unknown;
}):
  | { ok: true; value: AnamnesisReviewOutput }
  | { ok: false; error: string } {
  if (!isRecord(input.value) || !Array.isArray(input.value.findings)) {
    return { ok: false, error: "invalid_provider_output_shape" };
  }

  const mappedFindings: unknown[] = [];

  for (const finding of input.value.findings) {
    if (!isRecord(finding) || !Array.isArray(finding.source_refs)) {
      return { ok: false, error: "invalid_provider_finding_shape" };
    }

    const sourceAnswerIds: string[] = [];

    for (const sourceRef of finding.source_refs) {
      if (typeof sourceRef !== "string") {
        return { ok: false, error: "invalid_provider_source_ref" };
      }

      const answerId = input.aliases.sourceRefToAnswerId.get(sourceRef);

      if (!answerId) {
        return { ok: false, error: "unknown_provider_source_ref" };
      }

      sourceAnswerIds.push(answerId);
    }

    let targetQuestionId: string | undefined;

    if (finding.target_ref !== null) {
      if (typeof finding.target_ref !== "string") {
        return { ok: false, error: "invalid_provider_target_ref" };
      }

      targetQuestionId = input.aliases.targetRefToQuestionId.get(
        finding.target_ref,
      );

      if (!targetQuestionId) {
        return { ok: false, error: "unknown_provider_target_ref" };
      }
    }

    mappedFindings.push({
      type: finding.type,
      source_answer_ids: sourceAnswerIds,
      ...(targetQuestionId
        ? { target_question_id: targetQuestionId }
        : {}),
      explanation: finding.explanation,
      ...(typeof finding.suggested_follow_up_question === "string"
        ? {
            suggested_follow_up_question:
              finding.suggested_follow_up_question,
          }
        : {}),
    });
  }

  const validated = validateAnamnesisReviewOutput({
    allowedMissingTargetQuestionIds:
      input.context.allowedMissingTargetQuestionIds,
    allowedSourceAnswerIds: input.context.allowedSourceAnswerIds,
    value: { findings: mappedFindings },
  });

  return validated.ok
    ? { ok: true, value: validated.value }
    : { ok: false, error: validated.error };
}
