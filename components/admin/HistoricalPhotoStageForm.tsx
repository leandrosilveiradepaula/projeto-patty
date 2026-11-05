"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

type Source = Readonly<{
  source_id: string;
  source_sha256: string;
  kind: string;
  state: string;
  photo_type: string | null;
  proposed_client_id: string | null;
}>;
type Receipt = Readonly<{
  id: string;
  source_id: string;
  client_id: string;
  source_sha256: string;
  client_file_id: string;
  state: string;
}>;
const sha = /^[a-f0-9]{64}$/;
const id = /^source_[0-9]{4}$/;
const MAX_PHOTO = 10 * 1024 * 1024;
const bytesHex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes),
  (x) => x.toString(16).padStart(2, "0")).join("");

export function HistoricalPhotoStageForm({
  batchId, sources, receipts, available,
}: {
  batchId: string;
  sources: readonly Source[];
  receipts: readonly Receipt[];
  available: boolean;
}) {
  const router = useRouter();
  const [sourceId, setSourceId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [identity, setIdentity] = useState(false);
  const [photoReview, setPhotoReview] = useState(false);
  const [custody, setCustody] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const candidates = sources.filter((source) =>
    source.kind === "photo" && source.state === "pending_backend_identity_verification"
    && !!source.proposed_client_id && sha.test(source.source_sha256) && id.test(source.source_id)
    && (source.photo_type === "jpeg" || source.photo_type === "png")
    && !receipts.some((r) => r.source_id === source.source_id));
  const chosen = candidates.find((s) => s.source_id === sourceId);
  function clear() {
    setFile(null);
    setIdentity(false);
    setPhotoReview(false);
    setCustody(false);
    setMessage(null);
  }
  async function submit() {
    if (busy || !available || !chosen || !chosen.proposed_client_id || !file
      || !identity || !photoReview || !custody) return;
    setBusy(true);
    setMessage(null);
    try {
      const expectedExt = chosen.photo_type === "jpeg" ? /\.(jpe?g)$/i : /\.png$/i;
      if (file.size < 1 || file.size > MAX_PHOTO || file.name.length > 255
        || !expectedExt.test(file.name)) throw new Error("invalid");
      const actualHash = bytesHex(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()));
      if (actualHash !== chosen.source_sha256) throw new Error("hash");
      const body = new FormData();
      body.set("photo", file);
      body.set("batch_id", batchId);
      body.set("source_id", chosen.source_id);
      body.set("sha256", chosen.source_sha256);
      body.set("confirmed_identity", "true");
      body.set("confirmed_photo", "true");
      body.set("confirmed_custody", "true");
      const result = await fetch(
        `/api/admin/clients/${chosen.proposed_client_id}/historical-photo`,
        { method: "POST", credentials: "same-origin", cache: "no-store", body },
      );
      const payload: unknown = await result.json();
      if (!result.ok || !payload || typeof payload !== "object"
        || !("state" in payload) || payload.state !== "staged_private"
        || !("source_id" in payload) || payload.source_id !== chosen.source_id
        || !("file_id" in payload) || typeof payload.file_id !== "string") {
        throw new Error("blocked");
      }
      setSourceId("");
      clear();
      setMessage("Foto original associada e guardada com recibo privado. Não foi liberada para a cliente.");
      router.refresh();
    } catch {
      setMessage("Importação bloqueada. Confira o arquivo original, o SHA e a associação da cliente; nenhum sucesso foi presumido.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div style={{ display: "grid", gap: "0.75rem" }} aria-busy={busy}>
      <p>Escolha uma origem de foto inventariada e confira a associação com a cliente. Os arquivos devem ser selecionados separadamente do Excel. Fotos guardadas permanecem ocultas até liberação profissional explícita.</p>
      {!available ? (
        <Alert variant="warning">Guarda de fotos indisponível. Confirme a aplicação da migration protegida antes de enviar arquivos.</Alert>
      ) : (
        <>
          <label>Origem de foto
            <select value={sourceId} disabled={busy} onChange={(e) => { setSourceId(e.target.value); clear(); }}>
              <option value="">Selecione uma origem pendente</option>
              {candidates.map((s) => (
                <option key={s.source_id} value={s.source_id}>
                  {s.source_id} — SHA {s.source_sha256.slice(0, 12)}… ({s.photo_type})
                </option>
              ))}
            </select>
          </label>
          {chosen ? (
            <>
              <p>Cliente proposta: <code>{chosen.proposed_client_id}</code>. Essa proposta não constitui verificação de identidade.</p>
              <label>Foto original (.jpg, .jpeg ou .png)
                <input type="file" accept={chosen.photo_type === "jpeg" ? ".jpg,.jpeg,image/jpeg" : ".png,image/png"}
                  disabled={busy} onChange={(e) => {
                    clear();
                    setFile(e.target.files?.[0] ?? null);
                  }} />
              </label>
              <label><input type="checkbox" checked={identity} disabled={busy || !file}
                onChange={(e) => setIdentity(e.target.checked)} />
                Conferi pessoalmente que a foto pertence à cliente proposta, sem inferir por nome ou pasta.
              </label>
              <label><input type="checkbox" checked={photoReview} disabled={busy || !file}
                onChange={(e) => setPhotoReview(e.target.checked)} />
                Conferi que o conteúdo corresponde à origem histórica e não a outra cliente.
              </label>
              <label><input type="checkbox" checked={custody} disabled={busy || !file}
                onChange={(e) => setCustody(e.target.checked)} />
                Confirmei proveniência, fundamento e guarda privada do arquivo.
              </label>
              <Button type="button" loading={busy} disabled={busy || !file || !identity || !photoReview || !custody}
                onClick={() => void submit()}>Guardar foto histórica com recibo privado</Button>
            </>
          ) : null}
          {!candidates.length ? <p>Nenhuma origem de foto desta página está elegível para guarda.</p> : null}
        </>
      )}
      {message ? <Alert variant="info" live="polite">{message}</Alert> : null}
    </div>
  );
}
