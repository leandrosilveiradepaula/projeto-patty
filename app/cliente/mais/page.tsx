import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import Link from "next/link";
import styles from "./page.module.css";

const areas = [
  {
    description: "Preencha, continue ou consulte suas respostas já enviadas.",
    href: "/cliente/anamnese",
    title: "Anamnese",
  },
  {
    description: "Veja suas avaliações finalizadas e as medidas registradas.",
    href: "/cliente/avaliacoes",
    title: "Avaliações",
  },
  {
    description: "Acompanhe a evolução numérica das suas medidas ao longo do tempo.",
    href: "/cliente/evolucao",
    title: "Evolução",
  },
  {
    description: "Acesse os conteúdos educacionais liberados pela Patty.",
    href: "/cliente/conteudos",
    title: "Conteúdos",
  },
  {
    description: "Envie e consulte fotos, exames e documentos privados.",
    href: "/cliente/arquivos",
    title: "Arquivos",
  },
  {
    description: "Solicite o serviço de treino e consulte suas solicitações.",
    href: "/cliente/treino",
    title: "Treino",
  },
  {
    description: "Consulte e atualize seus dados de contato e acesso.",
    href: "/cliente/perfil",
    title: "Perfil",
  },
];

export default function ClientMorePage() {
  return (
    <>
      <PageHeader
        description="Acesse as demais áreas do seu acompanhamento."
        eyebrow="Cliente"
        title="Mais"
      />

      <Section
        description="Tudo o que não precisa ficar na barra principal continua disponível aqui."
        title="Outras áreas"
      >
        <div className={styles.grid}>
          {areas.map((area) => (
            <Link className={styles.link} href={area.href} key={area.href}>
              <Card className={styles.card} variant="subtle">
                <div className={styles.header}>
                  <h2 className={styles.title}>{area.title}</h2>
                  <Badge variant="neutral">Abrir</Badge>
                </div>
                <p className={styles.description}>{area.description}</p>
              </Card>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
