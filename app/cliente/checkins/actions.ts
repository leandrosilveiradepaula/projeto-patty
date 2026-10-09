"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseCheckinHistoryDay } from "@/lib/checkins/history-day";
import { parsePositiveCheckinMl } from "@/lib/checkins/amount";
import { loadSupportedLiquidTaxonomy } from "@/lib/method/liquid-taxonomy-loader";
import { createLiquidIntakeWithMethodSnapshot } from "@/lib/method/liquid-persistence";
import { requireRole } from "@/lib/supabase/auth";
import {
  createAccessibleClientActivityCheckinEventCorrection,
  createAccessibleClientLiquidIntakeEventCorrection,
  createCurrentClientActivityCheckinEvent,
  getCurrentClient,
  listAccessibleClientActivityCheckinEvents,
  listAccessibleClientLiquidIntakeEvents,
} from "@/lib/supabase/data-access";

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

  try {
    await createCurrentClientActivityCheckinEvent({
      checkinDate: currentSaoPauloDate(),
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
    !eventId ||
    amountMl === null
  ) {
    redirect("/cliente/checkins?status=correction-invalid");
  }

  const events = await listAccessibleClientLiquidIntakeEvents(client.id);
  const event = events.find((item) => item.id === eventId);

  if (!event) redirect("/cliente/checkins?status=correction-invalid");

  const taxonomy = await loadSupportedLiquidTaxonomy();
  const liquidKind =
    typeof rawKind === "string"
      ? taxonomy.kinds.find((kind) => kind.key === rawKind) ?? null
      : null;

  if (!liquidKind) redirect("/cliente/checkins?status=correction-invalid");

  try {
    await createAccessibleClientLiquidIntakeEventCorrection({
      amountMl,
      correctedByProfileId: auth.profileId,
      eventId,
      liquidKind: liquidKind.key,
      recordedAt: event.recorded_at,
    });
  } catch {
    redirect("/cliente/checkins?status=correction-error");
  }

  revalidateCheckinJourneys(client.id);
  const historyDay = parseCheckinHistoryDay(formData.get("historyDay"), currentSaoPauloDate());
  redirect("/cliente/checkins?status=correction-recorded" + (historyDay ? "&dia=" + historyDay : ""));
}

export async function correctActivityCheckinAction(formData: FormData) {
  const auth = await requireRole("client");
  const client = await getCurrentClient();

  if (!client) redirect("/cliente/checkins?status=client-unavailable");

  const eventId = formData.get("eventId");
  const rawValue = formData.get("didActivity");

  if (
    typeof eventId !== "string" ||
    !eventId ||
    (rawValue !== "yes" && rawValue !== "no")
  ) {
    redirect("/cliente/checkins?status=correction-invalid");
  }

  const events = await listAccessibleClientActivityCheckinEvents(client.id);
  const event = events.find((item) => item.id === eventId);

  if (!event) redirect("/cliente/checkins?status=correction-invalid");

  try {
    await createAccessibleClientActivityCheckinEventCorrection({
      checkinDate: event.checkin_date,
      correctedByProfileId: auth.profileId,
      didActivity: rawValue === "yes",
      eventId,
    });
  } catch {
    redirect("/cliente/checkins?status=correction-error");
  }

  revalidateCheckinJourneys(client.id);
  const historyDay = parseCheckinHistoryDay(formData.get("historyDay"), currentSaoPauloDate());
  redirect("/cliente/checkins?status=correction-recorded" + (historyDay ? "&dia=" + historyDay : ""));
}
