import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../../app/admin/clientes/nova/actions.ts", import.meta.url), "utf8");

test("both client onboarding paths refresh admin client list and operational queues", () => {
  const automatic = source.slice(source.indexOf("export async function inviteClient"), source.indexOf("export type ManualInviteClientState"));
  const manual = source.slice(source.indexOf("export async function generateManualClientInvite"));
  for (const action of [automatic, manual]) {
    assert.match(action, /revalidatePath\("\/admin"\)/);
    assert.match(action, /revalidatePath\("\/admin\/pendencias"\)/);
    assert.match(action, /revalidatePath\("\/admin\/clientes"\)/);
  }
  assert.ok(automatic.indexOf('revalidatePath("/admin/clientes")') > automatic.indexOf("await inviteAndProvisionClient("));
  assert.ok(manual.indexOf('revalidatePath("/admin/clientes")') > manual.indexOf("await generateManualInviteAndProvisionClient("));
});
