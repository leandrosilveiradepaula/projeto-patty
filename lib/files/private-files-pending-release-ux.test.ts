import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  isPrivateFilePendingProfessionalRelease,
  isPrivateFileVisibleInHistory,
  privateFileOriginLabel,
} from "./private-file-history-view.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const page = fs.readFileSync(
  path.join(root, "app/admin/clientes/[clienteId]/arquivos/page.tsx"),
  "utf8",
);

test("admin private files separates release decisions from the filtered history", () => {
  assert.match(page, /pendingReleaseFiles = filteredFiles\.filter/);
  assert.match(page, /historyFiles = filteredFiles\.filter/);
  assert.match(page, /isPrivateFilePendingProfessionalRelease\(file, client\.profile_id\)/);
  assert.match(page, /title="Aguardando liberação"/);
  assert.match(page, /title="Histórico de arquivos"/);
  assert.match(page, /totalPending = counts\.pending/);
  assert.match(page, /privateFileHistoryCounts\(files, client\.profile_id\)/);
});

test("only hidden non-client uploads become professional release pendencies", () => {
  const clientProfileId = "client-profile";
  const sentByClient = {
    id: "own",
    file_kind: "photo",
    uploaded_by_profile_id: clientProfileId,
    client_visible_at: null,
  };
  const hiddenAdministrativeUpload = {
    id: "team",
    file_kind: "exam",
    uploaded_by_profile_id: "team-profile",
    client_visible_at: null,
  };
  const releasedAdministrativeUpload = {
    ...hiddenAdministrativeUpload,
    client_visible_at: "2026-10-11T12:00:00Z",
  };

  assert.equal(isPrivateFilePendingProfessionalRelease(sentByClient, clientProfileId), false);
  assert.equal(isPrivateFileVisibleInHistory(sentByClient, clientProfileId), true);
  assert.equal(isPrivateFilePendingProfessionalRelease(hiddenAdministrativeUpload, clientProfileId), true);
  assert.equal(isPrivateFileVisibleInHistory(hiddenAdministrativeUpload, clientProfileId), false);
  assert.equal(isPrivateFilePendingProfessionalRelease(releasedAdministrativeUpload, clientProfileId), false);
  assert.equal(isPrivateFileVisibleInHistory(releasedAdministrativeUpload, clientProfileId), true);
  assert.equal(privateFileOriginLabel(sentByClient, clientProfileId, "admin"), "Enviado pela cliente");
  assert.match(page, /AdminPrivateFileReleaseForm/);
  assert.match(page, /privateFileOriginLabel\(file, client\.profile_id, "admin"\)/);
});

test("pending private file section exposes a stable corrective deep link", () => {
  assert.match(page, /id="aguardando-liberacao"/);
});

test("mobile private-file release uses a dedicated, touchable confirmation row", () => {
  const layout = fs.readFileSync(
    path.join(root, "app/admin/clientes/[clienteId]/arquivos/page.module.css"), "utf8");
  const confirmation = fs.readFileSync(
    path.join(root, "components/admin/AdminPrivateFileReleaseForm.module.css"), "utf8");
  const browser = fs.readFileSync(
    path.join(root, "e2e/j1-local-onboarding.spec.mjs"), "utf8");
  assert.match(layout, /\.fileActions > form\s*\{[^}]*flex:\s*0 0 100%/);
  assert.match(layout, /\.fileActions > form\s*\{[^}]*z-index:\s*2/);
  assert.match(confirmation, /\.confirmation\s*\{[^}]*min-height:\s*44px/);
  assert.match(confirmation, /\.confirmation\s*\{[^}]*touch-action:\s*manipulation/);
  assert.ok(browser.includes("await releaseTouchTarget.tap({ timeout: 15000 })"));
  assert.ok(browser.includes("await expect(releaseCheckbox).toBeChecked()"));
});
