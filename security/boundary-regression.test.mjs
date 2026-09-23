import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();

const ENTRYPOINT_RULES = new Map([
  ["app/admin/anamneses/[anamneseId]/revisao/actions.ts", "admin"],
  ["app/admin/arquivos/[fileId]/route.ts", "admin"],
  ["app/admin/avaliacoes/[avaliacaoId]/actions.ts", "admin"],
  ["app/admin/clientes/[clienteId]/actions.ts", "admin"],
  ["app/admin/clientes/[clienteId]/arquivos/actions.ts", "admin"],
  ["app/admin/clientes/[clienteId]/conteudos/actions.ts", "admin"],
  ["app/admin/clientes/nova/actions.ts", "admin"],
  ["app/admin/fotos/[fileId]/route.ts", "admin"],
  ["app/admin/protocolos/[protocoloId]/actions.ts", "admin"],
  ["app/api/cron/private-file-upload-cleanup/route.ts", "public-infrastructure"],
  ["app/ativar-conta/actions.ts", "client-identity"],
  ["app/auth/confirm/route.ts", "public-auth"],
  ["app/cliente/arquivos/[fileId]/route.ts", "client"],
  ["app/cliente/arquivos/actions.ts", "client"],
  ["app/login/actions.ts", "public-auth"],
]);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function relative(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join("/");
}

test("every App Router action/route entrypoint has an explicit security classification", async () => {
  const appFiles = await walk(path.join(ROOT, "app"));
  const entrypoints = appFiles
    .map(relative)
    .filter(
      (file) =>
        file.endsWith("/actions.ts") ||
        file.endsWith("/route.ts"),
    )
    .sort();

  assert.deepEqual(
    entrypoints,
    [...ENTRYPOINT_RULES.keys()].sort(),
    "A new or removed server entrypoint must be explicitly reviewed and classified.",
  );
});

test("classified protected entrypoints contain the expected authentication boundary", async () => {
  for (const [file, rule] of ENTRYPOINT_RULES) {
    const content = await readFile(path.join(ROOT, file), "utf8");

    if (rule === "admin") {
      assert.match(
        content,
        /requireRole\(["']admin["']\)/,
        `${file} must enforce admin role/AAL2 via requireRole("admin")`,
      );
    }

    if (rule === "client") {
      assert.match(
        content,
        /requireRole\(["']client["']\)/,
        `${file} must enforce client role via requireRole("client")`,
      );
    }

    if (rule === "client-identity") {
      assert.match(
        content,
        /requireRoleIdentity\(["']client["']\)/,
        `${file} must enforce an authenticated client identity`,
      );
    }

    if (rule === "public-infrastructure") {
      assert.match(
        content,
        /CRON_SECRET/,
        `${file} must keep its explicit infrastructure secret boundary`,
      );
      assert.match(
        content,
        /authorization/,
        `${file} must verify an authorization header`,
      );
    }

    if (rule === "public-auth") {
      assert.doesNotMatch(
        content,
        /createAdminClient\s*\(/,
        `${file} must not bypass RLS with the administrative client`,
      );
    }
  }
});

test("any module that uses the Supabase administrative client is server-only", async () => {
  const roots = ["app", "lib"];
  const sourceFiles = [];

  for (const root of roots) {
    const files = await walk(path.join(ROOT, root));
    sourceFiles.push(
      ...files.filter(
        (file) =>
          (file.endsWith(".ts") || file.endsWith(".tsx")) &&
          !file.endsWith(".test.ts"),
      ),
    );
  }

  const offenders = [];

  for (const file of sourceFiles) {
    const content = await readFile(file, "utf8");

    if (!/createAdminClient\s*\(/.test(content)) {
      continue;
    }

    if (!/^import ["']server-only["'];/m.test(content)) {
      offenders.push(relative(file));
    }
  }

  assert.deepEqual(
    offenders,
    [],
    "Administrative Supabase access must remain in server-only modules.",
  );
});
