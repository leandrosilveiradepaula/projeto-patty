import type { AnamnesisReviewContext } from "../lib/ai/anamnesis-review-context.ts";
import type { AnamnesisReviewFindingType } from "../lib/ai/anamnesis-review-output.ts";
import {
  buildOpenAiAnamnesisReviewRequest,
  extractOpenAiStructuredOutput,
  mapOpenAiReviewOutputToCanonical,
} from "../lib/ai/openai-anamnesis-review.ts";

const apiKey = process.env.OPENAI_API_KEY?.trim();
const model = process.env.OPENAI_EVAL_MODEL?.trim() || "gpt-5.6-terra";


type EvalUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readUsage(value: unknown): EvalUsage {
  if (!isRecord(value)) {
    return { inputTokens: null, outputTokens: null, totalTokens: null };
  }

  const usage = value.usage;

  if (!isRecord(usage)) {
    return { inputTokens: null, outputTokens: null, totalTokens: null };
  }

  const readTokenCount = (key: string) => {
    const tokenCount = usage[key];
    return typeof tokenCount === "number" && Number.isFinite(tokenCount)
      ? tokenCount
      : null;
  };

  return {
    inputTokens: readTokenCount("input_tokens"),
    outputTokens: readTokenCount("output_tokens"),
    totalTokens: readTokenCount("total_tokens"),
  };
}

if (!apiKey) {
  console.error("OPENAI_API_KEY is required for the synthetic OpenAI evaluation.");
  process.exit(2);
}

const instructions =
  process.env.OPENAI_EVAL_INSTRUCTIONS?.trim() ||
  "Voce auxilia exclusivamente a revisao interna de Anamnese pela profissional Patty. Analise somente os dados fornecidos em sources e missing_targets. Nao diagnostique doencas ou transtornos. Nao prescreva, recomende ou monte dieta, treino, suplementacao, medicamento, protocolo ou tratamento. Nao atribua score, gravidade, risco clinico, adesao ou decisao de progressao. Nao fale diretamente com a cliente e nao transforme achados em decisao profissional. Retorne apenas findings internos para revisao humana. possible_contradiction serve somente para sinalizar possivel incompatibilidade entre duas ou mais respostas existentes e deve usar source_refs fornecidos. clarification_needed serve para sinalizar resposta existente ambigua ou insuficiente e deve usar ao menos um source_ref fornecido. missing_answer so pode ser usado para itens presentes em missing_targets e deve usar target_ref fornecido; nao invente ausencia fora dessa lista. Use somente source_refs e target_refs recebidos. Expresse incerteza na explanation. suggested_follow_up_question e apenas uma sugestao interna e pode ser null. Um array findings vazio e valido quando nada precisar ser sinalizado.";

const ids = {
  a1: "11111111-1111-4111-8111-111111111111",
  a2: "22222222-2222-4222-8222-222222222222",
  a3: "33333333-3333-4333-8333-333333333333",
  a4: "44444444-4444-4444-8444-444444444444",
  q1: "55555555-5555-4555-8555-555555555555",
  q2: "66666666-6666-4666-8666-666666666666",
  q3: "77777777-7777-4777-8777-777777777777",
  q4: "88888888-8888-4888-8888-888888888888",
  qm: "99999999-9999-4999-8999-999999999999",
};


const representativeVolumeItems: Array<{
  answer: string;
  key: string;
  label: string;
}> = [
  { key: "city", label: "Cidade", answer: "Cidade Sintetica" },
  { key: "contact_phone", label: "Telefone", answer: "00000000000" },
  { key: "contact_email", label: "Email", answer: "cliente.sintetica@example.invalid" },
  { key: "blood_test_habit", label: "Tem o costume de realizar exames de sangue?", answer: "Sim" },
  { key: "has_health_plan", label: "Possui plano de saude?", answer: "Sim" },
  { key: "health_plan_details", label: "Qual plano de saude?", answer: "Plano sintetico" },
  { key: "has_diabetes", label: "Possui diabetes?", answer: "Nao" },
  { key: "has_metabolic_disorder", label: "Possui algum transtorno metabolico, como tireoide ou hipogonadismo?", answer: "Nao" },
  { key: "chronic_disease", label: "Possui alguma doenca cronica, como anemia, artrite, fibromialgia etc.?", answer: "Nao" },
  { key: "had_surgery", label: "Ja realizou alguma cirurgia?", answer: "Sim" },
  { key: "surgery_details", label: "Qual(is)?", answer: "Procedimento sintetico antigo, sem dado real" },
  { key: "has_allergy", label: "Possui alergia a alguma medicacao ou comida?", answer: "Nao" },
  { key: "had_fracture_or_sequela", label: "Ja fraturou ou teve alguma lesao importante que deixou sequela?", answer: "Nao" },
  { key: "intense_body_pain", label: "Sente dor intensa em alguma parte do corpo?", answer: "Nao" },
  { key: "cardiovascular_or_hypertension", label: "Possui alguma doenca cardiovascular ou hipertensao arterial?", answer: "Nao" },
  { key: "chest_pain_during_activity", label: "Ja sentiu dor no peito durante alguma atividade fisica?", answer: "Nao" },
  { key: "has_fainted", label: "Ja desmaiou alguma vez?", answer: "Nao" },
  { key: "used_supplement_before", label: "Ja usou algum tipo de suplemento alimentar?", answer: "Sim" },
  { key: "past_supplement_details", label: "Qual(is)?", answer: "Suplemento sintetico A" },
  { key: "current_supplements_medicines", label: "O que esta administrando atualmente entre suplementos, fitoterapicos e medicamentos?", answer: "Nenhum no momento" },
  { key: "libido", label: "Como esta sua libido?", answer: "Sem observacao relevante" },
  { key: "uses_vitamin_supplement", label: "Toma algum suplemento vitaminico?", answer: "Nao" },
  { key: "sleep_quality_and_duration", label: "Como esta a qualidade e o tempo do seu sono?", answer: "Aproximadamente 7 horas, qualidade regular" },
  { key: "takes_long_to_sleep", label: "Demora a dormir?", answer: "Nao" },
  { key: "wakes_often_at_night", label: "Acorda muitas vezes durante a noite?", answer: "Nao" },
  { key: "social_relationships", label: "Como sao suas relacoes sociais?", answer: "Boas e estaveis" },
  { key: "considers_self_patient", label: "Considera-se paciente?", answer: "Sim" },
  { key: "was_more_patient_before", label: "Ja foi mais paciente do que e hoje?", answer: "Nao" },
  { key: "mood", label: "Como esta seu humor?", answer: "Estavel" },
  { key: "too_tired_to_get_up", label: "Sente-se muito cansado para levantar da cama pela manha?", answer: "Nao" },
  { key: "daily_water_intake", label: "Toma quantos litros de agua por dia?", answer: "2L" },
  { key: "favorite_foods", label: "3 alimentos preferidos", answer: "Arroz, feijao e frango" },
  { key: "least_favorite_foods", label: "3 alimentos que menos gostei", answer: "Alimento sintetico A, B e C" },
  { key: "relationship_with_food", label: "Me fala um pouco como tu ve tua relacao com a comida", answer: "Rotina regular, sem observacao adicional" },
  { key: "self_image_in_mirror", label: "Quando tu te olha no espelho, o que tu enxerga?", answer: "Desejo de melhorar a composicao corporal" },
  { key: "perceived_external_image", label: "E como acredita que as pessoas te veem?", answer: "Sem observacao especifica" },
  { key: "self_qualities", label: "Me fala das tuas qualidades", answer: "Organizada, persistente e pontual" },
  { key: "has_addiction", label: "Possui algum vicio (cigarro, bebidas alcoolicas, drogas ilicitas etc.)?", answer: "Nao" },
  { key: "is_competitive_athlete", label: "E atleta competitivo de fisiculturismo ou outro esporte?", answer: "Nao" },
  { key: "short_medium_long_term_goals", label: "Quais sao seus objetivos a curto (3 meses), medio (12 meses) e longo (5 anos) prazo?", answer: "Melhorar rotina, manter consistencia e preservar os resultados" },
  { key: "plan_choice_reason", label: "Por que optou por este plano?", answer: "Busca acompanhamento estruturado" },
  { key: "consent_acceptance", label: "Declaracao de anuencia", answer: "Concordo" },
];

const representativeVolumeSources = representativeVolumeItems.map(
  (item, index) => {
    const suffix = String(index + 1).padStart(12, "0");

    return {
      answer_value: item.answer,
      label: item.label,
      question_id: `b0000000-0000-4000-8000-${suffix}`,
      question_key: item.key,
      source_answer_id: `a0000000-0000-4000-8000-${suffix}`,
    };
  },
);

const scenarios: Array<{
  name: string;
  expectedType: AnamnesisReviewFindingType | null;
  context: AnamnesisReviewContext;
  validationOnly?: boolean;
}> = [
  {
    name: "clear_no_findings",
    expectedType: null,
    context: {
      allowedMissingTargetQuestionIds: new Set(),
      allowedSourceAnswerIds: new Set([ids.a1, ids.a2]),
      missingTargets: [],
      sources: [
        {
          answer_value: "Nao",
          label: "Fuma atualmente?",
          question_id: ids.q1,
          question_key: "smokes",
          source_answer_id: ids.a1,
        },
        {
          answer_value: "Nao",
          label: "Consome bebida alcoolica?",
          question_id: ids.q2,
          question_key: "alcohol",
          source_answer_id: ids.a2,
        },
      ],
    },
  },
  {
    name: "possible_contradiction",
    expectedType: "possible_contradiction",
    context: {
      allowedMissingTargetQuestionIds: new Set(),
      allowedSourceAnswerIds: new Set([ids.a1, ids.a2]),
      missingTargets: [],
      sources: [
        {
          answer_value: "Nao",
          label: "Fuma atualmente?",
          question_id: ids.q1,
          question_key: "smokes",
          source_answer_id: ids.a1,
        },
        {
          answer_value: 10,
          label: "Quantos cigarros fuma por dia?",
          question_id: ids.q2,
          question_key: "cigarettes_per_day",
          source_answer_id: ids.a2,
        },
      ],
    },
  },
  {
    name: "clarification_needed",
    expectedType: "clarification_needed",
    context: {
      allowedMissingTargetQuestionIds: new Set(),
      allowedSourceAnswerIds: new Set([ids.a3]),
      missingTargets: [],
      sources: [
        {
          answer_value: "As vezes",
          label: "Usa medicamento de forma continua?",
          question_id: ids.q3,
          question_key: "continuous_medication",
          source_answer_id: ids.a3,
        },
      ],
    },
  },
  {
    name: "missing_answer",
    expectedType: "missing_answer",
    context: {
      allowedMissingTargetQuestionIds: new Set([ids.qm]),
      allowedSourceAnswerIds: new Set([ids.a4]),
      missingTargets: [
        {
          label: "Possui alguma alergia conhecida?",
          question_id: ids.qm,
          question_key: "allergies",
        },
      ],
      sources: [
        {
          answer_value: "Sem observacoes adicionais",
          label: "Observacoes gerais",
          question_id: ids.q4,
          question_key: "general_notes",
          source_answer_id: ids.a4,
        },
      ],
    },
  },
  {
    name: "representative_volume",
    expectedType: null,
    validationOnly: true,
    context: {
      allowedMissingTargetQuestionIds: new Set(),
      allowedSourceAnswerIds: new Set(
        representativeVolumeSources.map((source) => source.source_answer_id),
      ),
      missingTargets: [],
      sources: representativeVolumeSources,
    },
  },
];

let failed = 0;
let totalLatencyMs = 0;
let totalInputTokens = 0;
let totalOutputTokens = 0;
let totalTokens = 0;
let usageSamples = 0;

for (const scenario of scenarios) {
  const request = buildOpenAiAnamnesisReviewRequest({
    context: scenario.context,
    instructions,
    model,
  });

  const startedAt = Date.now();
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request.body),
  });

  const raw = await response.text();
  const latencyMs = Date.now() - startedAt;
  totalLatencyMs += latencyMs;

  if (!response.ok) {
    failed += 1;
    console.error(
      JSON.stringify({
        scenario: scenario.name,
        pass: false,
        error: `HTTP ${response.status}`,
        latency_ms: latencyMs,
      }),
    );
    continue;
  }

  let responseJson;

  try {
    responseJson = JSON.parse(raw);
  } catch {
    failed += 1;
    console.error(
      JSON.stringify({
        scenario: scenario.name,
        pass: false,
        error: "provider_response_not_json",
        latency_ms: latencyMs,
      }),
    );
    continue;
  }

  const usage = readUsage(responseJson);

  if (
    usage.inputTokens !== null &&
    usage.outputTokens !== null &&
    usage.totalTokens !== null
  ) {
    usageSamples += 1;
    totalInputTokens += usage.inputTokens;
    totalOutputTokens += usage.outputTokens;
    totalTokens += usage.totalTokens;
  }

  const extracted = extractOpenAiStructuredOutput(responseJson);

  if (!extracted.ok) {
    failed += 1;
    console.error(
      JSON.stringify({
        scenario: scenario.name,
        pass: false,
        error: extracted.code,
        latency_ms: latencyMs,
        usage: {
          input_tokens: usage.inputTokens,
          output_tokens: usage.outputTokens,
          total_tokens: usage.totalTokens,
        },
      }),
    );
    continue;
  }

  const mapped = mapOpenAiReviewOutputToCanonical({
    aliases: request.aliases,
    context: scenario.context,
    value: extracted.value,
  });

  if (!mapped.ok) {
    failed += 1;
    console.error(
      JSON.stringify({
        scenario: scenario.name,
        pass: false,
        error: mapped.error,
        latency_ms: latencyMs,
        usage: {
          input_tokens: usage.inputTokens,
          output_tokens: usage.outputTokens,
          total_tokens: usage.totalTokens,
        },
      }),
    );
    continue;
  }

  const findingTypes = mapped.value.findings.map((finding) => finding.type);
  const pass = scenario.validationOnly
    ? true
    : scenario.expectedType === null
      ? findingTypes.length === 0
      : findingTypes.includes(scenario.expectedType);

  if (!pass) failed += 1;

  console.log(
    JSON.stringify({
      scenario: scenario.name,
      pass,
      expectedType: scenario.expectedType,
      validationOnly: scenario.validationOnly ?? false,
      findingTypes,
      findingCount: mapped.value.findings.length,
      latency_ms: latencyMs,
      usage: {
        input_tokens: usage.inputTokens,
        output_tokens: usage.outputTokens,
        total_tokens: usage.totalTokens,
      },
    }),
  );
}

console.log(
  JSON.stringify({
    model,
    scenarios: scenarios.length,
    failed,
    passed: scenarios.length - failed,
    latency: {
      total_ms: totalLatencyMs,
      average_ms: Math.round(totalLatencyMs / scenarios.length),
    },
    usage: {
      samples: usageSamples,
      input_tokens: usageSamples > 0 ? totalInputTokens : null,
      output_tokens: usageSamples > 0 ? totalOutputTokens : null,
      total_tokens: usageSamples > 0 ? totalTokens : null,
    },
  }),
);

process.exit(failed === 0 ? 0 : 1);
