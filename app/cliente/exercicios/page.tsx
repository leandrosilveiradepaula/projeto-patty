import Link from "next/link";

import { EmptyState } from "@/components/ui/EmptyState";

export default function ClientExercisesPage() {
  return (
    <EmptyState
      action={<Link href="/cliente/treino">Ir para Treino</Link>}
      description="Os exercícios do seu acompanhamento serão exibidos como parte do treino que a Patty selecionar e publicar para você. A biblioteca completa de exercícios é uma ferramenta de trabalho da Consultoria."
      title="Exercícios fazem parte do seu treino"
    />
  );
}
