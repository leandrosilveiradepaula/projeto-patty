import { ClientSummaryHeader } from "@/components/admin/ClientSummaryHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import Link from "next/link";
import styles from "./page.module.css";

type AdminClienteAnamnesePageProps = {
  params: Promise<{
    clienteId: string;
  }>;
};

const anamneseCategories = [
  {
    description:
      "Área prevista para informações cadastrais de referência, sem interpretação nesta etapa.",
    title: "Cadastro",
  },
  {
    description:
      "Área prevista para informações corporais estruturais, sem cálculos ou fórmulas nesta etapa.",
    title: "Medidas",
  },
  {
    description:
      "Área prevista para registros de contexto pessoal informados na coleta.",
    title: "Histórico de vida",
  },
  {
    description:
      "Área prevista para informações de saúde com tratamento de acesso mais restritivo.",
    title: "Histórico de saúde",
  },
  {
    description:
      "Área prevista para registrar a existência de informações sobre medicamentos e suplementação.",
    title: "Medicamentos e suplementação",
  },
  {
    description:
      "Área prevista para informações relacionadas à rotina e qualidade do sono.",
    title: "Sono",
  },
  {
    description:
      "Área prevista para informações comportamentais coletadas na anamnese.",
    title: "Comportamento",
  },
  {
    description:
      "Área prevista para contexto de rotina diária informado pela cliente.",
    title: "Rotina",
  },
  {
    description:
      "Área prevista para informações de prática de atividade física, sem orientar prática nesta etapa.",
    title: "Atividade física",
  },
  {
    description:
      "Área prevista para coleta de informações alimentares, sem dieta ou metas nesta etapa.",
    title: "Alimentação",
  },
  {
    description:
      "Área prevista para registro dos objetivos informados pela cliente.",
    title: "Objetivos",
  },
  {
    description:
      "Área prevista para informações declaradas sobre percepção e autoimagem.",
    title: "Autoimagem",
  },
  {
    description:
      "Área prevista para fotos vinculadas ao acompanhamento, com acesso controlado.",
    title: "Fotos",
  },
  {
    description:
      "Área prevista para exames e documentos com acesso controlado.",
    title: "Exames e documentos",
  },
  {
    description:
      "Área prevista para informações de consentimento, sem texto legal definido nesta etapa.",
    title: "Consentimento",
  },
];

export default async function AdminClienteAnamnesePage({
  params,
}: AdminClienteAnamnesePageProps) {
  const { clienteId } = await params;

  return (
    <>
      <ClientSummaryHeader
        meta="Dados sintéticos para validação da interface."
        name="Cliente Demonstração 001"
        secondary="Estrutura administrativa da anamnese."
        status={<Badge variant="neutral">Demonstração</Badge>}
        visual={<span>01</span>}
      />
      <Section
        action={
          <Link
            className={styles.returnLink}
            href={`/admin/clientes/${clienteId}`}
          >
            Voltar para visão geral
          </Link>
        }
        description="Estrutura das informações previstas para coleta e consulta da anamnese."
        title="Anamnese"
      >
        <div className={styles.categoryGrid}>
          {anamneseCategories.map((category) => (
            <Card className={styles.categoryCard} key={category.title}>
              <h3 className={styles.categoryTitle}>{category.title}</h3>
              <p className={styles.categoryDescription}>
                {category.description}
              </p>
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}
