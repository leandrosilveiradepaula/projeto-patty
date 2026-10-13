import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const sql = readFileSync(
  new URL("../../supabase/migrations/20261012150000_allow_own_finalized_assessment_history.sql", import.meta.url),
  "utf8",
);
const page = readFileSync(new URL("../../app/cliente/avaliacoes/page.tsx", import.meta.url), "utf8");
const access = readFileSync(new URL("../supabase/data-access.ts", import.meta.url), "utf8");

test("client-facing RPC exposes only id and dates, not professional metadata", () => {
  assert.match(sql, /returns table\s*\(\s*id uuid,\s*assessed_at timestamptz,\s*finalized_at timestamptz\s*\)/i);
  assert.doesNotMatch(sql, /create policy|on public\.assessment_measurements|grant select/i);
  assert.match(page, /listCurrentClientFinalizedAssessmentHistory\\(\\)/);
  assert.doesNotMatch(page, /listAccessibleAssessmentsForClient\(/);
  assert.match(access, /list_current_client_finalized_assessment_headers/);
});

test("private definer enforces own account and excludes drafts and other clients", () => {
  assert.match(sql, /create function app_private\.list_current_client_finalized_assessment_headers\(\)/i);
  assert.match(sql, /security definer[\s\S]*?set search_path = pg_catalog/i);
  assert.match(sql, /join public\.client_assessments ca\s+on ca\.client_id = c\.id\s+and ca\.finalized_at is not null/i);
  assert.match(sql, /where c\.profile_id = \(select auth\.uid\(\)\)/i);
  assert.doesNotMatch(sql, /service_role|user_metadata|create policy/i);
});

test("anonymous and unauthenticated roles cannot execute either RPC", () => {
  for (const schema of ["app_private", "public"]) {
    const func = schema + ".list_current_client_finalized_assessment_headers()";
    assert.ok(sql.includes("revoke execute on function " + func));
    assert.match(sql.slice(sql.indexOf("revoke execute on function " + func)), /from public, anon;/);
    assert.ok(sql.includes("grant execute on function " + func + "\n  to authenticated;"));
  }
  assert.match(sql, /create function public\.list_current_client_finalized_assessment_headers\(\)[\s\S]*security invoker/i);
});
