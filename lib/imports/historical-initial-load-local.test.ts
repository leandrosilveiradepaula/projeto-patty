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


async function withClientArchive<T>(fn: (root: string) => Promise<T>) {
  const root = await mkdtemp(join(tmpdir(), "historic-clients-hierarchy-"));
  try { return await fn(root); }
  finally { await rm(root, {recursive:true,force:true}); }
}

test("real client/date hierarchy is inventoried without leaking names or date-folder labels",async()=>{
  await withClientArchive(async root=>{
    const client1=join(root,"PRIVATE_CLIENT_A");
    const client2=join(root,"PRIVATE_CLIENT_B");
    const dated=join(client1,"2023-08-15");
    const deeper=join(client1,"2024","09");
    await mkdir(dated,{recursive:true});
    await mkdir(deeper,{recursive:true});
    await mkdir(client2);
    await writeFile(join(client1,"PRIVATE_A.xlsx"),syntheticXlsx());
    await writeFile(join(client1,"PRIVATE_A.png"),syntheticPng);
    await writeFile(join(dated,"PRIVATE_A_BEFORE.jpeg"),syntheticJpeg);
    await writeFile(join(deeper,"PRIVATE_A_AFTER.png"),syntheticPng);
    await writeFile(join(client2,"PRIVATE_B.xlsx"),syntheticXlsx());
    await writeFile(join(client2,"PRIVATE_B.jpeg"),syntheticJpeg);
    const first=await planHistoricalLocalInitialLoad(root);
    assert.equal(first.totals.files,6);
    assert.equal(first.totals.excels,2);
    assert.equal(first.totals.photos,4);
    assert.equal(first.totals.duplicate_binary,6);
    assert.equal(first.import_allowed,false);
    assert.equal(first.persistence,"none");
    assert.equal(first.identity_verification,"authorized_backend_required");
    assert.doesNotMatch(JSON.stringify(first),/PRIVATE_|2023-08-15|2024|client_folder|source_path|photo_date/);
    assert.deepEqual(first,await planHistoricalLocalInitialLoad(root));
  });
});

test("one-client photo chronology remains metadata-only and not claimed as a clinical assessment date",async()=>{
  await withClientArchive(async root=>{
    const client=join(root,"SENSITIVE_CLIENT");
    await mkdir(join(client,"15.08.2023"),{recursive:true});
    await writeFile(join(client,"history.xlsx"),syntheticXlsx());
    await writeFile(join(client,"15.08.2023","evolution.jpg"),syntheticJpeg);
    const result=await planHistoricalLocalInitialLoad(root);
    assert.equal(result.totals.files,2);
    assert.equal(result.totals.pending_human_association,2);
    assert.doesNotMatch(JSON.stringify(result),/SENSITIVE_CLIENT|15.08.2023|evolution/);
  });
});

test("hierarchy rejects mixed extra Excel, unknown files, nested spreadsheets and empty dated directories",async()=>{
  await withClientArchive(async root=>{
    const client=join(root,"PRIVATE_1");await mkdir(client);
    await writeFile(join(client,"a.xlsx"),syntheticXlsx());
    await writeFile(join(client,"b.xlsx"),syntheticXlsx());
    await assert.rejects(()=>planHistoricalLocalInitialLoad(root),/Carga inicial bloqueada/);
    await rm(join(client,"b.xlsx"));
    await writeFile(join(client,"unexpected.pdf"),new Uint8Array([1,2,3]));
    await assert.rejects(()=>planHistoricalLocalInitialLoad(root),/Carga inicial bloqueada/);
    await rm(join(client,"unexpected.pdf"));
    await mkdir(join(client,"2021"));
    await assert.rejects(()=>planHistoricalLocalInitialLoad(root),/Carga inicial bloqueada/);
    await writeFile(join(client,"2021","bad.xlsx"),syntheticXlsx());
    await assert.rejects(()=>planHistoricalLocalInitialLoad(root),/Carga inicial bloqueada/);
  });
});

test("hierarchical symlinks are blocked without following photo destinations",async()=>{
  await withClientArchive(async root=>{
    const client=join(root,"private-client");await mkdir(client);
    await writeFile(join(client,"record.xlsx"),syntheticXlsx());
    try{
      await symlink(join(client,"record.xlsx"),join(client,"2020.jpg"));
      await assert.rejects(()=>planHistoricalLocalInitialLoad(root),/Carga inicial bloqueada/);
    }catch(error){
      if((error as NodeJS.ErrnoException).code!=="EPERM")throw error;
    }
  });
});

test("hierarchy does not silently discard unexpected top-level files",async()=>{
  await withClientArchive(async root=>{
    const client=join(root,"CLIENT");
    await mkdir(client);
    await writeFile(join(client,"source.xlsx"),syntheticXlsx());
    await writeFile(join(root,"NOTES_PRIVATE.txt"),"private");
    await assert.rejects(()=>planHistoricalLocalInitialLoad(root),error=>
      error instanceof Error && /Carga inicial bloqueada/.test(error.message)
       && !error.message.includes("NOTES_PRIVATE"));
  });
});
