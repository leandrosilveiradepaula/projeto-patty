import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("accepted client file refreshes Patty's file queue and client summary", () => {
  const source = readFileSync(new URL("../../app/cliente/arquivos/actions.ts", import.meta.url), "utf8");
  const accepted = source.slice(source.indexOf('if (result.status === "accepted")'));
  assert.match(accepted, /revalidatePath\("\/admin"\)/);
  assert.match(accepted, /revalidatePath\("\/admin\/pendencias"\)/);
  assert.match(accepted, /revalidatePath\("\/admin\/arquivos"\)/);
  assert.match(accepted, /revalidatePath\(`\/admin\/clientes\/\$\{client\.id\}`\)/);
  assert.match(accepted, /revalidatePath\("\/cliente\/arquivos"\)/);
  assert.ok(source.indexOf('revalidatePath("/admin/pendencias")') > source.indexOf('if (result.status === "accepted")'));
});
