"use server";

import { revalidatePath } from "next/cache";

import { ClientRegistrationConflictError, upsertClientRegistrationPrivileged } from "@/lib/clients/registration-admin";
import { parseClientRegistrationForm, clientRegistrationSnapshotFromRow } from "@/lib/clients/registration";
import { requireRole } from "@/lib/supabase/auth";
import { getAccessibleClientRegistration, getCurrentClient } from "@/lib/supabase/data-access";

export type ClientRegistrationFormState = {
  message: string | null;
  success: boolean;
  outcome?: "saved" | "unchanged" | "invalid" | "conflict" | "error";
  field?: import("@/lib/clients/registration").ClientRegistrationField;
  current?: import("@/lib/clients/registration").ClientRegistrationSnapshot;
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
      field: parsed.field,
      outcome: "invalid",
      success: false,
    };
  }

  const expectedRaw = formData.get("expectedUpdatedAt");
  if (typeof expectedRaw !== "string" || (expectedRaw !== "" && !Number.isFinite(Date.parse(expectedRaw)))) {
    return { message: "A versão do cadastro é inválida. Atualize a página.", success: false };
  }

  let writeResult: { outcome: "saved" | "unchanged"; updatedAt: string | null } | null = null;
  try {
    const saved = await upsertClientRegistrationPrivileged({
      clientId: client.id,
      expectedUpdatedAt: expectedRaw || null,
      registration: parsed.value,
    });
    writeResult = { outcome: saved.status, updatedAt: saved.registration?.updated_at ?? null };
  } catch (error) {
    if (error instanceof ClientRegistrationConflictError) {
      const current = await getAccessibleClientRegistration(client.id);
      return {
        current: clientRegistrationSnapshotFromRow(current),
        outcome: "conflict",
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
    ...writeResult,
    message: writeResult?.outcome === "unchanged" ? "Cadastro já está atualizado. Nenhuma gravação nova foi necessária." : "Cadastro atual atualizado com sucesso.",
    success: true,
  };
}esso.",
    success: true,
  };
}
