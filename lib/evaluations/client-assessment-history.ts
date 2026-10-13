import { newestFactualAssessments } from "./progress-journey.ts";
export type ClientAssessmentHistoryVersion={id:string;assessed_at:string;finalized_at:string|null};
export type ClientAssessmentMeasure={assessment_id:string;assessed_at:string};
/** Show every finalized, RLS-authorized assessment, including a finalization with zero measures. */
export function completeClientAssessmentHistory<T extends ClientAssessmentMeasure,V extends ClientAssessmentHistoryVersion>(
 assessments:readonly V[],measurements:readonly T[],
):Array<{id:string;assessedAt:string;measurements:T[]}>{
 const visible=new Map(assessments.filter(a=>a.finalized_at!==null).map(a=>[a.id,{id:a.id,assessedAt:a.assessed_at,measurements:[] as T[]}]));
 for(const m of measurements){const row=visible.get(m.assessment_id);if(row)row.measurements.push(m);}
 return newestFactualAssessments([...visible.values()]);
}

/**
 * Temporary compatibility path while the finalized-header RPC is unavailable.
 * Only measured assessments can be derived from the existing authorized
 * measurement RPC. This is NOT a complete assessment history.
 */
export function measurementBackedAssessmentHeaders<T extends ClientAssessmentMeasure>(
  measurements: readonly T[],
): ClientAssessmentHistoryVersion[] {
  return [...new Map(measurements.map((measurement) => [
    measurement.assessment_id,
    {
      id: measurement.assessment_id,
      assessed_at: measurement.assessed_at,
      finalized_at: measurement.assessed_at,
    },
  ])).values()];
}
