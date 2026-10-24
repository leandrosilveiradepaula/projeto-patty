"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import {
  createEducationalContentDraftAction,
  type CreateEducationalContentState,
} from "@/app/admin/conteudos/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { MAX_CONTENT_DISPLAY_ORDER } from "@/lib/content/display-order";
import { EDUCATIONAL_CONTENT_TYPES } from "@/lib/content/publication-eligibility";

import styles from "@/app/admin/conteudos/page.module.css";

export function AdminEducationalContentCreateForm() {
  const router = useRouter();
  const inFlightRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);
  const [result, setResult] = useState<CreateEducationalContentState | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlightRef.current || created) return;
    const formData = new FormData(event.currentTarget);
    inFlightRef.current = true;
    setBusy(true);
    setResult(null);

    try {
      const response = await createEducationalContentDraftAction(formData);
      if (response.success) {
        setCreated(true);
        router.push("/admin/conteudos/" + response.contentId);
        return;
      }

      // The form stays mounted with the typed values for a safe retry.
      setResult(response);
      router.refresh();
    } catch {
      setResult({
        contentId: null,
        success: false,
        message: "Não foi possível confirmar a criação. Verifique a biblioteca antes de repetir a operação.",
      });
      router.refresh();
    } finally {
      inFlightRef.current = false;
      setBusy(false);
    }
  }

  return (
    <form aria-busy={busy} className={styles.createForm} onSubmit={submit}>
      {result && !result.success ? (
        <div className={styles.createMessage}>
          <Alert live="assertive" title="Rascunho não confirmado" variant="critical">
            {result.message}
          </Alert>
          <a className={styles.clearLink} href="#biblioteca-conteudos">
            Conferir biblioteca
          </a>
        </div>
      ) : null}
      {created ? (
        <p className={styles.createMessage} role="status">
          Rascunho criado. Abrindo o editor da nova versão.
        </p>
      ) : null}
      <label className={styles.field}>
        <span>Título</span>
        <input
          disabled={busy || created}
          maxLength={200}
          name="title"
          onChange={() => setResult(null)}
          placeholder="Ex.: Como utilizar a balança de alimentos"
          required
        />
      </label>
      <label className={styles.orderField}>
        <span>Ordem</span>
        <input
          defaultValue="1"
          disabled={busy || created}
          max={MAX_CONTENT_DISPLAY_ORDER}
          min="1"
          name="displayOrder"
          onChange={() => setResult(null)}
          required
          step="1"
          type="number"
        />
      </label>
      <label className={styles.field}>
        <span>Tipo de conteúdo</span>
        <select defaultValue="" disabled={busy || created} name="contentTypeKey" onChange={() => setResult(null)} required>
          <option disabled value="">Selecione o tipo</option>
          {EDUCATIONAL_CONTENT_TYPES.map((contentType) => (
            <option key={contentType.key} value={contentType.key}>{contentType.label}</option>
          ))}
        </select>
      </label>
      <Button disabled={busy || created} loading={busy} type="submit">
        Criar rascunho
      </Button>
    </form>
  );
}
