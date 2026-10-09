"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createClientFileUploadSessionAction,
  finalizeClientFileUploadSessionAction,
} from "@/app/cliente/arquivos/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { createClient } from "@/lib/supabase/client";
import type { PrivateFileKind } from "@/lib/validation/private-files";
import { validatePrivateFileUploadSelection } from "@/lib/files/private-file-upload-selection";

import styles from "./ClientPrivateFileUploadForm.module.css";

const acceptByKind: Record<PrivateFileKind, string> = {
  photo: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp",
  exam: ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png",
  document: ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png",
};

const errorMessages: Record<string, string> = {
  missing_file: "Selecione um arquivo não vazio para enviar.",
  extension_mime_mismatch:
    "A extensão do arquivo não corresponde ao tipo informado pelo dispositivo.",
  invalid_extension: "Este formato de arquivo não é aceito.",
  invalid_mime_type: "O tipo deste arquivo não é aceito.",
  invalid_original_filename: "O arquivo precisa ter um nome válido.",
  invalid_session_id: "A sessão de upload é inválida.",
  invalid_size: "O arquivo está vazio ou ultrapassa o limite permitido.",
};

export function ClientPrivateFileUploadForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const inFlightRef = useRef(false);
  const router = useRouter();
  const [fileKind, setFileKind] = useState<PrivateFileKind>("photo");
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlightRef.current) return;
    setMessage(null);
    setSuccess(false);

    const formData = new FormData(event.currentTarget);
    const selectedFile = formData.get("file");

    const selection = validatePrivateFileUploadSelection(
      selectedFile instanceof File ? selectedFile : null,
      fileKind,
    );
    if (!selection.ok) {
      setMessage(errorMessages[selection.error] ?? "Revise o formato e o tamanho do arquivo.");
      return;
    }

    inFlightRef.current = true;
    setIsPending(true);

    try {
      const sessionResult = await createClientFileUploadSessionAction({
        byteSize: selection.byteSize,
        claimedMimeType: selection.claimedMimeType,
        extension: selection.extension,
        fileKind,
        originalFilename: selection.originalFilename,
      });

      if (!sessionResult.ok) {
        setMessage(
          errorMessages[sessionResult.error] ??
            "Não foi possível autorizar este arquivo para upload.",
        );
        return;
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("client-private")
        .upload(sessionResult.session.objectPath, selectedFile, {
          cacheControl: "3600",
          contentType: selectedFile.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Private file temporary upload failed");
        setMessage(
          "Não foi possível enviar o arquivo para a área temporária. Tente novamente.",
        );
        return;
      }

      const finalizationResult = await finalizeClientFileUploadSessionAction(
        sessionResult.session.id,
      );

      if (!finalizationResult.ok) {
        setMessage(
          errorMessages[finalizationResult.error] ??
            "Não foi possível concluir o upload.",
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
      setSuccess(true);
      setMessage("Arquivo enviado e validado com sucesso.");
      router.refresh();
    } catch {
      console.error("Private file upload flow failed");
      setMessage("Não foi possível concluir o upload. Tente novamente.");
    } finally {
      inFlightRef.current = false;
      setIsPending(false);
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
        description="Escolha a categoria correta para manter seu histórico organizado."
        id="private-file-kind"
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
              const input = formRef.current?.querySelector<HTMLInputElement>('input[name="file"]');
              if (input) input.value = "";
              setMessage(null);
              setSuccess(false);
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
        id="private-file-input"
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
            required
            type="file"
          />
        )}
      </FormField>

      <p className={styles.privacyNote}>
        O arquivo permanece privado. Ele só é registrado como recebido depois
        da validação do conteúdo no servidor.
      </p>

      <Button loading={isPending} type="submit">
        Enviar arquivo
      </Button>
    </form>
  );
}
