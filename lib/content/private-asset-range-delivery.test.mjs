import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const source=fs.readFileSync(path.join(root,"app/cliente/conteudos/assets/[assetId]/route.ts"),"utf8");
test("private educational asset route stays private while range remains a production gate",()=>{
 assert.match(source,/"Cache-Control": "private, no-store"/);
 assert.match(source,/"Content-Disposition": "inline"/);
 assert.doesNotMatch(source,/range,/);
});
