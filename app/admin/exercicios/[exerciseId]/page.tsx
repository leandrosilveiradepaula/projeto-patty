import {
  createNextExerciseVersionAction,
  publishExerciseVersionAction,
  updateExerciseDraftAction,
} from "@/app/admin/exercicios/[exerciseId]/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { findSingleDraftExerciseVersion } from "@/lib/training/exercise-versioning";
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

  const versions = await listExerciseVersionsForCurrentAdmin(exercise.id);
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
              <form
                action={updateExerciseDraftAction.bind(
                  null,
                  exercise.id,
                  draft.id,
                )}
                className={styles.form}
              >
                <label className={styles.field}>
                  <span>Nome do exercício</span>
                  <input
                    defaultValue={draft.name}
                    maxLength={200}
                    name="exerciseName"
                    required
                  />
                </label>
                <Button type="submit">Salvar rascunho</Button>
              </form>
            </Card>

            <Card>
              <h2 className={styles.cardTitle}>Publicar versão</h2>
              <p className={styles.description}>
                Depois de publicada, esta versão não é editada pela interface.
                Mudanças futuras são feitas em uma nova versão.
              </p>
              <form
                action={publishExerciseVersionAction.bind(
                  null,
                  exercise.id,
                  draft.id,
                )}
                className={styles.form}
              >
                <label className={styles.confirmation}>
                  <input
                    name="confirmPublish"
                    required
                    type="checkbox"
                    value="yes"
                  />
                  <span>Confirmo a publicação desta versão.</span>
                </label>
                <Button type="submit">Publicar exercício</Button>
              </form>
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
              <Badge variant="positive">Publicado</Badge>
            </div>
            <form action={createNextExerciseVersionAction.bind(null, exercise.id)}>
              <Button type="submit">Criar nova versão</Button>
            </form>
          </Card>
        ) : (
          <EmptyState
            description="Este exercício não possui versão disponível. Isso indica um estado incompleto que precisa de revisão."
            title="Sem versão"
          />
        )}
      </Section>

      <Section
        description="O histórico permanece disponível para a Patty. A cliente visualiza somente a versão publicada mais recente de cada exercício."
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
              <li key={version.id}>
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
                    <Badge variant={version.published_at ? "positive" : "warning"}>
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
