import {
  buildOpenAiAnamnesisReviewRequest,
  extractOpenAiStructuredOutput,
  mapOpenAiReviewOutputToCanonical,
} from "../lib/ai/openai-anamnesis-review.ts";

const apiKey = process.env.OPENAI_API_KEY?.trim();
const model = process.env.OPENAI_EVAL_MODEL?.trim() || "gpt-5.6-terra";

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

const scenarios = [
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
];

let failed = 0;

for (const scenario of scenarios) {
  const request = buildOpenAiAnamnesisReviewRequest({
    context: scenario.context,
    instructions,
    model,
  });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request.body),
  });

  const raw = await response.text();

  if (!response.ok) {
    failed += 1;
    console.error(
      JSON.stringify({
        scenario: scenario.name,
        pass: false,
        error: `HTTP ${response.status}`,
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
      }),
    );
    continue;
  }

  const extracted = extractOpenAiStructuredOutput(responseJson);

  if (!extracted.ok) {
    failed += 1;
    console.error(
      JSON.stringify({
        scenario: scenario.name,
        pass: false,
        error: extracted.code,
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
      }),
    );
    continue;
  }

  const findingTypes = mapped.value.findings.map((finding) => finding.type);
  const pass =
    scenario.expectedType === null
      ? findingTypes.length === 0
      : findingTypes.includes(scenario.expectedType);

  if (!pass) failed += 1;

  console.log(
    JSON.stringify({
      scenario: scenario.name,
      pass,
      expectedType: scenario.expectedType,
      findingTypes,
      findingCount: mapped.value.findings.length,
    }),
  );
}

console.log(
  JSON.stringify({
    model,
    scenarios: scenarios.length,
    failed,
    passed: scenarios.length - failed,
  }),
);

process.exit(failed === 0 ? 0 : 1);
