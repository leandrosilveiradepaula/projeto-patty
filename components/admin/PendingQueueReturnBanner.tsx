"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { readPendingQueueReturn } from "@/lib/operations/pending-queue-return";
import styles from "./PendingQueueReturnBanner.module.css";

/**
 * Displayed only for links opened from an operational queue. This is navigation
 * context, not authority: destination permissions remain enforced by the server.
 */
export function PendingQueueReturnBanner() {
  const pathname = usePathname();
  const params = useSearchParams();
  if (pathname === "/admin/pendencias") return null;
  const href = readPendingQueueReturn(params.get("filaRetorno"));
  if (!href) return null;

  return (
    <nav className={styles.returnBanner} aria-label="Retorno à fila de pendências">
      <Link href={href} className={styles.returnLink}>← Voltar às pendências</Link>
      <span>Retomar os mesmos filtros, grupo e páginas da fila.</span>
    </nav>
  );
}
