import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { pendingQueueLinks, parsePendingQueueFocus } from "./pending-navigation.ts";

const page = readFileSync(new URL("../../app/admin/pendencias/page.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../../app/admin/pendencias/page.module.css", import.meta.url), "utf8");

test("queue exposes group jump-links only when the group has a real target", () => {
  assert.ok(page.includes('aria-label="Ir para grupo de pendências"'));
  for (const name of ["patty", "client", "operational"] as const) {
    assert.ok(page.includes(`grouped.${name}.length > 0`), name);
    assert.ok(page.includes(`pendingQueueLinks.${name}`), name);
    assert.ok(pendingQueueLinks[name].includes("#"), name);
    assert.equal(parsePendingQueueFocus(name), name);
  }
});

test("focused groups keep collapsible client/operational queues accessible", () => {
  assert.ok(page.includes('open={focusedGroup === "client"}'));
  assert.ok(page.includes('open={focusedGroup === "operational"}'));
  assert.ok(page.includes('id="acao-da-patty"'));
  assert.ok(page.includes('id="aguardando-cliente"'));
  assert.ok(page.includes('id="operacional-do-sistema"'));
});

test("queue distinguishes waiting on client from professional/operational alerts", () => {
  assert.ok(page.includes('variant={group === "client" ? "neutral" : "warning"}'));
  assert.ok(page.includes('<PendingList group="client" items={grouped.client} />'));
  assert.ok(page.includes('<PendingList group="patty" items={grouped.patty} />'));
  assert.ok(page.includes('<PendingList group="operational" items={grouped.operational} />'));
});

test("group navigation works by keyboard and does not require client-only state", () => {
  assert.ok(css.includes('.groupNavigation a:focus-visible'));
  assert.ok(css.includes('min-height: 44px'));
  assert.ok(page.includes('aria-current={focusedGroup === "patty"'));
});
