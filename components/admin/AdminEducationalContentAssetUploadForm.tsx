"use client";

import { useMemo, useState } from "react";

import { registerEducationalContentAssetAction } from "@/app/admin/conteudos/[contentId]/actions";
import { Button } from "@/components/ui/Button";

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

  const registerAction = useMemo(
    () => registerEducationalContentAssetAction.bind(null, contentId, versionId),
    [contentId, versionId],
  );

  async function uploadSelectedFile() {
    if (!file || busy) {
      return;
    }

    if (!file.type) {
      setStatus("O arquivo precisa informar um MIME type reconhecido.");
      return;
    }

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
      setBusy(false);
    }
  }

  return (
    <div className={styles.uploadPanel}>
      <label className={styles.field}>
        <span>Arquivo aprovado para upload privado</span>
        <input
          accept="application/pdf,image/jpeg,image/png,image/webp,video/mp4"
          disabled={busy}
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setUploaded(null);
            setStatus(null);
          }}
          type="file"
        />
      </label>

      <div className={styles.uploadActions}>
        <Button
          disabled={!file || busy}
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

      {uploaded ? (
        <form action={registerAction} className={styles.form}>
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

          <Button type="submit">Registrar asset verificado</Button>
        </form>
      ) : null}
    </div>
  );
}
