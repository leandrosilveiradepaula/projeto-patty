import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const page = readFileSync(path.join(root, "app/admin/importacao-inicial/page.tsx"), "utf8");
const list = readFileSync(path.join(root, "components/admin/HistoricalInitialLoadLedgerList.tsx"), "utf8");

test("review UI reads only authenticated scoped metadata, never originals or privileged client", () => {
  assert.match(page, /await requireRole\("admin"\)/);
  assert.match(page, /isUuid\(query\.batch\)/);
  assert.match(list, /await requireRole\("admin"\)/);
  assert.match(list, /await createClient\(\)/);
  assert.doesNotMatch(list, /createAdminClient|service_role|\.rpc\(|\.insert\(|\.update\(|\.delete\(|\.storage\./);
  assert.match(list, /"historical_initial_load_batches"/);
  assert.match(list, /"historical_initial_load_sources"/);
  assert.match(list, /\.eq\("batch_id", batch\.id\)/);
  assert.match(list, /const PAGE_SIZE = 100/);
  assert.match(list, /\.range\(start, start \+ PAGE_SIZE - 1\)/);
  assert.match(list, /\.limit\(25\)/);
});

test("all pending states shown, no automatic verification or source content", () => {
  for (const state of [
    "blocked", "duplicate_binary", "pending_human_association",
    "pending_backend_identity_verification",
  ]) assert.match(list, new RegExp(state));
  assert.match(list, /Vínculos propostos não são identidade confirmada/);
  assert.match(list, /guarda privada de Anamnese/);
  assert.match(list, /Registros de guarda privada no lote/);
  assert.match(list, /A conferência dos registros de Anamnese guardados está indisponível/);
  assert.match(list, /reconcileHistoricalLedgerPage/);
  assert.match(list, /\.eq\("batch_id", batch\.id\)/);
  assert.match(list, /\.in\("source_id",/);
  assert.match(list, /historical_anamnesis_imports/);
  assert.match(list, /Guardada — consultar/);
  assert.doesNotMatch(list, /import.*approved|activate_client|publish_|raw_value|full_name|contact_email/);
});
