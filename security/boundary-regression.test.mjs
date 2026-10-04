import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();

const ENTRYPOINT_RULES = new Map([
  ["app/admin/anamneses/[anamneseId]/correcoes/actions.ts", "admin"],
  ["app/admin/anamneses/[anamneseId]/esclarecimentos/actions.ts", "admin"],
  ["app/admin/anamneses/[anamneseId]/ia/actions.ts", "admin"],
  ["app/admin/anamneses/[anamneseId]/revisao/actions.ts", "admin"],
  ["app/admin/arquivos/[fileId]/route.ts", "admin"],
  ["app/admin/avaliacoes/[avaliacaoId]/actions.ts", "admin"],
  ["app/admin/clientes/[clienteId]/actions.ts", "admin"],
  ["app/admin/clientes/[clienteId]/arquivos/actions.ts", "admin"],
  ["app/admin/clientes/[clienteId]/avaliacoes/actions.ts", "admin"],
  ["app/admin/clientes/[clienteId]/checkins/actions.ts", "admin"],
  ["app/admin/clientes/[clienteId]/conteudos/actions.ts", "admin"],
  ["app/admin/clientes/[clienteId]/feedback-semanal/actions.ts", "admin"],
  ["app/admin/clientes/nova/actions.ts", "admin"],
  ["app/admin/fotos/[fileId]/route.ts", "admin"],
  ["app/admin/protocolos/[protocoloId]/actions.ts", "admin"],
  ["app/api/cron/private-file-upload-cleanup/route.ts", "public-infrastructure"],
  ["app/ativar-conta/actions.ts", "client-identity"],
  ["app/auth/confirm/route.ts", "public-auth"],
  ["app/auth/recovery/route.ts", "public-auth"],
  ["app/cliente/anamnese/[anamneseId]/actions.ts", "client"],
  ["app/cliente/anamnese/[anamneseId]/esclarecimentos/actions.ts", "client"],
  ["app/cliente/anamnese/actions.ts", "client"],
  ["app/cliente/arquivos/[fileId]/route.ts", "client"],
  ["app/cliente/arquivos/actions.ts", "client"],
  ["app/cliente/checkins/actions.ts", "client"],
  ["app/cliente/feedback-semanal/actions.ts", "client"],
  ["app/cliente/perfil/actions.ts", "client"],
  ["app/cliente/treino/actions.ts", "client"],
  ["app/login/actions.ts", "public-auth"],
  ["app/recuperar-senha/actions.ts", "public-auth"],
  ["app/redefinir-senha/actions.ts", "authenticated-recovery"],
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

    if (rule === "authenticated-recovery") {
      assert.match(
        content,
        /auth\.getClaims\(\)/,
        `${file} must require an authenticated recovery session before changing credentials`,
      );
      assert.doesNotMatch(
        content,
        /createAdminClient\s*\(/,
        `${file} must not use the administrative client to change a user password`,
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

test("Anamnesis draft updates reuse the authenticated Supabase client", async () => {
  const content = await readFile(
    path.join(ROOT, "lib", "anamnesis", "draft.ts"),
    "utf8",
  );

  assert.match(
    content,
    /async function updateDraftAnswer\(\s*supabase: ServerSupabaseClient,/,
    "Draft answer update helper must receive the already-authenticated Supabase client.",
  );

  const helperStart = content.indexOf("async function updateDraftAnswer");
  const helperEnd = content.indexOf(
    "export async function saveCurrentClientAnamnesisDraftAnswer",
    helperStart,
  );
  const helperBody = content.slice(helperStart, helperEnd);

  assert.equal(
    helperBody.includes("createClient()"),
    false,
    "Draft answer update helper must not create a second request-scoped Supabase client.",
  );
});

test("Anamnesis draft forms do not refresh stale values after ordinary saves", async () => {
  const textForm = await readFile(
    path.join(
      ROOT,
      "components",
      "client",
      "ClientAnamnesisDraftTextAnswerForm.tsx",
    ),
    "utf8",
  );
  const singleChoiceForm = await readFile(
    path.join(
      ROOT,
      "components",
      "client",
      "ClientAnamnesisDraftSingleChoiceAnswerForm.tsx",
    ),
    "utf8",
  );

  assert.doesNotMatch(
    textForm,
    /router\.refresh\s*\(/,
    "Text draft saves must preserve the live form value instead of racing an async router refresh.",
  );
  assert.doesNotMatch(
    textForm,
    /useRouter/,
    "Text draft form must not install a navigation refresh solely after save.",
  );

  assert.doesNotMatch(
    singleChoiceForm,
    /router\.refresh\s*\(/,
    "Ordinary single-choice saves must not race an async router refresh.",
  );
  assert.match(
    singleChoiceForm,
    /state\.success\s*&&\s*reloadPageOnSuccess/,
    "Only applicability-controller saves should trigger a post-save navigation.",
  );
  assert.match(
    singleChoiceForm,
    /window\.location\.assign\(/,
    "Applicability-controller saves must keep deterministic navigation so dependent fields refresh.",
  );
});

test("canonical E2E setup masks ephemeral credentials before exporting them", async () => {
  const content = await readFile(
    path.join(ROOT, "e2e", "setup-canonical-anamnesis-client.mjs"),
    "utf8",
  );

  for (const required of [
    "console.log(`::add-mask::${email}`)",
    "console.log(`::add-mask::${password}`)",
    "`E2E_CANONICAL_EMAIL=${email}`",
    "`E2E_CANONICAL_PASSWORD=${password}`",
  ]) {
    assert.equal(
      content.includes(required),
      true,
      "Canonical E2E setup must keep credential masking/export boundary: " + required,
    );
  }

  assert.equal(
    content.indexOf("console.log(`::add-mask::${email}`)") <
      content.indexOf("`E2E_CANONICAL_EMAIL=${email}`"),
    true,
    "Ephemeral email must be masked before it is exported to later steps.",
  );
  assert.equal(
    content.indexOf("console.log(`::add-mask::${password}`)") <
      content.indexOf("`E2E_CANONICAL_PASSWORD=${password}`"),
    true,
    "Ephemeral password must be masked before it is exported to later steps.",
  );
});

test("conditional submit E2E uses only the ephemeral canonical client", async () => {
  const workflow = await readFile(
    path.join(
      ROOT,
      ".github",
      "workflows",
      "e2e-client-anamnesis-conditional-submit.yml",
    ),
    "utf8",
  );
  const spec = await readFile(
    path.join(ROOT, "e2e", "client-anamnesis-conditional-submit.spec.mjs"),
    "utf8",
  );

  for (const required of [
    "node e2e/setup-canonical-anamnesis-client.mjs",
    "node e2e/cleanup-canonical-anamnesis-client.mjs",
    "if: always()",
    "E2E_CANONICAL_EMAIL",
    "E2E_CANONICAL_PASSWORD",
    "E2E_CANONICAL_CLIENT_ID",
  ]) {
    assert.equal(
      workflow.includes(required) || spec.includes(required),
      true,
      "Conditional submit E2E must keep ephemeral-client boundary: " + required,
    );
  }

  for (const forbidden of [
    "E2E Correction Client",
    "updateUserById",
    "lockSyntheticClient",
    "loadSyntheticClient",
  ]) {
    assert.equal(
      spec.includes(forbidden),
      false,
      "Conditional submit E2E must not depend on persistent fixture behavior: " +
        forbidden,
    );
  }
});

test("canonical consent E2E uses only the ephemeral canonical client", async () => {
  const workflow = await readFile(
    path.join(
      ROOT,
      ".github",
      "workflows",
      "e2e-client-anamnesis-canonical-consent.yml",
    ),
    "utf8",
  );
  const spec = await readFile(
    path.join(ROOT, "e2e", "client-anamnesis-canonical-consent.spec.mjs"),
    "utf8",
  );

  for (const required of [
    "node e2e/setup-canonical-anamnesis-client.mjs",
    "node e2e/cleanup-canonical-anamnesis-client.mjs",
    "if: always()",
    "E2E_CANONICAL_EMAIL",
    "E2E_CANONICAL_PASSWORD",
    "E2E_CANONICAL_CLIENT_ID",
  ]) {
    assert.equal(
      workflow.includes(required) || spec.includes(required),
      true,
      "Consent E2E must keep ephemeral-client boundary: " + required,
    );
  }

  for (const forbidden of [
    "E2E Correction Client",
    "updateUserById",
    "lockSyntheticClient",
    "loadSyntheticClient",
  ]) {
    assert.equal(
      spec.includes(forbidden),
      false,
      "Consent E2E must not depend on persistent fixture behavior: " +
        forbidden,
    );
  }
});

test("persistent Anamnesis E2E fixture usage stays limited to immutable-history flows", async () => {
  const e2eDirectory = path.join(ROOT, "e2e");
  const files = (await readdir(e2eDirectory))
    .filter((file) => file.endsWith(".mjs"))
    .sort();

  const persistentFixtureFiles = [];

  for (const file of files) {
    const content = await readFile(path.join(e2eDirectory, file), "utf8");

    if (
      content.includes("E2E Correction Client") ||
      content.includes("updateUserById")
    ) {
      persistentFixtureFiles.push(file);
    }
  }

  assert.deepEqual(
    persistentFixtureFiles,
    [
      "admin-anamnesis-corrections.spec.mjs",
      "anamnesis-clarifications.spec.mjs",
    ],
    "Persistent fixture/password rotation is allowed only where a submitted immutable Anamnesis history is required.",
  );
});

test("immutable-history Anamnesis E2E workflows stay manual-only", async () => {
  const clarificationWorkflow = await readFile(
    path.join(
      ROOT,
      ".github",
      "workflows",
      "e2e-anamnesis-clarifications.yml",
    ),
    "utf8",
  );

  assert.match(
    clarificationWorkflow,
    /on:\s*\n\s*workflow_dispatch:/,
    "Clarification E2E must keep an explicit manual trigger.",
  );

  for (const forbidden of ["pull_request:", "push:", "schedule:"]) {
    assert.equal(
      clarificationWorkflow.includes(forbidden),
      false,
      "Immutable-history clarification E2E must not run automatically via " +
        forbidden,
    );
  }

  for (const required of [
    "confirmation:",
    "CREATE_E2E_HISTORY",
    "github.ref == 'refs/heads/master'",
    "inputs.confirmation == 'CREATE_E2E_HISTORY'",
  ]) {
    assert.equal(
      clarificationWorkflow.includes(required),
      true,
      "Immutable-history clarification E2E must require explicit production confirmation: " +
        required,
    );
  }
});

test("all production E2E workflows are restricted to master", async () => {
  const workflowDirectory = path.join(ROOT, ".github", "workflows");
  const files = (await readdir(workflowDirectory))
    .filter((file) => file.startsWith("e2e-") && file.endsWith(".yml"))
    .sort();

  assert.ok(files.length > 0, "Expected production E2E workflows.");

  for (const file of files) {
    const content = await readFile(path.join(workflowDirectory, file), "utf8");

    assert.equal(
      content.includes("github.ref == 'refs/heads/master'"),
      true,
      file + " must refuse production E2E execution from non-master refs.",
    );
  }
});

test("Supabase SSR proxy preserves session cookies and cache-control headers", async () => {
  const content = await readFile(
    path.join(ROOT, "lib", "supabase", "proxy.ts"),
    "utf8",
  );

  for (const required of [
    "setAll(cookiesToSet, headers)",
    "request.cookies.set(name, value)",
    "response.cookies.set(name, value, options)",
    "Object.entries(headers)",
    "response.headers.set(key, value)",
    "supabase.auth.getClaims()",
  ]) {
    assert.equal(
      content.includes(required),
      true,
      "Supabase SSR proxy must keep " + required,
    );
  }
});

test("password login routes from the user returned by the successful sign-in", async () => {
  const content = await readFile(
    path.join(ROOT, "app", "login", "actions.ts"),
    "utf8",
  );

  for (const required of [
    "signInWithPassword",
    "data.user",
    "getAuthContextForProfileId(supabase, data.user.id)",
  ]) {
    assert.equal(
      content.includes(required),
      true,
      "Login action must keep deterministic post-auth routing via " + required,
    );
  }

  assert.equal(
    content.includes("getCurrentAuthContext()"),
    false,
    "Login action must not re-read auth context through a new request-scoped client.",
  );
});

test("Vercel denies automatic deployments by default while preserving approved branches", async () => {
  const config = JSON.parse(
    await readFile(path.join(ROOT, "vercel.json"), "utf8"),
  );

  assert.equal(
    config.git?.deploymentEnabled?.["**"],
    false,
    "automatic deployments must be denied by default",
  );

  assert.equal(
    config.git?.deploymentEnabled?.master,
    true,
    "master must remain eligible for production deployment",
  );

  assert.equal(
    config.git?.deploymentEnabled?.["preview/**"],
    true,
    "explicit preview branches must remain eligible for preview deployment",
  );

  assert.deepEqual(
    config.crons,
    [
      {
        path: "/api/cron/private-file-upload-cleanup",
        schedule: "17 3 * * *",
      },
    ],
    "Vercel cron configuration must be preserved",
  );
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

const REVIEWED_SECURITY_DEFINER_MIGRATIONS = new Set([
  "20260930151722_create_ai_finding_actions.sql",
  "20260930152158_harden_ai_finding_action_boundary.sql",
]);

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

    if (
      /security\s+definer/.test(normalized) &&
      !REVIEWED_SECURITY_DEFINER_MIGRATIONS.has(file)
    ) {
      violations.push(`${file}: SECURITY DEFINER requires explicit security review`);
    }
  }

  assert.deepEqual(
    violations,
    [],
    "Migrations must not introduce deprecated/user-editable authorization or implicit RLS bypass.",
  );
});

test("reviewed AI finding SECURITY DEFINER boundary remains server-only", async () => {
  const createMigration = await readFile(
    path.join(
      ROOT,
      "supabase",
      "migrations",
      "20260930151722_create_ai_finding_actions.sql",
    ),
    "utf8",
  );
  const hardenMigration = await readFile(
    path.join(
      ROOT,
      "supabase",
      "migrations",
      "20260930152158_harden_ai_finding_action_boundary.sql",
    ),
    "utf8",
  );

  assert.match(createMigration, /security definer/i);
  assert.match(createMigration, /set search_path = pg_catalog, public/i);

  for (const required of [
    "revoke execute on function public.record_ai_finding_action",
    "drop function public.record_ai_finding_action",
    "create function public.record_ai_finding_action_server",
    "security definer",
    "set search_path = pg_catalog, public",
    "active assigned admin required",
    "from public, anon, authenticated",
    "to service_role",
  ]) {
    assert.equal(
      hardenMigration.toLowerCase().includes(required.toLowerCase()),
      true,
      "AI finding hardening migration must keep reviewed boundary: " + required,
    );
  }

  assert.equal(
    /grant execute on function public\.record_ai_finding_action_server[\s\S]*to authenticated/i.test(
      hardenMigration,
    ),
    false,
    "Hardened AI finding SECURITY DEFINER function must never be executable by authenticated.",
  );
});

test("private file finalization stays scoped to the expected client", async () => {
  const finalization = await readFile(
    path.join(ROOT, "lib", "files", "private-file-finalization.ts"),
    "utf8",
  );
  const adminActions = await readFile(
    path.join(
      ROOT,
      "app",
      "admin",
      "clientes",
      "[clienteId]",
      "arquivos",
      "actions.ts",
    ),
    "utf8",
  );
  const clientActions = await readFile(
    path.join(ROOT, "app", "cliente", "arquivos", "actions.ts"),
    "utf8",
  );

  assert.match(finalization, /expectedClientId:\s*string/);
  assert.match(
    finalization,
    /\.eq\(["']client_id["'],\s*input\.expectedClientId\)/,
  );
  assert.match(adminActions, /expectedClientId:\s*clientId/);
  assert.match(clientActions, /const client = await getCurrentClient\(\)/);
  assert.match(clientActions, /expectedClientId:\s*client\.id/);
});


test("hydration persistence boundary remains service-role-only and assignment-scoped", async () => {
  const migration = await readFile(
    path.join(
      ROOT,
      "supabase",
      "migrations",
      "20261002005720_hydrate_client_targets_from_configuration.sql",
    ),
    "utf8",
  );

  for (const required of [
    "create function public.create_hydration_target_from_method_snapshot",
    "security invoker",
    "set search_path = pg_catalog",
    "active admin assignment is required for hydration target creation",
    "active client hydration override does not match resolution",
    "from public, anon, authenticated",
    "to service_role",
  ]) {
    assert.equal(
      migration.toLowerCase().includes(required.toLowerCase()),
      true,
      "Hydration persistence boundary must keep reviewed control: " + required,
    );
  }

  assert.equal(
    /grant execute on function public\.create_hydration_target_from_method_snapshot[\s\S]*to authenticated/i.test(
      migration,
    ),
    false,
    "Hydration persistence boundary must never be executable by authenticated.",
  );

  assert.equal(
    /security\s+definer/i.test(migration),
    false,
    "Hydration persistence boundary must remain SECURITY INVOKER.",
  );
});


test("liquid taxonomy loader stays server-only and fail-closed", async () => {
  const loader = await readFile(
    path.join(ROOT, "lib", "method", "liquid-taxonomy-loader.ts"),
    "utf8",
  );

  assert.match(loader, /^import ["']server-only["'];/m);
  assert.match(loader, /createClient/);
  assert.doesNotMatch(loader, /createAdminClient/);
  assert.match(loader, /hydration\.liquid_taxonomy/);
  assert.match(loader, /liquid_taxonomy_v1/);
  assert.match(loader, /\.limit\(2\)/);
  assert.match(loader, /versions\.length !== 1/);
  assert.match(loader, /parseLiquidTaxonomyConfiguration/);
  assert.doesNotMatch(
    loader,
    /minimumRatio|minimumWaterRatio|pureWaterRatio|minimum[_\s-]*pure[_\s-]*water/i,
  );
});

test("assessment and liquid consumers use snapshot persistence boundaries", async () => {
  const assessmentAction = await readFile(
    path.join(ROOT, "app", "admin", "avaliacoes", "[avaliacaoId]", "actions.ts"),
    "utf8",
  );
  const liquidAction = await readFile(
    path.join(ROOT, "app", "cliente", "checkins", "actions.ts"),
    "utf8",
  );
  const assessmentPersistence = await readFile(
    path.join(ROOT, "lib", "evaluations", "assessment-persistence.ts"),
    "utf8",
  );
  const liquidPersistence = await readFile(
    path.join(ROOT, "lib", "method", "liquid-persistence.ts"),
    "utf8",
  );
  const dataAccess = await readFile(
    path.join(ROOT, "lib", "supabase", "data-access.ts"),
    "utf8",
  );

  assert.match(assessmentAction, /finalizeAssessmentWithMethodSnapshot/);
  assert.match(liquidAction, /createLiquidIntakeWithMethodSnapshot/);

  for (const source of [assessmentPersistence, liquidPersistence]) {
    assert.match(source, /import "server-only"/);
    assert.match(source, /createAdminClient/);
  }

  assert.match(
    assessmentPersistence,
    /finalize_assessment_from_method_snapshot/,
  );
  assert.match(
    liquidPersistence,
    /create_liquid_intake_event_from_method_snapshot/,
  );

  assert.doesNotMatch(
    dataAccess,
    /function finalizeAccessibleClientAssessment/,
  );
  assert.doesNotMatch(
    dataAccess,
    /function createCurrentClientLiquidIntakeEvent/,
  );
});

test("liquid check-in consumers resolve the active taxonomy without inventing ratios", async () => {
  const loader = await readFile(
    path.join(ROOT, "lib", "method", "liquid-taxonomy-loader.ts"),
    "utf8",
  );
  const clientAction = await readFile(
    path.join(ROOT, "app", "cliente", "checkins", "actions.ts"),
    "utf8",
  );
  const clientPage = await readFile(
    path.join(ROOT, "app", "cliente", "checkins", "page.tsx"),
    "utf8",
  );
  const adminPage = await readFile(
    path.join(
      ROOT,
      "app",
      "admin",
      "clientes",
      "[clienteId]",
      "checkins",
      "page.tsx",
    ),
    "utf8",
  );

  assert.match(loader, /loadSupportedLiquidTaxonomy/);
  assert.match(loader, /unsupported by current persistence/);
  assert.match(clientAction, /loadSupportedLiquidTaxonomy/);
  assert.doesNotMatch(
    clientAction,
    /rawKind !== ["']water["'].*rawKind !== ["']zero_calorie_other["']/s,
  );
  assert.match(clientPage, /loadSupportedLiquidTaxonomy/);
  assert.match(adminPage, /loadSupportedLiquidTaxonomy/);
  assert.doesNotMatch(
    clientPage,
    /maior parte deve ser agua pura|menor quantidade/i,
  );
  assert.match(
    clientPage,
    /não aplica uma proporção mínima automática/i,
  );
});

test("assessment configuration loader stays server-only, bounded and fail-closed", async () => {
  const loader = await readFile(
    path.join(ROOT, "lib", "evaluations", "assessment-configuration-loader.ts"),
    "utf8",
  );

  assert.match(loader, /^import ["']server-only["'];/m);
  assert.match(loader, /createClient/);
  assert.doesNotMatch(loader, /createAdminClient/);
  assert.match(loader, /evaluation\.assessment_kind_catalog/);
  assert.match(loader, /evaluation\.assessment_definition\./);
  assert.match(loader, /"basic" \| "complete"/);
  assert.doesNotMatch(loader, /cadence|fortnight|monthly|29|30|31/i);
  assert.match(loader, /\.limit\(2\)/);
  assert.match(loader, /versions\.length !== 1/);
  assert.match(loader, /parseAssessmentKindCatalogConfiguration/);
  assert.match(loader, /parseAssessmentDefinitionConfiguration/);
});

test("assessment consumers resolve active catalog and definitions without hardcoded readiness", async () => {
  const createPage = await readFile(
    path.join(ROOT, "app", "admin", "clientes", "[clienteId]", "avaliacoes", "page.tsx"),
    "utf8",
  );
  const historyPage = await readFile(
    path.join(ROOT, "app", "admin", "avaliacoes", "page.tsx"),
    "utf8",
  );
  const detailPage = await readFile(
    path.join(ROOT, "app", "admin", "avaliacoes", "[avaliacaoId]", "page.tsx"),
    "utf8",
  );
  const createAction = await readFile(
    path.join(ROOT, "app", "admin", "clientes", "[clienteId]", "avaliacoes", "actions.ts"),
    "utf8",
  );
  const detailAction = await readFile(
    path.join(ROOT, "app", "admin", "avaliacoes", "[avaliacaoId]", "actions.ts"),
    "utf8",
  );
  const createForm = await readFile(
    path.join(ROOT, "components", "admin", "AssessmentCreateForm.tsx"),
    "utf8",
  );
  const draftForms = await readFile(
    path.join(ROOT, "components", "admin", "AssessmentDraftForms.tsx"),
    "utf8",
  );

  for (const source of [createPage, historyPage, detailPage, createAction, detailAction]) {
    assert.match(source, /loadSupportedAssessmentKindOptions/);
  }

  assert.match(detailPage, /loadAssessmentDefinition/);
  assert.match(detailPage, /buildConfigurableAssessmentReadiness/);
  assert.match(detailAction, /loadAssessmentDefinition/);
  assert.match(detailAction, /buildConfigurableAssessmentReadiness/);

  assert.doesNotMatch(createForm, /ASSESSMENT_KIND_OPTIONS/);
  assert.doesNotMatch(draftForms, /ASSESSMENT_KIND_OPTIONS/);
  assert.doesNotMatch(detailPage, /buildAssessmentFinalizationReadiness/);
  assert.doesNotMatch(detailAction, /buildAssessmentFinalizationReadiness/);
});

test("Carb Cycle configuration loader stays server-only, bounded and fail-closed", async () => {
  const loader = await readFile(
    path.join(ROOT, "lib", "method", "carb-cycle-loader.ts"),
    "utf8",
  );

  assert.match(loader, /^import ["']server-only["'];/m);
  assert.match(loader, /createClient/);
  assert.doesNotMatch(loader, /createAdminClient/);
  assert.match(loader, /carb_cycle_v1/);
  assert.match(loader, /phase_1.*phase_2.*phase_3/s);
  assert.doesNotMatch(loader, /phase_4|phase_5|phase_6/);
  assert.match(loader, /\.limit\(2\)/);
  assert.match(loader, /versions\.length !== 1/);
  assert.match(loader, /parseCarbCycleConfiguration/);
});

test("operational pending data resolves clarification reminder configuration without fallback", async () => {
  const source = await readFile(
    path.join(ROOT, "lib", "operations", "pending-data.ts"),
    "utf8",
  );
  const builder = await readFile(
    path.join(ROOT, "lib", "operations", "pending.ts"),
    "utf8",
  );

  assert.match(source, /loadClarificationReminderInterval/);
  assert.match(source, /clarificationReminder\.intervalHours/);
  assert.doesNotMatch(source, /createAdminClient|service_role/);
  assert.doesNotMatch(source, /\?\?\s*24|\|\|\s*24/);
  assert.doesNotMatch(builder, /CLARIFICATION_REMINDER_INTERVAL_MS/);
  assert.match(builder, /clarificationReminderIntervalHours/);
});

test("food reconciliation loader stays server-only, RLS-bound, and fail-closed", async () => {
  const source = await readFile(
    path.join(
      ROOT,
      "lib",
      "content",
      "food-equivalent-reconciliation-loader.ts",
    ),
    "utf8",
  );

  assert.match(source, /import "server-only"/);
  assert.match(source, /createClient/);
  assert.match(source, /nutrition\.dose\.protein/);
  assert.match(source, /nutrition\.dose\.carbohydrate/);
  assert.match(source, /nutrition\.dose\.fat/);
  assert.match(
    source,
    /nutrition\.vegetable_carbohydrate_equivalence/,
  );
  assert.match(source, /versions\.length !== 1/);
  assert.doesNotMatch(source, /createAdminClient|service_role/);
});

test("clarification reminder configuration loader stays server-only and fail-closed", async () => {
  const loader = await readFile(
    path.join(
      ROOT,
      "lib",
      "operations",
      "clarification-reminder-loader.ts",
    ),
    "utf8",
  );

  assert.match(loader, /^import ["']server-only["'];/m);
  assert.match(loader, /createClient/);
  assert.doesNotMatch(loader, /createAdminClient/);
  assert.match(loader, /workflow\.anamnesis_clarification_reminder/);
  assert.match(loader, /scalar_parameter_v1/);
  assert.match(loader, /\.limit\(2\)/);
  assert.match(loader, /versions\.length !== 1/);
  assert.match(loader, /clarificationReminderIntervalHours/);
  assert.doesNotMatch(loader, /\?\?\s*24|\|\|\s*24/);
});

test("configured hydration uses the reviewed server-only persistence boundary", async () => {
  const loader = await readFile(
    path.join(ROOT, "lib", "method", "hydration-loader.ts"),
    "utf8",
  );
  const persistence = await readFile(
    path.join(ROOT, "lib", "method", "hydration-persistence.ts"),
    "utf8",
  );
  const adminAction = await readFile(
    path.join(
      ROOT,
      "app",
      "admin",
      "clientes",
      "[clienteId]",
      "checkins",
      "actions.ts",
    ),
    "utf8",
  );

  assert.match(loader, /^import ["']server-only["'];/m);
  assert.match(loader, /createClient/);
  assert.doesNotMatch(loader, /createAdminClient/);
  assert.match(loader, /hydration\.daily_target/);
  assert.match(loader, /method_engine_v1/);
  assert.match(loader, /protocol_version_id/);
  assert.match(loader, /\.limit\(2\)/);

  assert.match(persistence, /^import ["']server-only["'];/m);
  assert.match(persistence, /createAdminClient/);
  assert.match(
    persistence,
    /\.rpc\(\s*["']create_hydration_target_from_method_snapshot["']/,
  );
  assert.match(persistence, /p_resolved_configuration/);
  assert.match(persistence, /p_result_values/);
  assert.match(persistence, /p_template_version_id/);
  assert.match(persistence, /p_override_version_id/);

  assert.match(adminAction, /requireRole\(["']admin["']\)/);
  assert.match(adminAction, /getAccessibleClient/);
  assert.match(adminAction, /loadHydrationTargetResolution/);
  assert.match(adminAction, /persistConfiguredHydrationTarget/);
  assert.doesNotMatch(adminAction, /createAdminClient/);
  assert.doesNotMatch(adminAction, /createAccessibleClientHydrationTarget/);
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


test("AI execution boundary keeps privileged persistence server-only", async () => {
  const executionBoundary = await readFile(
    path.join(ROOT, "lib", "ai", "anamnesis-review-execution.ts"),
    "utf8",
  );
  const persistenceBoundary = await readFile(
    path.join(ROOT, "lib", "ai", "ai-execution-persistence.ts"),
    "utf8",
  );

  assert.match(executionBoundary, /^import ["']server-only["'];/m);
  assert.match(executionBoundary, /requireRole\(["']admin["']\)/);
  assert.doesNotMatch(executionBoundary, /createAdminClient\s*\(/);

  assert.match(persistenceBoundary, /^import ["']server-only["'];/m);
  assert.match(persistenceBoundary, /createAdminClient\s*\(/);
  assert.match(persistenceBoundary, /\.rpc\(\s*["']start_anamnesis_review_execution["']/);
  assert.match(persistenceBoundary, /\.rpc\(\s*["']complete_ai_execution["']/);
  assert.match(persistenceBoundary, /\.rpc\(\s*["']fail_ai_execution["']/);
  assert.match(persistenceBoundary, /sanitizeAiFailureMessage/);
  assert.match(persistenceBoundary, /retainAiFailureResponse/);
});


test("OpenAI Anamnesis review remains server-only and stateless", async () => {
  const provider = await readFile(
    path.join(ROOT, "lib", "ai", "openai-provider.ts"),
    "utf8",
  );
  const adapter = await readFile(
    path.join(ROOT, "lib", "ai", "openai-anamnesis-review.ts"),
    "utf8",
  );

  assert.match(provider, /^import ["']server-only["'];/m);
  assert.match(provider, /OPENAI_HEALTH_DATA_PROCESSING_ENABLED/);
  assert.match(provider, /OPENAI_API_KEY/);
  assert.match(provider, /OPENAI_MODEL/);
  assert.doesNotMatch(provider, /console\.(log|error|warn)/);

  assert.match(adapter, /store:\s*false/);
  assert.doesNotMatch(adapter, /source_answer_id.*JSON\.stringify/);
});
