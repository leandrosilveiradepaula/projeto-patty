import "server-only";
import { orderAdministrativeAssessments } from "./administrative-assessment-history";
import { applyAssessmentMeasurementCorrections } from "./measurement-corrections";
import { listAccessibleAssessmentMeasurementCorrections } from "./measurement-correction-store";
import { buildFactualProgressSeries } from "./progress-view";
import {
  listAccessibleAssessmentMeasurements,
  listAccessibleAssessmentsForClient,
} from "@/lib/supabase/data-access";

/** 
 * Same RLS-scoped effective measurements for the professional evolution page
 * and its validated return link. Never query draft values or other clients.
 * Call only after the client/assessment has passed its existing access check.
 */
export async function loadAccessibleAdminClientProgress(clientId: string) {
  const assessments = orderAdministrativeAssessments(
    (await listAccessibleAssessmentsForClient(clientId)).filter(
      assessment => Boolean(assessment.finalized_at),
    ),
  );
  const snapshots = await Promise.all(assessments.map(async assessment => {
    const rawMeasurements = await listAccessibleAssessmentMeasurements(assessment.id);
    const corrections = await listAccessibleAssessmentMeasurementCorrections(
      rawMeasurements.map(measurement => measurement.id),
    );
    return {
      assessedAt: assessment.assessed_at,
      id: assessment.id,
      measurements: applyAssessmentMeasurementCorrections(rawMeasurements, corrections),
    };
  }));
  return {
    assessments,
    series: buildFactualProgressSeries(snapshots),
  };
}
