import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("activation checks implicit invite fragments before presenting the account form", () => {
  const page = read("app/ativar-conta/page.tsx");
  const gate = read("components/auth/ActivationSessionGate.tsx");
  assert.match(page, /<ActivationSessionGate invalid=/);
  assert.doesNotMatch(page, /canActivate \?/);
  assert.match(gate, /parseImplicitInviteFragment\(window\.location\.hash\)/);
  assert.match(gate, /window\.history\.replaceState\(/);
  assert.match(gate, /supabase\.auth\.setSession\(/);
  assert.match(gate, /window\.location\.replace\("\/ativar-conta"\)/);
  assert.match(gate, /phase === "ready" && role && !invalid/);
  assert.match(gate, /phase === "invalid"/);
  assert.match(gate, /phase === "failed"/);
  assert.doesNotMatch(gate, /localStorage|sessionStorage|console\./);
});

test("both invite and recovery fragments handle rejected session promises", () => {
  for (const path of [
    "components/auth/ImplicitInviteSessionBridge.tsx",
    "components/auth/ImplicitRecoverySessionBridge.tsx",
    "components/auth/PasswordResetSessionGate.tsx",
    "components/auth/ActivationSessionGate.tsx",
  ]) {
    const source = read(path);
    assert.match(source, /try \{/);
    assert.match(source, /catch \{/);
    assert.match(source, /window\.history\.replaceState\(/);
  }
});

test("access forms have native field validation and block inputs while saving", () => {
  for (const path of [
    "components/auth/LoginForm.tsx",
    "components/auth/PasswordRecoveryRequestForm.tsx",
  ]) {
    const source = read(path);
    assert.doesNotMatch(source, /noValidate/);
    assert.match(source, /aria-busy=\{isPending\}/);
    assert.match(source, /disabled=\{isPending\}/);
    assert.match(source, /<Button disabled=\\{isPending\\} loading=\\{isPending\\} type="submit">/);
    assert.match(source, /validateInvitationEmail\\(email\\)\\.ok/);
    assert.match(source, /inFlightRef\\.current/);
    assert.match(source, /onSubmit=\\{\\(event\\)/);
    assert.match(source, /<p role="status">/);
  }
});

test("input lengths match server validation and recovery never promises delivery", () => {
  const login = read("components/auth/LoginForm.tsx");
  const activation = read("components/auth/ClientActivationPasswordForm.tsx");
  const reset = read("components/auth/PasswordResetForm.tsx");
  const recovery = read("components/auth/PasswordRecoveryRequestForm.tsx");
  assert.match(login, /maxLength=\{254\}/);
  assert.match(login, /maxLength=\{128\}/);
  const shared = read("components/auth/AccessPasswordForm.tsx");
  assert.match(activation, /<AccessPasswordForm/);
  assert.match(reset, /<AccessPasswordForm/);
  assert.equal(shared.match(/maxLength=\{128\}/g)?.length, 2);
  assert.equal(shared.match(/minLength=\{8\}/g)?.length, 2);
  assert.match(shared, /aria-busy=\{pending\}/);
  assert.match(shared, /disabled=\{pending\}/);
  assert.match(shared, /<Button type="submit" loading=\{pending\}/);
  assert.doesNotMatch(shared, /noValidate/);
  assert.match(recovery, /maxLength=\{254\}/);
  assert.match(recovery, /title="Solicitação recebida"/);
  assert.match(recovery, /<a className=\{styles.retryLink\} href="\/recuperar-senha">/);
  assert.doesNotMatch(recovery, /<Link className=\{styles.retryLink\}/);
});
