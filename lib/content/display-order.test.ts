import assert from "node:assert/strict";
import test from "node:test";

import { MAX_CONTENT_DISPLAY_ORDER, parseContentDisplayOrder } from "./display-order.ts";

test("display order matches existing positive int4 database constraint", () => {
  for (const raw of ["1", "2", "42", "2147483647", " 7 "]) {
    assert.ok(parseContentDisplayOrder(raw) !== null, raw);
  }
  assert.equal(parseContentDisplayOrder("2147483647"), MAX_CONTENT_DISPLAY_ORDER);
  for (const raw of [undefined, null, "", "0", "-1", "1.5", "1e3", "01", "2147483648", "99999999999999999999", "NaN", {}]) {
    assert.equal(parseContentDisplayOrder(raw), null, String(raw));
  }
});
