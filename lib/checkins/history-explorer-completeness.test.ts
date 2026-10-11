import assert from "node:assert/strict";
import test from "node:test";
import {
  readCheckinExploreOptions,
  exploreLiquidCheckins,
  exploreActivityCheckins,
  compareCheckinEventInstants,
  checkinExplorerQuery,
  checkinExplorerClearQuery,
  checkinExploreHref,
} from "./history-explorer.ts";

const liq = (id: string, recorded_at: string, effectiveAmountMl: number, recorded_by_profile_id = "client") =>
  ({ id, recorded_at, effectiveAmountMl, effectiveLiquidKind: "water", recorded_by_profile_id, wasCorrected: false });
const activity = (id: string, checkin_date: string, recorded_at: string, didActivityEffective: boolean, recorded_by_profile_id = "client") =>
  ({ id, checkin_date, recorded_at, didActivityEffective, recorded_by_profile_id, wasCorrected: false });

test("liquids compare real instants across time zones and tie deterministically", () => {
  const events = [
    liq("a", "2026-10-11T10:00:00-03:00", 150),
    liq("b", "2026-10-11T12:30:00Z", 200),
    liq("c", "2026-10-11T13:00:00Z", 220),
  ];
  assert.ok(compareCheckinEventInstants(events[0], events[2]) > 0); // deterministic tie by ID
  assert.deepEqual(exploreLiquidCheckins(events, readCheckinExploreOptions({})).items.map(x => x.id), ["c", "a", "b"]);
  assert.deepEqual(exploreLiquidCheckins(events, readCheckinExploreOptions({ ordem: "oldest" })).items.map(x => x.id), ["b", "a", "c"]);
});
test("invalid timestamps go to the end of newest and last of same-day activity", () => {
  const xs = [liq("bad", "invalid", 20), liq("good", "2026-10-11T09:00:00Z", 10)];
  assert.deepEqual(exploreLiquidCheckins(xs, readCheckinExploreOptions({})).items.map(x => x.id), ["good", "bad"]);
  const ys = [activity("bad", "2026-10-11", "invalid", false), activity("good", "2026-10-11", "2026-10-11T10:00:00Z", true)];
  assert.deepEqual(exploreActivityCheckins(ys, readCheckinExploreOptions({})).items.map(x => x.id), ["good", "bad"]);
});
test("ascending amount and descending amount sort use effective value and stable tie", () => {
  const xs = [liq("a", "2026-10-11T11:00:00Z", 500), liq("b", "2026-10-11T10:00:00Z", 100), liq("c", "2026-10-11T12:00:00Z", 100)];
  assert.deepEqual(exploreLiquidCheckins(xs, readCheckinExploreOptions({ordem:"amount-asc"})).items.map(x=>x.id), ["c","b","a"]);
  assert.deepEqual(exploreLiquidCheckins(xs, readCheckinExploreOptions({ordem:"amount-desc"})).items.map(x=>x.id), ["a","c","b"]);
});
test("client and professional origin are exact and fail closed without actor context", () => {
  const xs = [liq("own", "2026-10-11T10:00:00Z", 1), liq("admin", "2026-10-11T11:00:00Z", 2, "admin")];
  assert.deepEqual(exploreLiquidCheckins(xs, readCheckinExploreOptions({origemLiquido:"client"}), "client").items.map(x=>x.id),["own"]);
  assert.deepEqual(exploreLiquidCheckins(xs, readCheckinExploreOptions({origemLiquido:"professional"}), "client").items.map(x=>x.id),["admin"]);
  assert.equal(exploreLiquidCheckins(xs, readCheckinExploreOptions({origemLiquido:"professional"})).total,0);
  const ys = [activity("a", "2026-10-11", "2026-10-11T10:00:00Z", true), activity("b", "2026-10-12", "2026-10-12T10:00:00Z",false,"admin")];
  assert.deepEqual(exploreActivityCheckins(ys, readCheckinExploreOptions({origemAtividade:"professional"}),"client").items.map(x=>x.id), ["b"]);
});
test("activity oldest and newest use calendar day then absolute timestamp", () => {
  const ys = [activity("a","2026-10-11","2026-10-11T12:00:00Z",true),activity("b","2026-10-10","2026-10-11T15:00:00Z",false)];
  assert.deepEqual(exploreActivityCheckins(ys,readCheckinExploreOptions({})).items.map(x=>x.id),["a","b"]);
  assert.deepEqual(exploreActivityCheckins(ys,readCheckinExploreOptions({ordemAtividade:"oldest"})).items.map(x=>x.id),["b","a"]);
});
test("invalid query values reset to defaults and pages show explicit clamping", () => {
  const o=readCheckinExploreOptions({origemLiquido:"everyone",origemAtividade:"admin<script>",ordemAtividade:"unsorted",lp:"99999",ap:"0"});
  assert.equal(o.liquidOrigin,"all");assert.equal(o.activityOrigin,"all");
  assert.equal(o.activitySort,"newest");assert.equal(o.liquidPage,10000);assert.equal(o.activityPage,1);
  const result=exploreLiquidCheckins([liq("a","2026-10-11T10:00:00Z",1)],o);
  assert.equal(result.page,1);assert.equal(result.outOfRange,true);assert.equal(result.first,1);assert.equal(result.last,1);
});
test("clearing liquids keeps only activity filters and its page, and vice versa", () => {
  const o=readCheckinExploreOptions({ordem:"amount-asc",correcao:"corrected",tipo:"water",origemLiquido:"client",atividade:"no",atividadeCorrecao:"original",origemAtividade:"professional",ordemAtividade:"oldest",lp:"3",ap:"4"});
  const clearedLiquid=checkinExplorerClearQuery(o,"2026-10-11","liquid");
  assert.equal(clearedLiquid.ordem,undefined);assert.equal(clearedLiquid.atividade,"no");assert.equal(clearedLiquid.ap,"4");
  const clearedActivity=checkinExplorerClearQuery(o,"2026-10-11","activity");
  assert.equal(clearedActivity.atividade,undefined);assert.equal(clearedActivity.tipo,"water");assert.equal(clearedActivity.lp,"3");
  assert.ok(checkinExploreHref("/cliente/checkins",checkinExplorerQuery(o,"2026-10-11"),{}).includes("origemLiquido=client"));
});
