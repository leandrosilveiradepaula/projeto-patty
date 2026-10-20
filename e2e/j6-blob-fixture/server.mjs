import { createServer } from "node:http";
import { syntheticPdfBytes, syntheticPdfContentType } from "./pdf.mjs";
import { assertDisposableFixture, verifyTicket } from "./signing.mjs";

// Simulates only a signed GET from a private object, with physically served
// synthetic bytes. Not a Vercel Blob emulator or a production provider test.
assertDisposableFixture();
const verifiedPdf = /^j6-local-verified\/[a-f0-9]{16}\/second-object\.pdf$/;
const size = syntheticPdfBytes.length;

function deny(response, status) {
  response.writeHead(status, {
    "Cache-Control": "private, no-store",
    "Content-Length": "0",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  });
  response.end();
}

const server = createServer((request, response) => {
  if (request.method !== "GET" || !request.url || request.url.length > 4096) {
    deny(response, 405);
    return;
  }
  let url;
  try { url = new URL(request.url, "http://127.0.0.1:54329"); }
  catch { deny(response, 400); return; }
  if (url.pathname === "/healthz" && url.search === "") {
    response.writeHead(200, { "Cache-Control": "no-store", "Content-Length": "2" });
    response.end("ok");
    return;
  }
  if (url.pathname !== "/private" || url.searchParams.size !== 1 ||
      !url.searchParams.has("ticket")) {
    deny(response, 403);
    return;
  }
  const validated = verifyTicket(url.searchParams.get("ticket"));
  if (!validated) {
    deny(response, 403);
    return;
  }
  if (!verifiedPdf.test(validated.pathname)) {
    // A validly signed path alone cannot make a nonexistent object readable.
    deny(response, 404);
    return;
  }

  let start = 0;
  let end = size - 1;
  let status = 200;
  const range = request.headers.range;
  if (range !== undefined) {
    const match = /^bytes=([0-9]+)-([0-9]*)$/.exec(range);
    if (!match) {
      response.writeHead(416, {
        "Content-Range": "bytes */" + size,
        "Cache-Control": "private, no-store",
        "Content-Length": "0",
      });
      response.end();
      return;
    }
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
        start >= size || end >= size || end < start) {
      response.writeHead(416, {
        "Content-Range": "bytes */" + size,
        "Cache-Control": "private, no-store",
        "Content-Length": "0",
      });
      response.end();
      return;
    }
    status = 206;
  }
  const chunk = syntheticPdfBytes.subarray(start, end + 1);
  const headers = {
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "Content-Disposition": 'inline; filename="synthetic-j6.pdf"',
    "Content-Length": String(chunk.length),
    "Content-Type": syntheticPdfContentType,
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  };
  if (status === 206) headers["Content-Range"] = "bytes " + start + "-" + end + "/" + size;
  response.writeHead(status, headers);
  response.end(chunk);
});
server.listen(54329, "127.0.0.1");
