import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  CLIENT_MORE_GROUP_LABELS,
  CLIENT_MORE_GROUPS,
  CLIENT_MORE_QUERY_MAX_LENGTH,
  filterClientMoreAreas,
  parseClientMoreFilters,
  type ClientMoreArea,
} from "@/lib/clients/client-more-directory";
import Link from "next/link";
import styles from "./page.module.css";

const areas: ClientMoreArea[] = [
  {
    description: "Volte ao painel principal e veja o que precisa da sua atenção.",
    group: "inicio",
    href: "/cliente",
    title: "Início",
  },
  {
    description: "Consulte seu plano alimentar publicado pela Patty e versões anteriores.",
    group: "planos",
    href: "/cliente/protocolo",
    title: "Meu protocolo",
  },
  {
    description: "Registre sua atividade e os líquidos consumidos, com histórico e correções.",
    group: "registros",
    href: "/cliente/checkins",
    title: "Check-ins",
  },
  {
    description: "Responda ou continue o formulário semanal solicitado pela Patty.",
    group: "registros",
    href: "/cliente/feedback-semanal",
    title: "Feedback semanal",
  },
  {
    description: "Preencha, continue ou consulte suas respostas já enviadas.",
    group: "registros",
    href: "/cliente/anamnese",
    title: "Anamnese",
  },
  {
    description: "Veja suas avaliações finalizadas e as medidas registradas.",
    group: "historico",
    href: "/cliente/avaliacoes",
    title: "Avaliações",
  },
  {
    description: "Acompanhe a evolução numérica das suas medidas ao longo do tempo.",
    group: "historico",
    href: "/cliente/evolucao",
    title: "Evolução",
  },
  {
    description: "Acesse os conteúdos educacionais liberados pela Patty.",
    group: "materiais",
    href: "/cliente/conteudos",
    title: "Conteúdos",
  },
  {
    description: "Envie e consulte fotos, exames e documentos privados.",
    group: "materiais",
    href: "/cliente/arquivos",
    title: "Arquivos",
  },
  {
    description: "Consulte seu treino publicado ou solicite o serviço de treino quando precisar.",
    group: "planos",
    href: "/cliente/treino",
    title: "Treino",
  },
  {
    description: "Consulte e atualize seus dados de contato e acesso.",
    group: "conta",
    href: "/cliente/perfil",
    title: "Perfil",
  },
];

type ClientMorePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClientMorePage({ searchParams }: ClientMorePageProps) {
  const filters = parseClientMoreFilters(await searchParams);
  const visibleAreas = filterClientMoreAreas(areas, filters);
  const hasFilters = Boolean(filters.query) || filters.group !== "todos" || filters.sort !== "padrao";

  return (
    <>
      <PageHeader
        description="Acesse as demais áreas do seu acompanhamento."
        eyebrow="Cliente"
        title="Mais"
      />
      <Section
        description="Encontre as áreas reais do seu acompanhamento, incluindo os registros anteriores e as ações do dia."
        title="Outras áreas"
      >
        <form action="/cliente/mais" className={styles.filters} method="get" role="search">
          <label className={styles.field} htmlFor="cliente-mais-busca">
            Pesquisar áreas
            <input
              defaultValue={filters.query}
              id="cliente-mais-busca"
              maxLength={CLIENT_MORE_QUERY_MAX_LENGTH}
              name="q"
              placeholder="Ex.: evolução, fotos, treino"
              type="search"
            />
          </label>
          <label className={styles.field} htmlFor="cliente-mais-grupo">
            Categoria
            <select defaultValue={filters.group} id="cliente-mais-grupo" name="grupo">
              {CLIENT_MORE_GROUPS.map((group) => (
                <option key={group} value={group}>{CLIENT_MORE_GROUP_LABELS[group]}</option>
              ))}
            </select>
          </label>
          <label className={styles.field} htmlFor="cliente-mais-ordem">
            Ordenar
            <select defaultValue={filters.sort} id="cliente-mais-ordem" name="ordem">
              <option value="padrao">Ordem de navegação</option>
              <option value="az">Nome (A–Z)</option>
            </select>
          </label>
          <button className={styles.applyButton} type="submit">Aplicar filtros</button>
        </form>
        {filters.hasInvalidParams ? (
          <p className={styles.notice} role="alert">
            Alguns parâmetros do endereço eram inválidos ou longos demais e foram ignorados.
          </p>
        ) : null}
        <div className={styles.results}>
          <p aria-live="polite" className={styles.summary} role="status">
            {visibleAreas.length} de {areas.length} áreas disponíveis nesta seleção.
          </p>
          {(hasFilters || filters.hasInvalidParams) ? (
            <Link className={styles.clearLink} href="/cliente/mais">Limpar filtros</Link>
          ) : null}
        </div>
        {visibleAreas.length === 0 ? (
          <EmptyState
            description="Não há áreas que correspondam à busca e à categoria escolhidas. Limpe os filtros para consultar todas."
            title="Nenhuma área encontrada"
          />
        ) : (
          <div className={styles.grid}>
            {visibleAreas.map((area) => (
              <Link className={styles.link} href={area.href} key={area.href}>
                <Card className={styles.card} variant="subtle">
                  <div className={styles.header}>
                    <h2 className={styles.title}>{area.title}</h2>
                    <Badge variant="neutral">{CLIENT_MORE_GROUP_LABELS[area.group]}</Badge>
                  </div>
                  <p className={styles.description}>{area.description}</p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
