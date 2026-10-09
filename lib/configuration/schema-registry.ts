import { parseAssessmentDefinitionConfiguration } from "../evaluations/assessment-definition.ts";
import { parseAssessmentKindCatalogConfiguration } from "../evaluations/assessment-kind-catalog.ts";
import { parseCarbCycleConfiguration } from "../method/carb-cycle.ts";
import { validateMethodEngineConfiguration } from "../method/config-engine.ts";
import { parseLiquidTaxonomyConfiguration } from "../method/liquid-taxonomy.ts";
import { parseScalarParameterShapeConfiguration } from "../method/scalar-parameter.ts";
import { parseAssessmentSchedulePreferencesConfiguration } from "./assessment-schedule-preferences.ts";
import { parseWeeklyFeedbackScheduleConfiguration } from "./weekly-feedback-schedule.ts";

export const METHOD_CONFIGURATION_SCHEMA_KEYS = [
  "method_engine_v1",
  "scalar_parameter_v1",
  "carb_cycle_v1",
  "assessment_kind_catalog_v1",
  "assessment_definition_v1",
  "assessment_schedule_preferences_v1",
  "liquid_taxonomy_v1",
  "weekly_feedback_schedule_v1",
] as const;

export type MethodConfigurationSchemaKey =
  (typeof METHOD_CONFIGURATION_SCHEMA_KEYS)[number];

export function isMethodConfigurationSchemaKey(
  value: string,
): value is MethodConfigurationSchemaKey {
  return typeof value === "string" &&
    (METHOD_CONFIGURATION_SCHEMA_KEYS as readonly string[]).includes(value);
}

export function validateMethodConfigurationBySchema(
  configSchemaKey: string,
  configurationValue: unknown,
) {
  if (!isMethodConfigurationSchemaKey(configSchemaKey)) {
    throw new RangeError(
      "unknown method configuration schema key " + configSchemaKey,
    );
  }

  switch (configSchemaKey) {
    case "method_engine_v1":
      return validateMethodEngineConfiguration(configurationValue);
    case "scalar_parameter_v1":
      return parseScalarParameterShapeConfiguration(configurationValue);
    case "carb_cycle_v1":
      return parseCarbCycleConfiguration(configurationValue);
    case "assessment_kind_catalog_v1":
      return parseAssessmentKindCatalogConfiguration(configurationValue);
    case "assessment_definition_v1":
      return parseAssessmentDefinitionConfiguration(configurationValue);
    case "assessment_schedule_preferences_v1":
      return parseAssessmentSchedulePreferencesConfiguration(configurationValue);
    case "liquid_taxonomy_v1":
      return parseLiquidTaxonomyConfiguration(configurationValue);
    case "weekly_feedback_schedule_v1":
      return parseWeeklyFeedbackScheduleConfiguration(configurationValue);
  }
}
