import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readdir, rm, symlink, writeFile, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { previewHistoricalLocalDirectory } from "../../scripts/preview-historical-archives.ts";
import { syntheticZip, syntheticPng, text } from "../../tests/fixtures/imports/synthetic-archives.ts";

function xlsx(personalValue: string, extraCell = "") {
  return syntheticZip([
    { name: "[Content_Types].xml", bytes: text("<Types/>") },
    { name: "xl/workbook.xml", bytes: text('<workbook><sheets><sheet name="Test" sheetId="1"/></sheets></workbook>') },
    { name: "xl/sharedStrings.xml", bytes: text(`<sst><si><t>${personalValue}</t></si></sst>`) },
    { name: "xl/worksheets/sheet1.xml", bytes: text(`<worksheet><sheetData><row><c r="A1" t="s"><v>0</v></c>${extraCell}</row></sheetData></worksheet>`) },
  ]);
}

test("read-only local preview groups same XLSX layout without names, paths or cell contents", async () => {
  const dir = await mkdtemp(join(tmpdir(), "patty-local-preview-"));
  try {
    await writeFile(join(dir, "SEGREDO_ALFA.zip"), syntheticZip([{ name: "PESSOA_ALFA.xlsx", bytes: xlsx("CLIENTE_ALFA") }]));
    await writeFile(join(dir, "SEGREDO_BETA.zip"), syntheticZip([{ name: "PESSOA_BETA.xlsx", bytes: xlsx("CLIENTE_BETA") }]));
    const first = await previewHistoricalLocalDirectory(dir);
    const second = await previewHistoricalLocalDirectory(dir);
    assert.deepEqual(first, second);
    assert.equal(first.mode, "dry_run");
    assert.equal(first.persistence, "none");
    assert.equal(first.xlsx_layout_groups.length, 1);
    assert.equal(first.xlsx_layout_groups[0]!.entry_ids.length, 2);
    assert.equal(first.xlsx_layout_groups[0]!.status, "human_mapping_required");
    assert.deepEqual((await readdir(dir)).sort(), ["SEGREDO_ALFA.zip", "SEGREDO_BETA.zip"]);
    assert.doesNotMatch(JSON.stringify(first), /SEGREDO|PESSOA|CLIENTE|patty-local-preview/);
    const child = spawnSync(process.execPath, ["--experimental-strip-types", resolve("scripts/preview-historical-archives.ts"), dir], { encoding: "utf8" });
    assert.equal(child.status, 0, child.stderr);
    assert.deepEqual(JSON.parse(child.stdout), first);
    assert.doesNotMatch(child.stdout, /SEGREDO|PESSOA|CLIENTE|patty-local-preview/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("structurally different spreadsheets do not share candidate layout group", async () => {
  const dir = await mkdtemp(join(tmpdir(), "patty-local-preview-"));
  try {
    await writeFile(join(dir, "a.zip"), syntheticZip([{ name: "a.xlsx", bytes: xlsx("A") }]));
    await writeFile(join(dir, "b.zip"), syntheticZip([{ name: "b.xlsx", bytes: xlsx("B", '<c r="B1" t="n"><v>22</v></c>') }]));
    const report = await previewHistoricalLocalDirectory(dir);
    assert.equal(report.xlsx_layout_groups.length, 2);
    assert.ok(report.xlsx_layout_groups.every((group) => group.entry_ids.length === 1));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("CLI refuses non-ZIP entries, subdirectories, links and empty directories without disclosing paths", async () => {
  const root = await mkdtemp(join(tmpdir(), "patty-local-preview-"));
  try {
    const dir = join(root, "SEGREDO_PASTA");
    await mkdir(dir);
    await assert.rejects(() => previewHistoricalLocalDirectory(dir), /Triagem local recusada/);
    await writeFile(join(dir, "NOME_PRIVADO.xlsx"), text("secret"));
    await assert.rejects(() => previewHistoricalLocalDirectory(dir), /Triagem local recusada/);
    await rm(join(dir, "NOME_PRIVADO.xlsx"));
    await writeFile(join(dir, "normal.zip"), syntheticZip([{ name: "a.png", bytes: syntheticPng }]));
    await mkdir(join(dir, "SEGREDO_SUBPASTA"));
    await assert.rejects(() => previewHistoricalLocalDirectory(dir), /Triagem local recusada/);
    await rm(join(dir, "SEGREDO_SUBPASTA"), { recursive: true });
    await symlink(join(dir, "normal.zip"), join(dir, "SEGREDO_LINK.zip"));
    const child = spawnSync(process.execPath, ["--experimental-strip-types", resolve("scripts/preview-historical-archives.ts"), dir], { encoding: "utf8" });
    assert.equal(child.status, 1);
    assert.equal(child.stdout, "");
    assert.doesNotMatch(child.stderr, /SEGREDO|NOME_PRIVADO|patty-local-preview/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("CLI respects total and per-file archive limits without parsing large material", async () => {
  const root = await mkdtemp(join(tmpdir(), "patty-local-preview-"));
  try {
    const file = join(root, "SEGREDO_GRANDE.zip");
    await writeFile(file, new Uint8Array(25 * 1024 * 1024 + 1));
    await assert.rejects(() => previewHistoricalLocalDirectory(root), /Triagem local recusada/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
