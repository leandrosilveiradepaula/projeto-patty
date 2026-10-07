import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const source=fs.readFileSync(path.join(root,"app/cliente/conteudos/assets/[assetId]/route.ts"),"utf8");
test("private educational asset route forwards byte ranges",()=>{
 assert.match(source,/request\.headers\.get\("range"\)/);
 assert.match(source,/range,/);
 assert.match(source,/content-range/);
 assert.match(source,/status: blob\.statusCode === 206 \? 206 : 200/);
 assert.match(source,/"Cache-Control": "private, no-store"/);
});
