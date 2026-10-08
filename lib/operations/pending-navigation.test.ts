import assert from "node:assert/strict";
import test from "node:test";
import { parsePendingQueueFocus, pendingQueueLinks } from "./pending-navigation.ts";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("pending queue only accepts explicit group names", () => {
  assert.equal(parsePendingQueueFocus("patty"), "patty");
  assert.equal(parsePendingQueueFocus("client"), "client");
  assert.equal(parsePendingQueueFocus("operational"), "operational");
  for (const bad of ["", "all", "../client", ["client"], null, undefined]) {
    assert.equal(parsePendingQueueFocus(bad), null);
  }
});
test("dashboard shortcuts target the correct queue section", () => {
  const dashboard = read("app/admin/page.tsx");
  for (const group of ["patty", "client", "operational"] as const) {
    assert.match(dashboard, new RegExp("href=\\{pendingQueueLinks\\." + group + "\\}"));
    assert.match(pendingQueueLinks[group], /^\/admin\/pendencias\?grupo=/);
  }
});
test("queue opens only requested collapsible group", () => {
  const page = read("app/admin/pendencias/page.tsx");
  assert.match(page, /open=\{focusedGroup === "client"\}/);
  assert.match(page, /open=\{focusedGroup === "operational"\}/);
  assert.match(page, /id="acao-da-patty"/);
  assert.match(page, /focusedGroup && grouped\[focusedGroup\]\.length === 0/);
});
