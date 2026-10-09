"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { checkinHistorySearch, parseCheckinHistoryDay } from "@/lib/checkins/history-day";
import { parsePositiveCheckinMl } from "@/lib/checkins/amount";
import { loadSupportedLiquidTaxonomy } from "@/lib/method/liquid-taxonomy-loader";
import { isUuid } from "@/lib/validation/uuid";
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

function correctionReturnPath(
  clientId: string,
  status: "correction-invalid" | "correction-error" | "correction-recorded",
  formData: FormData,
  kind: "liquido" | "atividade",
) {
  const today = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(new Date());
  const day = parseCheckinHistoryDay(formData.get("historyDay"), today);
  const eventId = formData.get("eventId");
  const anchor = typeof eventId === "string" && isUuid(eventId)
    ? `#${kind}-${eventId}`
    : "";
  return adminCheckinsPath(clientId, status) + checkinHistorySearch(day) + anchor;
}

export async function correctClientLiquidIntakeAction(
  clientId: string,
  formData: FormData,
) {
  const auth = await requireRole("admin");
  if (!isUuid(clientId)) redirect("/admin/clientes?status=invalid");
  const client = await getAccessibleClient(clientId);

  if (!client) redirect(adminCheckinsPath(clientId, "client-unavailable"));

  const eventId = formData.get("eventId");
  const rawAmount = formData.get("amountMl");
  const rawKind = formData.get("liquidKind");
  const amountMl = parsePositiveCheckinMl(rawAmount);

  if (
    typeof eventId !== "string" ||
    !isUuid(eventId) ||
    amountMl === null
  ) {
    redirect(correctionReturnPath(clientId, "correction-invalid", formData, "liquido"));
  }

  const events = await listAccessibleClientLiquidIntakeEvents(client.id);
  const event = events.find((item) => item.id === eventId);

  if (!event) redirect(correctionReturnPath(clientId, "correction-invalid", formData, "liquido"));

  const taxonomy = await loadSupportedLiquidTaxonomy();
  const liquidKind =
    typeof rawKind === "string"
      ? taxonomy.kinds.find((kind) => kind.key === rawKind) ?? null
      : null;

  if (!liquidKind) redirect(correctionReturnPath(clientId, "correction-invalid", formData, "liquido"));

  try {
    await createAccessibleClientLiquidIntakeEventCorrection({
      amountMl,
      correctedByProfileId: auth.profileId,
      eventId,
      liquidKind: liquidKind.key,
      recordedAt: event.recorded_at,
    });
  } catch {
    redirect(correctionReturnPath(clientId, "correction-error", formData, "liquido"));
  }

  revalidatePath("/admin");
  revalidatePath("/admin/pendencias");
  revalidatePath(`/admin/clientes/${client.id}`);
  revalidatePath(adminCheckinsPath(clientId));
  revalidatePath("/cliente");
  revalidatePath("/cliente/checkins");
  redirect(correctionReturnPath(clientId, "correction-recorded", formData, "liquido"));
}

export async function correctClientActivityCheckinAction(
  clientId: string,
  formData: FormData,
) {
  const auth = await requireRole("admin");
  if (!isUuid(clientId)) redirect("/admin/clientes?status=invalid");
  const client = await getAccessibleClient(clientId);

  if (!client) redirect(adminCheckinsPath(clientId, "client-unavailable"));

  const eventId = formData.get("eventId");
  const rawValue = formData.get("didActivity");

  if (
    typeof eventId !== "string" ||
    !isUuid(eventId) ||
    (rawValue !== "yes" && rawValue !== "no")
  ) {
    redirect(correctionReturnPath(clientId, "correction-invalid", formData, "atividade"));
  }

  const events = await listAccessibleClientActivityCheckinEvents(client.id);
  const event = events.find((item) => item.id === eventId);

  if (!event) redirect(correctionReturnPath(clientId, "correction-invalid", formData, "atividade"));

  try {
    await createAccessibleClientActivityCheckinEventCorrection({
      checkinDate: event.checkin_date,
      correctedByProfileId: auth.profileId,
      didActivity: rawValue === "yes",
      eventId,
    });
  } catch {
    redirect(correctionReturnPath(clientId, "correction-error", formData, "atividade"));
  }

  revalidatePath("/admin");
  revalidatePath("/admin/pendencias");
  revalidatePath(`/admin/clientes/${client.id}`);
  revalidatePath(adminCheckinsPath(clientId));
  revalidatePath("/cliente");
  revalidatePath("/cliente/checkins");
  redirect(correctionReturnPath(clientId, "correction-recorded", formData, "atividade"));
}
