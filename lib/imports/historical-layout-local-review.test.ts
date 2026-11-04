import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm, writeFile, symlink } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { previewHistoricalArchives } from "./historical-archive-preview.ts";
import { HISTORICAL_LAYOUT_PROPOSAL_VERSION } from "./historical-layout-mapping-review.ts";
import { reviewHistoricalMappingLocal } from "../../scripts/review-historical-layout.ts";
import { syntheticXlsx, syntheticZip } from "../../tests/fixtures/imports/synthetic-archives.ts";

test("local CLI reviews two synthetic manifests and never discloses private file names or target labels", async () => {
  const directory = await mkdtemp(join(tmpdir(), "historical-private-review-"));
  try {
    const preview = previewHistoricalArchives([{
      bytes: syntheticZip([{ name: "SEGREDO_ARQUIVO.xlsx", bytes: syntheticXlsx() }]),
    }]);
    const archive = preview.archives[0]!;
    const entry = archive.entries[0]!;
    const proposal = {
      version: HISTORICAL_LAYOUT_PROPOSAL_VERSION,
      source: {
        archive_sha256: archive.sha256,
        entry_id: entry.entry_id,
        entry_sha256: entry.sha256,
        column_signature_sha256: entry.spreadsheet!.column_signature_sha256,
      },
      revision: { number: 1, supersedes_sha256: null },
      columns: [{ sheet_index: 0, column_index: 1, destination_key: "secret_internal_measure", value_kind: "decimal", unit: "kg" }],
    };
    const a = join(directory, "SEGREDO_PREVIA.json");
    const b = join(directory, "SEGREDO_PROPOSTA.json");
    await writeFile(a, JSON.stringify(preview));
    await writeFile(b, JSON.stringify(proposal));
    const result = await reviewHistoricalMappingLocal(a, b);
    assert.equal(result.state, "pending_professional_review");
    assert.equal(result.persistence, "none");
    const cli = spawnSync(process.execPath, ["--experimental-strip-types", resolve("scripts/review-historical-layout.ts"), a, b], { encoding: "utf8" });
    assert.equal(cli.status, 0, cli.stderr);
    assert.deepEqual(JSON.parse(cli.stdout), result);
    assert.doesNotMatch(cli.stdout + cli.stderr, /SEGREDO|secret_internal_measure|historical-private-review/);
    await writeFile(b, JSON.stringify({ ...proposal, columns: [{ ...proposal.columns[0], unit: null }] }));
    const rejected = spawnSync(process.execPath, ["--experimental-strip-types", resolve("scripts/review-historical-layout.ts"), a, b], { encoding: "utf8" });
    assert.equal(rejected.status, 1);
    assert.equal(JSON.parse(rejected.stdout).state, "blocked");
    assert.doesNotMatch(rejected.stdout + rejected.stderr, /SEGREDO|secret_internal_measure|historical-private-review/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("CLI refuses malformed and symlinked manifests without printing paths, names or payloads", async () => {
  const directory = await mkdtemp(join(tmpdir(), "historical-private-review-"));
  try {
    const bad = join(directory, "NOME_CLIENTE_PRIVADO.json");
    const link = join(directory, "LINK_PRIVADO.json");
    await writeFile(bad, "CLIENTE_SENSIVEL_INVALIDO");
    await symlink(bad, link);
    await assert.rejects(() => reviewHistoricalMappingLocal(bad, bad), /Revisão local recusada/);
    await assert.rejects(() => reviewHistoricalMappingLocal(link, bad), /Revisão local recusada/);
    const cli = spawnSync(process.execPath, ["--experimental-strip-types", resolve("scripts/review-historical-layout.ts"), link, bad], { encoding: "utf8" });
    assert.equal(cli.status, 1);
    assert.equal(cli.stdout, "");
    assert.doesNotMatch(cli.stderr, /CLIENTE_SENSIVEL|NOME_CLIENTE|LINK_PRIVADO|historical-private-review/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
