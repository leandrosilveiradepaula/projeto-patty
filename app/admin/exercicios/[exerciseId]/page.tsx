import {
  AdminExerciseDraftEditForm,
  AdminExercisePublishForm,
  AdminExerciseCreateVersionForm,
} from "@/components/admin/AdminExerciseLifecycleForms";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { findSingleDraftExerciseVersion, nextExerciseVersionNumber } from "@/lib/training/exercise-versioning";
import {
  getAccessibleExerciseForCurrentAdmin,
  listExerciseVersionsForCurrentAdmin,
} from "@/lib/supabase/data-access";
import { isUuid } from "@/lib/validation/uuid";
import Link from "next/link";
import { notFound } from "next/navigation";

import styles from "./page.module.css";

type PageProps = {
  params: Promise<{ exerciseId: string }>;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export default async function AdminExerciseDetailPage({ params }: PageProps) {
  const { exerciseId } = await params;

  if (!isUuid(exerciseId)) {
    notFound();
  }

  const exercise = await getAccessibleExerciseForCurrentAdmin(exerciseId);

  if (!exercise) {
    notFound();
  }

  const versions = (await listExerciseVersionsForCurrentAdmin(exercise.id))
    .slice()
    .sort((left, right) =>
      right.version_number - left.version_number || left.id.localeCompare(right.id),
    );
  const draft = findSingleDraftExerciseVersion(versions);
  const latestPublished =
    versions
      .filter((version) => version.published_at !== null)
      .sort((left, right) => right.version_number - left.version_number)[0] ??
    null;
  const displayName = draft?.name ?? latestPublished?.name ?? "Exercício";

  return (
    <>
      <PageHeader
        actions={
          <Link className={styles.backLink} href="/admin/exercicios">
            Voltar à biblioteca
          </Link>
        }
        description="Edite somente a versão em rascunho. Versões já publicadas permanecem preservadas no histórico."
        eyebrow="Admin · Exercícios"
        title={displayName}
      />

      <Section
        description="A publicação apenas disponibiliza o exercício na biblioteca. Ela não prescreve treino nem define séries, repetições ou carga para uma cliente."
        title="Versão de trabalho"
      >
        {draft ? (
          <div className={styles.grid}>
            <Card>
              <h2 className={styles.cardTitle}>
                Rascunho · versão {draft.version_number}
              </h2>
              <AdminExerciseDraftEditForm
                exerciseId={exercise.id}
                initialName={draft.name}
                key={draft.id}
                versionId={draft.id}
              />
            </Card>

            <Card>
              <h2 className={styles.cardTitle}>Publicar versão</h2>
              <p className={styles.description}>
                Depois de publicada, esta versão não é editada pela interface.
                Mudanças futuras são feitas em uma nova versão.
              </p>
              <AdminExercisePublishForm
                exerciseId={exercise.id}
                key={draft.id}
                name={draft.name}
                versionId={draft.id}
                versionNumber={draft.version_number}
              />
            </Card>
          </div>
        ) : latestPublished ? (
          <Card>
            <div className={styles.summaryHeader}>
              <div>
                <h2 className={styles.cardTitle}>
                  Versão {latestPublished.version_number} publicada
                </h2>
                <p className={styles.description}>
                  Publicada em {formatDateTime(latestPublished.published_at!)}.
                </p>
              </div>
              <Badge variant="neutral">Publicado</Badge>
            </div>
            <AdminExerciseCreateVersionForm
              exerciseId={exercise.id}
              key={latestPublished.id}
              name={latestPublished.name}
              nextVersionNumber={nextExerciseVersionNumber(versions)}
            />
          </Card>
        ) : (
          <EmptyState
            description="Este exercício não possui versão disponível. Isso indica um estado incompleto que precisa de revisão."
            title="Sem versão"
          />
        )}
      </Section>

      <Section
        description="Histórico das versões da biblioteca profissional. A cliente somente vê exercícios escolhidos e publicados no treino individual."
        title="Histórico de versões"
      >
        {versions.length === 0 ? (
          <EmptyState
            description="Nenhuma versão encontrada para este exercício."
            title="Sem versões"
          />
        ) : (
          <ol className={styles.history}>
            {versions.map((version) => (
              <li id={`versao-${version.id}`} key={version.id}>
                <Card variant="subtle">
                  <div className={styles.summaryHeader}>
                    <div>
                      <strong>
                        Versão {version.version_number} · {version.name}
                      </strong>
                      <p className={styles.description}>
                        Criada em {formatDateTime(version.created_at)}
                        {version.published_at
                          ? " · publicada em " +
                            formatDateTime(version.published_at)
                          : " · ainda em rascunho"}
                      </p>
                    </div>
                    <Badge variant={version.published_at ? "neutral" : "warning"}>
                      {version.published_at ? "Publicado" : "Rascunho"}
                    </Badge>
                  </div>
                </Card>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </>
  );
}
