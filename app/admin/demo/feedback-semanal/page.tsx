import { DemoWorkspaceNav } from "@/components/admin/DemoWorkspaceNav";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";

import styles from "../demo.module.css";

const responses = [
  ["1. Fez quantos treinos?", "4 treinos."],
  ["2. Quantos aerobicos?", "3 aerobicos de 30 minutos."],
  ["3. Teve refeicao livre programada?", "Sim. Hamburguer artesanal e batata no sabado."],
  ["4. Comeu a mais nas refeicoes propostas?", "Nao."],
  ["5. Beliscou algum alimento?", "Sim, duas vezes. Castanhas no fim da tarde."],
  ["6. Furou o protocolo com oleo ou acucar?", "Nao."],
  ["7. Comeu em restaurante?", "Sim, almoco de trabalho na quinta-feira."],
  ["8. Em Cutting, consumiu churrasco ou comida japonesa?", "Nao se aplica nesta semana."],
  ["9. Consumiu bebida alcoolica nao programada?", "Nao."],
  ["10. Comeu a menos as doses propostas?", "Sim. Faltou 1 dose de carboidrato em uma refeicao."],
  ["11. Respeitou o limite maximo diario?", "Sim."],
  ["12. Atingiu a meta de liquidos?", "Na maioria dos dias."],
  ["13. Media diaria de liquidos?", "3,2 L por dia."],
  ["14. Manipulados previstos no protocolo?", "Nao se aplica."],
  ["15. Suplementos previstos no protocolo?", "Sim, usei todos os dias."],
  ["16. Recursos ergogenicos previstos no protocolo?", "Nao se aplica."],
  ["17. Nota para sua execucao?", "8/10."],
  ["18. Maior dificuldade?", "Organizar as refeicoes nos dois dias de escritorio."],
  ["19. Como esta se sentindo?", "Bem, com boa energia e menos fome no fim do dia."],
  ["20. Home office ou trabalho externo?", "Hibrido: tres dias em casa e dois no escritorio."],
  ["21. Academia ou casa?", "Academia."],
];

export default function AdminDemoWeeklyFeedbackPage() {
  return (
    <>
      <PageHeader
        actions={<Badge variant="positive">Respondido</Badge>}
        description="Exemplo de como a Patty pode ler rapidamente o feedback semanal sem perder a resposta original da cliente."
        eyebrow="Feedback semanal · DEMO"
        title="Semana de 21 a 27/09/2026"
      />

      <DemoWorkspaceNav />

      <Section title="Resumo operacional">
        <div className={styles.grid}>
          <Card className={styles.card}>
            <h3>Cliente</h3>
            <p>Marina Oliveira (DEMO)</p>
            <p>Enviado: segunda-feira · Respondido: terca-feira</p>
          </Card>
          <Card className={styles.card}>
            <h3>Leitura rapida</h3>
            <p>4 treinos · 3 aerobicos · autoavaliacao 8/10</p>
            <p>Maior dificuldade: refeicoes nos dias de escritorio.</p>
          </Card>
        </div>
      </Section>

      <Section
        description="Nesta demonstracao nao existe classificacao automatica de adesao nem mudanca automatica de protocolo."
        title="Respostas originais"
      >
        <ol className={styles.feedbackList}>
          {responses.map(([question, answer]) => (
            <li key={question}>
              <Card variant="subtle">
                <strong>{question}</strong>
                <p className={styles.answer}>{answer}</p>
              </Card>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Area profissional">
        <Card className={styles.card}>
          <h3>Observacao da Patty</h3>
          <p>
            Espaco reservado para a Patty registrar sua leitura depois de revisar
            as respostas. Em producao, esta observacao deve permanecer separada
            da resposta original da cliente.
          </p>
        </Card>
      </Section>
    </>
  );
}
