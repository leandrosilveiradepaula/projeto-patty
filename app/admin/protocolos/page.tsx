import { ProtocolListItem } from "@/components/admin/ProtocolListItem";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import Link from "next/link";
import styles from "./page.module.css";

const demoProtocols = [
  { clientLabel: "Cliente Demonstração 001", dateLabel: "12/09/2026", href: "/admin/protocolos/demo-001", protocolLabel: "Protocolo Demonstração 001", status: "Publicado", strategyLabel: "Reconhecimento Metabólico", versionLabel: "Versão 1" },
  { clientLabel: "Cliente Demonstração 002", dateLabel: "05/09/2026", href: "/admin/protocolos/demo-002", protocolLabel: "Protocolo Demonstração 002", status: "Em revisão", strategyLabel: "Cutting 1 Dia 1 / Dia 2", versionLabel: "Versão 2" },
  { clientLabel: "Cliente Demonstração 003", dateLabel: "28/08/2026", href: "/admin/protocolos/demo-003", protocolLabel: "Protocolo Demonstração 003", status: "Substituído", strategyLabel: "Cutting 1 — 2 dias Low / 1 dia High", versionLabel: "Versão 3" },
];

export default function AdminProtocolosPage() {
  return (
    <>
      <PageHeader description="Estrutura inicial para consulta do histórico administrativo de protocolos." eyebrow="Admin" title="Protocolos" />
      <p className={styles.demoNote}>Dados sintéticos para validação da interface.</p>
      <Section description="Registros demonstrativos para validar cliente, versão, estratégia e status administrativo." title="Histórico de protocolos">
        <ul className={styles.protocolList}>
          {demoProtocols.map((protocol) => (
            <li key={protocol.href}>
              <ProtocolListItem
                action={<Link className={styles.actionLink} href={protocol.href}>Ver protocolo</Link>}
                clientLabel={protocol.clientLabel}
                meta={`Data do protocolo: ${protocol.dateLabel}`}
                protocolLabel={protocol.protocolLabel}
                status={<Badge variant="neutral">{protocol.status}</Badge>}
                strategyLabel={protocol.strategyLabel}
                versionLabel={protocol.versionLabel}
              />
            </li>
          ))}
        </ul>
      </Section>
      <Section description="Estado estrutural disponível para integrações futuras, sem fluxo operacional nesta etapa." title="Estado futuro">
        <Card variant="subtle"><EmptyState description="A integração com dados, revisão e publicação será definida em tarefas próprias." title="Sem backend integrado" /></Card>
      </Section>
    </>
  );
}
