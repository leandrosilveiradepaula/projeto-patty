import assert from "node:assert/strict";
import test from "node:test";
import {
  formatPrivateFileRecordedAt, formatPrivateFileSize, isPrivateFilePendingProfessionalRelease,
  isPrivateFileVisibleInHistory, matchesPrivateFileFilters, privateFileOriginLabel,
  readPrivateFileKindFilter, readPrivateFileOriginFilter, readPrivateFileViewFilter,
} from "./private-file-history-view.ts";

const client = "client-profile";
const own = { id:"own", file_kind:"photo", uploaded_by_profile_id:client, client_visible_at:null };
const pending = { id:"pending", file_kind:"exam", uploaded_by_profile_id:"admin-profile", client_visible_at:null };
const released = { ...pending, id:"released", client_visible_at:"2026-10-11T12:00:00.000Z" };

test("only known URL enum filters are accepted, including repeated params", () => {
  assert.equal(readPrivateFileKindFilter("exam"), "exam");
  assert.equal(readPrivateFileKindFilter(["exam"]), "all");
  assert.equal(readPrivateFileKindFilter("__proto__"), "all");
  assert.equal(readPrivateFileOriginFilter("team"), "team");
  assert.equal(readPrivateFileOriginFilter(["client"]), "all");
  assert.equal(readPrivateFileViewFilter("pending"), "pending");
  assert.equal(readPrivateFileViewFilter(["pending"]), "all");
});

test("a client upload is not an administrative release pending even without timestamp", () => {
  assert.equal(isPrivateFilePendingProfessionalRelease(own, client), false);
  assert.equal(isPrivateFileVisibleInHistory(own, client), true);
  assert.equal(isPrivateFilePendingProfessionalRelease(pending, client), true);
  assert.equal(isPrivateFileVisibleInHistory(released, client), true);
  assert.equal(isPrivateFilePendingProfessionalRelease(own, null), true);
});

test("filters keep origin and kind independent and never change access scopes", () => {
  assert.equal(matchesPrivateFileFilters(own, client, "photo", "client"), true);
  assert.equal(matchesPrivateFileFilters(own, client, "exam", "client"), false);
  assert.equal(matchesPrivateFileFilters(pending, client, "exam", "team"), true);
  assert.equal(matchesPrivateFileFilters(released, client, "exam", "client"), false);
});

test("source labels distinguish user uploads without inferring unknown authorship", () => {
  assert.equal(privateFileOriginLabel(own, client, "client"), "Enviado por você");
  assert.equal(privateFileOriginLabel(own, client, "admin"), "Enviado pela cliente");
  assert.equal(privateFileOriginLabel(pending, client, "admin"), "Enviado pela equipe");
  assert.equal(privateFileOriginLabel({...pending,uploaded_by_profile_id:null}, client,"admin"), "Origem não identificada");
});

test("tiny files show bytes and timestamps are valid in São Paulo", () => {
  assert.equal(formatPrivateFileSize(20), "20 B");
  assert.equal(formatPrivateFileSize(0), "0 B");
  assert.equal(formatPrivateFileSize(-2), "Tamanho não informado");
  assert.equal(formatPrivateFileSize(Infinity), "Tamanho não informado");
  assert.equal(formatPrivateFileSize(null), "Tamanho não informado");
  assert.equal(formatPrivateFileSize(1024), "1 KB");
  assert.equal(formatPrivateFileRecordedAt("invalid"),"Data indisponível");
  assert.match(formatPrivateFileRecordedAt("2026-10-11T12:34:00.000Z"), /09:34/);
});
