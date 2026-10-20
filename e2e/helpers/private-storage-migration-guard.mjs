import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Only the disposable GitHub Actions runner may replay this committed SQL.
// Never run a migration test against hosted Supabase.
if (
  process.env.GITHUB_ACTIONS !== "true" ||
  process.env.J1_E2E_LOCAL_ONLY !== "true" ||
  process.env.J1_E2E_BASE_URL !== "http://127.0.0.1:3000" ||
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321" ||
  process.env.SUPABASE_ACCESS_TOKEN ||
  process.env.SUPABASE_DB_PASSWORD ||
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  process.env.DOCKER_HOST ||
  process.env.DOCKER_CONTEXT
) {
  throw new Error("Private Storage guard test refused non-local execution");
}

const migration = readFileSync(
  "supabase/migrations/20261020191000_fix_private_storage_admin_read_after_assignment.sql",
  "utf8",
);
const expectedRejection =
  "Private Storage migration blocked: multiple admins require human reconciliation before expanding unassigned access";
if (!migration.includes(expectedRejection)) {
  throw new Error("Reviewed migration guard text changed; re-review required");
}

const sqlArgs = [
  "exec", "-i", "supabase_db_projeto-patty", "psql",
  "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1",
  "-U", "postgres", "-d", "postgres",
];
function localSql(statement) {
  return execFileSync("docker", sqlArgs, {
    input: statement.trimEnd() + "\n",
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    timeout: 15000,
  }).trim();
}
const syntheticAdmin = "99000000-0000-4000-8000-000000000001";
const adminCount = () => localSql(
  "select count(distinct profile_id) from public.user_roles where role='admin';",
);
const policyFingerprintSql = [
  "select md5(coalesce(string_agg(",
  "  p.polrelid::text || ':' || p.polname || ':' ||",
  "  coalesce(pg_get_expr(p.polqual,p.polrelid),'') || ':' ||",
  "  coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'') || ':' ||",
  "  p.polpermissive::text, chr(10) order by p.polrelid::text,p.polname",
  "),'')) from pg_policy p where",
  "  (p.polrelid='storage.objects'::regclass and p.polname in",
  "   ('client_private_storage_objects_select_visible_own_or_admin',",
  "    'storage_objects_admin_mfa_aal2_required'))",
  "  or (p.polrelid='public.client_files'::regclass",
  "   and p.polname='client_files_select_visible_own_or_admin');",
].join("\n");
const fingerprint = () => localSql(policyFingerprintSql);
function assertTrue(query, label) {
  if (localSql(query) !== "true") throw new Error("Local assertion failed: " + label);
}
const rlsInvariantSql = [
  "select (select relrowsecurity from pg_class",
  "        where oid='storage.objects'::regclass)",
  "  and (select relrowsecurity from pg_class",
  "        where oid='public.client_files'::regclass)",
  "  and (select count(*)=1 from pg_policies where schemaname='storage'",
  "       and tablename='objects'",
  "       and policyname='client_private_storage_objects_select_visible_own_or_admin')",
  "  and (select count(*)=1 from pg_policies where schemaname='public'",
  "       and tablename='client_files'",
  "       and policyname='client_files_select_visible_own_or_admin');",
].join("\n");
assertTrue(rlsInvariantSql, "private-file RLS / policies");
if (adminCount() !== "1") {
  throw new Error("J1 guard fixture requires exactly one synthetic admin");
}
const before = fingerprint();
if (!/^[a-f0-9]{32}$/.test(before)) {
  throw new Error("Local policy fingerprint unavailable");
}

try {
  localSql([
    "insert into auth.users (id,email,raw_user_meta_data) values",
    " ('99000000-0000-4000-8000-000000000001',",
    "  'synthetic-guard-admin@example.invalid','{}');",
    "insert into public.profiles (id,display_name) values",
    " ('99000000-0000-4000-8000-000000000001','Local-only guard fixture');",
    "insert into public.user_roles (profile_id,role) values",
    " ('99000000-0000-4000-8000-000000000001','admin');",
  ].join("\n"));
  if (adminCount() !== "2") {
    throw new Error("Disposable multi-admin condition not established");
  }

  // Replay the EXACT migration, not a copy of its check. An early rejection
  // must leave both the Storage and client_files policies unchanged.
  let rejected = false;
  try {
    localSql(migration);
  } catch (error) {
    rejected = String(error.stderr ?? "").includes(expectedRejection);
    if (!rejected) {
      throw new Error("Private Storage migration failed for an unexpected reason");
    }
  }
  if (!rejected) throw new Error("Migration allowed multiple admins");
  if (fingerprint() !== before) {
    throw new Error("Private Storage policy changed despite rejected migration");
  }
  assertTrue(rlsInvariantSql, "policy or RLS changed after guard rejection");
  process.stdout.write(
    "J1 local guard PASS: multi-admin migration blocked before policy change\n",
  );
} finally {
  // Remove only the known synthetic fixture from the disposable container.
  localSql([
    "delete from public.user_roles where profile_id='" + syntheticAdmin + "';",
    "delete from public.profiles where id='" + syntheticAdmin + "';",
    "delete from auth.users where id='" + syntheticAdmin + "';",
  ].join("\n"));
}
