import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const callbackPaths = ["app/auth/recovery/route.ts", "app/auth/recovery-token/route.ts"];

test("recovery callback returns session cookies and signed grants only after verified recovery evidence", () => {
  for (const path of callbackPaths) {
    const code = read(path);
    assert.match(code, /createServerClient<Database>/);
    assert.match(code, /request\.cookies\.getAll\(\)/);
    assert.match(code, /response\.cookies\.set\(name, value, options\)/);
    assert.match(code, /response\.headers\.set\(key, value\)/);
    assert.match(code, /supabase\.auth\.getClaims\(data\.session\.access_token\)/);
    assert.match(code, /if \(error \|\| claimsError/);
    assert.match(code, /issueRecoveryGrantCookie\(response, claimsData/);
    assert.match(code, /return response;/);
    assert.doesNotMatch(code, /NextResponse\.redirect\(/);
  }
  const pkce = read("app/auth/recovery/route.ts");
  const otp = read("app/auth/recovery-token/route.ts");
  assert.match(pkce, /hasVerifiedRecoverySession\(claimsData\?\.claims\)/);
  assert.match(pkce, /claimsData\?\.claims\?\.sub !== data\.session\.user\.id/);
  assert.match(otp, /verifyOtp\(/);
  assert.match(otp, /type: "recovery"/);
  assert.match(otp, /data\.user\.id !== identity\.sub/);
  assert.doesNotMatch(otp, /hasVerifiedRecoverySession/);
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

test("PKCE code exchange retains flow ID and rejects missing codes", () => {
  const code = read("app/auth/recovery/route.ts");
  assert.match(code, /if \(!code\) return uncachedRecoveryRedirect\(true\)/);
  assert.match(code, /supabase\.auth\.exchangeCodeForSession\(/);
  assert.match(code, /flowId \? \{ flowId \} : undefined/);
});

test("one-time recovery hash rejects wrong OTP types", () => {
  const code = read("app/auth/recovery-token/route.ts");
  assert.match(code, /if \(!tokenHash \|\| type !== "recovery"\)/);
  assert.match(code, /supabase\.auth\.verifyOtp\(/);
  assert.match(code, /type: "recovery"/);
});

test("reset page and action keep per-session safeguards", () => {
  const page = read("app/redefinir-senha/page.tsx");
  const action = read("app/redefinir-senha/actions.ts");
  const form = read("components/auth/PasswordRecoveryRequestForm.tsx");
  assert.match(page, /export const dynamic = "force-dynamic"/);
  assert.match(action, /supabase\.auth\.getClaims\(\)/);
  assert.match(action, /supabase\.auth\.updateUser\(\{ password \}\)/);
  assert.match(action, /signOut\(\{ scope: "local" \}\)/);
  assert.match(form, /mesmo navegador/);
  assert.match(form, /uso único/);
});
