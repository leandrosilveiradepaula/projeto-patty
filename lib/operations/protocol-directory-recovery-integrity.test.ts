import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (p: string) => readFileSync(new URL("../../" + p, import.meta.url), "utf8");
test("directory filters and recovery target", () => {
 const src = read("app/admin/protocolos/page.tsx");
 for (const term of ["listAccessibleProtocols()", "listAccessibleProtocolVersionsForProtocols", "readProtocolCatalogStatus(status)", "selectProtocolCatalog(", "needs-recovery", "Retomar versão inicial", "Limpar filtros", "maxLength={120}"]) assert.ok(src.includes(term), term);
 assert.ok(!src.includes("publishProtocolVersion"));
});
test("workspace validates client scope and retains exact recovery form", () => {
 const src = read("app/admin/clientes/[clienteId]/protocolos/page.tsx");
 for (const term of ["if (!isUuid(clienteId)) notFound()", "existingProtocolNavigation(existing, versionedIds)", "AdminProtocolInitialVersionForm", "versionedIds.has(protocol.id)", "requireRole(\"admin\")", "getAccessibleClient(clientId)", "afterConflict.length === 0"]) assert.ok(src.includes(term), term);
});
test("form prevents rapid duplicate submits and distinguishes recovery", () => {
 const src = read("components/admin/AdminProtocolInitialVersionForm.tsx");
 for (const term of ["useFormStatus()", "inFlight.current", "event.preventDefault()", "disabled={pending}", "role=\"status\"", "name=\"clientId\"", "name=\"protocolId\""]) assert.ok(src.includes(term), term);
 assert.ok(!src.includes("publishProtocolVersion"));
});
