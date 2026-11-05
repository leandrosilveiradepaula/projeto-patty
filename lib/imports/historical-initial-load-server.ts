import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/supabase/auth";
import { prepareHistoricalInitialLoadRegistration } from "@/lib/imports/historical-initial-load-ledger";
import type { Json } from "@/lib/supabase/database.types";

/**
 * Metadata-only registration. The actual files and all health data MUST stay
 * outside this audit ledger. This is not permission to write Client records.
 */
export async function registerHistoricalInitialLoadPlan(
  plan: unknown,
  batchId: string,
): Promise<{ batch_id: string; status: "pending_review"; source_count: number }> {
  const { profileId } = await requireRole("admin"); // Relational admin + MFA AAL2.
  const payload = prepareHistoricalInitialLoadRegistration(plan, batchId);
  const db = createAdminClient(); // Secret is never exposed to the browser.
  const { data, error } = await db.rpc("register_historical_initial_load_manifest", {
    p_batch_id: payload.batch_id,
    p_manifest_sha256: payload.manifest_sha256,
    p_sources: payload.sources as unknown as Json,
    p_created_by_profile_id: profileId,
  });
  if (error || data !== batchId) {
    // Never include source metadata, personal data or database errors in logs.
    throw new Error("historical_initial_load_registration_blocked");
  }
  return { batch_id: data, status: "pending_review", source_count: payload.sources.length };
}
