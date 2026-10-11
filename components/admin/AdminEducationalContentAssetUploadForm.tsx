"use client";

import { type FormEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { inspectEducationalContentAssetRegistrationAction, registerEducationalContentAssetAction } from "@/app/admin/conteudos/[contentId]/actions";
import { Button } from "@/components/ui/Button";
import { EDUCATIONAL_ASSET_MIME_TYPES, validateEducationalAssetUploadSelection } from "@/lib/content/asset-upload-selection";

import styles from "@/app/admin/conteudos/[contentId]/page.module.css";

type UploadGrantResponse =
  | {
      error: string;
    }
  | {
      expiresAt: number;
      pathname: string;
      uploadUrl: string;
    };

type UploadedAsset = {
  byteSize: number;
  contentType: string;
  pathname: string;
  sha256Hex: string;
};

function hexFromBuffer(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function sha256File(file: File) {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return hexFromBuffer(digest);
}

export function AdminEducationalContentAssetUploadForm({
  contentId,
  versionId,
}: {
  contentId: string;
  versionId: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<UploadedAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [registerBusy, setRegisterBusy] = useState(false);
  const [inspectionBusy, setInspectionBusy] = useState(false);
  const [registrationUncertain, setRegistrationUncertain] = useState(false);
  const uploadInFlightRef = useRef(false);
  const registerInFlightRef = useRef(false);
  const inspectInFlightRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const registerAction = useMemo(
    () => registerEducationalContentAssetAction.bind(null, contentId, versionId),
    [contentId, versionId],
  );

  async function uploadSelectedFile() {
    if (uploadInFlightRef.current || registerInFlightRef.current || inspectInFlightRef.current || uploaded) {
      return;
    }

    const selection = validateEducationalAssetUploadSelection(file);
    if (!selection.ok) {
      setStatus(selection.message);
      return;
    }
    if (!file) return;

    uploadInFlightRef.current = true;
    setBusy(true);
    setUploaded(null);

    try {
      setStatus("Calculando SHA-256 localmente antes do upload…");
      const sha256Hex = await sha256File(file);

      setStatus("Preparando uma URL privada e temporária de upload…");
      const grantResponse = await fetch(
        `/admin/conteudos/${contentId}/assets/upload`,
        {
          body: JSON.stringify({
            byteSize: file.size,
            contentType: file.type,
            versionId,
          }),
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        },
      );

      const grant = (await grantResponse.json()) as UploadGrantResponse;

      if (!grantResponse.ok || "error" in grant) {
        throw new Error(
          "error" in grant ? grant.error : "Não foi possível preparar o upload",
        );
      }

      setStatus("Enviando o arquivo diretamente para o Blob privado…");
      const uploadResponse = await fetch(grant.uploadUrl, {
        body: file,
        headers: {
          "Content-Type": file.type,
        },
        method: "PUT",
      });

      if (!uploadResponse.ok) {
        throw new Error(
          `O Blob recusou o upload (HTTP ${uploadResponse.status}).`,
        );
      }

      setRegistrationUncertain(false);
      setUploaded({
        byteSize: file.size,
        contentType: file.type,
        pathname: grant.pathname,
        sha256Hex,
      });
      setStatus(
        "Upload concluído. Revise os dados abaixo e registre o asset explicitamente.",
      );
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Falha inesperada no upload",
      );
    } finally {
      uploadInFlightRef.current = false;
      setBusy(false);
    }
  }

  async function registerUploadedAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!uploaded || registerInFlightRef.current || uploadInFlightRef.current || inspectInFlightRef.current || registrationUncertain) return;
    registerInFlightRef.current = true;
    setRegisterBusy(true);
    setStatus("Validando o asset no servidor e registrando os metadados…");
    try {
      await registerAction(new FormData(event.currentTarget));
      setStatus("Asset privado registrado com sucesso. Ainda não foi publicado nem liberado.");
      setUploaded(null);
      setRegistrationUncertain(false);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch {
      setRegistrationUncertain(true);
      setStatus(
        "Não foi possível confirmar o registro do asset. O upload não será repetido automaticamente. Consulte o estado no servidor antes de tentar registrar novamente.",
      );
    } finally {
      registerInFlightRef.current = false;
      setRegisterBusy(false);
    }
  }

  async function inspectRegistration() {
    if (!uploaded || inspectInFlightRef.current || uploadInFlightRef.current || registerInFlightRef.current) return;
    inspectInFlightRef.current = true;
    setInspectionBusy(true);
    setStatus("Conferindo se o registro deste arquivo existe no servidor…");
    try {
      const result = await inspectEducationalContentAssetRegistrationAction(contentId, versionId, {
        storagePath: uploaded.pathname,
        byteSize: uploaded.byteSize,
        contentType: uploaded.contentType,
        sha256Hex: uploaded.sha256Hex,
      });
      if (result.status === "registered") {
        setRegistrationUncertain(false);
        setUploaded(null);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setStatus("Registro confirmado no servidor. A publicação e a liberação continuam manuais.");
        router.refresh();
      } else if (result.status === "not_registered") {
        setRegistrationUncertain(false);
        setStatus("O servidor não encontrou um registro para este arquivo. Você pode repetir somente o registro dos metadados, sem transferir o arquivo novamente.");
      } else if (result.status === "conflict") {
        setRegistrationUncertain(true);
        setStatus("Existe outro registro ou a versão mudou. Confira os arquivos da versão antes de tomar qualquer ação.");
      } else {
        setRegistrationUncertain(true);
        setStatus("Não foi possível verificar o registro neste momento. Consulte o histórico da versão e tente verificar novamente; não envie outra cópia.");
      }
    } catch {
      setRegistrationUncertain(true);
      setStatus("Falha ao consultar o registro. Consulte os arquivos da versão antes de reenviar.");
    } finally {
      inspectInFlightRef.current = false;
      setInspectionBusy(false);
    }
  }

  return (
    <div aria-busy={busy || registerBusy || inspectionBusy} className={styles.uploadPanel}>
      <label className={styles.field}>
        <span>Arquivo aprovado para upload privado</span>
        <input
          accept={EDUCATIONAL_ASSET_MIME_TYPES.join(",")}
          disabled={busy || registerBusy || inspectionBusy || registrationUncertain}
          ref={fileInputRef}
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setUploaded(null);
            setRegistrationUncertain(false);
            setStatus(null);
          }}
          type="file"
        />
      </label>

      <div className={styles.uploadActions}>
        <Button
          disabled={!file || busy || registerBusy || inspectionBusy || uploaded !== null}
          onClick={uploadSelectedFile}
          type="button"
        >
          {busy ? "Enviando…" : "Enviar para o Blob privado"}
        </Button>
        {file ? (
          <span className={styles.description}>
            {file.name} · {file.size.toLocaleString("pt-BR")} bytes ·{" "}
            {file.type || "MIME desconhecido"}
          </span>
        ) : null}
      </div>

      {status ? (
        <p aria-live="polite" className={styles.description}>
          {status}
        </p>
      ) : null}

      {registrationUncertain && uploaded ? (
        <div className={styles.uploadSummary} role="alert">
          <p>O upload já foi transferido, mas ainda não sabemos se o registro foi concluído. Não inicie outro envio antes de consultar esta mesma versão.</p>
          <Button type="button" variant="secondary" disabled={busy || registerBusy || inspectionBusy} onClick={inspectRegistration}>
            {inspectionBusy ? "Verificando…" : "Consultar estado do registro"}
          </Button>
        </div>
      ) : null}
      {uploaded ? (
        <form className={styles.form} onSubmit={registerUploadedAsset}>
          <input name="storagePath" type="hidden" value={uploaded.pathname} />
          <input name="contentType" type="hidden" value={uploaded.contentType} />
          <input
            name="byteSize"
            type="hidden"
            value={String(uploaded.byteSize)}
          />
          <input name="sha256Hex" type="hidden" value={uploaded.sha256Hex} />

          <div className={styles.uploadSummary}>
            <strong>Upload concluído, ainda não registrado</strong>
            <p className={styles.mono}>Path: {uploaded.pathname}</p>
            <p className={styles.mono}>MIME: {uploaded.contentType}</p>
            <p className={styles.mono}>
              Tamanho: {uploaded.byteSize.toLocaleString("pt-BR")} bytes
            </p>
            <p className={styles.mono}>SHA-256: {uploaded.sha256Hex}</p>
          </div>

          <label className={styles.confirmation}>
            <input
              disabled={registerBusy}
              name="confirmVerified"
              required
              type="checkbox"
              value="yes"
            />
            <span>
              Revisei os dados do upload. Registrar o asset não publica nem
              libera o conteúdo para clientes.
            </span>
          </label>

          <Button disabled={busy || registerBusy || inspectionBusy || registrationUncertain} loading={registerBusy} type="submit">
            Registrar asset verificado
          </Button>
        </form>
      ) : null}
    </div>
  );
}
