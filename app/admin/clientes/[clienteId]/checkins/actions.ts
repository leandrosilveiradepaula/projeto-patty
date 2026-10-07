"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { loadSupportedLiquidTaxonomy } from "@/lib/method/liquid-taxonomy-loader";
import { requireRole } from "@/lib/supabase/auth";
import {
  createAccessibleClientActivityCheckinEventCorrection,
  createAccessibleClientLiquidIntakeEventCorrection,
  getAccessibleClient,
  listAccessibleClientActivityCheckinEvents,
  listAccessibleClientLiquidIntakeEvents,
} from "@/lib/supabase/data-access";

function adminCheckinsPath(clientId: string, status?: string) {
  const path = `/admin/clientes/${clientId}/checkins`;
  return status ? `${path}?status=${status}` : path;
}

export async function correctClientLiquidIntakeAction(
  clientId: string,
  formData: FormData,
) {
  const auth = await requireRole("admin");
  const client = await getAccessibleClient(clientId);

  if (!client) redirect(adminCheckinsPath(clientId, "client-unavailable"));

  const eventId = formData.get("eventId");
  const rawAmount = formData.get("amountMl");
  const rawKind = formData.get("liquidKind");
  const amountMl =
    typeof rawAmount === "string" ? Number.parseInt(rawAmount, 10) : Number.NaN;

  if (
    typeof eventId !== "string" ||
    !eventId ||
    !Number.isInteger(amountMl) ||
    amountMl <= 0
  ) {
    redirect(adminCheckinsPath(clientId, "correction-invalid"));
  }

  const events = await listAccessibleClientLiquidIntakeEvents(client.id);
  const event = events.find((item) => item.id === eventId);

  if (!event) redirect(adminCheckinsPath(clientId, "correction-invalid"));

  const taxonomy = await loadSupportedLiquidTaxonomy();
  const liquidKind =
    typeof rawKind === "string"
      ? taxonomy.kinds.find((kind) => kind.key === rawKind) ?? null
      : null;

  if (!liquidKind) redirect(adminCheckinsPath(clientId, "correction-invalid"));

  try {
    await createAccessibleClientLiquidIntakeEventCorrection({
      amountMl,
      correctedByProfileId: auth.profileId,
      eventId,
      liquidKind: liquidKind.key,
      recordedAt: event.recorded_at,
    });
  } catch {
    redirect(adminCheckinsPath(clientId, "correction-error"));
  }

  revalidatePath(adminCheckinsPath(clientId));
  revalidatePath("/cliente");
  revalidatePath("/cliente/checkins");
  redirect(adminCheckinsPath(clientId, "correction-recorded"));
}

export async function correctClientActivityCheckinAction(
  clientId: string,
  formData: FormData,
) {
  const auth = await requireRole("admin");
  const client = await getAccessibleClient(clientId);

  if (!client) redirect(adminCheckinsPath(clientId, "client-unavailable"));

  const eventId = formData.get("eventId");
  const rawValue = formData.get("didActivity");

  if (
    typeof eventId !== "string" ||
    !eventId ||
    (rawValue !== "yes" && rawValue !== "no")
  ) {
    redirect(adminCheckinsPath(clientId, "correction-invalid"));
  }

  const events = await listAccessibleClientActivityCheckinEvents(client.id);
  const event = events.find((item) => item.id === eventId);

  if (!event) redirect(adminCheckinsPath(clientId, "correction-invalid"));

  try {
    await createAccessibleClientActivityCheckinEventCorrection({
      checkinDate: event.checkin_date,
      correctedByProfileId: auth.profileId,
      didActivity: rawValue === "yes",
      eventId,
    });
  } catch {
    redirect(adminCheckinsPath(clientId, "correction-error"));
  }

  revalidatePath(adminCheckinsPath(clientId));
  revalidatePath("/cliente");
  revalidatePath("/cliente/checkins");
  redirect(adminCheckinsPath(clientId, "correction-recorded"));
}
