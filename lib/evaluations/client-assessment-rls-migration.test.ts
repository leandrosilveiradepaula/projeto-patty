import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("client assessment policy is limited to finalized own rows",()=>{
 const sql=readFileSync(new URL("../../supabase/migrations/20261012150000_allow_own_finalized_assessment_history.sql",import.meta.url),"utf8");
 assert.match(sql,/on public\.client_assessments/);
 assert.match(sql,/for select\s+to authenticated/i);
 assert.match(sql,/finalized_at is not null/i);
 assert.match(sql,/clients\.id = client_assessments\.client_id/);
 assert.match(sql,/clients\.profile_id = \(select auth\.uid\(\)\)/);
 assert.doesNotMatch(sql,/create policy[^;]*on public\.assessment_measurements/i);
 assert.doesNotMatch(sql,/security definer|for update|for insert|for delete/i);
});
