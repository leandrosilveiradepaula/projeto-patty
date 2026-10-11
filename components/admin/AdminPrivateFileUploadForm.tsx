"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createAdminPrivateFileUploadSessionAction,
  finalizeAdminPrivateFileUploadSessionAction,
} from "@/app/admin/clientes/[clienteId]/arquivos/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { createClient } from "@/lib/supabase/client";
import type { PrivateFileKind } from "@/lib/validation/private-files";
import { validatePrivateFileUploadSelection } from "@/lib/files/private-file-upload-selection";
import { privateFileUploadProgressMessage, type PrivateFileUploadPhase } from "@/lib/files/private-file-upload-progress";
import { privateFileSelectionReview, PRIVATE_FILE_ACCEPT, PRIVATE_FILE_KIND_LABELS } from "@/lib/files/private-file-upload-review";

import styles from "./AdminPrivateFileUploadForm.module.css";

const acceptByKind = PRIVATE_FILE_ACCEPT;

const errorMessages: Record<string, string> = {
  missing_file: "Selecione um arquivo não vazio para enviar.",
  client_not_found: "A cliente selecionada não está disponível.",
  extension_mime_mismatch:
    "A extensão do arquivo não corresponde ao tipo informado pelo dispositivo.",
  invalid_client_id: "A cliente selecionada é inválida.",
  invalid_extension: "Este formato de arquivo não é aceito.",
  invalid_mime_type: "O tipo deste arquivo não é aceito.",
  invalid_original_filename: "O arquivo precisa ter um nome válido.",
  invalid_session_id: "A sessão de upload é inválida.",
  invalid_size: "O arquivo está vazio ou ultrapassa o limite permitido.",
};

type AdminPrivateFileUploadFormProps = {
  clientId: string;
};

export function AdminPrivateFileUploadForm({
  clientId,
}: AdminPrivateFileUploadFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const inFlightRef = useRef(false);
  const router = useRouter();
  const [fileKind, setFileKind] = useState<PrivateFileKind>("photo");
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [phase, setPhase] = useState<PrivateFileUploadPhase>(null);
  const [selectedFile,setSelectedFile] = useState<File|null>(null);
  const [selectionConfirmed,setSelectionConfirmed] = useState(false);
  const [ambiguousCompletion,setAmbiguousCompletion] = useState(false);
  const reviewed = privateFileSelectionReview(selectedFile,fileKind);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlightRef.current || ambiguousCompletion || !selectionConfirmed) return;
    if (!selectedFile || !reviewed.ok) {setMessage(reviewed.message);return;}
    setMessage(null);
    setSuccess(false);
    setPhase(null);

    const formData = new FormData(event.currentTarget);
    const selectedFile = formData.get("file");
    if (!(selectedFile instanceof File)) {
      setMessage("Selecione um arquivo para enviar.");
      return;
    }

    const selection = validatePrivateFileUploadSelection(selectedFile, fileKind);
    if (!selection.ok) {
      setMessage(errorMessages[selection.error] ?? "Revise o formato e o tamanho do arquivo.");
      return;
    }

    inFlightRef.current = true;
    setIsPending(true);
    setPhase("authorizing");
    let finalizationStarted = false;

    try {
      const sessionResult = await createAdminPrivateFileUploadSessionAction(
        clientId,
        {
          byteSize: selection.byteSize,
          claimedMimeType: selection.claimedMimeType,
          extension: selection.extension,
          fileKind,
          originalFilename: selection.originalFilename,
        },
      );

      if (!sessionResult.ok) {
        setMessage(
          errorMessages[sessionResult.error] ??
            "Não foi possível autorizar este arquivo para upload.",
        );
        return;
      }

      setPhase("transferring");
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("client-private")
        .uploadToSignedUrl(
          sessionResult.session.objectPath,
          sessionResult.session.token,
          selectedFile,
          {
            contentType: selectedFile.type,
            upsert: false,
          },
        );

      if (uploadError) {
        console.error("Admin private file temporary upload failed");
        setMessage(
          "Não foi possível enviar o arquivo para a área temporária. Tente novamente.",
        );
        return;
      }

      finalizationStarted = true;
      setPhase("verifying");
      const finalizationResult =
        await finalizeAdminPrivateFileUploadSessionAction(
          clientId,
          sessionResult.session.id,
        );

      if (!finalizationResult.ok) {
        setAmbiguousCompletion(true);
        setMessage(
          errorMessages[finalizationResult.error] ??
            "Não foi possível confirmar o registro. Confira o histórico antes de enviar novamente.",
        );
        return;
      }

      if (finalizationResult.result.status !== "accepted") {
        setMessage(
          finalizationResult.result.reason === "expired"
            ? "A autorização do upload expirou. Envie o arquivo novamente."
            : "O conteúdo real do arquivo não corresponde a um formato permitido.",
        );
        return;
      }

      formRef.current?.reset();
      setFileKind("photo");
      setSelectedFile(null);
      setSelectionConfirmed(false);
      setAmbiguousCompletion(false);
      setSuccess(true);
      setMessage(
        "Arquivo enviado e validado. Ele permanece oculto para a cliente até liberação explícita.",
      );
      router.refresh();
    } catch {
      console.error("Admin private file upload flow failed");
      if (finalizationStarted) setAmbiguousCompletion(true);
      setMessage(
        finalizationStarted
          ? "A confirmação do envio não foi concluída. Confira o histórico antes de tentar novamente."
          : "O envio não foi concluído. Corrija a conexão ou tente novamente.",
      );
    } finally {
      inFlightRef.current = false;
      setIsPending(false);
      setPhase(null);
    }
  }

  return (
    <form aria-busy={isPending} className={styles.form} onSubmit={handleSubmit} ref={formRef}>
      {message ? (
        <Alert
          live={success ? "polite" : "assertive"}
          title={success ? "Upload concluído" : "Não foi possível enviar"}
          variant={success ? "success" : "critical"}
        >
          {message}
        </Alert>
      ) : null}

      <FormField
        description="Escolha o tipo do arquivo para aplicar os formatos e limites corretos."
        id="admin-private-file-kind"
        label="Categoria"
        required
      >
        {(fieldProps) => (
          <select
            {...fieldProps}
            className={styles.select}
            disabled={isPending}
            name="fileKind"
            onChange={(event) => {
              setFileKind(event.target.value as PrivateFileKind);
              setSelectedFile(null);
              setSelectionConfirmed(false);
              setAmbiguousCompletion(false);
              const input = formRef.current?.querySelector<HTMLInputElement>('input[name="file"]');
              if (input) input.value = "";
              setMessage(null);
              setSuccess(false);
              setPhase(null);
            }}
            value={fileKind}
          >
            <option value="photo">Foto</option>
            <option value="exam">Exame</option>
            <option value="document">Documento</option>
          </select>
        )}
      </FormField>

      <FormField
        description={
          fileKind === "photo"
            ? "JPEG, PNG ou WebP. Máximo de 10 MB."
            : "PDF, JPEG ou PNG. Máximo de 20 MB."
        }
        id="admin-private-file-input"
        label="Arquivo"
        required
      >
        {(fieldProps) => (
          <input
            {...fieldProps}
            accept={acceptByKind[fileKind]}
            className={styles.fileInput}
            disabled={isPending}
            name="file"
            onChange={(event) => {
              setSelectedFile(event.currentTarget.files?.[0] ?? null);
              setSelectionConfirmed(false);
              setAmbiguousCompletion(false);
              setMessage(null);
              setSuccess(false);
            }}
            required
            type="file"
          />
        )}
      </FormField>

      <div className={styles.selectionReview} aria-live="polite">
        <strong>Conferência antes do envio</strong>
        <p>Categoria: {PRIVATE_FILE_KIND_LABELS[fileKind]}. Limite permitido: {reviewed.maxSize}.</p>
        {selectedFile ? <p>Arquivo selecionado: {reviewed.name} · {reviewed.size}</p> : <p>Nenhum arquivo selecionado.</p>}
        <p>{reviewed.message}</p>
        {selectedFile && reviewed.ok ? <label className={styles.confirmation}>
          <input type="checkbox" checked={selectionConfirmed} disabled={isPending} onChange={event=>setSelectionConfirmed(event.target.checked)} />
          Conferi o arquivo e a categoria antes de enviar.
        </label> : null}
      </div>
      {ambiguousCompletion ? <div role="alert" className={styles.selectionReview}>
        <p>A confirmação do envio pode ter sido concluída. Confira o histórico antes de repetir para evitar duplicidade.</p>
        <Button type="button" variant="secondary" disabled={isPending} onClick={()=>{router.refresh();setAmbiguousCompletion(false);setSelectionConfirmed(false);}}>Conferi o histórico; permitir nova tentativa</Button>
      </div> : null}
      <p className={styles.notice}>
        O arquivo será validado antes de aparecer no histórico. Ele ficará
        oculto para a cliente até você escolher “Liberar para cliente”.
      </p>

      {isPending && privateFileUploadProgressMessage(phase) ? (
        <p aria-live="polite" role="status" className={styles.notice}>
          {privateFileUploadProgressMessage(phase)} Não feche esta página até a confirmação.
        </p>
      ) : null}

      <Button disabled={isPending || !reviewed.ok || !selectionConfirmed || ambiguousCompletion} loading={isPending} type="submit">
        Enviar arquivo
      </Button>
    </form>
  );
}
