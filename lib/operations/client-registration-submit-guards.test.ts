import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

for (const [scope, path] of [
  ["Patty name", "components/admin/AdminClientNameEditForm.tsx"],
  ["Patty current registration", "components/admin/AdminClientRegistrationEditForm.tsx"],
  ["client current registration", "components/client/ClientRegistrationEditForm.tsx"],
] as const) {
  test(scope + " blocks same-tick double submissions and editing while saving", () => {
    const form = read(path);
    assert.ok(form.includes("inFlightRef.current || isPending"), path);
    assert.ok(form.includes("event.preventDefault()"), path);
    assert.ok(form.includes("inFlightRef.current = true"), path);
    assert.ok(form.includes("inFlightRef.current = false"), path);
    assert.ok(form.includes("aria-busy={isPending}"), path);
    assert.ok(form.includes("disabled={isPending}"), path);
  });
  test(scope + " distinguishes changed fields from confirmed values", () => {
    const form = read(path);
    assert.ok(form.includes("setEditedSinceResult(true)"), path);
    assert.ok(form.includes("state.message && !editedSinceResult"), path);
    assert.ok(form.includes("setEditedSinceResult(false)"), path);
    assert.ok(form.includes("router.refresh()"), path);
  });
}

test("persisted registration versions remount contact editors without conflating canonical identity", () => {
  const admin = read("app/admin/clientes/[clienteId]/page.tsx");
  const client = read("app/cliente/perfil/page.tsx");
  assert.ok(admin.includes('key={registration?.updated_at ?? "new"}'));
  assert.ok(client.includes('key={registration?.updated_at ?? "new"}'));
  assert.ok(admin.includes('key={displayName ?? "unnamed"}'));
  assert.ok(admin.includes("client.full_name?.trim()"));
});

for (const [label, path] of [
  ["professional", "components/admin/AdminTrainingRequestForm.tsx"],
  ["client", "components/client/ClientTrainingRequestForm.tsx"],
] as const) {
  test(label + " training request requires a deliberate second request", () => {
    const form = read(path);
    assert.ok(form.includes("inFlightRef.current || isPending || (state.success && !allowNext)"), path);
    assert.ok(form.includes("disabled={isPending || (state.success && !allowNext)}"), path);
    assert.ok(form.includes("setAllowNext(false)"), path);
    assert.ok(form.includes("setAllowNext(true)"), path);
    assert.ok(form.includes("Registrar outra solicitação"), path);
    assert.ok(form.includes("router.refresh()"), path);
    assert.ok(form.includes("aria-busy={isPending}"), path);
  });
}

for (const [label, path] of [
  ["automatic invite", "components/admin/ClientInviteForm.tsx"],
  ["manual invite", "components/admin/ManualClientInviteForm.tsx"],
  ["recovery link", "components/admin/AdminClientRecoveryLinkForm.tsx"],
] as const) {
  test(label + " cannot trigger a second in-flight identity action", () => {
    const form = read(path);
    assert.ok(form.includes("const inFlightRef = useRef(false)"), path);
    assert.ok(form.includes("event.preventDefault()"), path);
    assert.ok(form.includes("inFlightRef.current = true"), path);
    assert.ok(form.includes("inFlightRef.current = false"), path);
    assert.ok(form.includes("aria-busy={isPending}"), path);
  });
}

test("admin and client identities and actions still verify authorization server-side", () => {
  const admin = read("app/admin/clientes/[clienteId]/actions.ts");
  const profile = read("app/cliente/perfil/actions.ts");
  const training = read("app/cliente/treino/actions.ts");
  const invite = read("app/admin/clientes/nova/actions.ts");
  assert.ok(admin.includes('requireRole("admin")'));
  assert.ok(admin.includes("getAccessibleClient(clientId)"));
  assert.ok(admin.includes("parseClientRegistrationForm(formData)"));
  assert.ok(profile.includes('requireRole("client")'));
  assert.ok(profile.includes("getCurrentClient()"));
  assert.ok(training.includes('requireRole("client")'));
  assert.ok(invite.includes('requireRole("admin")'));
  assert.ok(admin.includes("resolveTrustedClientAccessOrigin()"));
});
