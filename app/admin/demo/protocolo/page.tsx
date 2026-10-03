import { DemoWorkspaceNav } from "@/components/admin/DemoWorkspaceNav";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";

import styles from "../demo.module.css";

export default function AdminDemoProtocolPage() {
  return (
    <>
      <PageHeader
        actions={<Badge variant="info">DEMO</Badge>}
        description="Exemplo visual do que a Patty veria ao revisar um protocolo antes da publicacao."
        eyebrow="Protocolo"
        title="Reconhecimento Metabolico · v1"
      />

      <DemoWorkspaceNav />

      <Section title="Resumo">
        <div className={styles.grid}>
          <Card className={styles.card}>
            <h3>Estado</h3>
            <div className={styles.meta}>
              <Badge variant="positive">Publicado</Badge>
              <span>Inicio: 21/09/2026</span>
            </div>
            <p>Protocolo linear inicial do acompanhamento.</p>
          </Card>
          <Card className={styles.card}>
            <h3>Metas da versao DEMO</h3>
            <p>Proteina: 9 doses/dia</p>
            <p>Carboidrato: 12 doses/dia</p>
            <p>Gordura: 8 doses/dia</p>
          </Card>
        </div>
      </Section>

      <Section
        description="A distribuicao abaixo e apenas um exemplo visual para avaliacao da interface; nao representa regra geral da Patty."
        title="Distribuicao demonstrativa"
      >
        <div className={styles.grid}>
          <Card className={styles.card} variant="subtle">
            <h3>Refeicao 1</h3>
            <p>3 doses proteina · 4 doses carboidrato · 2 doses gordura</p>
          </Card>
          <Card className={styles.card} variant="subtle">
            <h3>Refeicao 2</h3>
            <p>3 doses proteina · 4 doses carboidrato · 3 doses gordura</p>
          </Card>
          <Card className={styles.card} variant="subtle">
            <h3>Refeicao 3</h3>
            <p>3 doses proteina · 4 doses carboidrato · 3 doses gordura</p>
          </Card>
        </div>
      </Section>

      <Section title="O que queremos validar com a Patty">
        <ul className={styles.list}>
          <li>Se esse nivel de resumo e suficiente para revisar rapidamente.</li>
          <li>Se macros/doses devem aparecer antes ou depois das refeicoes.</li>
          <li>Quais observacoes profissionais precisam ficar em destaque.</li>
          <li>Como ela prefere comparar versoes antes de publicar.</li>
        </ul>
      </Section>
    </>
  );
}
