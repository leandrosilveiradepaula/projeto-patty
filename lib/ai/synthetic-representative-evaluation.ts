import {
  buildAnamnesisReviewContext,
  type AnamnesisReviewContext,
  type AnamnesisReviewContextAnswer,
  type AnamnesisReviewContextQuestion,
} from "./anamnesis-review-context.ts";

type RepresentativeItem = {
  answer: string;
  key: string;
  label: string;
};

const FORM_VERSION_ID = "c0000000-0000-4000-8000-000000000001";
const SUBMISSION_ID = "d0000000-0000-4000-8000-000000000001";

// This is a known synthetic evaluation fixture, not a form template or a
// professional rule. The privacy allowlist remains exclusively in the runtime
// context builder called below.
const items: RepresentativeItem[] = [
  { key: "city", label: "Cidade", answer: "Cidade Sintética" },
  { key: "contact_phone", label: "Telefone", answer: "00000000000" },
  { key: "contact_email", label: "Email", answer: "cliente.sintetica@example.invalid" },
  { key: "blood_test_habit", label: "Tem o costume de realizar exames de sangue?", answer: "Sim" },
  { key: "has_health_plan", label: "Possui plano de saúde?", answer: "Sim" },
  { key: "health_plan_details", label: "Qual plano de saúde?", answer: "Plano sintético" },
  { key: "has_diabetes", label: "Possui diabetes?", answer: "Não" },
  { key: "has_metabolic_disorder", label: "Possui algum transtorno metabólico, como tireoide ou hipogonadismo?", answer: "Não" },
  { key: "chronic_disease", label: "Possui alguma doença crônica, como anemia, artrite, fibromialgia etc.?", answer: "Não" },
  { key: "had_surgery", label: "Já realizou alguma cirurgia?", answer: "Sim" },
  { key: "surgery_details", label: "Qual(is)?", answer: "Procedimento sintético antigo, sem dado real" },
  { key: "has_allergy", label: "Possui alergia a alguma medicação ou comida?", answer: "Não" },
  { key: "had_fracture_or_sequela", label: "Já fraturou ou teve alguma lesão importante que deixou sequela?", answer: "Não" },
  { key: "intense_body_pain", label: "Sente dor intensa em alguma parte do corpo?", answer: "Não" },
  { key: "cardiovascular_or_hypertension", label: "Possui alguma doença cardiovascular ou hipertensão arterial?", answer: "Não" },
  { key: "chest_pain_during_activity", label: "Já sentiu dor no peito durante alguma atividade física?", answer: "Não" },
  { key: "has_fainted", label: "Já desmaiou alguma vez?", answer: "Não" },
  { key: "used_supplement_before", label: "Já usou algum tipo de suplemento alimentar?", answer: "Sim" },
  { key: "past_supplement_details", label: "Qual(is)?", answer: "Suplemento sintético A" },
  { key: "current_supplements_medicines", label: "O que está administrando atualmente entre suplementos, fitoterápicos e medicamentos?", answer: "Nenhum no momento" },
  { key: "libido", label: "Como está sua libido?", answer: "Sem observação relevante" },
  { key: "uses_vitamin_supplement", label: "Toma algum suplemento vitamínico?", answer: "Não" },
  { key: "sleep_quality_and_duration", label: "Como está a qualidade e o tempo do seu sono?", answer: "Aproximadamente 7 horas, qualidade regular" },
  { key: "takes_long_to_sleep", label: "Demora a dormir?", answer: "Não" },
  { key: "wakes_often_at_night", label: "Acorda muitas vezes durante a noite?", answer: "Não" },
  { key: "social_relationships", label: "Como são suas relações sociais?", answer: "Boas e estáveis" },
  { key: "considers_self_patient", label: "Considera-se paciente?", answer: "Sim" },
  { key: "was_more_patient_before", label: "Já foi mais paciente do que é hoje?", answer: "Não" },
  { key: "mood", label: "Como está seu humor?", answer: "Estável" },
  { key: "too_tired_to_get_up", label: "Sente-se muito cansado para levantar da cama pela manhã?", answer: "Não" },
  { key: "daily_water_intake", label: "Toma quantos litros de água por dia?", answer: "2L" },
  { key: "favorite_foods", label: "3 alimentos preferidos", answer: "Arroz, feijão e frango" },
  { key: "least_favorite_foods", label: "3 alimentos que menos gostou", answer: "Alimento sintético A, B e C" },
  { key: "relationship_with_food", label: "Me fala um pouco como tu vê tua relação com a comida", answer: "Rotina regular, sem observação adicional" },
  { key: "self_image_in_mirror", label: "Quando tu te olha no espelho, o que tu enxerga?", answer: "Desejo de melhorar a composição corporal" },
  { key: "perceived_external_image", label: "E como acredita que as pessoas te veem?", answer: "Sem observação específica" },
  { key: "self_qualities", label: "Me fala das tuas qualidades", answer: "Organizada, persistente e pontual" },
  { key: "has_addiction", label: "Possui algum vício (cigarro, bebidas alcoólicas, drogas ilícitas etc.)?", answer: "Não" },
  { key: "is_competitive_athlete", label: "É atleta competitivo de fisiculturismo ou outro esporte?", answer: "Não" },
  { key: "short_medium_long_term_goals", label: "Quais são seus objetivos a curto, médio e longo prazo?", answer: "Melhorar rotina, manter consistência e preservar os resultados" },
  { key: "financial_capacity_for_supplements", label: "Capacidade financeira para suplementos ou medicamentos", answer: "Resposta financeira sintética" },
  { key: "consent_acceptance", label: "Declaração de anuência", answer: "Concordo" },
];

function syntheticId(prefix: string, index: number) {
  return `${prefix}0000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

const questions: AnamnesisReviewContextQuestion[] = items.map((item, index) => ({
  applicability_expected_answer: null,
  applicability_source_question_id: null,
  form_version_id: FORM_VERSION_ID,
  id: syntheticId("b", index + 1),
  label: item.label,
  question_key: item.key,
}));

const answers: AnamnesisReviewContextAnswer[] = items.map((item, index) => ({
  answer_value: item.answer,
  form_version_id: FORM_VERSION_ID,
  id: syntheticId("a", index + 1),
  question_id: questions[index].id,
  submission_id: SUBMISSION_ID,
}));

const financialAnswer = answers.find(
  (answer) =>
    questions.find((question) => question.id === answer.question_id)?.question_key ===
    "financial_capacity_for_supplements",
);

if (!financialAnswer) {
  throw new Error("synthetic_representative_financial_answer_missing");
}

export const representativeVolumeSyntheticFixture = {
  answers,
  explicitlyIncludedAnswerIds: [financialAnswer.id],
  formVersionId: FORM_VERSION_ID,
  questions,
  submissionId: SUBMISSION_ID,
};

export function buildRepresentativeVolumeEvaluationContext(): AnamnesisReviewContext {
  return buildAnamnesisReviewContext(representativeVolumeSyntheticFixture);
}
