import assert from "node:assert/strict";
import test from "node:test";
import { newestFactualAssessments, summarizeFactualProgressCoverage } from "./progress-journey.ts";
import { buildFactualProgressSeries } from "./progress-view.ts";

test("history orders actual instants rather than ISO timezone strings", () => {
  const rows = [
    {id:"later",assessedAt:"2026-10-09T09:00:00-03:00"},
    {id:"earlier",assessedAt:"2026-10-09T11:30:00Z"},
  ];
  assert.deepEqual(newestFactualAssessments(rows).map(row=>row.id),["later","earlier"]);
  assert.equal(rows[0].id,"later");
});

test("history keeps invalid legacy dates last, while tied instants are stable", () => {
  const rows=[
    {id:"unknown",assessedAt:"not-a-date"},
    {id:"b",assessedAt:"2026-10-09T09:00:00-03:00"},
    {id:"a",assessedAt:"2026-10-09T12:00:00Z"},
  ];
  assert.deepEqual(newestFactualAssessments(rows).map(x=>x.id),["a","b","unknown"]);
});

test("one observed value is factual history but not a comparable variation", () => {
  const series=buildFactualProgressSeries([{id:"a",assessedAt:"2026-10-01",measurements:[
    {measurement_key:"peso",measurement_value:70,unit:"kg"},
  ]}]);
  assert.deepEqual(summarizeFactualProgressCoverage(series),{
    seriesCount:1,comparableSeriesCount:0,singleObservationSeriesCount:1,
  });
  assert.equal(series[0].points[0].deltaFromPrevious,null);
});

test("unit differences cannot be presented as longitudinal comparison", () => {
  const series=buildFactualProgressSeries([
    {id:"a",assessedAt:"2026-09-01",measurements:[{measurement_key:"peso",measurement_value:70,unit:"kg"}]},
    {id:"b",assessedAt:"2026-10-01",measurements:[{measurement_key:"peso",measurement_value:154,unit:"lb"}]},
  ]);
  assert.deepEqual(summarizeFactualProgressCoverage(series),{
    seriesCount:2,comparableSeriesCount:0,singleObservationSeriesCount:2,
  });
});

test("two valid observations of same identity produce a factual comparable series", () => {
  const series=buildFactualProgressSeries([
    {id:"a",assessedAt:"2026-09-01",measurements:[{measurement_key:"cintura",measurement_value:80,unit:"cm"}]},
    {id:"b",assessedAt:"2026-10-01",measurements:[{measurement_key:"cintura",measurement_value:77,unit:"cm"}]},
  ]);
  assert.equal(summarizeFactualProgressCoverage(series).comparableSeriesCount,1);
  assert.equal(series[0].points[1].deltaFromPrevious,-3);
});
