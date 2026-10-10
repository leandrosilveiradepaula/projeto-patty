"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import {
  createNextExerciseVersionAction,
  publishExerciseVersionAction,
  updateExerciseDraftAction,
} from "@/app/admin/exercicios/[exerciseId]/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

import styles from "@/app/admin/exercicios/[exerciseId]/page.module.css";

function ActionFeedback({ message, success }: { message: string | null; success: boolean }) {
  if (!message) return null;
  return (
    <Alert live={success ? "polite" : "assertive"} title={success ? "Alteração salva" : "Não foi possível concluir"} variant={success ? "success" : "critical"}>
      {message}
    </Alert>
  );
}

export function AdminExerciseDraftEditForm({
  exerciseId,
  versionId,
  initialName,
}: {
  exerciseId: string;
  versionId: string;
  initialName: string;
}) {
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inFlight = useRef(false);
  const router = useRouter();
  const normalizedName = name.trim();
  const isValid = normalizedName.length > 0 && normalizedName.length <= 200;
  const hasChanged = normalizedName !== initialName;

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || !isValid || !hasChanged) return;

    inFlight.current = true;
    setBusy(true);
    setMessage(null);

    try {
      const data = new FormData();
      data.set("exerciseName", normalizedName);
      await updateExerciseDraftAction(exerciseId, versionId, data);
      setMessage("Rascunho atualizado. A publicação continua sendo uma etapa manual.");
      setSuccess(true);
      router.refresh();
    } catch {
      setSuccess(false);
      setMessage("Não foi possível salvar. O rascunho pode ter sido alterado por outra sessão. Confira os dados antes de tentar novamente.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <form aria-busy={busy} className={styles.form} onSubmit={submit}>
      <ActionFeedback message={message} success={success} />
      <label className={styles.field}>
        <span>Nome do exercício</span>
        <input
          autoComplete="off"
          disabled={busy}
          maxLength={200}
          name="exerciseName"
          onChange={(event) => {
            setName(event.target.value);
            setMessage(null);
          }}
          required
          value={name}
        />
      </label>
      <div className={styles.actionRow}>
        <Button disabled={busy || !hasChanged || !isValid} loading={busy} type="submit">
          Salvar rascunho
        </Button>
        <Button disabled={busy || !hasChanged} onClick={() => { setName(initialName); setMessage(null); }} type="button" variant="ghost">
          Descartar edição
        </Button>
      </div>
    </form>
  );
}

export function AdminExercisePublishForm({
  exerciseId,
  versionId,
  name,
  versionNumber,
}: {
  exerciseId: string;
  versionId: string;
  name: string;
  versionNumber: number;
}) {
  const [reviewing, setReviewing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inFlight = useRef(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reviewing || !confirmed || busy || completed || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const data = new FormData();
      data.set("confirmPublish", "yes");
      await publishExerciseVersionAction(exerciseId, versionId, data);
      setCompleted(true);
      setMessage("Versão publicada na biblioteca profissional. Nenhuma cliente recebeu um treino automaticamente.");
      router.refresh();
    } catch {
      setMessage("Não foi possível publicar. Revise a versão em rascunho e atualize a página antes de tentar novamente.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <form aria-busy={busy} className={styles.form} onSubmit={submit}>
      <ActionFeedback message={message} success={completed} />
      {!reviewing ? (
        <Button disabled={busy || completed} onClick={() => setReviewing(true)} type="button" variant="secondary">
          Revisar publicação
        </Button>
      ) : (
        <>
          <p className={styles.description}>
            Você está prestes a publicar <strong>{name} · versão {versionNumber}</strong> no catálogo profissional.
            A publicação não inclui o exercício em nenhum treino individual.
          </p>
          <label className={styles.confirmation}>
            <input
              checked={confirmed}
              disabled={busy || completed}
              name="confirmPublish"
              onChange={(event) => setConfirmed(event.target.checked)}
              required
              type="checkbox"
              value="yes"
            />
            <span>Revisei esta versão e confirmo sua publicação na biblioteca profissional.</span>
          </label>
          <div className={styles.actionRow}>
            <Button disabled={busy || completed} onClick={() => { setReviewing(false); setConfirmed(false); setMessage(null); }} type="button" variant="ghost">
              Cancelar
            </Button>
            <Button disabled={!confirmed || busy || completed} loading={busy} type="submit">
              Confirmar publicação
            </Button>
          </div>
        </>
      )}
    </form>
  );
}

export function AdminExerciseCreateVersionForm({
  exerciseId,
  name,
  nextVersionNumber,
}: {
  exerciseId: string;
  name: string;
  nextVersionNumber: number;
}) {
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inFlight = useRef(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reviewing || busy || completed || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setMessage(null);
    try {
      await createNextExerciseVersionAction(exerciseId);
      setCompleted(true);
      setMessage("Novo rascunho criado. A versão publicada anteriormente continua preservada.");
      router.refresh();
    } catch {
      setMessage("Não foi possível criar a nova versão. Pode existir outro rascunho. Atualize a página antes de tentar novamente.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <form aria-busy={busy} className={styles.form} onSubmit={submit}>
      <ActionFeedback message={message} success={completed} />
      {!reviewing ? (
        <Button disabled={busy || completed} onClick={() => setReviewing(true)} type="button" variant="secondary">
          Criar nova versão
        </Button>
      ) : (
        <>
          <p className={styles.description}>
            Criar um rascunho da versão {nextVersionNumber} de <strong>{name}</strong>?
            O exercício publicado continuará disponível para a seleção profissional enquanto você prepara a nova versão.
          </p>
          <div className={styles.actionRow}>
            <Button disabled={busy || completed} onClick={() => { setReviewing(false); setMessage(null); }} type="button" variant="ghost">
              Cancelar
            </Button>
            <Button disabled={busy || completed} loading={busy} type="submit">
              Confirmar novo rascunho
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
