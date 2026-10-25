"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import {
  createNextEducationalContentVersionAction,
  publishEducationalContentVersionAction,
  updateEducationalContentDraftAction,
} from "@/app/admin/conteudos/[contentId]/actions";
import { Alert } from "@/components/ui/Alert";
import { MAX_CONTENT_DISPLAY_ORDER } from "@/lib/content/display-order";
import { EDUCATIONAL_CONTENT_TYPES } from "@/lib/content/publication-eligibility";
import { Button } from "@/components/ui/Button";
import styles from "@/app/admin/conteudos/[contentId]/page.module.css";

type SaveResult = { success: boolean; message: string } | null;

function VersionMutationForm({
  children,
  completeMessage,
  disabled = false,
  label,
  lockAfterSuccess,
  run,
}: {
  children?: ReactNode;
  completeMessage: string;
  disabled?: boolean;
  label: string;
  lockAfterSuccess: boolean;
  run: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const inFlightRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SaveResult>(null);
  const locked = lockAfterSuccess && result?.success === true;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlightRef.current || locked || disabled) return;
    const formData = new FormData(event.currentTarget);
    inFlightRef.current = true;
    setBusy(true);
    setResult(null);
    try {
      await run(formData);
      setResult({ success: true, message: completeMessage });
      router.refresh();
    } catch {
      // No provider, Auth or health details are returned to the browser.
      setResult({
        success: false,
        message: "Não foi possível concluir a operação. Confira a versão atual e tente novamente.",
      });
    } finally {
      inFlightRef.current = false;
      setBusy(false);
    }
  }

  return (
    <form
      aria-busy={busy}
      className={styles.form}
      onChange={() => { if (result) setResult(null); }}
      onSubmit={submit}
    >
      {result ? (
        <Alert
          live={result.success ? "polite" : "assertive"}
          title={result.success ? "Operação confirmada" : "Operação não concluída"}
          variant={result.success ? "success" : "critical"}
        >
          {result.message}
        </Alert>
      ) : null}
      <fieldset className={styles.mutationFields} disabled={busy || locked || disabled}>
        {children}
        <Button disabled={busy || locked} loading={busy} type="submit">
          {label}
        </Button>
      </fieldset>
    </form>
  );
}

export function AdminEducationalContentDraftSaveForm({
  contentId,
  contentTypeKey,
  displayOrder,
  title,
  versionId,
}: {
  contentId: string;
  contentTypeKey: string | null;
  displayOrder: number;
  title: string;
  versionId: string;
}) {
  return (
    <VersionMutationForm
      completeMessage="O rascunho foi salvo no servidor. A publicação e a liberação continuam separadas."
      label="Salvar rascunho"
      lockAfterSuccess={false}
      run={(formData) => updateEducationalContentDraftAction(contentId, versionId, formData)}
    >
      <label className={styles.field}>
        <span>Título</span>
        <input defaultValue={title} maxLength={200} name="title" required />
      </label>
      <label className={styles.field}>
        <span>Ordem de exibição</span>
        <input defaultValue={displayOrder} max={MAX_CONTENT_DISPLAY_ORDER} min="1" name="displayOrder" required step="1" type="number" />
      </label>
      <label className={styles.field}>
        <span>Tipo de conteúdo</span>
        <select defaultValue={contentTypeKey ?? ""} name="contentTypeKey" required>
          <option disabled value="">Selecione o tipo</option>
          {EDUCATIONAL_CONTENT_TYPES.map((contentType) => (
            <option key={contentType.key} value={contentType.key}>{contentType.label}</option>
          ))}
        </select>
      </label>
    </VersionMutationForm>
  );
}

export function AdminEducationalContentPublishForm({
  contentId,
  versionId,
  versionNumber,
  canPublish,
  publicationBlockedReason,
}: {
  contentId: string;
  versionId: string;
  versionNumber: number;
  canPublish: boolean;
  publicationBlockedReason: string | null;
}) {
  return (
    <VersionMutationForm
      completeMessage="Publicação confirmada. A liberação para cada cliente ainda exige uma ação profissional separada."
      label="Publicar versão"
      disabled={!canPublish}
      lockAfterSuccess
      run={(formData) => publishEducationalContentVersionAction(contentId, versionId, formData)}
    >
      <label className={styles.confirmation}>
        <input disabled={!canPublish} name="confirmPublish" required type="checkbox" value="yes" />
        <span>Confirmo que a versão {versionNumber} foi revisada e pode ser publicada.</span>
      </label>
      {!canPublish ? <p className={styles.description} role="status">
        {publicationBlockedReason ?? "Esta versão ainda não atende aos requisitos técnicos de publicação."}
      </p> : null}
    </VersionMutationForm>
  );
}

export function AdminEducationalContentNewVersionForm({
  contentId,
}: { contentId: string }) {
  return (
    <VersionMutationForm
      completeMessage="Nova versão criada em rascunho. A versão publicada anterior foi preservada."
      label="Criar nova versão"
      lockAfterSuccess
      run={async () => createNextEducationalContentVersionAction(contentId)}
    />
  );
}
