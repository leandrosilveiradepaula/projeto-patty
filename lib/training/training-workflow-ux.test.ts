import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("admin training workspace prioritizes prescription and exposes lifecycle state", () => {
  const page = read("app/admin/clientes/[clienteId]/treino/page.tsx");

  assert.match(page, /Pronto para publicar/);
  assert.match(page, /Rascunho em edição/);
  assert.match(page, /Treino publicado/);
  assert.match(page, /AdminTrainingPlanLifecycleAction/);

  const prescription = page.indexOf('title="Prescrição de treino"');
  const request = page.indexOf('title="Solicitação do serviço"');

  assert.ok(prescription > -1);
  assert.ok(request > -1);
  assert.ok(
    prescription < request,
    "Prescrição deve aparecer antes do histórico/registro de solicitação no fluxo diário da Patty.",
  );
});

test("training lifecycle actions provide feedback and destructive confirmation", () => {
  const component = read("components/admin/AdminTrainingPlanLifecycleAction.tsx");
  const actions = read("app/admin/clientes/[clienteId]/treino/actions.ts");

  assert.match(component, /useActionState/);
  assert.match(component, /Confirmar remoção/);
  assert.match(component, /Cancelar/);
  assert.match(component, /loading={isPending}/);
  assert.match(actions, /Exercício removido do rascunho/);
  assert.match(actions, /Treino revisado/);
  assert.match(actions, /Treino publicado para a cliente/);
});

test("client training page foregrounds published prescription and avoids repeated load disclaimer", () => {
  const page = read("app/cliente/treino/page.tsx");
  const form = read("components/client/ClientTrainingRequestForm.tsx");

  assert.match(page, /Consulte seu treino individual publicado pela Patty/);
  assert.match(page, /Sobre carga e peso/);
  assert.doesNotMatch(page, /capacityNote/);
  assert.match(form, /useActionState/);
  assert.match(form, /loading={isPending}/);
  assert.match(form, /Solicitação enviada/);
});


test("training workspace exposes stable anchors for request and prescription work", () => {
  const page = read("app/admin/clientes/[clienteId]/treino/page.tsx");

  assert.match(page, /id="prescricao-treino"/);
  assert.match(page, /id="solicitacao-treino"/);
});

// Last publication is a chronological event, not necessarily the highest version.
test("admin training screens use the same latest publication selector as the client", () => {
  const admin = read("app/admin/clientes/[clienteId]/treino/page.tsx");
  const overview = read("app/admin/clientes/[clienteId]/page.tsx");
  const client = read("app/cliente/treino/page.tsx");
  const home = read("app/cliente/page.tsx");
  assert.match(admin, /publishedTrainingVersions\\(versions\\)/);
  assert.ok(admin.includes("const latestPublished = publishedVersions[0] ?? null"));
  assert.match(overview, /latestPublishedTrainingVersion\(trainingVersions\)/);
  assert.match(home, /latestPublishedTrainingVersion\(trainingVersions\)/);
  assert.match(client, /publishedTrainingVersions\(trainingVersions\)/);
});

// New training requests must remain visible even when an older prescription is published.
test("new request after published training remains visible in admin queue, overview and workspace", () => {
  const facts = read("lib/operations/pending-data.ts");
  const pending = read("lib/operations/pending.ts");
  const overview = read("app/admin/clientes/[clienteId]/page.tsx");
  const workspace = read("app/admin/clientes/[clienteId]/treino/page.tsx");
  const lifecycle = read("lib/operations/pending-training-lifecycle.ts");
  assert.match(facts, /derivePendingTrainingLifecycle\(/);
  assert.match(lifecycle, /isTrainingRequestAfterPublication\(request\.requested_at, published\.published_at\)/);
  assert.match(lifecycle, /state: "requested_after_publication"/);
  assert.match(pending, /training_request_after_publication/);
  assert.match(overview, /trainingWorkspaceState\.kind === "new_request"/);
  assert.match(workspace, /newRequestAfterPublication/);
  assert.match(workspace, /Ver solicitação/);
  assert.doesNotMatch(workspace, /newRequestAfterPublication\s*\?\s*createAccessibleClientTrainingPlanDraft/);
});

test("client training reports new request after the last publication without changing its release", () => {
  const page = read("app/cliente/treino/page.tsx");
  const actions = read("app/cliente/treino/actions.ts");
  const source = read("lib/supabase/data-access.ts");
  assert.match(page, /newestTrainingRequests\(requests\)/);
  assert.match(page, /isTrainingRequestAfterPublication\(orderedRequests\[0\]\.requested_at, latestPublished\.published_at\)/);
  assert.match(page, /Nova solicitação registrada/);
  assert.match(page, /id="suas-solicitacoes"/);
  assert.match(page, /publicado continua disponível/);
  assert.match(page, /listAccessibleClientTrainingPlanItemsForVersions\(/);
  assert.doesNotMatch(page, /Promise\.all\(\s*publishedVersions\.map\(/);
  assert.match(source, /collectTrainingHistoryRows\(versionIds/);
  assert.match(source, /\.in\("training_plan_version_id", ids\)/);
  assert.match(actions, /revalidatePath\("\/admin\/pendencias"\)/);
  assert.match(actions, /revalidatePath\(`\/admin\/clientes\/\$\{client\.id\}\/treino`\)/);
});
