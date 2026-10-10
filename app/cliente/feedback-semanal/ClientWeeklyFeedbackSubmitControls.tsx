"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/Button";

import styles from "./page.module.css";

// A action do formulário permanece no servidor; este componente apenas expõe o
// estado da submissão real e impede uma segunda intenção simultânea.
export function ClientWeeklyFeedbackSubmitControls({ completed = false }: { completed?: boolean }) {
  const { pending, data } = useFormStatus();
  const intent = data?.get("intent");

  return (
    <>
      <div className={styles.actions}>
        <Button
          disabled={pending || completed}
          formNoValidate
          loading={pending && intent === "save"}
          name="intent" type="submit" value="save" variant="secondary"
        >
          Salvar rascunho
        </Button>
        <Button
          disabled={pending || completed}
          loading={pending && intent === "submit"}
          name="intent" type="submit" value="submit"
        >
          Enviar feedback
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
