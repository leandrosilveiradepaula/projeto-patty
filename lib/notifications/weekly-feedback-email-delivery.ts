import "server-only";

import { buildWeeklyFeedbackEmailContent } from "@/lib/notifications/weekly-feedback-email-content";
import { checkWeeklyFeedbackEmailEligibility } from "@/lib/notifications/weekly-feedback-email-eligibility";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTrustedClientAccessOrigin } from "@/lib/onboarding/trusted-client-access-origin";
import {
  getGmailSmtpConfig,
  sendGmailSmtpEmail,
} from "@/lib/notifications/gmail-smtp";

const DEFAULT_BATCH_SIZE = 10;

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
    let failureCode = "gmail_smtp_error";

    try {
      // All per-claim preparation belongs inside the recovery boundary:
      // one malformed legacy period must not strand the claimed batch.
      // Recheck the live state immediately before SMTP. A claim can become
      // stale if the client submits, Patty changes channel/contact, or the
      // assignment ends after the database claim was acquired.
      const [feedback, notification, preference, contact, assignment] = await Promise.all([
        admin.from("client_weekly_feedbacks")
          .select("client_id, submitted_at, period_start, period_end")
          .eq("id", claim.weekly_feedback_id)
          .eq("client_id", claim.client_id)
          .maybeSingle(),
        admin.from("client_notification_events")
          .select("client_id, weekly_feedback_id, channel_key, preference_version_id, delivery_state")
          .eq("id", claim.notification_event_id)
          .eq("client_id", claim.client_id)
          .maybeSingle(),
        admin.from("client_notification_preference_versions")
          .select("id, client_id, purpose_key, channel_key, retired_at")
          .eq("client_id", claim.client_id)
          .eq("purpose_key", "weekly_feedback")
          .is("retired_at", null)
          .maybeSingle(),
        admin.from("client_registration")
          .select("client_id, contact_email")
          .eq("client_id", claim.client_id)
          .maybeSingle(),
        admin.from("client_assignments")
          .select("client_id")
          .eq("client_id", claim.client_id)
          .is("ended_at", null)
          .limit(1)
          .maybeSingle(),
      ]);
      if ([feedback, notification, preference, contact, assignment].some(row => row.error)) {
        failureCode = "eligibility_check_error";
        throw new Error("Could not revalidate weekly feedback email eligibility");
      }
      const eligibilityIssue = checkWeeklyFeedbackEmailEligibility(claim, {
        feedback: feedback.data,
        notification: notification.data,
        preference: preference.data,
        contact: contact.data,
        activeAssignment: assignment.data,
      });
      if (eligibilityIssue) {
        failureCode = "eligibility_changed";
        throw new Error("Weekly feedback email no longer eligible: " + eligibilityIssue);
      }

      const { subject, bodyText } = buildWeeklyFeedbackEmailContent({
        appOrigin,
        periodStart: claim.period_start,
        periodEnd: claim.period_end,
      });

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
          p_failure_code: failureCode,
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
