import assert from "node:assert/strict";
import test from "node:test";

import { readReceivedWeeklyFeedbackQuery } from "./received-weekly-feedback-inbox.ts";
import {
  weeklyFeedbackInboxReturnHref,
  readWeeklyFeedbackInboxReturn,
  withWeeklyFeedbackInboxReturn,
} from "./weekly-feedback-inbox-return.ts";

const clientId = "11111111-1111-4111-8111-111111111111";
const filters = { clientId, origin: "manual" as const, month: "2026-10" };

test("returns to the same filtered inbox situation and effective page", () => {
  const pending = weeklyFeedbackInboxReturnHref(filters, "pendentes", 3);
  assert.equal(pending,
    "/admin/feedback-semanal?situacao=pendentes&cliente=" + clientId +
    "&origem=manual&mes=2026-10&pagina=3#aguardando-cliente");
  assert.equal(readWeeklyFeedbackInboxReturn(pending), pending);
  const received = weeklyFeedbackInboxReturnHref(filters, "recebidos", 2);
  assert.equal(received,
    "/admin/feedback-semanal?cliente=" + clientId +
    "&origem=manual&mes=2026-10&pagina=2#recebidos");
  assert.equal(readWeeklyFeedbackInboxReturn(received), received);
  assert.equal(readWeeklyFeedbackInboxReturn("/admin/feedback-semanal#recebidos"),
    "/admin/feedback-semanal#recebidos");
});

test("restores context through record/comparison/assessment links without changing the anchor", () => {
  const back = weeklyFeedbackInboxReturnHref(filters, "recebidos", 2);
  const record = "/admin/clientes/" + clientId +
    "/feedback-semanal?registro=22222222-2222-4222-8222-222222222222#feedback-enviado-22222222";
  const withContext = withWeeklyFeedbackInboxReturn(record, back);
  const parsed = new URL(withContext, "https://patty.invalid");
  assert.equal(parsed.pathname, "/admin/clientes/" + clientId + "/feedback-semanal");
  assert.equal(parsed.searchParams.get("registro"), "22222222-2222-4222-8222-222222222222");
  assert.equal(parsed.hash, "#feedback-enviado-22222222");
  assert.equal(readWeeklyFeedbackInboxReturn(parsed.searchParams.get("caixaRetorno")), back);
  assert.equal(withWeeklyFeedbackInboxReturn(withContext, back), withContext);
  const assessment = withWeeklyFeedbackInboxReturn("/admin/avaliacoes/123#acompanhamento", back);
  assert.equal(new URL(assessment, "https://patty.invalid").hash, "#acompanhamento");
  assert.equal(new URL(assessment, "https://patty.invalid").searchParams.get("caixaRetorno"), back);
});

test("rejects open redirects, unknown keys, duplicated controls and forged anchors", () => {
  const forged = [
    "https://evil.example/admin/feedback-semanal#recebidos",
    "//evil.example/admin/feedback-semanal#recebidos",
    "/admin/feedback-semanal/../other#recebidos",
    "/admin/feedback-semanal#aguardando-cliente",
    "/admin/feedback-semanal?situacao=pendentes#recebidos",
    "/admin/feedback-semanal?situacao=unknown#recebidos",
    "/admin/feedback-semanal?cliente=../../other#recebidos",
    "/admin/feedback-semanal?origem=invalid#recebidos",
    "/admin/feedback-semanal?mes=2026-13#recebidos",
    "/admin/feedback-semanal?pagina=-1#recebidos",
    "/admin/feedback-semanal?pagina=999999#recebidos",
    "/admin/feedback-semanal?pagina=2&pagina=3#recebidos",
    "/admin/feedback-semanal?evil=1#recebidos",
    "/admin/feedback-semanal?cliente=" + clientId + "&cliente=" + clientId + "#recebidos",
  ];
  for (const value of forged) {
    assert.equal(readWeeklyFeedbackInboxReturn(value), null, value);
    assert.equal(withWeeklyFeedbackInboxReturn("/admin/avaliacoes/123", value),
      "/admin/avaliacoes/123");
  }
  const safe = weeklyFeedbackInboxReturnHref(filters, "recebidos", 2);
  assert.equal(withWeeklyFeedbackInboxReturn("https://evil.example/", safe),
    "https://evil.example/");
  assert.equal(withWeeklyFeedbackInboxReturn("//evil.example/", safe),
    "//evil.example/");
  assert.equal(withWeeklyFeedbackInboxReturn("/cliente/feedback-semanal", safe),
    "/cliente/feedback-semanal");
});

test("a stale client filter never grants access when assignment is revoked", () => {
  const returnLink = weeklyFeedbackInboxReturnHref(filters, "recebidos", 2);
  assert.equal(readWeeklyFeedbackInboxReturn(returnLink), returnLink);
  const raw = new URL(returnLink, "https://patty.invalid");
  const liveFilters = readReceivedWeeklyFeedbackQuery({
    cliente: raw.searchParams.get("cliente")!, origem: raw.searchParams.get("origem")!,
    mes: raw.searchParams.get("mes")!, pagina: raw.searchParams.get("pagina")!,
  }, []); // No currently assigned clients, regardless of the saved navigation context.
  assert.equal(liveFilters.invalid, true);
});
