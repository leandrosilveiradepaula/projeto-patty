import Link from "next/link";
import {
  eligibleAssessmentComparisonPhotos,
  selectAssessmentPhotoPair,
  type AssessmentPhotoComparisonFile,
  type AssessmentPhotoComparisonAssessment,
} from "@/lib/evaluations/assessment-photo-comparison";
import { formatAdministrativeAssessmentDate } from "@/lib/evaluations/administrative-assessment-history";
import styles from "./AssessmentLongitudinalPhotoComparison.module.css";

type Props<T extends AssessmentPhotoComparisonAssessment> = {
  assessmentId: string;
  currentDate: string;
  clientId: string;
  earlierAssessments: readonly T[];
  selectedAssessment: T | null;
  earlierFiles: readonly AssessmentPhotoComparisonFile[];
  currentFiles: readonly AssessmentPhotoComparisonFile[];
  requestedEarlierPhoto: unknown;
  requestedCurrentPhoto: unknown;
  invalidAssessment: boolean;
};

export function AssessmentLongitudinalPhotoComparison<T extends AssessmentPhotoComparisonAssessment>({
  assessmentId, currentDate, clientId, earlierAssessments, selectedAssessment,
  earlierFiles, currentFiles, requestedEarlierPhoto, requestedCurrentPhoto, invalidAssessment,
}: Props<T>) {
  const base = `/admin/avaliacoes/${assessmentId}`;
  const earlierPhotos = eligibleAssessmentComparisonPhotos(earlierFiles);
  const currentPhotos = eligibleAssessmentComparisonPhotos(currentFiles);
  const pair = selectAssessmentPhotoPair(earlierPhotos, currentPhotos, requestedEarlierPhoto, requestedCurrentPhoto);
  return <div className={styles.container}>
    <p>Compare visualmente fotos vinculadas a avaliações diferentes desta cliente. O aplicativo não conclui evolução corporal, diagnóstico ou qualidade de resultado.</p>
    {earlierAssessments.length === 0 ? <p role="status">Ainda não existe uma avaliação finalizada anterior para comparação fotográfica.</p> : <>
      <form action={base} method="get" className={styles.controls}>
        <label>Avaliação anterior
          <select name="fotoAvaliacaoAnterior" defaultValue={selectedAssessment?.id ?? ""} required>
            <option value="">Selecione</option>
            {earlierAssessments.map(assessment =>
              <option key={assessment.id} value={assessment.id}>{formatAdministrativeAssessmentDate(assessment.assessed_at)}</option>)}
          </select>
        </label>
        <button type="submit">Carregar fotos da avaliação</button>
      </form>
      {invalidAssessment ? <p role="alert">A avaliação selecionada não é uma avaliação anterior finalizada e acessível desta cliente.</p> : null}
      {selectedAssessment ? <>
        {earlierPhotos.length === 0 || currentPhotos.length === 0 ?
          <p role="status">A comparação exige pelo menos uma foto compatível vinculada a cada avaliação. Nenhum arquivo externo será carregado.</p> :
          <form action={base} method="get" className={styles.controls}>
            <input type="hidden" name="fotoAvaliacaoAnterior" value={selectedAssessment.id} />
            <label>Foto da avaliação anterior
              <select name="fotoAnterior" defaultValue={pair.state === "ready" ? pair.earlier.id : ""} required>
                <option value="">Selecione</option>
                {earlierPhotos.map(file => <option key={file.id} value={file.id}>{file.original_filename?.trim() || "Foto sem nome"}</option>)}
              </select>
            </label>
            <label>Foto da avaliação atual
              <select name="fotoAtual" defaultValue={pair.state === "ready" ? pair.current.id : ""} required>
                <option value="">Selecione</option>
                {currentPhotos.map(file => <option key={file.id} value={file.id}>{file.original_filename?.trim() || "Foto sem nome"}</option>)}
              </select>
            </label>
            <button type="submit">Comparar fotos vinculadas</button>
          </form>
        }
        {pair.state === "invalid" && earlierPhotos.length > 0 && currentPhotos.length > 0 ?
          <p role="alert">Escolha duas imagens diferentes, cada uma vinculada à avaliação indicada.</p> : null}
        {pair.state === "ready" ? <div className={styles.grid}>
          {[
            { label: "Avaliação anterior", date: selectedAssessment.assessed_at, file: pair.earlier },
            { label: "Avaliação atual", date: currentDate, file: pair.current },
          ].map(({label,date,file}) => <figure key={label} className={styles.figure}>
            <figcaption><strong>{label}</strong><span>{formatAdministrativeAssessmentDate(date)} · {file.original_filename?.trim() || "Foto sem nome"}</span></figcaption>
            <img src={`/admin/fotos/${file.id}`} alt={label + " selecionada para comparação manual"} loading="lazy" referrerPolicy="no-referrer" />
          </figure>)}
        </div> : null}
      </> : null}
    </>}
    <Link href={`/admin/clientes/${clientId}/arquivos`} className={styles.link}>Abrir arquivos privados da cliente</Link>
  </div>;
}
