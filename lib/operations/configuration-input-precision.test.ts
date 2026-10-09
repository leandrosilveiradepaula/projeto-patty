import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../../app/admin/configuracoes/actions.ts", import.meta.url), "utf8");

test("weekly feedback request weekday uses strict ISO weekday parser", () => {
  assert.match(source, /requestWeekday: readWeekday\(formData, "requestWeekday"\)/);
  assert.match(source, /\/\^\[1-7\]\$\//);
});

test("weekly feedback reminder weekday uses strict ISO weekday parser", () => {
  assert.match(source, /reminderWeekday: readWeekday\(formData, "reminderWeekday"\)/);
});

test("assessment preferred weekdays reject malformed form values", () => {
  assert.match(source, /typeof value !== "string" \|\| !\/\^\[1-7\]\$\/.test\(value\)/);
});

test("assessment preferred weekdays reject duplicates", () => {
  assert.match(source, /new Set\(preferredWeekdays\).size !== preferredWeekdays.length/);
});

test("numeric method parameters use strict decimal input parsing", () => {
  assert.match(source, /const normalized = raw.trim\(\)/);
  assert.match(source, /Informe apenas números decimais válidos/);
  assert.match(source, /const value = Number\(normalized\)/);
});
