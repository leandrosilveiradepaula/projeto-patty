import { ClientListItem } from "@/components/admin/ClientListItem";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import styles from "./page.module.css";

export default function AdminClientesPage() {
  return (
    <>
      <PageHeader
        description="Demonstração estrutural da lista administrativa. Dados de demonstração da interface."
        eyebrow="Admin"
        title="Clientes"
      />
      <Section
        description="Exemplos sintéticos para validar composição visual, quebra de texto e ações explícitas."
        title="Lista de demonstração"
      >
        <ul className={styles.clientList}>
          <li>
            <ClientListItem
              action={<Button variant="outline">Abrir</Button>}
              meta="Registro de demonstração"
              name="Cliente Demonstração 001"
              secondary="Informação secundária sintética para validar composição."
              status={<Badge variant="positive">Ativo</Badge>}
              visual={<span>01</span>}
            />
          </li>
          <li>
            <ClientListItem
              meta="Atualização de exemplo com texto mais longo para validar quebra em telas estreitas"
              name="Cliente Demonstração 002 com nome propositalmente longo para teste de layout"
              secondary="Descrição auxiliar de demonstração sem dado sensível."
              status={<Badge variant="warning">Pendente</Badge>}
              visual={<span>02</span>}
            />
          </li>
          <li>
            <ClientListItem
              action={<Button variant="outline">Abrir</Button>}
              meta="Item sem status para validar composição opcional"
              name="Cliente Demonstração 003"
              secondary="Item técnico sem status visual."
            />
          </li>
        </ul>
      </Section>
    </>
  );
}
