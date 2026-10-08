import assert from "node:assert/strict";
import test from "node:test";
import { parsePositiveCheckinMl } from "./amount.ts";

test("accepts strictly positive whole millilitres", () => {
  assert.equal(parsePositiveCheckinMl("1"), 1);
  assert.equal(parsePositiveCheckinMl("250"), 250);
  assert.equal(parsePositiveCheckinMl(" 00500 "), 500);
  assert.equal(parsePositiveCheckinMl("2147483647"), 2147483647);
});

test("rejects values parseInt would silently truncate or misinterpret", () => {
  for (const value of ["1.5", "1e3", "12xyz", "-10", "+10", "0", "0x10", "NaN", "Infinity", "", "  ", "2147483648", "9007199254740992", null, 500]) {
    assert.equal(parsePositiveCheckinMl(value), null, String(value));
  }
});
