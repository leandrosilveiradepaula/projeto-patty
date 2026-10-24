"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PrivateEducationalVideoPlayer } from "@/components/content/PrivateEducationalVideoPlayer";
import styles from "@/app/cliente/treino/page.module.css";

type Item = {
  id: string;
  position: number;
  exercise_name: string;
  sets_text: string;
  repetitions_text: string;
  rest_text: string | null;
  execution_notes: string | null;
  videoId: string | null;
};

export function ClientWorkoutGuide({ items }: { items: readonly Item[] }) {
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? "");
  const currentIndex = Math.max(0, items.findIndex(item => item.id === selectedId));
  const current = items[currentIndex];
  if (!current) return null;
  const jump = (index: number) => {
    const next = items[index];
    if (!next) return;
    setSelectedId(next.id);
    document.getElementById("exercicio-em-foco")?.focus();
  };
  return (
    <section className={styles.workoutGuide} aria-label="Guia de consulta dos exercícios publicados">
      <div className={styles.workoutGuideIntro}>
        <h3>Consulte os exercícios do seu treino</h3>
        <p>Veja um exercício de cada vez ou escolha diretamente na lista. Esta navegação não registra execução nem altera sua prescrição.</p>
      </div>
      <nav aria-label="Escolher exercício do treino" className={styles.exerciseNavigator}>
        {items.map((item, index) => (
          <button key={item.id} type="button" aria-current={currentIndex === index ? "step" : undefined}
            onClick={() => jump(index)}>
            <span>{index + 1}. {item.exercise_name}</span>
          </button>
        ))}
      </nav>
      <Card className={styles.workoutFocus} variant="subtle">
        <div className={styles.workoutFocusHeader} id="exercicio-em-foco" tabIndex={-1}>
          <span className={styles.meta}>Exercício {currentIndex + 1} de {items.length}</span>
          <Badge variant="neutral">{current.sets_text} séries</Badge>
        </div>
        <h3>{current.exercise_name}</h3>
        <dl className={styles.workoutFacts}>
          <div><dt>Séries</dt><dd>{current.sets_text}</dd></div>
          <div><dt>Repetições</dt><dd>{current.repetitions_text}</dd></div>
          {current.rest_text ? <div><dt>Descanso indicado</dt><dd>{current.rest_text}</dd></div> : null}
        </dl>
        {current.execution_notes ? (
          <section className={styles.exerciseInstructions} aria-label="Orientações da Patty">
            <h4>Orientações da Patty</h4><p>{current.execution_notes}</p>
          </section>
        ) : <p className={styles.meta}>Sem orientações adicionais registradas nesta versão.</p>}
        {current.videoId ? (
          <section className={styles.exerciseInstructions} aria-label="Vídeo demonstrativo privado">
            <h4>Vídeo demonstrativo</h4>
            <PrivateEducationalVideoPlayer
              assetUrl={`/cliente/treino/videos/${current.videoId}`}
              title={`Demonstração de ${current.exercise_name}`}
            />
          </section>
        ) : null}
        <div className={styles.workoutSteps}>
          <button type="button" disabled={currentIndex === 0} onClick={() => jump(currentIndex - 1)}>Exercício anterior</button>
          <button type="button" disabled={currentIndex === items.length - 1} onClick={() => jump(currentIndex + 1)}>Próximo exercício</button>
        </div>
      </Card>
    </section>
  );
}
