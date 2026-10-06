import Link from "next/link";

import { EmptyState } from "@/components/ui/EmptyState";
import styles from "./not-found.module.css";

export default function ClientNotFound() {
  return (
    <main className={styles.page}>
      <EmptyState
        action={
          <div className={styles.actions}>
            <Link className={styles.primaryLink} href="/cliente">
              Voltar ao início
            </Link>
            <Link className={styles.secondaryLink} href="/cliente/anamnese">
              Ver Anamnese
            </Link>
          </div>
        }
        description="O endereço pode estar incorreto ou este conteúdo pode não estar disponível para sua conta."
        title="Conteúdo indisponível"
      />
    </main>
  );
}
