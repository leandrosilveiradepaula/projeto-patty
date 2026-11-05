import "server-only";

import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { CLIENT_ANAMNESIS_FORM_KEY } from "@/lib/anamnesis/start-policy";
import { ANAMNESIS_QUESTION_KEYS } from "@/lib/anamnesis/question-keys";
import type { HistoricalQuestionTarget } from "@/lib/imports/historical-direct-anamnesis-mapping";

export type PublishedHistoricalAnamnesisTargets = Readonly<{
  form_version_id: string;
  version_number: number;
  questions: readonly HistoricalQuestionTarget[];
}>;

/**
 * The current published question catalogue is the sole authoritative target
 * list for the professional. Never use the historical Google Forms labels as
 * question identities. No client answers are queried here.
 */
export async function getPublishedHistoricalAnamnesisTargets(): Promise<PublishedHistoricalAnamnesisTargets | null> {
  await requireRole("admin"); // Full server-side role + MFA AAL2.
  const db = await createClient();
  const { data: form, error: formError } = await db
    .from("anamnesis_forms")
    .select("id")
    .eq("form_key", CLIENT_ANAMNESIS_FORM_KEY)
    .maybeSingle();
  if (formError) throw new Error("historical_mapping_target_unavailable");
  if (!form) return null;

  const { data: versions, error: versionError } = await db
    .from("anamnesis_form_versions")
    .select("id, version_number, published_at")
    .eq("form_id", form.id)
    .not("published_at", "is", null)
    .order("version_number", { ascending: false })
    .limit(1);
  if (versionError) throw new Error("historical_mapping_target_unavailable");
  const version = versions?.[0];
  if (!version) return null;

  const { data: questions, error: questionError } = await db
    .from("anamnesis_questions")
    .select("id, question_key, label, answer_type, options")
    .eq("form_version_id", version.id)
    .order("display_order", { ascending: true })
    .order("id", { ascending: true });
  if (questionError) throw new Error("historical_mapping_target_unavailable");

  return {
    form_version_id: version.id,
    version_number: version.version_number,
    // Never present the legal consent checkbox as an importable answer.
    questions: (questions ?? [])
      .filter((item) => item.question_key !== ANAMNESIS_QUESTION_KEYS.consentAcceptance)
      .map(({ id, question_key, label, answer_type, options }) => ({
        id, question_key, label, answer_type, options,
      })),
  };
}
