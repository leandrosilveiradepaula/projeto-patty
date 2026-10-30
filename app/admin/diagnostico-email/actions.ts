"use server";

import { requireRole } from "@/lib/supabase/auth";
import { sendIsolatedGmailDiagnostic } from "@/lib/notifications/gmail-diagnostic";

export type DiagnosticState = {
  result: "idle" | "not_configured" | "accepted" | "failed";
  reference: string | null;
};

export async function runEmailDiagnostic(
  _previous: DiagnosticState,
  _formData: FormData,
): Promise<DiagnosticState> {
  await requireRole("admin"); // Includes verified AAL2.
  const result = await sendIsolatedGmailDiagnostic();
  return {
    result: result.state,
    reference: "reference" in result ? result.reference : null,
  };
}
