import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
test("recovery link supports copy with a manual fallback", () => {
 const form=read("components/admin/AdminClientRecoveryLinkForm.tsx");
 assert.match(form, /navigator\.clipboard\.writeText/);
 assert.match(form, /Selecione o link acima e copie manualmente/);
 assert.match(form, /Copiar link/);
 assert.match(form, /setCopyStatus\(null\)/);
});
test("recovery link warns about sensitivity and one-client delivery", () => {
 const form=read("components/admin/AdminClientRecoveryLinkForm.tsx");
 assert.match(form, /acesso sensível/);
 assert.match(form, /não salve o link em locais públicos/);
 assert.match(form, /somente para esta cliente/);
});
