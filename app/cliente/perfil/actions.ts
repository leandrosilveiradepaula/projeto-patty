"use server";

import { revalidatePath } from "next/cache";

import { upsertClientRegistrationPrivileged } from "@/lib/clients/registration-admin";
import { parseClientRegistrationForm } from "@/lib/clients/registration";
import { requireRole } from "@/lib/supabase/auth";
import { getCurrentClient } from "@/lib/supabase/data-access";

export type ClientRegistrationFormState = {
  message: string | null;
  success: boolean;
};

export async function updateCurrentClientRegistrationAction(
  _state: ClientRegistrationFormState,
  formData: FormData,
): Promise<ClientRegistrationFormState> {
  await requireRole("client");
  const client = await getCurrentClient();

  if (!client) {
    return {
      message: "Não foi possível localizar seu cadastro de cliente.",
      success: false,
    };
  }

  const parsed = parseClientRegistrationForm(formData);

  if (!parsed.ok) {
    return {
      message: parsed.message,
      success: false,
    };
  }

  try {
    await upsertClientRegistrationPrivileged({
      clientId: client.id,
      registration: parsed.value,
    });
  } catch {
    return {
      message:
        "Não foi possível atualizar seu cadastro atual. Tente novamente.",
      success: false,
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/pendencias");
  revalidatePath(`/admin/clientes/${client.id}`);
  revalidatePath("/cliente");
  revalidatePath("/cliente/perfil");

  return {
    message: "Cadastro atual atualizado com sucesso.",
    success: true,
  };
}
