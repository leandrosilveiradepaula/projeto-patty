import assert from "node:assert/strict";
import test from "node:test";
import { assessmentDetailFromProgressHref, assessmentMeasureHistoryHref, assessmentProgressReturn } from "./assessment-progress-navigation.ts";
import { buildFactualProgressSeries } from "./progress-view.ts";

const series = buildFactualProgressSeries([
  { id: "a", assessedAt: "2026-01-01", measurements: [{ measurement_key: "peso", unit: "kg", measurement_value: 70 }, { measurement_key: "cintura", unit: "cm", measurement_value: 80 }] },
  { id: "b", assessedAt: "2026-02-01", measurements: [{ measurement_key: "peso", unit: "kg", measurement_value: 69 }] },
]);
const pesoIndex = series.findIndex(s => s.key === "peso") + 1;

test("each assessment measure opens only its matching factual series", () => {
  assert.equal(assessmentMeasureHistoryHref(series, { measurement_key: "peso", unit: "kg" }), `/cliente/evolucao?serie=${pesoIndex}&janela=all#medida-${pesoIndex-1}`);
  assert.equal(assessmentMeasureHistoryHref(series, { measurement_key: "peso", unit: "cm" }), null);
  assert.ok(!assessmentMeasureHistoryHref(series, { measurement_key: "cintura", unit: "cm" })?.includes("cintura"));
});

test("deep link keeps series and window but never puts a measurement key in its URL", () => {
  const href = assessmentDetailFromProgressHref("b", pesoIndex, "3");
  const url = new URL(href, "https://app.example");
  assert.equal(url.pathname, "/cliente/avaliacoes");
  assert.equal(url.searchParams.get("avaliacao"), "b");
  assert.equal(url.searchParams.get("origemSerie"), String(pesoIndex));
  assert.equal(url.searchParams.get("origemJanela"), "3");
  assert.equal(url.hash, "#avaliacao-b");
  assert.ok(!href.includes("peso"));
});

test("only an assessment present in the selected authorized series gets return navigation", () => {
  const raw = { avaliacao: "b", origemSerie: String(pesoIndex), origemJanela: "6" };
  assert.deepEqual(assessmentProgressReturn(raw, series), {
    href: `/cliente/evolucao?serie=${pesoIndex}&janela=6#medida-${pesoIndex-1}`,
    label: series[pesoIndex-1].label,
  });
  assert.equal(assessmentProgressReturn({ ...raw, avaliacao: "unauthorized" }, series), null);
  assert.equal(assessmentProgressReturn({ ...raw, origemSerie: ["1"] }, series), null);
  assert.equal(assessmentProgressReturn({ ...raw, origemJanela: "100" }, series), null);
  assert.equal(assessmentProgressReturn({ ...raw, origemSerie: "999" }, series), null);
  const cinturaIndex = series.findIndex(s => s.key === "cintura") + 1;
  assert.equal(assessmentProgressReturn({ ...raw, origemSerie: String(cinturaIndex) }, series), null);
  assert.equal(assessmentProgressReturn({ origemSerie: String(pesoIndex), origemJanela: "3" }, series), null);
});
