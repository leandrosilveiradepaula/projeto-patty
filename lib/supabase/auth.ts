import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type AppRole = "admin" | "client";

export type AuthContext = { profileId: string; role: AppRole | null };

export async function getCurrentAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const profileId = claimsData?.claims?.sub;

  if (claimsError || typeof profileId !== "string") return null;

  const { data: roles, error: rolesError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("profile_id", profileId);

  if (rolesError || roles?.length !== 1) return { profileId, role: null };

  const role = roles[0].role;
  return role === "admin" || role === "client" ? { profileId, role } : { profileId, role: null };
}

export async function requireRole(role: AppRole) {
  const context = await getCurrentAuthContext();
  if (!context || context.role !== role) redirect("/login");
  return context;
}
