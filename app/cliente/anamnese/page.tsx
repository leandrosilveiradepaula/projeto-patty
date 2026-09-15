import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { TextInput } from "@/components/ui/TextInput";
import Link from "next/link";
import styles from "./page.module.css";

const anamneseSections = [
  {
    description: "Área destinada às informações cadastrais da anamnese.",
    id: "cadastro",
    title: "Cadastro",
  },
  {
    description: "Área destinada às informações estruturais de medidas.",
    id: "medidas",
    title: "Medidas",
  },
  {
    description: "Área destinada às informações de histórico de vida.",
    id: "historico-de-vida",
    title: "Histórico de vida",
  },
  {
    description:
      "Área destinada a informações sensíveis de saúde, com tratamento apropriado.",
    id: "historico-de-saude",
    title: "Histórico de saúde",
  },
  {
    description:
      "Área destinada a informações sensíveis sobre medicamentos e suplementação.",
    id: "medicamentos-e-suplementacao",
    title: "Medicamentos e suplementação",
  },
  {
    description: "Área destinada às informações relacionadas ao sono.",
    id: "sono",
    title: "Sono",
  },
  {
    description: "Área destinada às informações de comportamento.",
    id: "comportamento",
    title: "Comportamento",
  },
  {
    description: "Área destinada às informações de rotina.",
    id: "rotina",
    title: "Rotina",
  },
  {
    description: "Área destinada às informações sobre atividade física.",
    id: "atividade-fisica",
    title: "Atividade física",
  },
  {
    description: "Área destinada às informações de alimentação.",
    id: "alimentacao",
    title: "Alimentação",
  },
  {
    description: "Área destinada aos objetivos informados pela cliente.",
    id: "objetivos",
    title: "Objetivos",
  },
  {
    description: "Área destinada às informações sobre autoimagem.",
    id: "autoimagem",
    title: "Autoimagem",
  },
  {
    description:
      "Área destinada ao envio e consulta de imagens com acesso controlado.",
    id: "fotos",
    title: "Fotos",
  },
  {
    description:
      "Área destinada a exames e documentos com tratamento apropriado e acesso controlado.",
    id: "exames-e-documentos",
    title: "Exames e documentos",
  },
  {
    description: "Área destinada aos consentimentos aplicáveis.",
    id: "consentimento",
    title: "Consentimento",
  },
];

const cadastroFields = [
  {
    id: "anamnese-cidade",
    label: "Cidade",
  },
  {
    id: "anamnese-telefone",
    label: "Telefone",
  },
  {
    id: "anamnese-email",
    label: "Email",
  },
  {
    id: "anamnese-instagram",
    label: "Instagram",
  },
];

export default function ClienteAnamnesePage() {
  return (
    <>
      <PageHeader
        actions={
          <span className={styles.notice}>
            Interface em estruturação. Os campos ainda não estão conectados ao armazenamento.
          </span>
        }
        description="Estrutura inicial das informações que farão parte da anamnese."
        eyebrow="Cliente"
        title="Anamnese"
      />
      <div className={styles.layout}>
        <nav aria-label="Seções da anamnese" className={styles.index}>
          <div className={styles.indexTitle}>Seções</div>
          <ul className={styles.indexList}>
            {anamneseSections.map((section) => (
              <li key={section.id}>
                <a className={styles.indexLink} href={`#${section.id}`}>
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.content}>
          <Section
            action={
              <Link className={styles.returnLink} href="/cliente">
                Voltar ao início
              </Link>
            }
            description="As seções abaixo indicam a organização prevista. As perguntas serão definidas em etapa posterior."
            title="Estrutura da anamnese"
          >
            <div className={styles.sectionStack}>
              {anamneseSections.map((section) => (
                <Card
                  className={styles.sectionCard}
                  id={section.id}
                  key={section.id}
                >
                  <h3 className={styles.sectionTitle}>{section.title}</h3>
                  <p className={styles.sectionDescription}>
                    {section.description}
                  </p>
                  {section.id === "cadastro" ? (
                    <>
                      <p className={styles.prototypeNote}>
                        Campos do formulário atual em validação para migração.
                        Os dados preenchidos nesta versão não são salvos.
                      </p>
                      <div className={styles.cadastroGrid}>
                        {cadastroFields.map((field) => (
                          <FormField
                            id={field.id}
                            key={field.id}
                            label={field.label}
                          >
                            {(fieldProps) => (
                              <TextInput {...fieldProps} type="text" />
                            )}
                          </FormField>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className={styles.sectionState}>
                      Os campos desta seção serão definidos em etapa posterior.
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}
