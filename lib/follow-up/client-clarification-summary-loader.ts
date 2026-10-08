import "server-only";

import {
  listAccessibleAnamnesisClarificationRequestsForSubmissions,
  listAccessibleAnamnesisClarificationResponses,
  listAccessibleAnamnesisClarificationResolutions,
} from "@/lib/supabase/data-access";
import { summarizeClientClarifications } from "./client-clarification-summary";

/**
 * Only caller-visible, already submitted Anamnesis IDs may reach this loader.
 * The existing Supabase data-access functions apply authenticated RLS;
 * no service role and no answer/request text are used by the UI summary.
 */
export async function loadClientClarificationSummary(submittedIds: string[]) {
  const requests = await listAccessibleAnamnesisClarificationRequestsForSubmissions(submittedIds);
  const ids = requests.map((request) => request.id);
  const [responses, resolutions] = await Promise.all([
    listAccessibleAnamnesisClarificationResponses(ids),
    listAccessibleAnamnesisClarificationResolutions(ids),
  ]);
  return summarizeClientClarifications(requests, responses, resolutions);
}
