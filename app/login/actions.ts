"use server";

import { redirect } from "next/navigation";

import { getCurrentAuthContext } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { message: string | null };
export const initialLoginState: LoginState = { message: null };

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
    return { message: "Email ou senha inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) return { message: "Email ou senha inválidos." };

  const context = await getCurrentAuthContext();
  if (context?.role === "admin") redirect("/admin");
  if (context?.role === "client") redirect("/cliente");

  await supabase.auth.signOut({ scope: "local" });
  return { message: "Seu acesso ainda não está configurado." };
}
