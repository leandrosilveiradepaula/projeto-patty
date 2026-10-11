import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (p: string) => readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const detail = read("app/admin/conteudos/[contentId]/page.tsx");
const releases = read("app/admin/clientes/[clienteId]/conteudos/page.tsx");
const actions = read("app/admin/conteudos/[contentId]/actions.ts");
const forms = read("components/admin/AdminEducationalContentVersionForms.tsx");

test("professional historical lookup selects the exact authorized version and its assets", () => {
  assert.match(detail, /searchParams: Promise<\{ versao\?: string;/);
  assert.match(detail, /readContentVersionFilter\(raw\)/);
  assert.match(detail, /versions\.find\(\(version\) => version\.id === versao\) \?\? current/);
  assert.match(detail, /listEducationalContentAssetsForCurrentAdmin\(inspected\.id\)/);
  assert.match(detail, /visibleAssets\.map\(\(asset\)/);
  assert.match(detail, /id="assets-do-conteudo"/);
  assert.match(detail, /href=\{\x60\?versao=\$\{version\.id\}#assets-do-conteudo\x60\}/);
});

test("a past individual release leads Patty to its historical version, not the current draft", () => {
  assert.match(releases, /parentContentIdByVersionId\.get\(contentVersion\.id\)/);
  assert.match(releases, /\?versao=\$\{contentVersion\.id\}#assets-do-conteudo/);
  assert.match(releases, /Conferir arquivos na biblioteca/);
  assert.match(releases, /Verificar arquivo desta versão/);
});

test("past-version inspection never changes publication target or grants client rights", () => {
  assert.match(detail, /hasAsset: currentAssets\.length > 0/);
  assert.match(detail, /publish.*Content/i);
  assert.match(detail, /current\.id/);
  assert.match(detail, /inspected\.id === current\?\.id/);
  assert.match(actions, /formData\.get\("confirmPublish"\) !== "yes"/);
  assert.match(actions, /requireRole\("admin"\)/);
  assert.doesNotMatch(detail, /createAccessibleClientContentRelease/);
  assert.doesNotMatch(detail, /createAdminClient/);
  assert.doesNotMatch(detail, /SUPABASE_SECRET_KEY/);
});

test("content changes require explicit professional actions, and client retries remain possible", () => {
  assert.match(forms, /if \(inFlightRef\.current \|\| locked \|\| disabled\) return/);
  assert.match(forms, /router\.refresh\(\)/);
  assert.match(forms, /catch \{/);
  assert.match(forms, /finally \{/);
  assert.match(forms, /lockAfterSuccess/);
  assert.match(forms, /confirmPublish/);
  assert.match(forms, /disabled=\{!canPublish\}/);
});

test("legacy malformed dates have neutral presentation", () => {
  assert.match(detail, /Number\.isFinite\(Date\.parse\(value\)\)/);
  assert.match(detail, /Data indisponível/);
});
