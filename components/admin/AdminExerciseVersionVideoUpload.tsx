"use client";

import { type FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { registerExerciseVersionVideoAction } from "@/app/admin/exercicios/[exerciseId]/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

import styles from "@/app/admin/exercicios/[exerciseId]/page.module.css";

type UploadedVideo = {
  byteSize: number;
  pathname: string;
  sha256Hex: string;
};

function hex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(file: File) {
  return hex(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()));
}

export function AdminExerciseVersionVideoUpload({ exerciseId, versionId }: { exerciseId: string; versionId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState<UploadedVideo | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function upload() {
    if (!file || busy || uploaded || file.type !== "video/mp4" || file.size <= 0) {
      setMessage("Selecione um arquivo MP4 válido antes de continuar.");
      return;
    }
    setBusy(true);
    setMessage("Calculando a integridade SHA-256 do vídeo…");
    try {
      const sha256Hex = await sha256(file);
      setMessage("Preparando o upload privado…");
      const grantResponse = await fetch(`/admin/exercicios/${exerciseId}/videos/upload`, {
        body: JSON.stringify({ byteSize: file.size, contentType: file.type, versionId }),
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const grant = await grantResponse.json() as { error?: string; pathname?: string; uploadUrl?: string };
      if (!grantResponse.ok || !grant.pathname || !grant.uploadUrl) throw new Error(grant.error ?? "Não foi possível preparar o upload.");
      setMessage("Enviando o vídeo ao armazenamento privado…");
      const response = await fetch(grant.uploadUrl, { body: file, headers: { "Content-Type": file.type }, method: "PUT" });
      if (!response.ok) throw new Error("O armazenamento privado recusou o upload.");
      setUploaded({ byteSize: file.size, pathname: grant.pathname, sha256Hex });
      setMessage("Upload concluído. Registre o vídeo explicitamente após revisar a confirmação.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível concluir o upload privado.");
    } finally {
      setBusy(false);
    }
  }

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!uploaded || busy) return;
    setBusy(true);
    setMessage("Validando o arquivo no servidor e registrando a mídia…");
    try {
      await registerExerciseVersionVideoAction(exerciseId, versionId, new FormData(event.currentTarget));
      setUploaded(null);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      setMessage("Vídeo privado registrado. A publicação da versão continua manual.");
      router.refresh();
    } catch {
      setMessage("O registro não foi confirmado. Não envie outra cópia; confira esta versão antes de tentar registrar novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div aria-busy={busy} className={styles.form}>
      {message ? <Alert live="polite" title="Vídeo demonstrativo" variant="info">{message}</Alert> : null}
      <label className={styles.field}>
        <span>Vídeo MP4 privado</span>
        <input accept="video/mp4" disabled={busy || uploaded !== null} onChange={(event) => { setFile(event.target.files?.[0] ?? null); setMessage(null); }} ref={inputRef} type="file" />
      </label>
      {file ? <p className={styles.description}>{file.name} · {file.size.toLocaleString("pt-BR")} bytes · {file.type || "MIME desconhecido"}</p> : null}
      <Button disabled={!file || busy || uploaded !== null} onClick={upload} type="button">{busy ? "Processando…" : "Enviar vídeo privado"}</Button>
      {uploaded ? (
        <form className={styles.form} onSubmit={register}>
          <input name="storagePath" type="hidden" value={uploaded.pathname} />
          <input name="contentType" type="hidden" value="video/mp4" />
          <input name="byteSize" type="hidden" value={String(uploaded.byteSize)} />
          <input name="sha256Hex" type="hidden" value={uploaded.sha256Hex} />
          <label className={styles.confirmation}><input disabled={busy} name="confirmVerified" required type="checkbox" value="yes" /><span>Revisei o upload. Registrar o vídeo não publica o exercício nem altera treinos.</span></label>
          <Button disabled={busy} loading={busy} type="submit">Registrar vídeo verificado</Button>
        </form>
      ) : null}
    </div>
  );
}
