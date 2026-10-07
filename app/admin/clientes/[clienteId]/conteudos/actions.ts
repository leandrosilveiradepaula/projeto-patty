"use server";

import { revalidatePath } from "next/cache";

import { isContentVersionReleaseEligible } from "@/lib/content/release-eligibility";
import { requireRole } from "@/lib/supabase/auth";
import {
  createAccessibleClientContentRelease,
  getAccessibleClient,
  listContentReleasesForAccessibleClient,
  listEducationalContentAssetsForCurrentAdminVersions,
  listEducationalContentVersionsForCurrentAdmin,
} from "@/lib/supabase/data-access";

export type ClientContentReleaseFormState = {
  message: string | null;
  success: boolean;
};

export async function releaseContentToClient(
  clientId: string,
  _state: ClientContentReleaseFormState,
  formData: FormData,
): Promise<ClientContentReleaseFormState> {
  const context = await requireRole("admin");
  const client = await getAccessibleClient(clientId);

  if (!client) {
    return {
      message: "Esta cliente não está acessível para sua atribuição atual.",
      success: false,
    };
  }

  const versionId = formData.get("educationalContentVersionId");

  if (typeof versionId !== "string" || !versionId) {
    return {
      message: "Selecione uma versão publicada para liberar.",
      success: false,
    };
  }

  const [versions, releases, assets] = await Promise.all([
    listEducationalContentVersionsForCurrentAdmin(),
    listContentReleasesForAccessibleClient(client.id),
    listEducationalContentAssetsForCurrentAdminVersions([versionId]),
  ]);
  const releasedVersionIds = new Set(
    releases.flatMap((release) =>
      release.educational_content_versions?.id
        ? [release.educational_content_versions.id]
        : [],
    ),
  );
  const selectedVersion = versions.find((version) => version.id === versionId);

  if (
    !selectedVersion ||
    !isContentVersionReleaseEligible({
      alreadyReleased: releasedVersionIds.has(versionId),
      hasAsset: assets.length > 0,
      publishedAt: selectedVersion.published_at,
    })
  ) {
    return {
      message:
        "A versão selecionada não está publicada, não possui arquivo privado registrado, não está disponível ou já foi liberada.",
      success: false,
    };
  }

  try {
    await createAccessibleClientContentRelease(
      client.id,
      selectedVersion.id,
      context.profileId,
    );
  } catch {
    return {
      message:
        "Não foi possível liberar esta versão. Ela pode já estar liberada ou seu acesso atual pode ter mudado.",
      success: false,
    };
  }

  revalidatePath(`/admin/clientes/${client.id}/conteudos`);
  revalidatePath("/cliente/conteudos");

  return {
    message: "Conteúdo liberado para a cliente.",
    success: true,
  };
}
