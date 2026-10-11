"use client";

import { useRef, useState, type FormEvent } from "react";
import { createExerciseAction } from "@/app/admin/exercicios/actions";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import styles from "@/app/admin/exercicios/page.module.css";

export function AdminExerciseCreateForm() {
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const data = new FormData(event.currentTarget);
    inFlight.current = true;
    setPending(true);
    setFailure(false);
    try {
      await createExerciseAction(data);
      // The server action redirects on success; do not claim persistence locally.
    } catch {
      setFailure(true);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <form aria-busy={pending} className={styles.createForm} onSubmit={submit}>
      {failure ? (
        <Alert live="assertive" title="Não foi possível criar o exercício" variant="critical">
          Confira a biblioteca antes de repetir: o registro pode ter sido concluído.
        </Alert>
      ) : null}
      <label className={styles.field}>
        <span>Nome do exercício</span>
        <input
          disabled={pending}
          maxLength={200}
          name="exerciseName"
          onChange={() => setFailure(false)}
          placeholder="Ex.: Agachamento"
          required
        />
      </label>
      <Button disabled={pending} loading={pending} type="submit">Criar rascunho</Button>
    </form>
  );
}
