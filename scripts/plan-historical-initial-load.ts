import { constants } from "node:fs";
import { lstat, open, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  planHistoricalInitialLoad,
  type InitialLoadAsset,
  type InitialLoadHumanAssociation,
} from "../lib/imports/historical-initial-load.ts";

const MAX_FILES = 1200;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 300 * 1024 * 1024;
const MAX_DECISION_BYTES = 256 * 1024;
const MAX_CLIENT_FOLDERS = 1200;
const MAX_PHOTO_FOLDERS = 2400;
const MAX_DATE_FOLDER_DEPTH = 8;
const EXCEL = /\.xlsx$/i;
const PHOTO = /\.(jpg|jpeg|png)$/i;

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
 * Offline-only inventory. Accepts TWO organizational layouts:
 *   legacy: root/excel/*.xlsx and root/fotos/*.{jpg,jpeg,png}
 *   actual: root/<client-folder>/<one>.xlsx, photos at that level,
 *           plus photo-only subfolders (which may represent dates).
 *
 * Directory names are never proof of client identity or photo capture date.
 * None of the source names, paths, or date-folder labels enter the output.
 * The existing metadata-only plan remains the only output, without uploads.
 */
export async function planHistoricalLocalInitialLoad(rootDirectory: string, decisionsPath?: string) {
  try {
    const root = resolve(rootDirectory);
    const rootStat = await lstat(root);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new InitialLoadLocalError();

    const entries = await readdir(root, { withFileTypes: true });
    if (!entries.length) throw new InitialLoadLocalError();
    const isLegacy = entries.length === 2
      && entries.every(item => item.isDirectory() && !item.isSymbolicLink()
        && ["excel", "fotos"].includes(item.name));

    const assets: InitialLoadAsset[] = [];
    let total = 0;
    let photoFolders = 0;

    async function addFile(file: string, kind: InitialLoadAsset["kind"]) {
      if (assets.length >= MAX_FILES) throw new InitialLoadLocalError();
      const bytes = await safeReadFile(file, kind === "photo" ? MAX_PHOTO_BYTES : MAX_FILE_BYTES);
      total += bytes.byteLength;
      if (total > MAX_TOTAL_BYTES) throw new InitialLoadLocalError();
      assets.push({ kind, bytes });
    }

    if (isLegacy) {
      for (const [folder, kind, extension] of [
        ["excel", "xlsx", EXCEL], ["fotos", "photo", PHOTO],
      ] as const) {
        const directory = join(root, folder);
        const stat = await lstat(directory);
        if (!stat.isDirectory() || stat.isSymbolicLink()) throw new InitialLoadLocalError();
        const files = await readdir(directory, { withFileTypes: true });
        if (assets.length + files.length > MAX_FILES
          || files.some(item => !item.isFile() || item.isSymbolicLink() || !extension.test(item.name)))
          throw new InitialLoadLocalError();
        for (const file of files) await addFile(join(directory, file.name), kind);
      }
    } else {
      // The top-level directories are *hints*, not associations with Client IDs.
      if (entries.length > MAX_CLIENT_FOLDERS
        || entries.some(item => !item.isDirectory() || item.isSymbolicLink()))
        throw new InitialLoadLocalError();

      async function scanPhotoFolder(directory: string, depth: number): Promise<number> {
        photoFolders += 1;
        if (photoFolders > MAX_PHOTO_FOLDERS || depth > MAX_DATE_FOLDER_DEPTH)
          throw new InitialLoadLocalError();
        const stat = await lstat(directory);
        if (!stat.isDirectory() || stat.isSymbolicLink()) throw new InitialLoadLocalError();
        const children = await readdir(directory, { withFileTypes: true });
        if (!children.length) throw new InitialLoadLocalError();
        let found = 0;
        for (const child of children) {
          if (child.isSymbolicLink()) throw new InitialLoadLocalError();
          const location = join(directory, child.name);
          if (child.isFile() && PHOTO.test(child.name)) {
            await addFile(location, "photo");
            found++;
          } else if (child.isDirectory()) {
            found += await scanPhotoFolder(location, depth + 1);
          } else {
            // Never silently skip an unexpected clinical document or format.
            throw new InitialLoadLocalError();
          }
        }
        return found;
      }

      for (const folder of entries) {
        const clientDirectory = join(root, folder.name);
        const clientStat = await lstat(clientDirectory);
        if (!clientStat.isDirectory() || clientStat.isSymbolicLink()) throw new InitialLoadLocalError();
        const children = await readdir(clientDirectory, { withFileTypes: true });
        const excels = children.filter(item => item.isFile() && EXCEL.test(item.name));
        // One Excel per client directory is an input-shape check, NOT identity proof.
        if (excels.length !== 1) throw new InitialLoadLocalError();
        let photos = 0;
        for (const item of children) {
          if (item.isSymbolicLink()) throw new InitialLoadLocalError();
          const location = join(clientDirectory, item.name);
          if (item.isFile() && EXCEL.test(item.name)) {
            await addFile(location, "xlsx");
          } else if (item.isFile() && PHOTO.test(item.name)) {
            await addFile(location, "photo");
            photos++;
          } else if (item.isDirectory()) {
            photos += await scanPhotoFolder(location, 1);
          } else {
            throw new InitialLoadLocalError();
          }
        }
        // A client may have an Excel with no photos; an empty dated folder is forbidden.
        void photos;
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
    // Never leak source paths, date-folder labels, filenames, or health data.
    throw new InitialLoadLocalError();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length < 3 || process.argv.length > 4) {
    process.stderr.write("Uso: node --experimental-strip-types scripts/plan-historical-initial-load.ts <pasta-com-clientes> [decisoes.json]\n");
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
