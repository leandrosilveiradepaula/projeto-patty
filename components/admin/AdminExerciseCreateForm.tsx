"use client";

import { useRef, useState } from "react";
import { createExerciseAction } from "@/app/admin/exercicios/actions";
import { Button } from "@/components/ui/Button";
import styles from "@/app/admin/exercicios/page.module.css";

export function AdminExerciseCreateForm() {
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);

  return (
    <form
      action={createExerciseAction}
      aria-busy={pending}
      className={styles.createForm}
      onSubmit={(event) => {
        if (inFlight.current) {
          event.preventDefault();
          return;
        }
        inFlight.current = true;
        setPending(true);
      }}
    >
      <label className={styles.field}>
        <span>Nome do exercício</span>
        <input
          disabled={pending}
          maxLength={200}
          name="exerciseName"
          placeholder="Ex.: Agachamento"
          required
        />
      </label>
      <Button disabled={pending} loading={pending} type="submit">Criar rascunho</Button>
      <span aria-live="polite" className={styles.createStatus}>
        {pending ? "Registrando exercício e abrindo o rascunho…" : ""}
      </span>
    </form>
  );
}
