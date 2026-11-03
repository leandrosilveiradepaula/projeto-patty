import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("lib/assignments/client-assignment-start.ts", "utf8");
const policy = readFileSync("lib/assignments/start-policy.ts", "utf8");

test("historical Client without Profile fails closed before any assignment writes", () => {
  const start = source.slice(source.indexOf("export async function startCurrentAdminClientAssignment"));
  const guard = start.indexOf("await requireLinkedClientForAssignment(input.clientId)");
  const existing = start.indexOf("getActiveAssignmentId(scopedInput)");
  const insert = start.indexOf('.from("client_assignments")');
  const activate = start.indexOf("markClientActive(input.clientId)");
  assert.ok(guard >= 0 && existing > guard && insert > guard && activate > guard);
  assert.match(source, /await requireRole\("admin"\)/);
  assert.match(source, /\.from\("clients"\)[\s\S]*?\.select\("id, profile_id"\)[\s\S]*?\.eq\("id", clientId\)/);
  assert.match(source, /if \(error \|\| !canStartAssignmentForLinkedClient\(client\)\)/);
  assert.match(policy, /client !== null && client\.profile_id !== null/);
  assert.doesNotMatch(start, /inviteUserByEmail|generateLink|auth\.admin|deleteUser/);
});
