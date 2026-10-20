// Test-only @vercel/blob replacement installed by CI's temporary next.config.
// No production source imports this module; it must NEVER be deployed.
import { assertDisposableFixture, fixtureOrigin, mintTicket, verifyTicket } from "./signing.mjs";

export async function issueSignedToken(input) {
  assertDisposableFixture();
  if (!input || JSON.stringify(input.operations) !== '["get"]') {
    throw new Error("J6 isolated Blob fixture permits read-only signing");
  }
  return mintTicket(input.pathname, input.validUntil);
}

export async function presignUrl(ticket, input) {
  assertDisposableFixture();
  const valid = verifyTicket(ticket);
  if (!valid || !input || input.operation !== "get" ||
      input.access !== "private" || input.useCache !== false ||
      input.pathname !== valid.pathname ||
      input.validUntil !== valid.validUntil) {
    throw new Error("J6 isolated private Blob URL contract rejected");
  }
  return {
    presignedUrl: fixtureOrigin + "/private?ticket=" + encodeURIComponent(ticket),
  };
}

// Upload/integrity operations are deliberately disabled by this transport.
// They are covered separately and cannot be simulated as success here.
export async function get() { throw new Error("J6 mock provider cannot verify uploads"); }
export async function head() { throw new Error("J6 mock provider cannot verify uploads"); }
export async function put() { throw new Error("J6 mock provider cannot upload"); }
export async function del() { throw new Error("J6 mock provider cannot delete"); }
