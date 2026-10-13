import assert from "node:assert/strict";
import test from "node:test";
import { eligiblePrivatePhotos, resolvePrivatePhotoPair,adjacentPrivatePhoto,privatePhotoDisplayDate } from "./private-photo-comparison.ts";
const records=[
 {id:"photo-a",client_id:"own",file_kind:"photo",mime_type:"image/jpeg",original_filename:"A.jpg",created_at:"2026-10-01T10:00:00Z"},
 {id:"photo-b",client_id:"own",file_kind:"photo",mime_type:"image/png",original_filename:"B.png",created_at:"2026-10-02T10:00:00Z"},
 {id:"other",client_id:"another",file_kind:"photo",mime_type:"image/jpeg",original_filename:"other.jpg",created_at:"2026-10-03T10:00:00Z"},
 {id:"exam",client_id:"own",file_kind:"exam",mime_type:"image/jpeg",original_filename:"exam.jpg",created_at:"2026-10-04T10:00:00Z"},
 {id:"unsupported",client_id:"own",file_kind:"photo",mime_type:"image/svg+xml",original_filename:"u.svg",created_at:"bad"}
];
test("comparison contains only scoped eligible photos, without mutating list",()=>{
 const actual=eligiblePrivatePhotos(records,"own");
 assert.deepEqual(actual.map(f=>f.id),["photo-b","photo-a"]);
 assert.equal(records[0].id,"photo-a");
 assert.deepEqual(eligiblePrivatePhotos(records,"another").map(f=>f.id),["other"]);
});
test("both selections must be distinct and from authorized list",()=>{
 const own=eligiblePrivatePhotos(records,"own");
 assert.deepEqual(resolvePrivatePhotoPair(own,undefined,undefined),{state:"unselected"});
 for(const [a,b] of [["photo-a","photo-a"],["photo-a","other"],["other","photo-b"],["exam","photo-b"],["photo-b","unsupported"],["photo-a",undefined],[["photo-a"],"photo-b"]]){
  assert.deepEqual(resolvePrivatePhotoPair(own,a,b),{state:"invalid"});
 }
 const selection=resolvePrivatePhotoPair(own,"photo-a","photo-b");
 assert.equal(selection.state,"ready");
 if(selection.state==="ready")assert.deepEqual([selection.before.id,selection.after.id],["photo-a","photo-b"]);
});
test("client and professional views source the scoped lists and existing guarded file routes",async()=>{
 const {readFileSync}=await import("node:fs");
 const read=(p:string)=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
 const client=read("app/cliente/arquivos/page.tsx"), admin=read("app/admin/clientes/[clienteId]/arquivos/page.tsx");
 const component=read("components/files/PrivatePhotoComparison.tsx");
 assert.match(client,/listCurrentClientFiles\(client.id\)/);
 assert.match(admin,/listAccessibleClientFiles\(clienteId\)/);
 assert.match(component,/eligiblePrivatePhotos\(files,clientId\)/);
 assert.match(component,/resolvePrivatePhotoPair\(photos,before,after\)/);
 assert.match(component,/fileRoute\+"\/"\+file.id\+"\?preview=1"/);
 assert.doesNotMatch(component,/createSignedUrl|service_role|object_path|bucket_id/);
});

test("adjacent photo navigation never crosses the eligible client-scoped selection",()=>{
 const photos=eligiblePrivatePhotos(records,"own");
 assert.equal(adjacentPrivatePhoto(photos,"photo-b",-1),null);
 assert.equal(adjacentPrivatePhoto(photos,"photo-b",1)?.id,"photo-a");
 assert.equal(adjacentPrivatePhoto(photos,"photo-a",-1)?.id,"photo-b");
 assert.equal(adjacentPrivatePhoto(photos,"other",1),null);
 assert.equal(privatePhotoDisplayDate("2026-10-13T01:00:00Z"),"2026-10-12");
 assert.equal(privatePhotoDisplayDate("bad"),"Data indisponível");
});

test("comparison interface hides adjacent links that collide with opposing photo",async()=>{
 const {readFileSync}=await import("node:fs");
 const s=readFileSync(new URL("../../components/files/PrivatePhotoComparison.tsx",import.meta.url),"utf8");
 assert.match(s,/adjacentPrivatePhoto\(photos,selection.before.id,1\)\?\.id!==selection.after.id/);
 assert.match(s,/adjacentPrivatePhoto\(photos,selection.after.id,-1\)\?\.id!==selection.before.id/);
});
