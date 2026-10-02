"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/supabase/auth";
import { loadHydrationTargetResolution } from "@/lib/method/hydration-loader";
import { persistConfiguredHydrationTarget } from "@/lib/method/hydration-persistence";
import { getAccessibleClient } from "@/lib/supabase/data-access";
import { isUuid } from "@/lib/validation/uuid";

export async function createHydrationTargetAction(
  clientId: string,
  formData: FormData,
) {
  const auth = await requireRole("admin");

  if (!isUuid(clientId)) {
    throw new Error("Cliente invalido");
  }

  const client = await getAccessibleClient(clientId);

  if (!client) {
    throw new Error("Cliente nao disponivel para a atribuicao atual");
  }

  const rawWeight = formData.get("weightKg");
  const weightKg =
    typeof rawWeight === "string"
      ? Number.parseFloat(rawWeight.replace(",", "."))
      : Number.NaN;

  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    throw new Error("Peso invalido");
  }

  const resolution = await loadHydrationTargetResolution(clientId, weightKg);

  await persistConfiguredHydrationTarget({
    clientId,
    createdByProfileId: auth.profileId,
    resolution,
    weightKg,
  });

  revalidatePath("/admin/clientes/" + clientId);
  revalidatePath("/admin/clientes/" + clientId + "/checkins");
  revalidatePath("/cliente/checkins");
}
