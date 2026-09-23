import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();

const ENTRYPOINT_RULES = new Map([
  ["app/admin/anamneses/[anamneseId]/correcoes/actions.ts", "admin"],
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
  ["app/cliente/anamnese/[anamneseId]/actions.ts", "client"],
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

test("protected layouts and MFA pages keep their authentication guards", async () => {
  const checks = [
    {
      file: "app/admin/layout.tsx",
      required: 'requireRole("admin")',
    },
    {
      file: "app/cliente/layout.tsx",
      required: 'requireRole("client")',
    },
    {
      file: "app/mfa/admin/setup/page.tsx",
      required: 'requireRoleIdentity("admin")',
    },
    {
      file: "app/mfa/admin/challenge/page.tsx",
      required: 'requireRoleIdentity("admin")',
    },
  ];

  for (const check of checks) {
    const content = await readFile(path.join(ROOT, check.file), "utf8");

    assert.equal(
      content.includes(check.required),
      true,
      check.file + " must keep " + check.required,
    );
  }
});

test("Next.js keeps baseline security response headers", async () => {
  const content = await readFile(path.join(ROOT, "next.config.ts"), "utf8");

  for (const required of [
    "Content-Security-Policy",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "Permissions-Policy",
    "Referrer-Policy",
    "X-Content-Type-Options",
    "nosniff",
    "X-Frame-Options",
    "DENY",
  ]) {
    assert.equal(
      content.includes(required),
      true,
      "next.config.ts must keep " + required,
    );
  }
});

test("GitHub workflows pin core actions by immutable commit SHA", async () => {
  const workflowDirectory = path.join(ROOT, ".github", "workflows");
  const files = (await readdir(workflowDirectory))
    .filter((file) => file.endsWith(".yml"))
    .sort();

  const mutableRefs = [];

  for (const file of files) {
    const content = await readFile(path.join(workflowDirectory, file), "utf8");

    for (const line of content.split("\n")) {
      if (
        line.includes("uses: actions/checkout@v") ||
        line.includes("uses: actions/setup-node@v")
      ) {
        mutableRefs.push(file + ": " + line.trim());
      }
    }
  }

  assert.deepEqual(
    mutableRefs,
    [],
    "Core GitHub Actions must use immutable commit SHAs, not mutable version tags.",
  );
});

test("GitHub workflows pin the runner image instead of following ubuntu-latest", async () => {
  const workflowDirectory = path.join(ROOT, ".github", "workflows");
  const files = (await readdir(workflowDirectory))
    .filter((file) => file.endsWith(".yml"))
    .sort();

  const offenders = [];

  for (const file of files) {
    const content = await readFile(path.join(workflowDirectory, file), "utf8");

    if (content.includes("runs-on: ubuntu-latest")) {
      offenders.push(file);
    }

    if (content.includes("runs-on: ubuntu-24.04") === false) {
      offenders.push(file + ":missing-ubuntu-24.04");
    }
  }

  assert.deepEqual(
    offenders,
    [],
    "Workflows must pin Ubuntu 24.04 until runner migration is reviewed explicitly.",
  );
});

test("Supabase Auth hardening workflow stays manual and one-way", async () => {
  const content = await readFile(
    path.join(ROOT, ".github", "workflows", "harden-supabase-auth.yml"),
    "utf8",
  );

  for (const required of [
    "workflow_dispatch:",
    "enable-hibp",
    "confirmation:",
    "SUPABASE_ACCESS_TOKEN",
    "password_hibp_enabled",
    '"password_hibp_enabled":true',
    "inputs.confirmation == 'ENABLE'",
    "github.ref == 'refs/heads/master'",
  ]) {
    assert.equal(
      content.includes(required),
      true,
      "Auth hardening workflow must keep " + required,
    );
  }

  for (const forbidden of [
    '"password_hibp_enabled":false',
    "schedule:",
    "SUPABASE_SECRET_KEY",
    "SUPABASE_DB_PASSWORD",
  ]) {
    assert.equal(
      content.includes(forbidden),
      false,
      "Auth hardening workflow must not contain " + forbidden,
    );
  }
});

test("Supabase production migration workflow stays manual and non-destructive", async () => {
  const content = await readFile(
    path.join(ROOT, ".github", "workflows", "deploy-supabase-migrations.yml"),
    "utf8",
  );

  for (const required of [
    "workflow_dispatch:",
    "mode:",
    "dry-run",
    "confirmation:",
    "SUPABASE_ACCESS_TOKEN",
    "SUPABASE_DB_PASSWORD",
    'github.ref == \'refs/heads/master\'',
    "npx supabase migration list",
    "npx supabase db push --dry-run",
    "inputs.mode == 'apply'",
    "inputs.confirmation == 'APPLY'",
    "npx supabase db push",
  ]) {
    assert.equal(
      content.includes(required),
      true,
      "migration deploy workflow must keep " + required,
    );
  }

  for (const forbidden of [
    "supabase db reset",
    "--include-seed",
    "schedule:",
  ]) {
    assert.equal(
      content.includes(forbidden),
      false,
      "migration deploy workflow must not contain " + forbidden,
    );
  }
});

test("database migrations avoid unsafe authorization shortcuts", async () => {
  const migrationDirectory = path.join(ROOT, "supabase", "migrations");
  const migrationFiles = (await readdir(migrationDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  const violations = [];

  for (const file of migrationFiles) {
    const content = await readFile(path.join(migrationDirectory, file), "utf8");
    const normalized = content.toLowerCase();

    if (/auth\.role\s*\(/.test(normalized)) {
      violations.push(`${file}: auth.role()`);
    }

    if (/\b(raw_)?user_metadata\b/.test(normalized)) {
      violations.push(`${file}: user-editable metadata in authorization/schema logic`);
    }

    if (/security\s+definer/.test(normalized)) {
      violations.push(`${file}: SECURITY DEFINER requires explicit security review`);
    }
  }

  assert.deepEqual(
    violations,
    [],
    "Migrations must not introduce deprecated/user-editable authorization or implicit RLS bypass.",
  );
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
