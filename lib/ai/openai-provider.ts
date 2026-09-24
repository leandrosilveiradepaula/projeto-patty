import "server-only";

import type { Json } from "@/lib/supabase/database.types";
import {
  completeInternalAiExecution,
  failInternalAiExecution,
} from "@/lib/ai/ai-execution-persistence";
import {
  buildOpenAiAnamnesisReviewRequest,
  extractOpenAiStructuredOutput,
  mapOpenAiReviewOutputToCanonical,
  OPENAI_PROVIDER_KEY,
  parseAnamnesisReviewPromptContent,
} from "@/lib/ai/openai-anamnesis-review";
import { startAnamnesisReviewExecutionRecord } from "@/lib/ai/anamnesis-review-execution";
import { getLatestAccessibleAiPromptVersion } from "@/lib/supabase/data-access";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

export type OpenAiProviderReadiness =
  | {
      ready: true;
      model: string;
      provider: typeof OPENAI_PROVIDER_KEY;
    }
  | {
      ready: false;
      reason:
        | "health_data_processing_not_enabled"
        | "api_key_missing"
        | "model_missing";
      provider: typeof OPENAI_PROVIDER_KEY;
    };

export class OpenAiAnamnesisReviewExecutionError extends Error {
  readonly code:
    | "provider_not_configured"
    | "prompt_unavailable"
    | "prompt_invalid"
    | "provider_request_failed"
    | "provider_response_invalid"
    | "persistence_failed";

  constructor(
    code: OpenAiAnamnesisReviewExecutionError["code"],
    message: string,
  ) {
    super(message);
    this.code = code;
    this.name = "OpenAiAnamnesisReviewExecutionError";
  }
}

export function getOpenAiProviderReadiness(): OpenAiProviderReadiness {
  if (process.env.OPENAI_HEALTH_DATA_PROCESSING_ENABLED !== "true") {
    return {
      ready: false,
      provider: OPENAI_PROVIDER_KEY,
      reason: "health_data_processing_not_enabled",
    };
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return {
      ready: false,
      provider: OPENAI_PROVIDER_KEY,
      reason: "api_key_missing",
    };
  }

  if (!process.env.OPENAI_MODEL?.trim()) {
    return {
      ready: false,
      provider: OPENAI_PROVIDER_KEY,
      reason: "model_missing",
    };
  }

  return {
    ready: true,
    model: process.env.OPENAI_MODEL.trim(),
    provider: OPENAI_PROVIDER_KEY,
  };
}

async function persistFailure(input: {
  executionId: string;
  failureCode:
    | "provider_request_failed"
    | "invalid_json"
    | "invalid_output_schema"
    | "persistence_failed";
  failureMessage: string;
  failureStage:
    | "provider_request"
    | "output_parse"
    | "output_validation"
    | "persistence";
  rawResponse?: string;
  rawResponseFormat?: "json" | "text";
  responseReceivedAt?: string;
}) {
  await failInternalAiExecution({
    executionId: input.executionId,
    failureCode: input.failureCode,
    failureMessage: input.failureMessage,
    failureStage: input.failureStage,
    responseContent: input.rawResponse ?? null,
    responseContentFormat: input.rawResponseFormat ?? null,
    responseReceivedAt: input.responseReceivedAt ?? null,
  });
}

export async function executeOpenAiAnamnesisReview(input: {
  explicitlyIncludedAnswerIds?: readonly string[];
  submissionId: string;
}) {
  const readiness = getOpenAiProviderReadiness();

  if (!readiness.ready) {
    throw new OpenAiAnamnesisReviewExecutionError(
      "provider_not_configured",
      `OpenAI provider is not ready: ${readiness.reason}.`,
    );
  }

  const promptVersion =
    await getLatestAccessibleAiPromptVersion("anamnesis_review");

  if (!promptVersion) {
    throw new OpenAiAnamnesisReviewExecutionError(
      "prompt_unavailable",
      "No anamnesis_review prompt version is available.",
    );
  }

  const promptContent = parseAnamnesisReviewPromptContent(
    promptVersion.content,
  );

  if (!promptContent) {
    throw new OpenAiAnamnesisReviewExecutionError(
      "prompt_invalid",
      "The latest anamnesis_review prompt has an invalid content shape.",
    );
  }

  const started = await startAnamnesisReviewExecutionRecord({
    explicitlyIncludedAnswerIds: input.explicitlyIncludedAnswerIds,
    modelIdentifier: readiness.model,
    promptVersionId: promptVersion.id,
    provider: OPENAI_PROVIDER_KEY,
    submissionId: input.submissionId,
  });

  const request = buildOpenAiAnamnesisReviewRequest({
    context: started.prepared,
    instructions: promptContent.instructions,
    model: readiness.model,
  });

  let response: Response;

  try {
    response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request.body),
    });
  } catch {
    await persistFailure({
      executionId: started.executionId,
      failureCode: "provider_request_failed",
      failureMessage: "OpenAI request failed before a response was received.",
      failureStage: "provider_request",
    });

    throw new OpenAiAnamnesisReviewExecutionError(
      "provider_request_failed",
      "OpenAI request failed before a response was received.",
    );
  }

  if (!response.ok) {
    await persistFailure({
      executionId: started.executionId,
      failureCode: "provider_request_failed",
      failureMessage: `OpenAI request returned HTTP ${response.status}.`,
      failureStage: "provider_request",
    });

    throw new OpenAiAnamnesisReviewExecutionError(
      "provider_request_failed",
      `OpenAI request returned HTTP ${response.status}.`,
    );
  }

  const rawResponse = await response.text();
  const responseReceivedAt = new Date().toISOString();

  let parsedResponse: unknown;

  try {
    parsedResponse = JSON.parse(rawResponse);
  } catch {
    await persistFailure({
      executionId: started.executionId,
      failureCode: "invalid_json",
      failureMessage: "OpenAI response body was not valid JSON.",
      failureStage: "output_parse",
      rawResponse,
      rawResponseFormat: "text",
      responseReceivedAt,
    });

    throw new OpenAiAnamnesisReviewExecutionError(
      "provider_response_invalid",
      "OpenAI response body was not valid JSON.",
    );
  }

  const extracted = extractOpenAiStructuredOutput(parsedResponse);

  if (!extracted.ok) {
    const failureCode =
      extracted.code === "invalid_json"
        ? "invalid_json"
        : "invalid_output_schema";
    const failureStage =
      extracted.code === "invalid_json"
        ? "output_parse"
        : "output_validation";

    await persistFailure({
      executionId: started.executionId,
      failureCode,
      failureMessage: extracted.message,
      failureStage,
      rawResponse,
      rawResponseFormat: "json",
      responseReceivedAt,
    });

    throw new OpenAiAnamnesisReviewExecutionError(
      "provider_response_invalid",
      extracted.message,
    );
  }

  const mapped = mapOpenAiReviewOutputToCanonical({
    aliases: request.aliases,
    context: started.prepared,
    value: extracted.value,
  });

  if (!mapped.ok) {
    await persistFailure({
      executionId: started.executionId,
      failureCode: "invalid_output_schema",
      failureMessage: `OpenAI output failed deterministic validation: ${mapped.error}.`,
      failureStage: "output_validation",
      rawResponse,
      rawResponseFormat: "json",
      responseReceivedAt,
    });

    throw new OpenAiAnamnesisReviewExecutionError(
      "provider_response_invalid",
      `OpenAI output failed deterministic validation: ${mapped.error}.`,
    );
  }

  try {
    await completeInternalAiExecution(
      started.executionId,
      mapped.value as unknown as Json,
    );
  } catch {
    await persistFailure({
      executionId: started.executionId,
      failureCode: "persistence_failed",
      failureMessage: "Validated OpenAI output could not be persisted.",
      failureStage: "persistence",
      rawResponse,
      rawResponseFormat: "json",
      responseReceivedAt,
    });

    throw new OpenAiAnamnesisReviewExecutionError(
      "persistence_failed",
      "Validated OpenAI output could not be persisted.",
    );
  }

  return {
    executionId: started.executionId,
    findings: mapped.value.findings,
    model: readiness.model,
    provider: OPENAI_PROVIDER_KEY,
  };
}
