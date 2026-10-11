"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { recoverInitialExerciseVersionAction } from "@/app/admin/exercicios/[exerciseId]/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import styles from "@/app/admin/exercicios/[exerciseId]/page.module.css";

/** Restores only the missing first version of an existing authorized parent. */
export function AdminExerciseRecoverInitialVersionForm({ exerciseId }: { exerciseId: string }) {
  const router = useRouter();
  const inFlight = useRef(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || busy || completed || !name.trim() || name.trim().length > 200) return;
    inFlight.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const data = new FormData();
      data.set("exerciseName", name.trim());
      const result = await recoverInitialExerciseVersionAction(exerciseId, data);
      setMessage(result.message);
      if (result.success) {
        setCompleted(true);
        router.refresh();
      }
    } catch {
      setMessage("Não foi possível confirmar a gravação. Atualize a página e confira o histórico antes de repetir.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <form aria-busy={busy} className={styles.form} onSubmit={submit}>
      {message ? (
        <Alert live={completed ? "polite" : "assertive"} title={completed ? "Rascunho recuperado" : "Gravação não confirmada"} variant={completed ? "success" : "critical"}>
          {message}
        </Alert>
      ) : null}
      <label className={styles.field}>
        <span>Nome do exercício</span>
        <input
          autoComplete="off"
          disabled={busy || completed}
          maxLength={200}
          name="exerciseName"
          onChange={(event) => { setName(event.target.value); setMessage(null); }}
          placeholder="Digite o nome do exercício"
          required
          value={name}
        />
      </label>
      <p className={styles.description}>
        Se uma tentativa anterior pode ter sido concluída, confira o histórico antes de repetir.
      </p>
      <div className={styles.actionRow}>
        <Button disabled={busy || completed || !name.trim()} loading={busy} type="submit">
          Registrar versão inicial
        </Button>
        <a className={styles.backLink} href="/admin/exercicios">Conferir biblioteca</a>
      </div>
    </form>
  );
}
