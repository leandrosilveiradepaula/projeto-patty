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
const password = `E2E-Canonical-${randomBytes(18).toString("base64url")}-Aa1!`;

const created = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (created.error) throw created.error;

const profileId = created.data.user.id;

try {
  const profile = await admin.from("profiles").insert({
    id: profileId,
    display_name: `E2E Canonical Client ${suffix}`,
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
      profile_id: profileId,
      status: "active",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (client.error) throw client.error;

  const verifier = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const signedIn = await verifier.auth.signInWithPassword({ email, password });
  if (signedIn.error) {
    throw new Error(`Ephemeral client login preflight failed: ${signedIn.error.message}`);
  }
  await verifier.auth.signOut();

  await appendFile(
    githubEnv,
    [
      `E2E_CANONICAL_EMAIL=${email}`,
      `E2E_CANONICAL_PASSWORD=${password}`,
      `E2E_CANONICAL_PROFILE_ID=${profileId}`,
      `E2E_CANONICAL_CLIENT_ID=${client.data.id}`,
      "",
    ].join("\n"),
  );

  console.log("Ephemeral canonical E2E client created and login preflight passed.");
} catch (error) {
  await admin.from("user_roles").delete().eq("profile_id", profileId);
  await admin.from("profiles").delete().eq("id", profileId);
  await admin.auth.admin.deleteUser(profileId);
  throw error;
}
