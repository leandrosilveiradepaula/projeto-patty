import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { planHistoricalLocalInitialLoad } from "../../scripts/plan-historical-initial-load.ts";
import { syntheticXlsx, syntheticJpeg, syntheticPng } from "../../tests/fixtures/imports/synthetic-archives.ts";

async function withTree<T>(fn: (root: string) => Promise<T>) {
  const root = await mkdtemp(join(tmpdir(), "historic-initial-census-"));
  try {
    await mkdir(join(root, "excel"));
    await mkdir(join(root, "fotos"));
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("direct initial-load layout scans the entire two-folder census without filenames in report", async () => {
  await withTree(async (root) => {
    await writeFile(join(root, "excel", "CLIENT_NAME_001.xlsx"), syntheticXlsx());
    await writeFile(join(root, "fotos", "PRIVATE_PERSON_001.png"), syntheticPng);
    await writeFile(join(root, "fotos", "PRIVATE_PERSON_002.jpeg"), syntheticJpeg);
    const first = await planHistoricalLocalInitialLoad(root);
    assert.equal(first.totals.files, 3);
    assert.equal(first.totals.excels, 1);
    assert.equal(first.totals.photos, 2);
    assert.equal(first.totals.layouts, 1);
    assert.equal(first.import_allowed, false);
    assert.equal(first.persistence, "none");
    assert.doesNotMatch(JSON.stringify(first), /CLIENT_NAME|PRIVATE_PERSON|\.png|\.xlsx|\.jpeg/);
    const second = await planHistoricalLocalInitialLoad(root);
    assert.deepEqual(first, second);
  });
});

test("unrecognized files, nested folders and ZIP input fail closed without paths", async () => {
  await withTree(async (root) => {
    await writeFile(join(root, "excel", "INVALID_RECORD.zip"), syntheticXlsx());
    await assert.rejects(() => planHistoricalLocalInitialLoad(root), (error: unknown) =>
      error instanceof Error && !error.message.includes("INVALID_RECORD")
        && /Carga inicial bloqueada/.test(error.message));
  });
  await withTree(async (root) => {
    await mkdir(join(root, "fotos", "subfolder"));
    await assert.rejects(() => planHistoricalLocalInitialLoad(root), /Carga inicial bloqueada/);
  });
});

test("decisions JSON is metadata-only and never authorizes import", async () => {
  await withTree(async (root) => {
    await writeFile(join(root, "excel", "one.xlsx"), syntheticXlsx());
    const a = await planHistoricalLocalInitialLoad(root);
    const file = a.files[0]!;
    const decisions = join(tmpdir(), "synthetic-initial-decisions-" + process.pid + ".json");
    try {
      await writeFile(decisions, JSON.stringify([
        { sha256: file.sha256, client_id: "11111111-1111-4111-8111-111111111111" },
      ]));
      const b = await planHistoricalLocalInitialLoad(root, decisions);
      assert.equal(b.totals.pending_backend_identity_verification, 1);
      assert.equal(b.import_allowed, false);
      await writeFile(decisions, JSON.stringify([
        { sha256: file.sha256, client_id: "11111111-1111-4111-8111-111111111111", full_name: "SENSITIVE" },
      ]));
      await assert.rejects(() => planHistoricalLocalInitialLoad(root, decisions), (error: unknown) =>
        error instanceof Error && !error.message.includes("SENSITIVE"));
    } finally {
      await rm(decisions, { force: true });
    }
  });
});

test("directory symlink is rejected without following its destination", async () => {
  await withTree(async (root) => {
    await writeFile(join(root, "excel", "one.xlsx"), syntheticXlsx());
    try {
      await symlink(join(root, "excel", "one.xlsx"), join(root, "fotos", "person.png"));
      await assert.rejects(() => planHistoricalLocalInitialLoad(root), /Carga inicial bloqueada/);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EPERM") return;
      throw error;
    }
  });
});
