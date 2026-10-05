import { updateEducationalContentDraftAction } from "@/app/admin/conteudos/[contentId]/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleEducationalContentForCurrentAdmin,
  listEducationalContentVersionsForCurrentAdmin,
} from "@/lib/supabase/data-access";
import { isUuid } from "@/lib/validation/uuid";
import Link from "next/link";
import { notFound } from "next/navigation";

import styles from "./page.module.css";

type PageProps = {
  params: Promise<{ contentId: string }>;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export default async function AdminEducationalContentDetailPage({
  params,
}: PageProps) {
  const { contentId } = await params;

  if (!isUuid(contentId)) {
    notFound();
  }

  const content = await getAccessibleEducationalContentForCurrentAdmin(contentId);

  if (!content) {
    notFound();
  }

  const versions = await listEducationalContentVersionsForCurrentAdmin(content.id);
  const current = versions[0] ?? null;

  return (
    <>
      <PageHeader
        actions={
          <Link className={styles.backLink} href="/admin/conteudos">
            Voltar à biblioteca
          </Link>
        }
        description="Edite metadados de rascunho sem publicar nem liberar conteúdo automaticamente."
        eyebrow="Admin · Conteúdos"
        title={current?.title ?? "Conteúdo educacional"}
      />

      <Section
        description="Esta etapa não define taxonomia, direitos/licenciamento, arquivo de mídia ou liberação para clientes."
        title="Rascunho"
      >
        {!current ? (
          <EmptyState
            description="Este conteúdo não possui versão cadastrada."
            title="Sem versão"
          />
        ) : current.published_at ? (
          <Card>
            <div className={styles.header}>
              <div>
                <h2 className={styles.title}>{current.title}</h2>
                <p className={styles.description}>
                  Versão {current.version_number} publicada em{" "}
                  {formatDateTime(current.published_at)}.
                </p>
              </div>
              <Badge variant="positive">Publicado</Badge>
            </div>
            <p className={styles.description}>
              A interface não altera versões publicadas. O fluxo de nova versão e
              publicação permanece separado.
            </p>
          </Card>
        ) : (
          <Card>
            <div className={styles.header}>
              <div>
                <h2 className={styles.title}>Versão {current.version_number}</h2>
                <p className={styles.description}>
                  Criada em {formatDateTime(current.created_at)}.
                </p>
              </div>
              <Badge variant="warning">Rascunho</Badge>
            </div>

            <form
              action={updateEducationalContentDraftAction.bind(
                null,
                content.id,
                current.id,
              )}
              className={styles.form}
            >
              <label className={styles.field}>
                <span>Título</span>
                <input
                  defaultValue={current.title}
                  maxLength={200}
                  name="title"
                  required
                />
              </label>

              <label className={styles.field}>
                <span>Ordem de exibição</span>
                <input
                  defaultValue={current.display_order}
                  min="0"
                  name="displayOrder"
                  required
                  type="number"
                />
              </label>

              <Button type="submit">Salvar rascunho</Button>
            </form>

            <p className={styles.description}>
              Categoria atual: {current.category_key ?? "não definida"} · Tipo
              atual: {current.content_type_key ?? "não definido"} · Fase:{" "}
              {current.phase_key ?? "não vinculada"}.
            </p>
          </Card>
        )}
      </Section>

      <Section
        description="Histórico factual das versões já existentes."
        title="Versões"
      >
        <ol className={styles.history}>
          {versions.map((version) => (
            <li key={version.id}>
              <Card variant="subtle">
                <div className={styles.header}>
                  <div>
                    <strong>
                      Versão {version.version_number} · {version.title}
                    </strong>
                    <p className={styles.description}>
                      Criada em {formatDateTime(version.created_at)}
                      {version.published_at
                        ? " · publicada em " + formatDateTime(version.published_at)
                        : " · rascunho"}
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
      </Section>
    </>
  );
}
