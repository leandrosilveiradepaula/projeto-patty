"use server";

import { revalidatePath } from "next/cache";

import { loadSupportedLiquidTaxonomy } from "@/lib/method/liquid-taxonomy-loader";
import { createLiquidIntakeWithMethodSnapshot } from "@/lib/method/liquid-persistence";
import { requireRole } from "@/lib/supabase/auth";
import {
  createCurrentClientActivityCheckinEvent,
  getCurrentClient,
} from "@/lib/supabase/data-access";

function currentSaoPauloDate() {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(new Date());
}

export async function addLiquidIntakeAction(formData: FormData) {
  const auth = await requireRole("client");
  const client = await getCurrentClient();

  if (!client) {
    throw new Error("Client profile is unavailable");
  }

  const rawAmount = formData.get("amountMl");
  const rawKind = formData.get("liquidKind");
  const amountMl =
    typeof rawAmount === "string" ? Number.parseInt(rawAmount, 10) : Number.NaN;

  if (!Number.isInteger(amountMl) || amountMl <= 0) {
    throw new Error("Quantidade de liquido invalida");
  }

  const taxonomy = await loadSupportedLiquidTaxonomy();
  const liquidKind =
    typeof rawKind === "string"
      ? taxonomy.kinds.find((kind) => kind.key === rawKind) ?? null
      : null;

  if (!liquidKind) {
    throw new Error("Tipo de liquido invalido");
  }

  await createLiquidIntakeWithMethodSnapshot({
    amountMl,
    clientId: client.id,
    liquidKind: liquidKind.key,
    recordedByProfileId: auth.profileId,
    templateVersionId: taxonomy.templateVersionId,
    resolvedConfiguration: taxonomy.configuration,
    resultValues: {
      liquid_kind: liquidKind.key,
      hydration_class: liquidKind.hydrationClass,
    },
  });

  revalidatePath("/cliente");
  revalidatePath("/cliente/checkins");
}

export async function recordActivityCheckinAction(formData: FormData) {
  const auth = await requireRole("client");
  const client = await getCurrentClient();

  if (!client) {
    throw new Error("Client profile is unavailable");
  }

  const rawValue = formData.get("didActivity");

  if (rawValue !== "yes" && rawValue !== "no") {
    throw new Error("Resposta de atividade fisica invalida");
  }

  await createCurrentClientActivityCheckinEvent({
    checkinDate: currentSaoPauloDate(),
    clientId: client.id,
    didActivity: rawValue === "yes",
    recordedByProfileId: auth.profileId,
  });

  revalidatePath("/cliente");
  revalidatePath("/cliente/checkins");
}
