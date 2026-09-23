import "server-only";

import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "admin" | "client";

export type AuthContext = { profileId: string; role: AppRole | null };

export type AuthenticatorAssuranceState = {
  currentLevel: string | null;
  nextLevel: string | null;
};

export async function getCurrentAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const profileId = claimsData?.claims?.sub;

  if (claimsError || typeof profileId !== "string") return null;

  // Role lookup must remain available before an admin reaches aal2 so the
  // application can route an authenticated admin into MFA enrollment/challenge.
  // The profile id comes from verified Auth claims; the privileged client stays
  // server-only and the query is restricted to that exact profile id.
  const admin = createAdminClient();
  const { data: roles, error: rolesError } = await admin
    .from("user_roles")
    .select("role")
    .eq("profile_id", profileId);

  if (rolesError || roles?.length !== 1) return { profileId, role: null };

  const role = roles[0].role;
  return role === "admin" || role === "client"
    ? { profileId, role }
    : { profileId, role: null };
}

export async function getAuthenticatorAssuranceState(): Promise<AuthenticatorAssuranceState> {
  const supabase = await createClient();
  const { data, error } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (error) {
    throw error;
  }

  return {
    currentLevel: data.currentLevel,
    nextLevel: data.nextLevel,
  };
}

export async function requireRoleIdentity(role: AppRole) {
  const context = await getCurrentAuthContext();

  if (!context || context.role !== role) {
    redirect("/login");
  }

  return context;
}

function redirectAdminToMfa(state: AuthenticatorAssuranceState): never {
  if (state.nextLevel === "aal2") {
    redirect("/mfa/admin/challenge");
  }

  redirect("/mfa/admin/setup");
}

export async function requireRole(role: AppRole) {
  const context = await requireRoleIdentity(role);

  if (role === "admin") {
    const assurance = await getAuthenticatorAssuranceState();

    if (assurance.currentLevel !== "aal2") {
      redirectAdminToMfa(assurance);
    }
  }

  return context;
}
