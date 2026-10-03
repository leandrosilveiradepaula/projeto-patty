import Link from "next/link";

import { DemoWorkspaceNav } from "@/components/admin/DemoWorkspaceNav";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";

import styles from "./demo.module.css";

export default function AdminDemoPage() {
  return (
    <>
      <PageHeader
        actions={<Badge variant="info">Dados 100% ficticios</Badge>}
        description="Ambiente demonstrativo para a Patty navegar pelo fluxo do produto antes de fecharmos todas as integracoes e regras abertas."
        eyebrow="Modo demonstracao"
        title="Projeto Patty · fluxo para avaliacao"
      />

      <div className={styles.demoBanner}>
        <div>
          <strong>Cliente ficticia: Marina Oliveira (DEMO)</strong>
          <p>Nenhum dado desta area pertence a uma cliente real.</p>
        </div>
        <Badge variant="warning">Nao operacional</Badge>
      </div>

      <DemoWorkspaceNav />

      <Section
        description="A ideia e validar com a Patty a sequencia, as informacoes e a experiencia antes de refinarmos detalhes."
        title="Jornada que ela pode percorrer"
      >
        <ol className={styles.timeline}>
          {[
            ["1", "Cliente e Cadastro Atual", "Dados basicos, status e contexto da cliente."],
            ["2", "Anamnese", "Respostas originais e revisao profissional ficam separadas."],
            ["3", "Avaliacao", "Peso, medidas e evolucao em momentos diferentes."],
            ["4", "Protocolo", "Fase atual, alimentacao e orientacoes publicadas."],
            ["5", "Check-ins", "Liquidos e atividade fisica factuais, sem score automatico."],
            ["6", "Feedback semanal", "Questionario semanal com respostas e pendencias."],
            ["7", "Conteudos", "Materiais liberados individualmente para a cliente."],
          ].map(([step, title, description]) => (
            <li className={styles.timelineItem} key={step}>
              <span className={styles.step}>{step}</span>
              <Card className={styles.card} variant="subtle">
                <h3>{title}</h3>
                <p>{description}</p>
              </Card>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Comecar a demonstracao">
        <div className={styles.actions}>
          <Link className={styles.link} href="/admin/demo/cliente">
            Abrir cliente DEMO
          </Link>
          <Link className={styles.link} href="/admin/demo/feedback-semanal">
            Ver feedback semanal
          </Link>
        </div>
      </Section>
    </>
  );
}
