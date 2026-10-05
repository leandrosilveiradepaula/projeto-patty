import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getGmailSmtpConfig,
  sendGmailSmtpEmail,
} from "@/lib/notifications/gmail-smtp";

const DEFAULT_BATCH_SIZE = 10;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value + "T12:00:00-03:00"));
}

function safeFailureMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown email delivery error";
  return message.replace(/[\r\n]+/g, " ").slice(0, 500);
}

export type WeeklyFeedbackEmailDeliveryResult = {
  claimed: number;
  configured: boolean;
  delivered: number;
  failed: number;
};

export async function deliverWeeklyFeedbackReminderEmails(input: {
  appOrigin: string;
  batchSize?: number;
}): Promise<WeeklyFeedbackEmailDeliveryResult> {
  const smtpConfig = getGmailSmtpConfig();

  if (!smtpConfig) {
    return {
      claimed: 0,
      configured: false,
      delivered: 0,
      failed: 0,
    };
  }

  const appOrigin = new URL(input.appOrigin).origin;
  const batchSize = Math.min(
    Math.max(input.batchSize ?? DEFAULT_BATCH_SIZE, 1),
    50,
  );
  const admin = createAdminClient();

  const { data: claims, error: claimError } = await admin.rpc(
    "claim_weekly_feedback_email_deliveries_server",
    {
      p_limit: batchSize,
    },
  );

  if (claimError) {
    throw claimError;
  }

  let delivered = 0;
  let failed = 0;

  for (const claim of claims ?? []) {
    const feedbackUrl = new URL("/cliente/feedback-semanal", appOrigin);
    const subject = "Lembrete do seu Feedback Semanal";
    const bodyText = [
      "Olá,",
      "",
      `Seu Feedback Semanal referente ao período de ${formatDate(claim.period_start)} a ${formatDate(claim.period_end)} ainda está disponível para preenchimento no aplicativo.`,
      "",
      "Acesse:",
      feedbackUrl.toString(),
      "",
      "Este lembrete não altera seu atendimento automaticamente.",
      "",
      "Consultoria Corpo e Mente - Patty",
    ].join("\n");

    try {
      const result = await sendGmailSmtpEmail(smtpConfig, {
        bodyText,
        subject,
        to: claim.recipient_email,
      });

      const { error: completeError } = await admin.rpc(
        "complete_weekly_feedback_email_delivery_server",
        {
          p_attempt_id: claim.attempt_id,
          p_provider_message_id: result.providerMessageId,
        },
      );

      if (completeError) {
        throw completeError;
      }

      delivered += 1;
    } catch (error) {
      const { error: failError } = await admin.rpc(
        "fail_weekly_feedback_email_delivery_server",
        {
          p_attempt_id: claim.attempt_id,
          p_failure_code: "gmail_smtp_error",
          p_failure_message: safeFailureMessage(error),
        },
      );

      if (failError) {
        throw failError;
      }

      failed += 1;
    }
  }

  return {
    claimed: claims?.length ?? 0,
    configured: true,
    delivered,
    failed,
  };
}
