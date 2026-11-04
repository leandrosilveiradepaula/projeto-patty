import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { reviewHistoricalLayoutMapping } from "../lib/imports/historical-layout-mapping-review.ts";

const MAX_JSON_BYTES = 2 * 1024 * 1024;

export class HistoricalMappingInputError extends Error {
  constructor() {
    super("Revisão local recusada. Confirme os dois arquivos JSON e seus limites; nenhum dado foi importado.");
  }
}

async function readSmallPrivateJson(path: string): Promise<unknown> {
  const file = resolve(path);
  const initial = await lstat(file);
  if (!initial.isFile() || initial.isSymbolicLink() || initial.size <= 0 || initial.size > MAX_JSON_BYTES) {
    throw new HistoricalMappingInputError();
  }
  const handle = await open(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const current = await handle.stat();
    if (!current.isFile() || current.size !== initial.size) throw new HistoricalMappingInputError();
    const contents = await handle.readFile();
    if (contents.byteLength !== current.size) throw new HistoricalMappingInputError();
    return JSON.parse(contents.toString("utf8")) as unknown;
  } finally {
    await handle.close();
  }
}

/**
 * Only reads the operator's two local manifests and returns sanitised review codes.
 * This is NOT a professional approval, a client identity check or an importer.
 */
export async function reviewHistoricalMappingLocal(previewPath: string, proposalPath: string) {
  try {
    const [preview, proposal] = await Promise.all([
      readSmallPrivateJson(previewPath),
      readSmallPrivateJson(proposalPath),
    ]);
    return reviewHistoricalLayoutMapping(preview, proposal);
  } catch {
    // File paths, usernames and JSON contents must never leak into diagnostics.
    throw new HistoricalMappingInputError();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length !== 4) {
    process.stderr.write(
      "Uso: node --experimental-strip-types scripts/review-historical-layout.ts <preview.json> <proposta.json>\n",
    );
    process.exitCode = 2;
  } else {
    reviewHistoricalMappingLocal(process.argv[2]!, process.argv[3]!)
      .then((result) => {
        process.stdout.write(JSON.stringify(result) + "\n");
        if (result.state === "blocked") process.exitCode = 1;
      })
      .catch(() => {
        process.stderr.write(
          "Revisão local recusada. Confirme os dois arquivos JSON e seus limites; nenhum dado foi importado.\n",
        );
        process.exitCode = 1;
      });
  }
}
