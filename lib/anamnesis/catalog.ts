export type AnamnesisRepresentationKind = "generic" | "single-choice";

export type AnamnesisOption = {
  label: string;
  value: string;
};

export type AnamnesisQuestion = {
  categoryId: string;
  id: string;
  label: string;
  options?: readonly AnamnesisOption[];
  representationKind: AnamnesisRepresentationKind;
};

export type AnamnesisCategory = {
  description: string;
  id: string;
  label: string;
  order: number;
  questions: readonly AnamnesisQuestion[];
};

const waterOptions = [
  "1L",
  "1,5L",
  "2L",
  "2,5L",
  "3L",
  "3,5L",
  "4L",
  "4,5L",
  "5L ou mais",
  "Não sei",
].map((label) => ({ label, value: label }));

const yesNoOptions = ["Sim", "Não"].map((label) => ({
  label,
  value: label,
}));

// This catalogue projects the documented inventory into UI; it is not a method definition.
const catalog = [
  {
    description: "O cadastro atual é mantido separadamente da Anamnese.",
    id: "cadastro",
    label: "Cadastro",
    order: 1,
    questions: [],
  },
  {
    description: "Perguntas documentadas sem transformar medidas em avaliação.",
    id: "medidas",
    label: "Medidas",
    order: 2,
    questions: [
      {
        categoryId: "medidas",
        id: "ANAM-005",
        label: "Ombros (toda circunferência)",
        representationKind: "generic",
      },
      {
        categoryId: "medidas",
        id: "ANAM-006",
        label: "Panturrilha",
        representationKind: "generic",
      },
      {
        categoryId: "medidas",
        id: "ANAM-007",
        label: "Peso atual",
        representationKind: "generic",
      },
      {
        categoryId: "medidas",
        id: "ANAM-008",
        label: "Altura",
        representationKind: "generic",
      },
    ],
  },
  {
    description: "Nenhuma pergunta ativa está documentada para esta categoria.",
    id: "historico-de-vida",
    label: "Histórico de vida",
    order: 3,
    questions: [],
  },
  {
    description: "Perguntas documentadas, sem diagnóstico, alerta ou interpretação.",
    id: "historico-de-saude",
    label: "Histórico de saúde",
    order: 4,
    questions: [
      {
        categoryId: "historico-de-saude",
        id: "ANAM-011",
        label: "Possui diabetes? Quanto tempo? Está controlado?",
        representationKind: "generic",
      },
      {
        categoryId: "historico-de-saude",
        id: "ANAM-012",
        label:
          "Possui algum transtorno metabólico, como tireoide ou hipogonadismo? Qual(is), há quanto tempo e está controlado?",
        representationKind: "generic",
      },
      {
        categoryId: "historico-de-saude",
        id: "ANAM-013",
        label:
          "Possui alguma doença crônica, como anemia, artrite, fibromialgia etc.?",
        representationKind: "generic",
      },
      {
        categoryId: "historico-de-saude",
        id: "ANAM-014",
        label: "Já realizou alguma cirurgia? Qual(is)?",
        representationKind: "generic",
      },
      {
        categoryId: "historico-de-saude",
        id: "ANAM-015",
        label: "Possui alergia a alguma medicação ou comida? Qual(is)?",
        representationKind: "generic",
      },
      {
        categoryId: "historico-de-saude",
        id: "ANAM-016",
        label:
          "Já fraturou ou teve alguma lesão importante que deixou sequela? Qual(is)?",
        representationKind: "generic",
      },
      {
        categoryId: "historico-de-saude",
        id: "ANAM-017",
        label: "Sente dor intensa em alguma parte do corpo?",
        representationKind: "generic",
      },
      {
        categoryId: "historico-de-saude",
        id: "ANAM-018",
        label: "Possui alguma doença cardiovascular ou hipertensão arterial?",
        representationKind: "generic",
      },
      {
        categoryId: "historico-de-saude",
        id: "ANAM-019",
        label: "Já sentiu dor no peito durante alguma atividade física?",
        representationKind: "generic",
      },
      {
        categoryId: "historico-de-saude",
        id: "ANAM-020",
        label: "Já desmaiou alguma vez? Descrição e frequência.",
        representationKind: "generic",
      },
    ],
  },
  {
    description: "Perguntas documentadas, sem regras de suplementação ou medicamentos.",
    id: "medicamentos-e-suplementacao",
    label: "Medicamentos e suplementação",
    order: 5,
    questions: [
      {
        categoryId: "medicamentos-e-suplementacao",
        id: "ANAM-021",
        label: "Já usou algum tipo de suplemento alimentar? Qual(is)?",
        representationKind: "generic",
      },
      {
        categoryId: "medicamentos-e-suplementacao",
        id: "ANAM-022",
        label:
          "O que está administrando atualmente entre suplementos, fitoterápicos e medicamentos?",
        representationKind: "generic",
      },
      {
        categoryId: "medicamentos-e-suplementacao",
        id: "ANAM-024",
        label: "Toma algum suplemento vitamínico? Qual(is)?",
        representationKind: "generic",
      },
    ],
  },
  {
    description: "Perguntas documentadas, sem regra de sono.",
    id: "sono",
    label: "Sono",
    order: 6,
    questions: [
      {
        categoryId: "sono",
        id: "ANAM-025",
        label: "Como está a qualidade e o tempo do seu sono?",
        representationKind: "generic",
      },
      {
        categoryId: "sono",
        id: "ANAM-026",
        label: "Demora a dormir?",
        representationKind: "generic",
      },
      {
        categoryId: "sono",
        id: "ANAM-027",
        label: "Acorda muitas vezes durante a noite?",
        representationKind: "generic",
      },
    ],
  },
  {
    description: "Perguntas documentadas, sem pontuação ou interpretação.",
    id: "comportamento",
    label: "Comportamento",
    order: 7,
    questions: [
      {
        categoryId: "comportamento",
        id: "ANAM-028",
        label: "Como são suas relações sociais?",
        representationKind: "generic",
      },
      {
        categoryId: "comportamento",
        id: "ANAM-029",
        label: "Considera-se paciente?",
        representationKind: "generic",
      },
      {
        categoryId: "comportamento",
        id: "ANAM-030",
        label: "Já foi mais paciente do que é hoje?",
        representationKind: "generic",
      },
      {
        categoryId: "comportamento",
        id: "ANAM-031",
        label: "Como está seu humor?",
        representationKind: "generic",
      },
      {
        categoryId: "comportamento",
        id: "ANAM-032",
        label: "Sente-se muito cansado para levantar da cama pela manhã?",
        representationKind: "generic",
      },
      {
        categoryId: "comportamento",
        id: "ANAM-041",
        label:
          "Possui algum vício (cigarro, bebidas alcoólicas, drogas ilícitas etc.)?",
        options: yesNoOptions,
        representationKind: "single-choice",
      },
    ],
  },
  {
    description: "Pergunta documentada, sem meta ou regra de hidratação.",
    id: "rotina",
    label: "Rotina",
    order: 8,
    questions: [
      {
        categoryId: "rotina",
        id: "ANAM-034",
        label: "Toma quantos litros de água por dia?",
        options: waterOptions,
        representationKind: "single-choice",
      },
    ],
  },
  {
    description: "Informação documentada, sem orientação de treino.",
    id: "atividade-fisica",
    label: "Atividade física",
    order: 9,
    questions: [
      {
        categoryId: "atividade-fisica",
        id: "ANAM-042",
        label:
          "É atleta competitivo de fisiculturismo ou outro esporte? Qual(is)?",
        representationKind: "generic",
      },
    ],
  },
  {
    description: "Coleta de informações, sem prescrição alimentar.",
    id: "alimentacao",
    label: "Alimentação",
    order: 10,
    questions: [
      {
        categoryId: "alimentacao",
        id: "ANAM-035",
        label: "3 alimentos preferidos",
        representationKind: "generic",
      },
      {
        categoryId: "alimentacao",
        id: "ANAM-036",
        label: "3 alimentos que menos gostei",
        representationKind: "generic",
      },
      {
        categoryId: "alimentacao",
        id: "ANAM-037",
        label: "Me fala um pouco como tu vê tua relação com a comida",
        representationKind: "generic",
      },
    ],
  },
  {
    description: "Pergunta documentada, sem cálculo de prazo ou meta automática.",
    id: "objetivos",
    label: "Objetivos",
    order: 11,
    questions: [
      {
        categoryId: "objetivos",
        id: "ANAM-043",
        label:
          "Quais são seus objetivos a curto (3 meses), médio (12 meses) e longo (5 anos) prazo?",
        representationKind: "generic",
      },
    ],
  },
  {
    description: "Perguntas documentadas, sem pontuação ou interpretação.",
    id: "autoimagem",
    label: "Autoimagem",
    order: 12,
    questions: [
      {
        categoryId: "autoimagem",
        id: "ANAM-038",
        label: "Quando tu te olha no espelho, o que tu enxerga?",
        representationKind: "generic",
      },
      {
        categoryId: "autoimagem",
        id: "ANAM-039",
        label: "E como acredita que as pessoas te veem?",
        representationKind: "generic",
      },
      {
        categoryId: "autoimagem",
        id: "ANAM-040",
        label: "Me fala das tuas qualidades",
        representationKind: "generic",
      },
    ],
  },
  {
    description:
      "A possibilidade de anexar fotos foi observada, sem posições rígidas ou upload nesta interface.",
    id: "fotos",
    label: "Fotos",
    order: 13,
    questions: [],
  },
  {
    description: "Perguntas e anexos documentados, sem envio real de arquivos.",
    id: "exames-e-documentos",
    label: "Exames e documentos",
    order: 14,
    questions: [
      {
        categoryId: "exames-e-documentos",
        id: "ANAM-009",
        label: "Tem o costume de realizar exames de sangue?",
        representationKind: "generic",
      },
    ],
  },
  {
    description:
      "A existência de uma declaração de anuência foi documentada; conteúdo e forma final serão definidos depois.",
    id: "consentimento",
    label: "Consentimento",
    order: 15,
    questions: [],
  },
] as const satisfies readonly AnamnesisCategory[];

export const anamnesisCategories: readonly AnamnesisCategory[] = catalog;

export type AnamnesisQuestionId =
  (typeof catalog)[number]["questions"][number]["id"];

export const anamnesisQuestions = anamnesisCategories.flatMap(
  (category) => category.questions,
);

export function getAnamnesisQuestion(questionId: AnamnesisQuestionId) {
  return anamnesisQuestions.find((question) => question.id === questionId);
}
