"use server";

import { revalidatePath } from "next/cache";

import { parseContentDisplayOrder } from "@/lib/content/display-order";
import { isEducationalContentTypeKey } from "@/lib/content/publication-eligibility";
import { requireRole } from "@/lib/supabase/auth";
import {
  createAccessibleEducationalContent,
  createAccessibleEducationalContentVersion,
  deleteAccessibleEducationalContentWithoutVersions,
} from "@/lib/supabase/data-access";

export type CreateEducationalContentState =
  | { contentId: string; message: null; success: true }
  | { contentId: null; message: string; success: false };

function readTitle(formData: FormData) {
  const raw = formData.get("title");
  if (typeof raw !== "string") {
    throw new Error("Informe o título do conteúdo.");
  }

  const title = raw.trim();
  if (!title || title.length > 200) {
    throw new Error("Informe um título com até 200 caracteres.");
  }
  return title;
}

function readDisplayOrder(formData: FormData) {
  const value = parseContentDisplayOrder(formData.get("displayOrder"));
  if (value === null) {
    throw new Error("Informe uma ordem inteira entre 1 e 2147483647.");
  }
  return value;
}

function readContentTypeKey(formData: FormData) {
  const value = formData.get("contentTypeKey");
  if (typeof value !== "string" || !isEducationalContentTypeKey(value)) {
    throw new Error("Selecione Vídeo ou PDF para o conteúdo.");
  }
  return value;
}

export async function createEducationalContentDraftAction(
  formData: FormData,
): Promise<CreateEducationalContentState> {
  await requireRole("admin");

  let title: string;
  let displayOrder: number;
  let contentTypeKey: "video" | "pdf";
  try {
    title = readTitle(formData);
    displayOrder = readDisplayOrder(formData);
    contentTypeKey = readContentTypeKey(formData);
  } catch (error) {
    return {
      contentId: null,
      message: error instanceof Error ? error.message : "Verifique os campos informados.",
      success: false,
    };
  }

  let content: Awaited<ReturnType<typeof createAccessibleEducationalContent>>;
  try {
    content = await createAccessibleEducationalContent();
  } catch {
    return {
      contentId: null,
      message: "Não foi possível iniciar o cadastro. Confira a biblioteca antes de tentar novamente.",
      success: false,
    };
  }

  try {
    await createAccessibleEducationalContentVersion({
      contentId: content.id,
      contentTypeKey,
      displayOrder,
      title,
      versionNumber: 1,
    });
  } catch {
    try {
      // Only the new empty parent from this attempt is eligible for cleanup.
      await deleteAccessibleEducationalContentWithoutVersions(content.id);
    } catch {
      // Inconclusive cleanup: preserve evidence and recommend manual review.
    }

    return {
      contentId: null,
      message: "Não foi possível confirmar o rascunho. Confira a biblioteca antes de tentar novamente.",
      success: false,
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/pendencias");
  revalidatePath("/admin/conteudos");
  return { contentId: content.id, message: null, success: true };
}
