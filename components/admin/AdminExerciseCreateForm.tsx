"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { createExerciseAction } from "@/app/admin/exercicios/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import styles from "@/app/admin/exercicios/page.module.css";

export function AdminExerciseCreateForm() {
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || createdId) return;
    const data = new FormData(event.currentTarget);
    inFlight.current = true;
    setPending(true);
    setErrorMessage(null);

    try {
      const result = await createExerciseAction(data);
      if (result.success) {
        setCreatedId(result.exerciseId);
        router.push("/admin/exercicios/" + result.exerciseId);
      } else {
        // Keep the original text in the mounted form for a considered retry.
        setErrorMessage(result.message);
      }
    } catch {
      setErrorMessage(
        "Não foi possível confirmar o cadastro. Confira a biblioteca antes de repetir a operação.",
      );
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <form aria-busy={pending} className={styles.createForm} onSubmit={submit}>
      <label className={styles.field}>
        <span>Nome do exercício</span>
        <input
          autoComplete="off"
          disabled={pending || Boolean(createdId)}
          maxLength={200}
          name="exerciseName"
          onChange={() => setErrorMessage(null)}
          placeholder="Ex.: Agachamento"
          required
        />
      </label>
      <Button disabled={pending || Boolean(createdId)} loading={pending} type="submit">
        Criar rascunho
      </Button>
      {pending ? (
        <p className={styles.createFeedback} role="status">
          Registrando exercício e verificando o rascunho…
        </p>
      ) : null}
      {errorMessage ? (
        <div className={styles.createFeedback}>
          <Alert live="assertive" title="Rascunho não confirmado" variant="critical">
            {errorMessage}
          </Alert>
          <a className={styles.createHistoryLink} href="#biblioteca-exercicios">
            Conferir biblioteca antes de tentar novamente
          </a>
        </div>
      ) : null}
      {createdId ? (
        <p className={styles.createFeedback} role="status">
          Rascunho criado. <a className={styles.createHistoryLink} href={"/admin/exercicios/" + createdId}>Abrir editor</a>.
        </p>
      ) : null}
    </form>
  );
}
