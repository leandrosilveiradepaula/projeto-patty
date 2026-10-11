import assert from "node:assert/strict";
import test from "node:test";
import {privateFileHumanSize,privateFileSelectionReview,privateFileTransferError,PRIVATE_FILE_ACCEPT,PRIVATE_FILE_KIND_LABELS} from "./private-file-upload-review.ts";
test("selection reports category, limits and precise valid metadata",()=>{
 const a=privateFileSelectionReview({name:"imagem.jpg",size:1200,type:"image/jpeg"},"photo");
 assert.equal(a.ok,true);assert.equal(a.kind,"Foto");assert.equal(a.maxSize,"10 MB");
 assert.equal(a.name,"imagem.jpg");
 assert.equal(PRIVATE_FILE_KIND_LABELS.exam,"Exame");
 assert.ok(PRIVATE_FILE_ACCEPT.document.includes("application/pdf"));
});
test("invalid or empty selection never declares ready",()=>{
 assert.equal(privateFileSelectionReview(null,"photo").ok,false);
 assert.equal(privateFileSelectionReview({name:"foto.pdf",size:100,type:"application/pdf"},"photo").ok,false);
 assert.equal(privateFileSelectionReview({name:"a.png",size:0,type:"image/png"},"photo").ok,false);
});
test("sizes and errors are human-readable without changing authoritative limits",()=>{
 assert.equal(privateFileHumanSize(1024),"1 KB");
 assert.equal(privateFileHumanSize(1048576),"1 MB");
 assert.equal(privateFileHumanSize(-1),"Tamanho indisponível");
 assert.match(privateFileTransferError("finalization",false),/histórico/);
 assert.match(privateFileTransferError("upload",true),/transferência/);
});
