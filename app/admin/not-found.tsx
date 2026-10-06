import Link from "next/link";

import { EmptyState } from "@/components/ui/EmptyState";
import styles from "./not-found.module.css";

export default function AdminNotFound() {
  return (
    <main className={styles.page}>
      <EmptyState
        action={
          <div className={styles.actions}>
            <Link className={styles.primaryLink} href="/admin">
              Ir para o painel
            </Link>
            <Link className={styles.secondaryLink} href="/admin/clientes">
              Ver clientes
            </Link>
          </div>
        }
        description="O endereço pode estar incorreto ou este registro pode não estar disponível para seu acesso atual."
        title="Página ou registro indisponível"
      />
    </main>
  );
}
