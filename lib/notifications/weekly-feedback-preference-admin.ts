import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type WeeklyFeedbackNotificationChannel =
  | "email"
  | "whatsapp"
  | "in_app";

export async function activateWeeklyFeedbackNotificationPreference(input: {
  actorProfileId: string;
  channel: WeeklyFeedbackNotificationChannel;
  clientId: string;
  expectedActiveVersionId: string | null;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc(
    "activate_client_notification_preference_version_server",
    {
      p_actor_profile_id: input.actorProfileId,
      p_channel_key: input.channel,
      p_client_id: input.clientId,
      p_expected_active_version_id: input.expectedActiveVersionId,
      p_purpose_key: "weekly_feedback",
    },
  );

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Notification preference activation returned no version id");
  }

  return data;
}
