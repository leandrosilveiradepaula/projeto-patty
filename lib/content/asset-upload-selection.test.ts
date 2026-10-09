import assert from "node:assert/strict";
import test from "node:test";
import { EDUCATIONAL_ASSET_MIME_TYPES, validateEducationalAssetUploadSelection } from "./asset-upload-selection.ts";

test("educational asset preflight rejects missing and empty candidates before grants", () => {
  assert.equal(validateEducationalAssetUploadSelection(null).ok, false);
  assert.equal(validateEducationalAssetUploadSelection({type:"video/mp4",size:0}).ok, false);
  assert.equal(validateEducationalAssetUploadSelection({type:"video/mp4",size:NaN}).ok, false);
  assert.equal(validateEducationalAssetUploadSelection({type:"video/mp4",size:Infinity}).ok, false);
  assert.equal(validateEducationalAssetUploadSelection({type:"video/mp4",size:1.2}).ok, false);
});

test("preflight recognizes only the five MIME types supported by the server grant", () => {
  assert.deepEqual(EDUCATIONAL_ASSET_MIME_TYPES, [
    "application/pdf","image/jpeg","image/png","image/webp","video/mp4",
  ]);
  for (const type of EDUCATIONAL_ASSET_MIME_TYPES) {
    assert.deepEqual(validateEducationalAssetUploadSelection({type,size:123262796}),{ok:true});
  }
  for (const type of ["", "application/octet-stream", "video/webm", "text/html", "image/svg+xml"]) {
    assert.equal(validateEducationalAssetUploadSelection({type,size:100}).ok,false,type);
  }
});

test("preflight does not impose a new professional or arbitrary file size limit", () => {
  assert.equal(validateEducationalAssetUploadSelection({type:"video/mp4",size:123262796}).ok,true);
  assert.equal(validateEducationalAssetUploadSelection({type:"video/mp4",size:Number.MAX_SAFE_INTEGER}).ok,true);
});
