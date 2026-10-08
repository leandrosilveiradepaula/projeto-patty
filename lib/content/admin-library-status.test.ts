import assert from "node:assert/strict";
import test from "node:test";
import { matchesLibraryStatus, summarizeLibraryVersions } from "./admin-library-status.ts";

const versions = [
 { id:"v1", item:"a", version_number:1, published_at:"2026-01-01" },
 { id:"v2", item:"a", version_number:2, published_at:null },
 { id:"v3", item:"b", version_number:1, published_at:null },
 { id:"v4", item:"c", version_number:1, published_at:"2026-02-01" },
];
test("a newer draft does not hide a previously published version", () => {
 const summaries=summarizeLibraryVersions(versions, v=>v.item);
 const a=summaries.get("a");
 assert.ok(a);
 assert.equal(a.latestVersion.id,"v2");
 assert.equal(a.latestPublishedVersion?.id,"v1");
 assert.equal(matchesLibraryStatus(a,"published"),true);
 assert.equal(matchesLibraryStatus(a,"draft"),true);
});
test("a draft-only item is never shown as published",()=>{
 const b=summarizeLibraryVersions(versions,v=>v.item).get("b");
 assert.ok(b);
 assert.equal(matchesLibraryStatus(b,"published"),false);
 assert.equal(matchesLibraryStatus(b,"draft"),true);
});
test("a published latest version does not qualify as a draft",()=>{
 const c=summarizeLibraryVersions(versions,v=>v.item).get("c");
 assert.ok(c);
 assert.equal(matchesLibraryStatus(c,"published"),true);
 assert.equal(matchesLibraryStatus(c,"draft"),false);
});
test("versions may arrive out of order without changing the summary",()=>{
 const a=summarizeLibraryVersions([...versions].reverse(),v=>v.item).get("a");
 assert.equal(a?.latestVersion.id,"v2");
 assert.equal(a?.latestPublishedVersion?.id,"v1");
});
