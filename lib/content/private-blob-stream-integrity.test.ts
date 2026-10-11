import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { verifyEducationalAssetBody } from "./private-blob-stream-integrity.ts";

const pdf = Buffer.from("%PDF-1.7\nsynthetic-private-educational-fixture\n%%EOF\n", "utf8");
const sha = (value: Uint8Array) => createHash("sha256").update(value).digest("hex");
function parts(input: Uint8Array, pieceLength = 4) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < input.length; i += pieceLength) controller.enqueue(input.subarray(i, i + pieceLength));
      controller.close();
    },
  });
}
function verify(input: Uint8Array, expectedByteSize = pdf.length, expectedSha256Hex = sha(pdf), expectedContentType = "application/pdf") {
  return verifyEducationalAssetBody({
    stream: parts(input),
    expectedByteSize,
    expectedSha256Hex,
    expectedContentType,
  });
}
test("hashes a private synthetic PDF incrementally across small chunks", async () => {
  assert.deepEqual(await verify(pdf), { byteSize: pdf.length, sha256Hex: sha(pdf) });
});
test("rejects a client-reported digest which differs from the stored bytes", async () => {
  await assert.rejects(verify(pdf, pdf.length, "0".repeat(64)), /SHA-256/);
});
test("rejects truncated and oversized objects even if a digest is supplied", async () => {
  await assert.rejects(verify(pdf.subarray(0, pdf.length - 1)), /size/);
  await assert.rejects(verify(Buffer.concat([pdf, Buffer.from("extra")])), /exceeds/);
});
test("rejects a forged extension or Content-Type with incompatible real bytes", async () => {
  const disguised = Buffer.from("not a PDF although declared as one", "utf8");
  await assert.rejects(verify(disguised, disguised.length, sha(disguised)), /signature/);
});
test("rejects non-allowlisted binary content types", async () => {
  await assert.rejects(verify(pdf, pdf.length, sha(pdf), "text/html"), /signature/);
});
test("verifies standard JPEG PNG WebP and MP4 prefixes without codec conclusions", async () => {
  for (const [mime, buf] of [
    ["image/jpeg", Buffer.from([0xff,0xd8,0xff,0xe0,0,0])],
    ["image/png", Buffer.from([137,80,78,71,13,10,26,10,1])],
    ["image/webp", Buffer.from("RIFFxxxxWEBP1234")],
    ["video/mp4", Buffer.from([0,0,0,20,102,116,121,112,105,115,111,109,0,0,0,0])],
  ] as const) {
    assert.equal((await verifyEducationalAssetBody({
      stream: parts(buf, 1),
      expectedByteSize: buf.length,
      expectedSha256Hex: sha(buf),
      expectedContentType: mime,
    })).sha256Hex, sha(buf));
  }
});
test("fails closed for malformed expected hashes or noninteger sizes", async () => {
  await assert.rejects(verify(pdf, -1), /metadata/);
  await assert.rejects(verify(pdf, 1.2), /metadata/);
  await assert.rejects(verify(pdf, pdf.length, "x"), /metadata/);
});
test("interrupted stream does not create a verified result", async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(pdf.subarray(0, 5));
      controller.error(new Error("synthetic transport failure"));
    },
  });
  await assert.rejects(verifyEducationalAssetBody({
    stream, expectedByteSize: pdf.length, expectedSha256Hex: sha(pdf), expectedContentType:"application/pdf",
  }), /transport failure/);
});
