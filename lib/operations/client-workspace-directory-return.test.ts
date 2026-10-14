import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const nav=fs.readFileSync(path.join(root,"components/admin/ClientWorkspaceNav.tsx"),"utf8");
test("workspace navigation preserves validated directory return context on desktop and mobile",()=>{
 assert.match(nav,/readClientDirectoryReturn/);
 assert.match(nav,/href=\{navigate\(item\.href\)\}/);
 assert.match(nav,/value=\{navigate\(item\.href\)\}/);
 assert.match(nav,/router\.push\(event\.target\.value\)/);
 assert.match(nav,/clientDirectoryReturnHref\(directoryReturn\)/);
});
test("search parameter access is wrapped in Suspense",()=>{
 assert.match(nav,/<Suspense fallback=/);
 assert.match(nav,/<ClientWorkspaceNavContent \{\.\.\.props\} \/>/);
});
