import { createHmac } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function decodeBase32(value) {
  const normalized = value.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let bitCount = 0;
  const bytes = [];

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);

    if (index < 0) {
      throw new Error("Invalid base32 TOTP secret");
    }

    bits = (bits << 5) | index;
    bitCount += 5;

    while (bitCount >= 8) {
      bitCount -= 8;
      bytes.push((bits >> bitCount) & 0xff);
      bits &= bitCount === 0 ? 0 : (1 << bitCount) - 1;
    }
  }

  if (bytes.length === 0) {
    throw new Error("Empty TOTP secret");
  }

  return Buffer.from(bytes);
}

export function generateTotp(secret, now = Date.now()) {
  const counter = Math.floor(now / 1000 / 30);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac("sha1", decodeBase32(secret))
    .update(counterBuffer)
    .digest();

  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binary % 1_000_000).padStart(6, "0");
}

export async function loginAdminWithMfa(page, input) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(input.email);
  await page.getByLabel("Senha").fill(input.password);
  await page.getByRole("button", { name: "Entrar" }).click();

  await page.waitForURL(/\/(admin|mfa\/admin\/(setup|challenge))\/?$/);

  if (page.url().includes("/mfa/admin/setup")) {
    throw new Error(
      "E2E admin MFA is not enrolled. Complete TOTP enrollment manually before running this smoke test.",
    );
  }

  if (page.url().includes("/mfa/admin/challenge")) {
    if (!input.totpSecret) {
      throw new Error(
        "Missing E2E_ADMIN_TOTP_SECRET for the enrolled E2E admin factor.",
      );
    }

    await page
      .getByLabel("Código de autenticação")
      .fill(generateTotp(input.totpSecret));
    await page.getByRole("button", { name: "Confirmar acesso" }).click();
  }

  await page.waitForURL(/\/admin\/?$/);
}
