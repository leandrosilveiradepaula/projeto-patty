export type ProfessionalReviewQuestion = {
  id: string;
  label: string;
  question_key: string;
};

export type ProfessionalReviewAnswer = {
  answer_value: unknown;
  question_id: string;
};

export type ProfessionalReviewItem = {
  answerValue: unknown;
  label: string;
  questionKey: string;
};

export type ProfessionalReviewGroup = {
  description: string;
  id: string;
  items: ProfessionalReviewItem[];
  title: string;
};

const ATTENTION_KEYS = [
  "relationship_with_food",
  "self_image_in_mirror",
  "perceived_external_image",
  "mood",
  "social_relationships",
] as const;

const GROUPS = [
  {
    id: "rotina-alimentacao",
    title: "Rotina, sono e alimentação",
    description:
      "Respostas disponíveis sobre sono, hidratação, preferências alimentares e relação com a comida.",
    questionKeys: [
      "sleep_quality_and_duration",
      "takes_long_to_sleep",
      "wakes_often_at_night",
      "daily_water_intake",
      "favorite_foods",
      "least_favorite_foods",
      "relationship_with_food",
    ],
  },
  {
    id: "saude-exames",
    title: "Saúde, exames e uso de substâncias",
    description:
      "Histórico de saúde e contexto de medicamentos/suplementos para revisão profissional, sem interpretação diagnóstica.",
    questionKeys: [
      "blood_test_habit",
      "has_diabetes",
      "diabetes_details",
      "has_metabolic_disorder",
      "metabolic_disorder_details",
      "chronic_disease",
      "had_surgery",
      "surgery_details",
      "has_allergy",
      "allergy_details",
      "had_fracture_or_sequela",
      "fracture_or_injury_details",
      "intense_body_pain",
      "cardiovascular_or_hypertension",
      "chest_pain_during_activity",
      "has_fainted",
      "fainting_details",
      "used_supplement_before",
      "past_supplement_details",
      "current_supplements_medicines",
      "uses_vitamin_supplement",
      "vitamin_supplement_details",
      "libido",
    ],
  },
  {
    id: "comportamento-autoimagem",
    title: "Comportamento, contexto e autoimagem",
    description:
      "Relatos da cliente que ajudam a Patty a compreender contexto, autoimagem e fatores de adesão. Não geram score ou diagnóstico.",
    questionKeys: [
      "social_relationships",
      "considers_self_patient",
      "was_more_patient_before",
      "mood",
      "too_tired_to_get_up",
      "self_image_in_mirror",
      "perceived_external_image",
      "self_qualities",
      "has_addiction",
    ],
  },
  {
    id: "atividade-objetivos",
    title: "Atividade e objetivos",
    description:
      "Contexto disponível sobre prática competitiva, objetivos declarados e motivo da escolha do plano.",
    questionKeys: [
      "is_competitive_athlete",
      "competitive_sport_details",
      "short_medium_long_term_goals",
      "plan_choice_reason",
    ],
  },
] as const;

export function buildProfessionalReviewGroups(
  questions: ProfessionalReviewQuestion[],
  answers: ProfessionalReviewAnswer[],
): ProfessionalReviewGroup[] {
  const questionsByKey = new Map(
    questions.map((question) => [question.question_key, question]),
  );
  const answersByQuestionId = new Map(
    answers.map((answer) => [answer.question_id, answer]),
  );

  return GROUPS.map((group) => ({
    description: group.description,
    id: group.id,
    title: group.title,
    items: group.questionKeys.flatMap((questionKey) => {
      const question = questionsByKey.get(questionKey);

      if (!question) {
        return [];
      }

      const answer = answersByQuestionId.get(question.id);

      if (!answer) {
        return [];
      }

      return [
        {
          answerValue: answer.answer_value,
          label: question.label,
          questionKey: question.question_key,
        },
      ];
    }),
  })).filter((group) => group.items.length > 0);
}

export function buildProfessionalAttentionItems(
  questions: ProfessionalReviewQuestion[],
  answers: ProfessionalReviewAnswer[],
): ProfessionalReviewItem[] {
  const questionsByKey = new Map(
    questions.map((question) => [question.question_key, question]),
  );
  const answersByQuestionId = new Map(
    answers.map((answer) => [answer.question_id, answer]),
  );

  return ATTENTION_KEYS.flatMap((questionKey) => {
    const question = questionsByKey.get(questionKey);

    if (!question) {
      return [];
    }

    const answer = answersByQuestionId.get(question.id);

    if (!answer) {
      return [];
    }

    return [
      {
        answerValue: answer.answer_value,
        label: question.label,
        questionKey: question.question_key,
      },
    ];
  });
}

