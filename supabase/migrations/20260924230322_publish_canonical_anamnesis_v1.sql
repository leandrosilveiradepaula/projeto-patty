insert into public.anamnesis_forms (form_key)
values ('client-anamnesis');

insert into public.anamnesis_form_versions (form_id, version_number)
select id, 1
from public.anamnesis_forms
where form_key='client-anamnesis';

insert into public.anamnesis_sections
  (form_version_id, section_key, title, display_order)
values
((
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
), 'cadastro', 'Cadastro', 1),
((
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
), 'historico-saude-exames', 'Historico de saude e exames', 2),
((
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
), 'medicamentos-suplementacao', 'Medicamentos e suplementacao', 3),
((
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
), 'sono-rotina', 'Sono e rotina', 4),
((
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
), 'comportamento-contexto', 'Comportamento e contexto', 5),
((
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
), 'alimentacao', 'Alimentacao', 6),
((
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
), 'autoimagem', 'Autoimagem', 7),
((
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
), 'atividade-objetivos', 'Atividade fisica e objetivos', 8),
((
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
), 'arquivos', 'Arquivos', 9),
((
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
), 'consentimento', 'Consentimento', 10);

insert into public.anamnesis_questions
  (form_version_id, section_id, question_key, label, display_order, answer_type, required, options, applicability_source_question_id, applicability_expected_answer)
values
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='cadastro'
),
  'city',
  'Cidade',
  1,
  'text',
  true,
  null,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='cadastro'
),
  'contact_phone',
  'Telefone',
  2,
  'text',
  true,
  null,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='cadastro'
),
  'contact_email',
  'Email',
  3,
  'text',
  true,
  null,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='cadastro'
),
  'instagram',
  'Instagram',
  4,
  'text',
  true,
  null,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='historico-saude-exames'
),
  'blood_test_habit',
  'Tem o costume de realizar exames de sangue?',
  1,
  'single_choice',
  true,
  '["Sim","Nao"]'::jsonb,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='cadastro'
),
  'has_health_plan',
  'Possui plano de saude?',
  5,
  'single_choice',
  true,
  '["Sim","Nao"]'::jsonb,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='historico-saude-exames'
),
  'has_diabetes',
  'Possui diabetes?',
  2,
  'single_choice',
  true,
  '["Sim","Nao"]'::jsonb,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='historico-saude-exames'
),
  'has_metabolic_disorder',
  'Possui algum transtorno metabolico, como tireoide ou hipogonadismo?',
  4,
  'single_choice',
  true,
  '["Sim","Nao"]'::jsonb,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='historico-saude-exames'
),
  'chronic_disease',
  'Possui alguma doenca cronica, como anemia, artrite, fibromialgia etc.?',
  6,
  'text',
  true,
  null,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='historico-saude-exames'
),
  'had_surgery',
  'Ja realizou alguma cirurgia?',
  7,
  'single_choice',
  true,
  '["Sim","Nao"]'::jsonb,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='historico-saude-exames'
),
  'has_allergy',
  'Possui alergia a alguma medicacao ou comida?',
  9,
  'single_choice',
  true,
  '["Sim","Nao"]'::jsonb,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='historico-saude-exames'
),
  'had_fracture_or_sequela',
  'Ja fraturou ou teve alguma lesao importante que deixou sequela?',
  11,
  'single_choice',
  true,
  '["Sim","Nao"]'::jsonb,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='historico-saude-exames'
),
  'intense_body_pain',
  'Sente dor intensa em alguma parte do corpo?',
  13,
  'text',
  true,
  null,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='historico-saude-exames'
),
  'cardiovascular_or_hypertension',
  'Possui alguma doenca cardiovascular ou hipertensao arterial?',
  14,
  'text',
  true,
  null,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='historico-saude-exames'
),
  'chest_pain_during_activity',
  'Ja sentiu dor no peito durante alguma atividade fisica?',
  15,
  'single_choice',
  true,
  '["Sim","Nao"]'::jsonb,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='historico-saude-exames'
),
  'has_fainted',
  'Ja desmaiou alguma vez?',
  16,
  'single_choice',
  true,
  '["Sim","Nao"]'::jsonb,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='medicamentos-suplementacao'
),
  'used_supplement_before',
  'Ja usou algum tipo de suplemento alimentar?',
  1,
  'single_choice',
  true,
  '["Sim","Nao"]'::jsonb,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='medicamentos-suplementacao'
),
  'current_supplements_medicines',
  'O que esta administrando atualmente entre suplementos, fitoterapicos e medicamentos?',
  3,
  'text',
  true,
  null,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='historico-saude-exames'
),
  'libido',
  'Como esta sua libido?',
  18,
  'text',
  true,
  null,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='medicamentos-suplementacao'
),
  'uses_vitamin_supplement',
  'Toma algum suplemento vitaminico?',
  4,
  'single_choice',
  true,
  '["Sim","Nao"]'::jsonb,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='sono-rotina'
),
  'sleep_quality_and_duration',
  'Como esta a qualidade e o tempo do seu sono?',
  1,
  'text',
  true,
  null,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='sono-rotina'
),
  'takes_long_to_sleep',
  'Demora a dormir?',
  2,
  'single_choice',
  true,
  '["Sim","Nao"]'::jsonb,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='sono-rotina'
),
  'wakes_often_at_night',
  'Acorda muitas vezes durante a noite?',
  3,
  'single_choice',
  true,
  '["Sim","Nao"]'::jsonb,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='comportamento-contexto'
),
  'social_relationships',
  'Como sao suas relacoes sociais?',
  1,
  'text',
  true,
  null,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='comportamento-contexto'
),
  'considers_self_patient',
  'Considera-se paciente?',
  2,
  'single_choice',
  true,
  '["Sim","Nao"]'::jsonb,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='comportamento-contexto'
),
  'was_more_patient_before',
  'Ja foi mais paciente do que e hoje?',
  3,
  'single_choice',
  true,
  '["Sim","Nao"]'::jsonb,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='comportamento-contexto'
),
  'mood',
  'Como esta seu humor?',
  4,
  'text',
  true,
  null,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='comportamento-contexto'
),
  'too_tired_to_get_up',
  'Sente-se muito cansado para levantar da cama pela manha?',
  5,
  'single_choice',
  true,
  '["Sim","Nao"]'::jsonb,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='comportamento-contexto'
),
  'financial_capacity_for_supplements',
  'Tem condicao financeira para gastos com suplementos/medicamentos?',
  6,
  'single_choice',
  true,
  '["Sim","Nao","Talvez"]'::jsonb,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='sono-rotina'
),
  'daily_water_intake',
  'Toma quantos litros de agua por dia?',
  4,
  'single_choice',
  true,
  '["1L","1,5L","2L","2,5L","3L","3,5L","4L","4,5L","5L ou mais","Nao sei"]'::jsonb,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='alimentacao'
),
  'favorite_foods',
  '3 alimentos preferidos',
  1,
  'text',
  true,
  null,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='alimentacao'
),
  'least_favorite_foods',
  '3 alimentos que menos gostei',
  2,
  'text',
  true,
  null,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='alimentacao'
),
  'relationship_with_food',
  'Me fala um pouco como tu ve tua relacao com a comida',
  3,
  'text',
  true,
  null,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='autoimagem'
),
  'self_image_in_mirror',
  'Quando tu te olha no espelho, o que tu enxerga?',
  1,
  'text',
  true,
  null,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='autoimagem'
),
  'perceived_external_image',
  'E como acredita que as pessoas te veem?',
  2,
  'text',
  true,
  null,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='autoimagem'
),
  'self_qualities',
  'Me fala das tuas qualidades',
  3,
  'text',
  true,
  null,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='comportamento-contexto'
),
  'has_addiction',
  'Possui algum vicio (cigarro, bebidas alcoolicas, drogas ilicitas etc.)?',
  7,
  'single_choice',
  true,
  '["Sim","Nao"]'::jsonb,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='atividade-objetivos'
),
  'is_competitive_athlete',
  'E atleta competitivo de fisiculturismo ou outro esporte?',
  1,
  'single_choice',
  true,
  '["Sim","Nao"]'::jsonb,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='atividade-objetivos'
),
  'short_medium_long_term_goals',
  'Quais sao seus objetivos a curto (3 meses), medio (12 meses) e longo (5 anos) prazo?',
  3,
  'text',
  true,
  null,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='atividade-objetivos'
),
  'plan_choice_reason',
  'Por que optou por este plano?',
  4,
  'text',
  true,
  null,
  null,
  null
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='consentimento'
),
  'consent_acceptance',
  'Concordo com o tratamento das informações fornecidas nesta Anamnese, inclusive dados de saúde, para realização do meu acompanhamento pela Consultoria Corpo & Mente.',
  1,
  'single_choice',
  true,
  '["Concordo"]'::jsonb,
  null,
  null
);

insert into public.anamnesis_questions
  (form_version_id, section_id, question_key, label, display_order, answer_type, required, options, applicability_source_question_id, applicability_expected_answer)
values
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='cadastro'
),
  'health_plan_details',
  'Qual plano de saude?',
  6,
  'text',
  true,
  null,
  (
    select q.id from public.anamnesis_questions q
    where q.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
      and q.question_key='has_health_plan'
  ),
  '"Sim"'::jsonb
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='historico-saude-exames'
),
  'diabetes_details',
  'Quanto tempo? Esta controlado?',
  3,
  'text',
  true,
  null,
  (
    select q.id from public.anamnesis_questions q
    where q.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
      and q.question_key='has_diabetes'
  ),
  '"Sim"'::jsonb
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='historico-saude-exames'
),
  'metabolic_disorder_details',
  'Qual(is), ha quanto tempo e esta controlado?',
  5,
  'text',
  true,
  null,
  (
    select q.id from public.anamnesis_questions q
    where q.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
      and q.question_key='has_metabolic_disorder'
  ),
  '"Sim"'::jsonb
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='historico-saude-exames'
),
  'surgery_details',
  'Qual(is)?',
  8,
  'text',
  true,
  null,
  (
    select q.id from public.anamnesis_questions q
    where q.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
      and q.question_key='had_surgery'
  ),
  '"Sim"'::jsonb
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='historico-saude-exames'
),
  'allergy_details',
  'Qual(is)?',
  10,
  'text',
  true,
  null,
  (
    select q.id from public.anamnesis_questions q
    where q.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
      and q.question_key='has_allergy'
  ),
  '"Sim"'::jsonb
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='historico-saude-exames'
),
  'fracture_or_injury_details',
  'Qual(is)?',
  12,
  'text',
  true,
  null,
  (
    select q.id from public.anamnesis_questions q
    where q.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
      and q.question_key='had_fracture_or_sequela'
  ),
  '"Sim"'::jsonb
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='historico-saude-exames'
),
  'fainting_details',
  'Descricao e frequencia.',
  17,
  'text',
  true,
  null,
  (
    select q.id from public.anamnesis_questions q
    where q.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
      and q.question_key='has_fainted'
  ),
  '"Sim"'::jsonb
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='medicamentos-suplementacao'
),
  'past_supplement_details',
  'Qual(is)?',
  2,
  'text',
  true,
  null,
  (
    select q.id from public.anamnesis_questions q
    where q.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
      and q.question_key='used_supplement_before'
  ),
  '"Sim"'::jsonb
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='medicamentos-suplementacao'
),
  'vitamin_supplement_details',
  'Qual(is)?',
  5,
  'text',
  true,
  null,
  (
    select q.id from public.anamnesis_questions q
    where q.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
      and q.question_key='uses_vitamin_supplement'
  ),
  '"Sim"'::jsonb
),
(
  (
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
),
  (
  select s.id
  from public.anamnesis_sections s
  where s.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
    and s.section_key='atividade-objetivos'
),
  'competitive_sport_details',
  'Qual(is)?',
  2,
  'text',
  true,
  null,
  (
    select q.id from public.anamnesis_questions q
    where q.form_version_id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
)
      and q.question_key='is_competitive_athlete'
  ),
  '"Sim"'::jsonb
);

update public.anamnesis_form_versions
set published_at=statement_timestamp()
where id=(
  select v.id
  from public.anamnesis_form_versions v
  join public.anamnesis_forms f on f.id=v.form_id
  where f.form_key='client-anamnesis' and v.version_number=1
);
