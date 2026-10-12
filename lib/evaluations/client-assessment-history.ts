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
