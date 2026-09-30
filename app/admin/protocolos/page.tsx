import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { listAccessibleProtocols } from "@/lib/supabase/data-access";
import Link from "next/link";
import styles from "./page.module.css";

export default async function AdminProtocolosPage() {
  const protocols = await listAccessibleProtocols();

  return (
    <>
      <PageHeader
        actions={<Link className={styles.actionLink} href="/admin/protocolos/calculadora-carb-cycle">Calculadora Carb Cycle</Link>}
        description="Consulta dos protocolos acessíveis para a administração atual."
        eyebrow="Admin"
        title="Protocolos"
      />
      <Section description="Protocolos disponíveis conforme as atribuições administrativas ativas." title="Protocolos registrados">
        {protocols.length === 0 ? (
          <EmptyState description="Nenhum protocolo está acessível para a administração atual." title="Sem protocolos registrados" />
        ) : (
          <ul className={styles.protocolList}>
            {protocols.map((protocol) => (
              <li className={styles.protocolItem} key={protocol.id}>
                <div>
                  <p className={styles.clientLabel}>{protocol.clients?.profiles?.display_name ?? "Cliente sem nome de exibição"}</p>
                  <dl className={styles.details}><div><dt>Tipo</dt><dd>{protocol.protocol_type}</dd></div></dl>
                </div>
                <Link className={styles.actionLink} href={`/admin/protocolos/${protocol.id}`}>Ver detalhes</Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
