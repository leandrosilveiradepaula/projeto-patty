import { authorizedCorrectionHistoryDay } from "@/lib/checkins/correction-return-day";
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { checkinHistorySearch } from "@/lib/checkins/history-day";
import { parsePositiveCheckinMl } from "@/lib/checkins/amount";
import { loadSupportedLiquidTaxonomy } from "@/lib/method/liquid-taxonomy-loader";
import { createLiquidIntakeWithMethodSnapshot } from "@/lib/method/liquid-persistence";
import { requireRole } from "@/lib/supabase/auth";
import { isUuid } from "@/lib/validation/uuid";
import { parseExpectedCheckinCorrectionId, checkinCorrectionSnapshotMatches, liquidCorrectionChangesValue, activityCorrectionChangesValue } from "@/lib/checkins/correction-audit";
import { latestCheckinCorrectionsByEvent } from "@/lib/checkins/effective-corrections";
import {
  createAccessibleClientActivityCheckinEventCorrection,
  createAccessibleClientLiquidIntakeEventCorrection,
  createCurrentClientActivityCheckinEvent,
  getCurrentClient,
  listAccessibleClientActivityCheckinEvents,
  listAccessibleClientLiquidIntakeEvents,
  getAccessibleClientLiquidIntakeEvent,
  getAccessibleClientActivityCheckinEvent,
  listAccessibleClientLiquidIntakeEventCorrections,
  listAccessibleClientActivityCheckinEventCorrections,
} from "@/lib/supabase/data-access";

function correctionRedirect(
  status: "correction-invalid" | "correction-error" | "correction-recorded" | "correction-conflict" | "correction-unchanged",
  formData: FormData,
  kind: "liquido" | "atividade",
  event?: { recorded_at?: string | null; checkin_date?: string | null } | null,
) {
  const day = authorizedCorrectionHistoryDay(kind, event, formData.get("historyDay"), currentSaoPauloDate());
  const eventId = formData.get("eventId");
  const anchor = typeof eventId === "string" && isUuid(eventId)
    ? `#${kind}-${eventId}`
    : "";
  const exactQuery = typeof eventId === "string" && isUuid(eventId)
    ? `&${kind === "liquido" ? "liquidoExato" : "atividadeExata"}=${eventId}` : "";
  return "/cliente/checkins?status=" + status + checkinHistorySearch(day) + exactQuery + anchor;
}

function currentSaoPauloDate() {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(new Date());
}

/**
 * The same factual records appear in both authenticated workspaces.
 * Invalidate the administrative view only after a write is confirmed.
 */
function revalidateCheckinJourneys(clientId: string) {
  revalidatePath("/cliente");
  revalidatePath("/cliente/checkins");
  revalidatePath("/admin");
  revalidatePath("/admin/pendencias");
  revalidatePath(`/admin/clientes/${clientId}`);
  revalidatePath(`/admin/clientes/${clientId}/checkins`);
}

export async function addLiquidIntakeAction(formData: FormData) {
  const auth = await requireRole("client");
  const client = await getCurrentClient();

  if (!client) {
    redirect("/cliente/checkins?status=client-unavailable");
  }

  const rawAmount = formData.get("amountMl");
  const rawKind = formData.get("liquidKind");
  const amountMl = parsePositiveCheckinMl(rawAmount);

  if (amountMl === null) {
    redirect("/cliente/checkins?status=liquid-invalid");
  }

  const taxonomy = await loadSupportedLiquidTaxonomy();
  const liquidKind =
    typeof rawKind === "string"
      ? taxonomy.kinds.find((kind) => kind.key === rawKind) ?? null
      : null;

  if (!liquidKind) {
    redirect("/cliente/checkins?status=liquid-invalid");
  }

  try {
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
  } catch {
    redirect("/cliente/checkins?status=liquid-error");
  }

  revalidateCheckinJourneys(client.id);
  redirect("/cliente/checkins?status=liquid-recorded");
}

export async function recordActivityCheckinAction(formData: FormData) {
  const auth = await requireRole("client");
  const client = await getCurrentClient();

  if (!client) {
    redirect("/cliente/checkins?status=client-unavailable");
  }

  const rawValue = formData.get("didActivity");

  if (rawValue !== "yes" && rawValue !== "no") {
    redirect("/cliente/checkins?status=activity-invalid");
  }

  const checkinDate = currentSaoPauloDate();
  // This is a UX-level duplicate guard, not a transactional uniqueness
  // guarantee across independent tabs or devices. Preserve existing events.
  let recordedToday = false;
  try {
    recordedToday = (
      await listAccessibleClientActivityCheckinEvents(client.id, checkinDate)
    ).length > 0;
  } catch {
    redirect("/cliente/checkins?status=activity-error");
  }

  if (recordedToday) {
    redirect("/cliente/checkins?status=activity-already-recorded#atividade-fisica");
  }

  try {
    await createCurrentClientActivityCheckinEvent({
      checkinDate,
      clientId: client.id,
      didActivity: rawValue === "yes",
      recordedByProfileId: auth.profileId,
    });
  } catch {
    redirect("/cliente/checkins?status=activity-error");
  }

  revalidateCheckinJourneys(client.id);
  redirect("/cliente/checkins?status=activity-recorded");
}


export async function correctLiquidIntakeAction(formData: FormData) {
  const auth = await requireRole("client");
  const client = await getCurrentClient();

  if (!client) redirect("/cliente/checkins?status=client-unavailable");

  const eventId = formData.get("eventId");
  const rawAmount = formData.get("amountMl");
  const rawKind = formData.get("liquidKind");
  const amountMl = parsePositiveCheckinMl(rawAmount);

  if (
    typeof eventId !== "string" ||
    !isUuid(eventId) ||
    amountMl === null
  ) {
    redirect(correctionRedirect("correction-invalid", formData, "liquido"));
  }

  const expected = parseExpectedCheckinCorrectionId(formData.get("expectedCorrectionId"));
  if (!expected.valid) redirect(correctionRedirect("correction-invalid", formData, "liquido"));
  const event = await getAccessibleClientLiquidIntakeEvent(client.id, eventId);

  if (!event) redirect(correctionRedirect("correction-invalid", formData, "liquido", event));

  const taxonomy = await loadSupportedLiquidTaxonomy();
  const liquidKind =
    typeof rawKind === "string"
      ? taxonomy.kinds.find((kind) => kind.key === rawKind) ?? null
      : null;

  if (!liquidKind) redirect(correctionRedirect("correction-invalid", formData, "liquido", event));

  const latest = latestCheckinCorrectionsByEvent(await listAccessibleClientLiquidIntakeEventCorrections([eventId])).get(eventId);
  if (!checkinCorrectionSnapshotMatches(expected.id, latest)) {
    redirect(correctionRedirect("correction-conflict", formData, "liquido", event));
  }
  if (!liquidCorrectionChangesValue(event, latest, amountMl, liquidKind.key)) {
    redirect(correctionRedirect("correction-unchanged", formData, "liquido", event));
  }
  try {
    await createAccessibleClientLiquidIntakeEventCorrection({
      amountMl,
      correctedByProfileId: auth.profileId,
      eventId,
      liquidKind: liquidKind.key,
      recordedAt: event.recorded_at,
    });
  } catch {
    redirect(correctionRedirect("correction-error", formData, "liquido", event));
  }

  revalidateCheckinJourneys(client.id);
  redirect(correctionRedirect("correction-recorded", formData, "liquido", event));
}

export async function correctActivityCheckinAction(formData: FormData) {
  const auth = await requireRole("client");
  const client = await getCurrentClient();

  if (!client) redirect("/cliente/checkins?status=client-unavailable");

  const eventId = formData.get("eventId");
  const rawValue = formData.get("didActivity");

  if (
    typeof eventId !== "string" ||
    !isUuid(eventId) ||
    (rawValue !== "yes" && rawValue !== "no")
  ) {
    redirect(correctionRedirect("correction-invalid", formData, "atividade"));
  }

  const expected = parseExpectedCheckinCorrectionId(formData.get("expectedCorrectionId"));
  if (!expected.valid) redirect(correctionRedirect("correction-invalid", formData, "atividade"));
  const event = await getAccessibleClientActivityCheckinEvent(client.id, eventId);

  if (!event) redirect(correctionRedirect("correction-invalid", formData, "atividade", event));

  const latest = latestCheckinCorrectionsByEvent(await listAccessibleClientActivityCheckinEventCorrections([eventId])).get(eventId);
  if (!checkinCorrectionSnapshotMatches(expected.id, latest)) {
    redirect(correctionRedirect("correction-conflict", formData, "atividade", event));
  }
  if (!activityCorrectionChangesValue(event, latest, event.checkin_date, rawValue === "yes")) {
    redirect(correctionRedirect("correction-unchanged", formData, "atividade", event));
  }
  try {
    await createAccessibleClientActivityCheckinEventCorrection({
      checkinDate: event.checkin_date,
      correctedByProfileId: auth.profileId,
      didActivity: rawValue === "yes",
      eventId,
    });
  } catch {
    redirect(correctionRedirect("correction-error", formData, "atividade", event));
  }

  revalidateCheckinJourneys(client.id);
  redirect(correctionRedirect("correction-recorded", formData, "atividade", event));
}
