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
      <PageHeader description="Consulte protocolos, versões e publicações das clientes." eyebrow="Admin" title="Protocolos" />
      <Section description="Os protocolos disponíveis aparecem aqui para consulta e revisão." title="Protocolos registrados">
        {protocols.length === 0 ? (
          <EmptyState
            action={<Link className={styles.actionLink} href="/admin/clientes">Escolher cliente</Link>}
            description="Escolha uma cliente para criar ou consultar um protocolo."
            title="Ainda não há protocolos"
          />
        ) : (
          <ul className={styles.protocolList}>
            {protocols.map((protocol) => (
              <li className={styles.protocolItem} key={protocol.id}>
                <div>
                  <p className={styles.clientLabel}>{protocol.clients?.full_name?.trim() || protocol.clients?.profiles?.display_name?.trim() || "Cliente sem nome cadastrado"}</p>
                  <dl className={styles.details}><div><dt>Tipo</dt><dd>{protocol.protocol_type}</dd></div></dl>
                </div>
                <Link
                  aria-label={`Ver protocolo de ${protocol.clients?.full_name?.trim() || protocol.clients?.profiles?.display_name?.trim() || "cliente sem nome cadastrado"}`}
                  className={styles.actionLink}
                  href={`/admin/protocolos/${protocol.id}`}
                >
                  Ver detalhes
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
