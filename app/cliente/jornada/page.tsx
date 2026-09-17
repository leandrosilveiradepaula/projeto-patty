import { ClientJourneyCurrent } from "@/components/client/ClientJourneyCurrent";
import { ClientJourneyTimeline } from "@/components/client/ClientJourneyTimeline";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";

export default function ClienteJornadaPage() {
  return (
    <>
      <PageHeader description="Histórico demonstrativo dos eventos publicados no acompanhamento." eyebrow="Cliente" title="Jornada" />
      <Section description="Acesso rápido ao protocolo demonstrativo disponível nesta interface." title="Agora"><ClientJourneyCurrent availableSinceLabel="Disponibilizado em 12/09/2026" href="/cliente/protocolo" strategyLabel="Reconhecimento Metabólico" /></Section>
      <Section description="Eventos demonstrativos organizados do mais antigo ao mais recente." title="Histórico da jornada"><ClientJourneyTimeline events={[
        { dateLabel: "10/06/2026", dateTime: "2026-06-10", description: "Avaliação registrada neste acompanhamento demonstrativo.", title: "Avaliação realizada", typeLabel: "Avaliação" },
        { dateLabel: "12/06/2026", dateTime: "2026-06-12", description: "Reconhecimento Metabólico disponibilizado.", title: "Protocolo disponibilizado", typeLabel: "Protocolo" },
        { dateLabel: "22/07/2026", dateTime: "2026-07-22", description: "Reavaliação registrada neste acompanhamento demonstrativo.", title: "Reavaliação realizada", typeLabel: "Reavaliação" },
        { dateLabel: "25/07/2026", dateTime: "2026-07-25", description: "Cutting 1 Dia 1 / Dia 2 disponibilizado.", title: "Protocolo disponibilizado", typeLabel: "Protocolo" },
        { dateLabel: "30/08/2026", dateTime: "2026-08-30", description: "Reconhecimento Metabólico retomado.", title: "Estratégia retomada", typeLabel: "Retomada" },
        { dateLabel: "12/09/2026", dateTime: "2026-09-12", description: "Reconhecimento Metabólico disponibilizado para consulta.", metaLabel: "Atual", title: "Protocolo disponibilizado", typeLabel: "Protocolo" },
      ]} /></Section>
    </>
  );
}
