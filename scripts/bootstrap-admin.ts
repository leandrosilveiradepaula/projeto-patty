import { createClient } from "@supabase/supabase-js";

import { resolveAdminBootstrapState } from "../lib/onboarding/admin-bootstrap.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim();

if (!url || !secretKey || !email) {
  throw new Error("Missing admin bootstrap environment");
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error("Invalid admin bootstrap email");
}

const admin = createClient(url, secretKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
});

async function findUserByEmail(targetEmail: string) {
  const normalized = targetEmail.toLocaleLowerCase("en-US");

  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) throw error;

    const match = data.users.find(
      (user) => user.email?.toLocaleLowerCase("en-US") === normalized,
    );

    if (match) return match;
    if (data.users.length < 100) return null;
  }

  throw new Error("Auth user pagination limit reached");
}

let user = await findUserByEmail(email);
let invitedNow = false;
let profileCreatedNow = false;
let roleCreatedNow = false;

try {
  if (!user) {
    const invitation = await admin.auth.admin.inviteUserByEmail(email);

    if (invitation.error || !invitation.data.user) {
      throw invitation.error ?? new Error("Admin invitation returned no user");
    }

    user = invitation.data.user;
    invitedNow = true;
  }

  const [profileResult, rolesResult, clientResult] = await Promise.all([
    admin.from("profiles").select("id").eq("id", user.id).maybeSingle(),
    admin.from("user_roles").select("role").eq("profile_id", user.id),
    admin.from("clients").select("id").eq("profile_id", user.id).maybeSingle(),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (rolesResult.error) throw rolesResult.error;
  if (clientResult.error) throw clientResult.error;

  const state = resolveAdminBootstrapState({
    clientLinked: Boolean(clientResult.data),
    roles: rolesResult.data.map((item) => item.role),
  });

  if (!profileResult.data) {
    const profileInsert = await admin.from("profiles").insert({ id: user.id });
    if (profileInsert.error) throw profileInsert.error;
    profileCreatedNow = true;
  }

  if (state === "create_admin_role") {
    const roleInsert = await admin.from("user_roles").insert({
      profile_id: user.id,
      role: "admin",
    });
    if (roleInsert.error) throw roleInsert.error;
    roleCreatedNow = true;
  }

  console.log(
    state === "already_admin"
      ? "Admin bootstrap verified: account is already provisioned."
      : "Admin bootstrap completed: invitation/account and admin role are provisioned.",
  );
} catch (error) {
  let cleanupFailed = false;

  if (invitedNow && user) {
    if (roleCreatedNow) {
      const roleCleanup = await admin
        .from("user_roles")
        .delete()
        .eq("profile_id", user.id)
        .eq("role", "admin");
      cleanupFailed ||= Boolean(roleCleanup.error);
    }

    if (profileCreatedNow) {
      const profileCleanup = await admin
        .from("profiles")
        .delete()
        .eq("id", user.id);
      cleanupFailed ||= Boolean(profileCleanup.error);
    }

    const authCleanup = await admin.auth.admin.deleteUser(user.id);
    cleanupFailed ||= Boolean(authCleanup.error);
  }

  if (cleanupFailed) {
    throw new Error("Admin bootstrap failed and compensation was incomplete");
  }

  throw error;
}
