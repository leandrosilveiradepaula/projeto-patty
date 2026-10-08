import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ClientAccessLinkOriginError,
  resolveTrustedClientAccessOrigin,
} from "./trusted-client-access-origin.ts";

const read = (p: string) => readFileSync(new URL("../../" + p, import.meta.url), "utf8");

test("manual access links always use configured or Vercel-trusted deployment origin", () => {
  assert.equal(
    resolveTrustedClientAccessOrigin({
      APP_PUBLIC_ORIGIN: "https://consultoria.example/",
      VERCEL_PROJECT_PRODUCTION_URL: "production.vercel.app",
      VERCEL_URL: "preview.vercel.app",
      NODE_ENV: "production",
    }),
    "https://consultoria.example",
  );
  assert.equal(resolveTrustedClientAccessOrigin({ VERCEL_PROJECT_PRODUCTION_URL: "patty.vercel.app", NODE_ENV: "production" }), "https://patty.vercel.app");
  assert.equal(resolveTrustedClientAccessOrigin({ VERCEL_URL: "patty-preview.vercel.app", NODE_ENV: "production" }), "https://patty-preview.vercel.app");
  assert.equal(resolveTrustedClientAccessOrigin({ NODE_ENV: "development" }), "http://localhost:3000");
  assert.equal(resolveTrustedClientAccessOrigin({ APP_PUBLIC_ORIGIN: "http://localhost:3001", NODE_ENV: "development" }), "http://localhost:3001");
});

test("origin resolver fails closed for an unconfigured production environment and untrusted URLs", () => {
  assert.throws(() => resolveTrustedClientAccessOrigin({ NODE_ENV: "production" }), ClientAccessLinkOriginError);
  for (const raw of [
    "http://consultoria.example",
    "https://consultoria.example@evil.example",
    "https://consultoria.example/path",
    "https://consultoria.example?token=abc",
    "https://consultoria.example#fragment",
    "javascript:alert(1)",
    "https://user:pass@consultoria.example",
    "//evil.example",
    "https://evil.example\\@consultoria.example",
    "https://",
  ]) {
    assert.throws(
      () => resolveTrustedClientAccessOrigin({ APP_PUBLIC_ORIGIN: raw, VERCEL_URL: "safe.vercel.app", NODE_ENV: "production" }),
      ClientAccessLinkOriginError,
      raw,
    );
  }
});

test("admin token-bearing URLs cannot use HTTP request-controlled Host headers", () => {
  const invite = read("app/admin/clientes/nova/actions.ts");
  const recovery = read("app/admin/clientes/[clienteId]/actions.ts");
  for (const action of [invite, recovery]) {
    assert.match(action, /resolveTrustedClientAccessOrigin\(\)/);
    assert.doesNotMatch(action, /x-forwarded-host|x-forwarded-proto|requestHeaders\.get\("host"\)/);
    assert.doesNotMatch(action, /import \{ headers \} from "next\/headers"/);
  }
  assert.ok(invite.indexOf("resolveTrustedClientAccessOrigin()") < invite.indexOf("generateManualInviteAndProvisionClient({"));
  assert.ok(recovery.indexOf("resolveTrustedClientAccessOrigin()") < recovery.indexOf("generateClientRecoveryToken({"));
  assert.match(invite, /new URL\("\/auth\/confirm", origin\)/);
  assert.match(recovery, /new URL\("\/auth\/recovery-token", origin\)/);
});
