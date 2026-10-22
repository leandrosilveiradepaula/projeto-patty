import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const callbackPaths = ["app/auth/recovery/route.ts", "app/auth/recovery-token/route.ts"];

test("recovery callback must return the response that received session cookies", () => {
  for (const path of callbackPaths) {
    const code = read(path);
    assert.match(code, /createServerClient<Database>/);
    assert.match(code, /getAll\(\)/);
    assert.match(code, /request\.cookies\.getAll\(\)/);
    assert.match(code, /response\.cookies\.set\(name, value, options\)/);
    assert.match(code, /response\.headers\.set\(key, value\)/);
    assert.match(code, /if \(error\) return uncachedRecoveryRedirect\(true\)/);
    assert.match(code, /return response;/);
    assert.doesNotMatch(code, /NextResponse\.redirect\(/);
  }
});

test("recovery callback returns only same-origin, uncached 303 redirects", () => {
  for (const path of callbackPaths) {
    const code = read(path);
    assert.match(code, /status: 303/);
    assert.match(code, /Location: invalid \? "\/redefinir-senha\?error=invalid" : "\/redefinir-senha"/);
    assert.match(code, /"Cache-Control": "private, no-store, max-age=0"/);
    assert.match(code, /"Referrer-Policy": "no-referrer"/);
    assert.doesNotMatch(code, /nextUrl\.clone\(/);
  }
});
