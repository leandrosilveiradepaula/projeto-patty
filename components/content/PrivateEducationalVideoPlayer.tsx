import styles from "./PrivateEducationalVideoPlayer.module.css";

type PrivateEducationalVideoPlayerProps = {
  assetUrl: string;
  title: string;
};

/**
 * The src is an application-owned, authenticated asset endpoint. Each media
 * request is authorized there before the browser gets a short-lived Blob URL.
 * Native controls permit playback and seeking without prefetching a large file.
 */
export function PrivateEducationalVideoPlayer({
  assetUrl,
  title,
}: PrivateEducationalVideoPlayerProps) {
  return (
    <div className={styles.container}>
      <video
        aria-label={`Reproduzir vídeo: ${title}`}
        className={styles.video}
        controls
        playsInline
        preload="none"
        src={assetUrl}
      >
        Seu navegador não suporta reprodução de vídeo. Use o link para baixar o arquivo.
      </video>
      <p className={styles.hint}>
        Use os controles para assistir ou avançar o vídeo. O arquivo continua
        privado; se a reprodução não for suportada, utilize o link de download.
      </p>
    </div>
  );
}
