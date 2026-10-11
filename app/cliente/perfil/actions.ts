"use server";

import { revalidatePath } from "next/cache";

import { ClientRegistrationConflictError, upsertClientRegistrationPrivileged } from "@/lib/clients/registration-admin";
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

  const expectedRaw = formData.get("expectedUpdatedAt");
  if (typeof expectedRaw !== "string" || (expectedRaw !== "" && !Number.isFinite(Date.parse(expectedRaw)))) {
    return { message: "A versão do cadastro é inválida. Atualize a página.", success: false };
  }

  try {
    await upsertClientRegistrationPrivileged({
      clientId: client.id,
      expectedUpdatedAt: expectedRaw || null,
      registration: parsed.value,
    });
  } catch (error) {
    if (error instanceof ClientRegistrationConflictError) {
      return {
        message: "Este cadastro foi alterado em outra sessão. Atualize a página e confira os dados antes de salvar novamente.",
        success: false,
      };
    }
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
