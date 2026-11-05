import { constants } from "node:fs";
import { lstat, open, readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  planHistoricalInitialLoad,
  type InitialLoadAsset,
  type InitialLoadHumanAssociation,
} from "../lib/imports/historical-initial-load.ts";

const MAX_FILES = 1200;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_BYTES = 300 * 1024 * 1024;
const MAX_DECISION_BYTES = 256 * 1024;

export class InitialLoadLocalError extends Error {
  constructor() {
    super("Carga inicial bloqueada: revise a estrutura de pastas, os arquivos e os limites. Nenhum dado foi importado.");
  }
}

async function safeReadFile(file: string, maxBytes: number) {
  const before = await lstat(file);
  if (!before.isFile() || before.isSymbolicLink() || before.size < 1 || before.size > maxBytes)
    throw new InitialLoadLocalError();
  const handle = await open(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size !== before.size || stat.size > maxBytes)
      throw new InitialLoadLocalError();
    const bytes = await handle.readFile();
    if (bytes.length !== stat.size) throw new InitialLoadLocalError();
    return bytes;
  } finally {
    await handle.close();
  }
}

/**
 * Local offline census of an entire source archive.
 * Input structure:
 *   root/excel/*.xlsx
 *   root/fotos/*.{jpg,jpeg,png}
 * Optional decisions JSON contains only {sha256,client_id}, NEVER names/emails.
 * No ZIP input, recursive traversal, network, database or writes.
 */
export async function planHistoricalLocalInitialLoad(rootDirectory: string, decisionsPath?: string) {
  try {
    const root = resolve(rootDirectory);
    const rootStat = await lstat(root);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new InitialLoadLocalError();
    const rootEntries = await readdir(root, { withFileTypes: true });
    if (rootEntries.length !== 2 || rootEntries.some((item) =>
      !item.isDirectory() || item.isSymbolicLink()
      || !["excel", "fotos"].includes(item.name))) throw new InitialLoadLocalError();

    const assets: InitialLoadAsset[] = [];
    let total = 0;
    for (const [directory, kind, extension] of [
      ["excel", "xlsx", /\.xlsx$/i],
      ["fotos", "photo", /\.(jpg|jpeg|png)$/i],
    ] as const) {
      const folder = join(root, directory);
      const folderStat = await lstat(folder);
      if (!folderStat.isDirectory() || folderStat.isSymbolicLink()) throw new InitialLoadLocalError();
      const entries = await readdir(folder, { withFileTypes: true });
      if (assets.length + entries.length > MAX_FILES) throw new InitialLoadLocalError();
      if (entries.some((entry) => !entry.isFile() || entry.isSymbolicLink()
        || !extension.test(entry.name))) throw new InitialLoadLocalError();
      for (const entry of entries) {
        const bytes = await safeReadFile(join(folder, entry.name), MAX_FILE_BYTES);
        total += bytes.length;
        if (total > MAX_TOTAL_BYTES) throw new InitialLoadLocalError();
        assets.push({ kind: kind === "xlsx" ? "xlsx" : "photo", bytes });
      }
    }
    if (!assets.length) throw new InitialLoadLocalError();

    let associations: InitialLoadHumanAssociation[] = [];
    if (decisionsPath) {
      // This optional local input is NOT permission to import: it merely
      // records a human proposal pending authorized backend identity checks.
      const bytes = await safeReadFile(resolve(decisionsPath), MAX_DECISION_BYTES);
      const parsed: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
      if (!Array.isArray(parsed) || !parsed.every((row: unknown) =>
        row !== null && typeof row === "object" && !Array.isArray(row)
        && Object.keys(row).length === 2
        && Object.hasOwn(row, "sha256") && Object.hasOwn(row, "client_id"))) {
        throw new InitialLoadLocalError();
      }
      associations = parsed as InitialLoadHumanAssociation[];
    }
    return planHistoricalInitialLoad(assets, associations);
  } catch {
    // Never leak paths, filenames or text from an original health record.
    throw new InitialLoadLocalError();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length < 3 || process.argv.length > 4) {
    process.stderr.write("Uso: node --experimental-strip-types scripts/plan-historical-initial-load.ts <pasta-com-excel-e-fotos> [decisoes.json]\n");
    process.exitCode = 2;
  } else {
    planHistoricalLocalInitialLoad(process.argv[2]!, process.argv[3])
      .then((result) => process.stdout.write(JSON.stringify(result) + "\n"))
      .catch(() => {
        process.stderr.write("Carga inicial bloqueada: revise a estrutura de pastas, os arquivos e os limites. Nenhum dado foi importado.\n");
        process.exitCode = 1;
      });
  }
}
