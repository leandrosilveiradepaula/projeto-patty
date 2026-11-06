import type { HistoricalAssessmentCell, HistoricalMeasurementSelection } from "./historical-assessment-review.ts";
import { reviewHistoricalAssessmentMeasurements, validateHistoricalMeasurementSelections } from "./historical-assessment-review.ts";
import { isUuid } from "../validation/uuid.ts";

export type HistoricalAssessmentSnapshot = Readonly<{
  proposalSha256: string;
  assessedOn: string;
  mapping: readonly HistoricalMeasurementSelection[];
  originals: readonly Readonly<HistoricalMeasurementSelection & {
    raw_type: string;
    raw_value: string;
    numeric_value: string;
  }>[];
}>;
/** Reuse the same immutable reviewed hash and exact original cells; no PII in exceptions. */
export function prepareHistoricalAssessmentSnapshot(input: Readonly<{
  clientId: string; sourceSha256: string; layoutSha256: string;
  assessedOn: string; cells: readonly HistoricalAssessmentCell[];
  selections: unknown; expectedProposalSha256: string;
}>): HistoricalAssessmentSnapshot {
  const blocked = (): never => { throw new Error("historical_assessment_snapshot_blocked"); };
  if (!isUuid(input.clientId) || !/^[a-f0-9]{64}$/.test(input.expectedProposalSha256)) blocked();
  const review = reviewHistoricalAssessmentMeasurements(input);
  if (review.state !== "pending_professional_review"
    || review.proposal_sha256 !== input.expectedProposalSha256) blocked();
  const selected = validateHistoricalMeasurementSelections(input.selections);
  if (!selected) blocked();
  const byCell = new Map(input.cells.map((cell) => [
    [cell.sheet_index, cell.column_index, cell.row_index].join(":"), cell,
  ]));
  const originals = selected.map((s) => {
    const cell = byCell.get([s.sheet_index,s.column_index,s.row_index].join(":"));
    if (!cell) return blocked();
    return {
      ...s, raw_type: cell.raw_type, raw_value: cell.raw_value,
      numeric_value: String(Number(cell.raw_value.replace(",", "."))),
    };
  }).sort((a,b) => a.measurement_key.localeCompare(b.measurement_key));
  const mapping = originals.map(({sheet_index,column_index,row_index,measurement_key,unit}) =>
    ({sheet_index,column_index,row_index,measurement_key,unit}));
  return {
    proposalSha256: review.proposal_sha256,
    assessedOn: input.assessedOn, mapping, originals,
  };
}
