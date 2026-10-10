import assert from "node:assert/strict";
import test from "node:test";
import {
  educationalAssetKind,
  educationalAssetOpenLabel,
  educationalAssetSize,
  orderReleasedEducationalAssets,
} from "./client-assets.ts";

const assets = [
  { id: "attachment-z", asset_key: "supplement", content_type: "application/pdf", byte_size: 4096 },
  { id: "main", asset_key: "primary", content_type: "video/mp4", byte_size: 123_262_796 },
  { id: "attachment-b", asset_key: "notes", content_type: "text/plain", byte_size: 0 },
];

test("a released version shows primary first, then all attachments in a stable order", () => {
  const sorted = orderReleasedEducationalAssets(assets);
  assert.deepEqual(sorted.map((a) => a.id), ["main", "attachment-b", "attachment-z"]);
  assert.deepEqual(assets.map((a) => a.id), ["attachment-z", "main", "attachment-b"]);
});

test("multiple assets with the same key use ID as stable tie breaker", () => {
  const input = [
    { id: "b", asset_key: "notes", content_type: "application/pdf", byte_size: 100 },
    { id: "a", asset_key: "notes", content_type: "application/pdf", byte_size: 100 },
  ];
  assert.deepEqual(orderReleasedEducationalAssets(input).map(a => a.id), ["a", "b"]);
});

test("the primary retains the existing open label and attachments have unique accessible labels", () => {
  const sorted = orderReleasedEducationalAssets(assets);
  assert.deepEqual(sorted.map((a, index) => educationalAssetOpenLabel(a, index, true)), [
    "Abrir conteúdo", "Abrir anexo 1", "Abrir anexo 2",
  ]);
});

test("legacy versions without a primary still expose every file with explicit numbers", () => {
  const rest = orderReleasedEducationalAssets(assets.filter(a => a.asset_key !== "primary"));
  assert.deepEqual(rest.map((a, index) => educationalAssetOpenLabel(a, index, false)), [
    "Abrir arquivo 1", "Abrir arquivo 2",
  ]);
});

test("asset kind comes only from the MIME type, never guessed from keys or filenames", () => {
  assert.equal(educationalAssetKind("application/pdf"), "PDF");
  assert.equal(educationalAssetKind("VIDEO/MP4"), "Vídeo");
  assert.equal(educationalAssetKind("audio/mpeg"), "Áudio");
  assert.equal(educationalAssetKind("image/jpeg"), "Imagem");
  assert.equal(educationalAssetKind("text/plain"), "Texto");
  assert.equal(educationalAssetKind("application/vnd.ms-excel"), "Arquivo");
});

test("file size is formatted without leaking storage metadata or invalid numbers", () => {
  assert.equal(educationalAssetSize(0), "0 B");
  assert.equal(educationalAssetSize(1024), "1 KB");
  assert.equal(educationalAssetSize(1_048_576), "1 MB");
  assert.equal(educationalAssetSize(123_262_796).endsWith(" MB"), true);
  for (const size of [-1, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1, null]) {
    assert.equal(educationalAssetSize(size), "Tamanho não informado");
  }
});

test("empty assets result never creates a false downloadable item", () => {
  assert.deepEqual(orderReleasedEducationalAssets([]), []);
});
