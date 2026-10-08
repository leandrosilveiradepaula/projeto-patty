import { randomBytes } from "node:crypto";
import { appendFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.E2E_SUPABASE_URL;
const secret = process.env.E2E_SUPABASE_SECRET_KEY;
const githubEnv = process.env.GITHUB_ENV;

if (!url || !secret || !githubEnv) {
  throw new Error("Missing canonical E2E setup environment.");
}

const admin = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const suffix = randomBytes(8).toString("hex");
const email = `e2e-canonical-${suffix}@example.invalid`;
const displayName = `E2E Canonical Client ${suffix}`;
const password = `E2E-Canonical-${randomBytes(18).toString("base64url")}-Aa1!`;

// Prevent ephemeral credentials from being echoed by later GitHub Actions steps.
console.log(`::add-mask::${email}`);
console.log(`::add-mask::${password}`);

const created = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (created.error) throw created.error;

const profileId = created.data.user.id;
let clientId = null;
let protocolId = null;
let protocolVersionId = null;

try {
  const profile = await admin.from("profiles").insert({
    id: profileId,
    display_name: displayName,
    status: "active",
  });
  if (profile.error) throw profile.error;

  const role = await admin.from("user_roles").insert({
    profile_id: profileId,
    role: "client",
  });
  if (role.error) throw role.error;

  const client = await admin
    .from("clients")
    .insert({
      full_name: displayName,
      profile_id: profileId,
      status: "active",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (client.error) throw client.error;
  clientId = client.data.id;

  // Seed an unpublished, synthetic nutrition draft to verify that the actual
  // authenticated client UI does NOT expose a professional draft via RLS.
  // This is not a professional approval/publication or an application action.
  const protocol = await admin
    .from("protocols")
    .insert({ client_id: clientId, protocol_type: "nutrition" })
    .select("id")
    .single();
  if (protocol.error) throw protocol.error;
  protocolId = protocol.data.id;

  const version = await admin
    .from("protocol_versions")
    .insert({
      client_id: clientId,
      // Technical creator for this disposable test fixture; no real staff ID.
      created_by_profile_id: profileId,
      protocol_id: protocolId,
      version_number: 1,
    })
    .select("id, submitted_for_review_at")
    .single();
  if (version.error) throw version.error;
  if (version.data.submitted_for_review_at !== null) {
    throw new Error("Synthetic protocol fixture must remain an unpublished draft");
  }
  protocolVersionId = version.data.id;

  const verifier = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  let loginError = null;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const signedIn = await verifier.auth.signInWithPassword({ email, password });

    if (!signedIn.error) {
      loginError = null;
      await verifier.auth.signOut();
      break;
    }

    loginError = signedIn.error;

    if (attempt < 5) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }

  if (loginError) {
    throw new Error(
      `Ephemeral client login preflight failed after retries: ${loginError.message}`,
    );
  }

  await appendFile(
    githubEnv,
    [
      `E2E_CANONICAL_EMAIL=${email}`,
      `E2E_CANONICAL_PASSWORD=${password}`,
      `E2E_CANONICAL_PROFILE_ID=${profileId}`,
      `E2E_CANONICAL_CLIENT_ID=${clientId}`,
      `E2E_CANONICAL_PROTOCOL_ID=${protocolId}`,
      `E2E_CANONICAL_PROTOCOL_VERSION_ID=${protocolVersionId}`,
      "",
    ].join("\n"),
  );

  console.log("Ephemeral canonical E2E client created and login preflight passed.");
} catch (error) {
  // Compensate only objects created inside this invocation, in FK order.
  if (protocolVersionId) {
    await admin.from("protocol_versions").delete().eq("id", protocolVersionId)
      .is("submitted_for_review_at", null);
  }
  if (protocolId) {
    await admin.from("protocols").delete().eq("id", protocolId);
  }
  if (clientId) {
    await admin.from("clients").delete().eq("id", clientId);
  }
  await admin.from("user_roles").delete().eq("profile_id", profileId);
  await admin.from("profiles").delete().eq("id", profileId);
  await admin.auth.admin.deleteUser(profileId);
  throw error;
}
