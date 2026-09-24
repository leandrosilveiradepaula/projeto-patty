"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/supabase/auth";
import {
  executeOpenAiAnamnesisReview,
  OpenAiAnamnesisReviewExecutionError,
} from "@/lib/ai/openai-provider";

export type AdminAiReviewFormState = {
  executionId?: string;
  message: string | null;
  success: boolean;
};

export async function runAdminAnamnesisAiReview(
  submissionId: string,
  _state: AdminAiReviewFormState,
  formData: FormData,
): Promise<AdminAiReviewFormState> {
  await requireRole("admin");
  const financialAnswerId = formData.get("financialAnswerId");
  const explicitlyIncludedAnswerIds =
    typeof financialAnswerId === "string" && financialAnswerId
      ? [financialAnswerId]
      : undefined;

  try {
    const result = await executeOpenAiAnamnesisReview({
      explicitlyIncludedAnswerIds,
      submissionId,
    });

    revalidatePath(`/admin/anamneses/${submissionId}/ia`);

    return {
      executionId: result.executionId,
      message:
        result.findings.length === 0
          ? "Análise concluída sem achados para revisão."
          : `Análise concluída com ${result.findings.length} achado(s) para revisão humana.`,
      success: true,
    };
  } catch (error) {
    if (error instanceof OpenAiAnamnesisReviewExecutionError) {
      const messages: Record<
        OpenAiAnamnesisReviewExecutionError["code"],
        string
      > = {
        provider_not_configured:
          "A integração OpenAI ainda não está habilitada para processar dados de saúde.",
        prompt_unavailable:
          "O prompt versionado de revisão de Anamnese ainda não está disponível.",
        prompt_invalid:
          "O prompt versionado de revisão de Anamnese está inválido.",
        provider_request_failed:
          "A OpenAI não respondeu corretamente. A tentativa foi registrada sem publicar nada.",
        provider_response_invalid:
          "A resposta da OpenAI não passou pela validação determinística. Nada foi publicado.",
        persistence_failed:
          "A resposta validada não pôde ser persistida. A falha foi registrada para auditoria.",
      };

      return {
        message: messages[error.code],
        success: false,
      };
    }

    return {
      message:
        "Não foi possível executar a análise assistida. Nenhuma decisão foi publicada.",
      success: false,
    };
  }
}
