import { randomBytes } from "node:crypto";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";

// Never commit the temporary Next config alias or generate a fixture key
// anywhere outside the guarded, disposable GitHub Actions J6 runner.
if (process.env.GITHUB_ACTIONS !== "true" ||
    !process.env.GITHUB_ENV ||
    process.env.J6_E2E_LOCAL_ONLY !== "true" ||
    process.env.J6_E2E_BASE_URL !== "http://127.0.0.1:3000" ||
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321" ||
    process.env.BLOB_READ_WRITE_TOKEN ||
    process.env.VERCEL_OIDC_TOKEN ||
    process.env.SUPABASE_ACCESS_TOKEN ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.J6_E2E_BLOB_FIXTURE_SECRET) {
  throw new Error("Refusing to install a J6 Blob fixture outside disposable CI");
}
const configPath = "next.config.ts";
const config = readFileSync(configPath, "utf8");
const anchor = "const nextConfig: NextConfig = {\n";
if (config.split(anchor).length !== 2 ||
    config.includes("turbopack:") ||
    config.includes("j6-blob-fixture")) {
  throw new Error("Unexpected Next config; test-only alias was not installed");
}
const alias = '  turbopack: {\n' +
  '    resolveAlias: {\n' +
  '      "@vercel/blob": "./e2e/j6-blob-fixture/sdk-mock.mjs",\n' +
  '    },\n' +
  '  },\n';
writeFileSync(configPath, config.replace(anchor, anchor + alias));
const key = randomBytes(32).toString("hex");
process.stdout.write("::add-mask::" + key + "\n");
appendFileSync(process.env.GITHUB_ENV, "J6_E2E_BLOB_FIXTURE_SECRET=" + key + "\n");
appendFileSync(process.env.GITHUB_ENV, "J6_E2E_LOCAL_ONLY=true\n");
process.stdout.write("J6: installed temporary localhost-only signing adapter for this job\n");
