"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/Button";

import styles from "./page.module.css";

// A action do formulário permanece no servidor; este componente apenas expõe o
// estado da submissão real e impede uma segunda intenção simultânea.
export function ClientWeeklyFeedbackSubmitControls({ blocked = false, completed = false, reviewing = false, onBeforeSubmit }: { blocked?: boolean; completed?: boolean; reviewing?: boolean; onBeforeSubmit?: (intent: "save" | "submit") => boolean }) {
  const { pending, data } = useFormStatus();
  const intent = data?.get("intent");

  return (
    <>
      <div className={styles.actions}>
        <Button
          disabled={pending || completed || blocked}
          formNoValidate
          onClick={(event) => { if (onBeforeSubmit && !onBeforeSubmit("save")) event.preventDefault(); }}
          loading={pending && intent === "save"}
          name="intent" type="submit" value="save" variant="secondary"
        >
          Salvar rascunho
        </Button>
        <Button
          disabled={pending || completed || blocked}
          onClick={(event) => { if (onBeforeSubmit && !onBeforeSubmit("submit")) event.preventDefault(); }}
          loading={pending && intent === "submit"}
          name="intent" type="submit" value="submit"
        >
          {reviewing ? "Confirmar envio definitivo" : "Revisar respostas para enviar"}
        </Button>
      </div>
      {pending ? (
        <p aria-live="polite" role="status">
          {intent === "submit" ? "Enviando feedback..." : intent === "save" ? "Salvando rascunho..." : "Processando feedback..."} Aguarde a confirmação antes de sair desta página.
        </p>
      ) : null}
    </>
  );
}
