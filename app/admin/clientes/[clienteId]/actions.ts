"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { endCurrentAdminClientAssignments } from "@/lib/assignments/client-assignment-admin";
import { requireRole } from "@/lib/supabase/auth";
import { isUuid } from "@/lib/validation/uuid";

export async function endClientAssignmentAction(clientId: string) {
  await requireRole("admin");

  if (!isUuid(clientId)) {
    redirect("/admin/clientes?assignment=invalid");
  }

  const result = await endCurrentAdminClientAssignments({
    clientId,
  });

  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${clientId}`);

  if (result.endedAssignmentIds.length === 0) {
    redirect("/admin/clientes?assignment=unavailable");
  }

  redirect("/admin/clientes?assignment=ended");
}
