"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseCheckinHistoryDay } from "@/lib/checkins/history-day";
import { parsePositiveCheckinMl } from "@/lib/checkins/amount";
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
  const amountMl = parsePositiveCheckinMl(rawAmount);

  if (
    typeof eventId !== "string" ||
    !eventId ||
    amountMl === null
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

  revalidatePath("/admin");
  revalidatePath("/admin/pendencias");
  revalidatePath(`/admin/clientes/${client.id}`);
  revalidatePath(adminCheckinsPath(clientId));
  revalidatePath("/cliente");
  revalidatePath("/cliente/checkins");
  const today = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date());
  const historyDay = parseCheckinHistoryDay(formData.get("historyDay"), today);
  redirect(adminCheckinsPath(clientId, "correction-recorded") + (historyDay ? "&dia=" + historyDay : ""));
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

  revalidatePath("/admin");
  revalidatePath("/admin/pendencias");
  revalidatePath(`/admin/clientes/${client.id}`);
  revalidatePath(adminCheckinsPath(clientId));
  revalidatePath("/cliente");
  revalidatePath("/cliente/checkins");
  const today = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date());
  const historyDay = parseCheckinHistoryDay(formData.get("historyDay"), today);
  redirect(adminCheckinsPath(clientId, "correction-recorded") + (historyDay ? "&dia=" + historyDay : ""));
}
