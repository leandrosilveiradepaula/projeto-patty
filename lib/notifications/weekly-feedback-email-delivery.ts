import "server-only";

import { formatWeeklyFeedbackPeriodDate } from "@/lib/weekly-feedback/date-format";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTrustedClientAccessOrigin } from "@/lib/onboarding/trusted-client-access-origin";
import {
  getGmailSmtpConfig,
  sendGmailSmtpEmail,
} from "@/lib/notifications/gmail-smtp";

const DEFAULT_BATCH_SIZE = 10;

function formatDate(value: string) {
  // Never normalize an invalid calendar day into a different period.
  const formatted = formatWeeklyFeedbackPeriodDate(value);
  if (formatted === "Data indisponível") {
    throw new Error("Invalid weekly feedback period date");
  }
  return formatted;
}

function safeFailureMessage(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Unknown email delivery error";

  return message
    .replace(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
      "[email]",
    )
    .replace(/[\r\n]+/g, " ")
    .slice(0, 500);
}

export type WeeklyFeedbackEmailDeliveryResult = {
  claimed: number;
  configured: boolean;
  delivered: number;
  failed: number;
};

export async function deliverWeeklyFeedbackReminderEmails(input: {
  batchSize?: number;
} = {}): Promise<WeeklyFeedbackEmailDeliveryResult> {
  const smtpConfig = getGmailSmtpConfig();

  if (!smtpConfig) {
    return {
      claimed: 0,
      configured: false,
      delivered: 0,
      failed: 0,
    };
  }

  // Resolve from deployment configuration before acquiring any email claims.
  // The HTTP request Host/Origin is never a trusted destination for clients.
  const appOrigin = resolveTrustedClientAccessOrigin();
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
    let result: Awaited<ReturnType<typeof sendGmailSmtpEmail>>;

    try {
      // All per-claim preparation belongs inside the recovery boundary:
      // one malformed legacy period must not strand the claimed batch.
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

      result = await sendGmailSmtpEmail(smtpConfig, {
        bodyText,
        messageId: `<weekly-feedback-${claim.notification_event_id}@projeto-patty.local>`,
        subject,
        to: claim.recipient_email,
      });
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
      continue;
    }

    const { error: completeError } = await admin.rpc(
      "complete_weekly_feedback_email_delivery_server",
      {
        p_attempt_id: claim.attempt_id,
        p_provider_message_id: result.providerMessageId,
      },
    );

    if (completeError) {
      throw new Error(
        "SMTP accepted the reminder but delivery persistence failed",
        { cause: completeError },
      );
    }

    delivered += 1;
  }

  return {
    claimed: claims?.length ?? 0,
    configured: true,
    delivered,
    failed,
  };
}
