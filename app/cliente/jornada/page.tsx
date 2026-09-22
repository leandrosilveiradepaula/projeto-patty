import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

export default function ClienteJornadaPage() {
  return (
    <>
      <PageHeader
        description="A Jornada não exibe eventos enquanto a composição definitiva desse histórico não estiver formalizada."
        eyebrow="Cliente"
        title="Jornada"
      />
      <EmptyState
        description="Os eventos demonstrativos foram removidos. Esta área será habilitada quando houver regras documentadas para quais fatos do acompanhamento podem compor a Jornada da cliente."
        title="Jornada ainda não disponível"
      />
    </>
  );
}
