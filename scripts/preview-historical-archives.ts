import { constants } from "node:fs";
import { lstat, open, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { previewHistoricalArchives } from "../lib/imports/historical-archive-preview.ts";

const MAX_ARCHIVES = 100;
const MAX_ARCHIVE_BYTES = 25 * 1024 * 1024;
const MAX_TOTAL_BYTES = 100 * 1024 * 1024;

export class HistoricalLocalPreviewError extends Error {
  constructor() {
    super("Triagem local recusada: verifique pasta, arquivos ZIP e limites. Nenhum arquivo foi importado.");
  }
}

/**
 * Offline and read-only. Never returns archive filenames, paths, cell values or
 * spreadsheet headers. Results are ordered by original archive SHA-256 so the
 * same ZIP set yields the same report regardless of directory enumeration.
 */
export async function previewHistoricalLocalDirectory(directory: string) {
  try {
    const root = resolve(directory);
    const rootStat = await lstat(root);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new HistoricalLocalPreviewError();
    const entries = await readdir(root, { withFileTypes: true });
    if (entries.length === 0 || entries.length > MAX_ARCHIVES) throw new HistoricalLocalPreviewError();
    if (entries.some((entry) => !entry.isFile() || !/\.zip$/i.test(entry.name))) throw new HistoricalLocalPreviewError();

    const sizes = await Promise.all(entries.map(async (entry) => {
      const stat = await lstat(join(root, entry.name));
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size <= 0 || stat.size > MAX_ARCHIVE_BYTES) {
        throw new HistoricalLocalPreviewError();
      }
      return stat.size;
    }));
    if (sizes.reduce((total, value) => total + value, 0) > MAX_TOTAL_BYTES) throw new HistoricalLocalPreviewError();

    const archives = [];
    for (const entry of entries) {
      // O_NOFOLLOW prevents the normal symlink-swap attack on platforms supporting it.
      const handle = await open(join(root, entry.name), constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
      try {
        const stat = await handle.stat();
        if (!stat.isFile() || stat.size <= 0 || stat.size > MAX_ARCHIVE_BYTES) throw new HistoricalLocalPreviewError();
        const bytes = await handle.readFile();
        if (bytes.byteLength !== stat.size) throw new HistoricalLocalPreviewError();
        archives.push({ bytes, hash: createHash("sha256").update(bytes).digest("hex") });
      } finally {
        await handle.close();
      }
    }
    if (archives.reduce((total, archive) => total + archive.bytes.length, 0) > MAX_TOTAL_BYTES) {
      throw new HistoricalLocalPreviewError();
    }
    archives.sort((a, b) => a.hash.localeCompare(b.hash));
    const preview = previewHistoricalArchives(archives.map((archive) => ({ bytes: archive.bytes })));
    const groups = new Map<string, string[]>();
    for (const archive of preview.archives) {
      for (const entry of archive.entries) {
        if (entry.status !== "recognized" || entry.kind !== "xlsx" || !entry.spreadsheet) continue;
        const key = entry.spreadsheet.column_signature_sha256;
        groups.set(key, [...(groups.get(key) ?? []), entry.entry_id]);
      }
    }
    return {
      ...preview,
      xlsx_layout_groups: [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([signature_sha256, entry_ids]) => ({
        signature_sha256,
        entry_ids: entry_ids.sort(),
        status: "human_mapping_required" as const,
      })),
    };
  } catch {
    // Do not pass through filesystem exception messages containing filenames or paths.
    throw new HistoricalLocalPreviewError();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length !== 3) {
    process.stderr.write("Uso: node --experimental-strip-types scripts/preview-historical-archives.ts <pasta-local-de-zips>\n");
    process.exitCode = 2;
  } else {
    previewHistoricalLocalDirectory(process.argv[2]!)
      .then((report) => process.stdout.write(JSON.stringify(report) + "\n"))
      .catch(() => {
        process.stderr.write("Triagem local recusada: verifique pasta, arquivos ZIP e limites. Nenhum arquivo foi importado.\n");
        process.exitCode = 1;
      });
  }
}
