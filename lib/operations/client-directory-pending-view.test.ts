import assert from "node:assert/strict";
import test from "node:test";
import { countClientDirectoryPendingViews, matchesClientDirectoryPendingView, readClientDirectoryPendingView } from "./client-directory-pending-view.ts";
import type { ClientPendingSummary } from "./client-pending-summary.ts";

const summary:ClientPendingSummary={patty:[],waiting:2,operational:1,total:3};
test("directory responsibility filters include waiting and operational without claiming Patty action",()=>{
 assert.equal(matchesClientDirectoryPendingView(summary,"pending"),true);
 assert.equal(matchesClientDirectoryPendingView(summary,"patty"),false);
 assert.equal(matchesClientDirectoryPendingView(summary,"waiting"),true);
 assert.equal(matchesClientDirectoryPendingView(summary,"operational"),true);
 assert.equal(matchesClientDirectoryPendingView(summary,"clear"),false);
 assert.equal(matchesClientDirectoryPendingView(undefined,"clear"),true);
});
test("counts are scoped to client ids supplied by authorized directory",()=>{
 const counts=countClientDirectoryPendingViews(["client-1","client-2"],new Map([["client-1",summary],["unassigned",summary]]));
 assert.deepEqual(counts,{all:2,pending:1,patty:0,waiting:1,operational:1,clear:1});
});
test("unknown or repeated view query defaults to all",()=>{
 assert.equal(readClientDirectoryPendingView(["patty"]),"all");
 assert.equal(readClientDirectoryPendingView("__proto__"),"all");
 assert.equal(readClientDirectoryPendingView("waiting"),"waiting");
});
