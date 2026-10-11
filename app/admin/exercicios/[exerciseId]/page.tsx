import {
  AdminExerciseDraftEditForm,
  AdminExercisePublishForm,
  AdminExerciseCreateVersionForm,
} from "@/components/admin/AdminExerciseLifecycleForms";
import { Badge } from "@/components/ui/Badge";
import { AdminExerciseRecoverInitialVersionForm } from "@/components/admin/AdminExerciseRecoverInitialVersionForm";
import { exerciseCatalogHref, readExerciseCatalogStatus, readExerciseCatalogTerm, readExerciseCatalogSort, readExerciseCatalogPage } from "@/lib/training/exercise-admin-directory";
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
  searchParams: Promise<{ q?: string; status?: string; ordem?: string; pagina?: string }>;
};

function formatDateTime(value: string) {
  if (!Number.isFinite(Date.parse(value))) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export default async function AdminExerciseDetailPage({ params, searchParams }: PageProps) {
  const [{ exerciseId }, filters] = await Promise.all([params, searchParams]);
  const term = readExerciseCatalogTerm(filters.q);
  const status = readExerciseCatalogStatus(filters.status);
  const backHref = exerciseCatalogHref({term,status,sort:readExerciseCatalogSort(filters.ordem),page:readExerciseCatalogPage(filters.pagina).page,anchor:"biblioteca-exercicios"});

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
          <Link className={styles.backLink} href={backHref}>
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
                key={`${draft.id}:${draft.name}`}
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
          <Card>
            <h2 className={styles.cardTitle}>Recuperar versão inicial</h2>
            <p className={styles.description}>
              O cadastro principal existe, mas sua primeira versão não foi registrada.
              Informe o nome para retomar a versão 1 como rascunho, sem publicar
              nem atribuir este exercício a nenhuma cliente.
            </p>
            <AdminExerciseRecoverInitialVersionForm exerciseId={exercise.id} />
          </Card>
        )}
      </Section>

      <Section
        description="Histórico das versões da biblioteca profissional. A cliente somente vê exercícios escolhidos e publicados no treino individual."
        title="Histórico de versões"
        id="historico-exercicio"
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
