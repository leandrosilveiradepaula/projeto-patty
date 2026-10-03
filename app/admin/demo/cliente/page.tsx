import Link from "next/link";

import { DemoWorkspaceNav } from "@/components/admin/DemoWorkspaceNav";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";

import styles from "../demo.module.css";

export default function AdminDemoClientPage() {
  return (
    <>
      <PageHeader
        actions={<Badge variant="info">DEMO</Badge>}
        description="Visao sintetica da cliente ficticia para a Patty avaliar quais informacoes precisam aparecer primeiro."
        eyebrow="Cliente"
        title="Marina Oliveira"
      />

      <DemoWorkspaceNav />

      <Section title="Resumo da cliente">
        <div className={styles.grid}>
          <Card className={styles.card}>
            <h3>Acompanhamento</h3>
            <div className={styles.meta}>
              <Badge variant="positive">Ativa</Badge>
              <span>Inicio: 14/09/2026</span>
              <span>Objetivo: reducao de gordura corporal</span>
            </div>
            <p>Ultima avaliacao: 28/09/2026 · Peso: 72,4 kg</p>
          </Card>

          <Card className={styles.card}>
            <h3>Situacao atual</h3>
            <p>Protocolo publicado: Reconhecimento Metabolico</p>
            <p>Feedback semanal: respondido</p>
            <p>Conteudo liberado: Como utilizar a balanca de alimentos</p>
          </Card>

          <Card className={styles.card}>
            <h3>Anamnese</h3>
            <p>Enviada em 16/09/2026. Revisao da Patty concluida.</p>
            <p>Maior dificuldade relatada: organizar refeicoes nos dias presenciais.</p>
          </Card>

          <Card className={styles.card}>
            <h3>Ultimos sinais factuais</h3>
            <ul className={styles.list}>
              <li>4 treinos na semana anterior</li>
              <li>3 aerobicos</li>
              <li>Media de 3,2 L de liquidos/dia</li>
              <li>Autoavaliacao semanal: 8/10</li>
            </ul>
          </Card>
        </div>
      </Section>

      <Section title="Proximas areas para a Patty revisar">
        <div className={styles.actions}>
          <Link className={styles.link} href="/admin/demo/protocolo">
            Abrir protocolo
          </Link>
          <Link className={styles.link} href="/admin/demo/feedback-semanal">
            Abrir feedback semanal
          </Link>
        </div>
      </Section>
    </>
  );
}
