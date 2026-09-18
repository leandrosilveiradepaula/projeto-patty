import type { AnamnesisQuestionId } from "@/lib/anamnesis/catalog";

export type DemoClient = {
  id: string;
  label: string;
  visualLabel: string;
};

export type DemoAnswer = Partial<Record<AnamnesisQuestionId, string>>;

export type DemoReviewEntry = {
  aiAnalysis?: string;
  pattyObservation?: string;
  questionId: AnamnesisQuestionId;
};

export type DemoAnamnesis = {
  answers: DemoAnswer;
  clientId: DemoClient["id"];
  id: string;
  reviewEntries: readonly DemoReviewEntry[];
};

export const demoClients: readonly DemoClient[] = [
  {
    id: "demo-001",
    label: "Cliente Demonstração 001",
    visualLabel: "01",
  },
  {
    id: "demo-002",
    label: "Cliente Demonstração 002",
    visualLabel: "02",
  },
];

export const demoAnamneses: readonly DemoAnamnesis[] = [
  {
    answers: {
      "ANAM-025": "Resposta demonstrativa registrada.",
      "ANAM-026": "Não informado neste exemplo.",
      "ANAM-034": "Não sei",
      "ANAM-035": "Resposta demonstrativa registrada.",
      "ANAM-041": "Não",
    },
    clientId: "demo-001",
    id: "demo-001",
    reviewEntries: [
      {
        aiAnalysis: "Análise demonstrativa da IA para revisão profissional.",
        pattyObservation: "Observação profissional demonstrativa.",
        questionId: "ANAM-025",
      },
      {
        pattyObservation: "Observação profissional demonstrativa.",
        questionId: "ANAM-041",
      },
      {
        aiAnalysis: "Análise demonstrativa da IA para revisão profissional.",
        questionId: "ANAM-034",
      },
      {
        questionId: "ANAM-026",
      },
      {
        aiAnalysis: "Análise demonstrativa da IA para revisão profissional.",
        questionId: "ANAM-035",
      },
    ],
  },
  {
    answers: {
      "ANAM-034": "Não sei",
      "ANAM-041": "Não",
    },
    clientId: "demo-002",
    id: "demo-002",
    reviewEntries: [],
  },
];

export function getDemoClient(clientId: string) {
  return demoClients.find((client) => client.id === clientId);
}

export function getDemoAnamnesis(anamnesisId: string) {
  return demoAnamneses.find((anamnesis) => anamnesis.id === anamnesisId);
}

export function getDemoAnamnesisForClient(clientId: string) {
  return demoAnamneses.find((anamnesis) => anamnesis.clientId === clientId);
}
