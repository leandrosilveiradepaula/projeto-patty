import Link from "next/link";

import { Section } from "@/components/ui/Section";

const destinations = {
  anamnesis: { href: "/cliente/anamnese", label: "Minha Anamnese" },
  assessments: { href: "/cliente/avaliacoes", label: "Minhas avaliações" },
  progress: { href: "/cliente/evolucao", label: "Minha evolução" },
  protocol: { href: "/cliente/protocolo", label: "Meu protocolo" },
  feedback: { href: "/cliente/feedback-semanal", label: "Feedback semanal" },
  checkins: { href: "/cliente/checkins", label: "Check-ins" },
  training: { href: "/cliente/treino", label: "Meu treino" },
  contents: { href: "/cliente/conteudos", label: "Conteúdos liberados" },
  files: { href: "/cliente/arquivos", label: "Meus arquivos" },
  index: { href: "/cliente/mais", label: "Todas as áreas" },
} as const;

type JourneyKey = keyof typeof destinations;

export function ClientJourneyNextSteps({ areas }: { areas: readonly JourneyKey[] }) {
  const unique = [...new Set(areas)];

  return (
    <Section
      description="Consulte outras áreas do seu acompanhamento. Nenhum desses acessos altera automaticamente seu protocolo ou substitui a revisão da Patty."
      title="Continuar meu acompanhamento"
    >
      <nav aria-label="Próximas áreas do acompanhamento">
        <ul>
          {unique.map((area) => (
            <li key={area}>
              <Link href={destinations[area].href}>{destinations[area].label}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </Section>
  );
}
