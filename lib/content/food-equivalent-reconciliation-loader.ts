import "server-only";

import {
  buildHistoricalFoodEquivalentValidationReference,
  type HistoricalFoodEquivalentValidationReference,
} from "./food-equivalent-source";
import { createClient } from "@/lib/supabase/server";

const TEMPLATE_KEYS = {
  protein: "nutrition.dose.protein",
  carbohydrate: "nutrition.dose.carbohydrate",
  fat: "nutrition.dose.fat",
  vegetableCarbohydrate: "nutrition.vegetable_carbohydrate_equivalence",
} as const;

type LoadedConfiguration = {
  configuration: unknown;
  templateVersionId: string;
};

async function loadSingleActiveConfiguration(
  templateKey: string,
  expectedSchemaKey: "scalar_parameter_v1" | "method_engine_v1",
): Promise<LoadedConfiguration> {
  const supabase = await createClient();

  const { data: template, error: templateError } = await supabase
    .from("method_configuration_templates")
    .select("id, config_schema_key")
    .eq("template_key", templateKey)
    .maybeSingle();

  if (templateError) throw templateError;
  if (!template) {
    throw new Error("Food reconciliation configuration template is missing");
  }
  if (template.config_schema_key !== expectedSchemaKey) {
    throw new Error("Food reconciliation configuration schema is unsupported");
  }

  const { data: versions, error: versionError } = await supabase
    .from("method_configuration_versions")
    .select("id, configuration")
    .eq("template_id", template.id)
    .not("activated_at", "is", null)
    .is("retired_at", null)
    .limit(2);

  if (versionError) throw versionError;
  if (!versions || versions.length !== 1) {
    throw new Error(
      "Food reconciliation configuration must have exactly one active version",
    );
  }

  return {
    configuration: versions[0].configuration,
    templateVersionId: versions[0].id,
  };
}

export async function loadHistoricalFoodEquivalentValidationReference(input: {
  historicalNonFreeItemDoseMarker: string;
  historicalVegetableGrams: number;
}): Promise<{
  reference: HistoricalFoodEquivalentValidationReference;
  templateVersionIds: {
    proteinDose: string;
    carbohydrateDose: string;
    fatDose: string;
    vegetableCarbohydrate: string;
  };
}> {
  const [protein, carbohydrate, fat, vegetableCarbohydrate] = await Promise.all([
    loadSingleActiveConfiguration(TEMPLATE_KEYS.protein, "scalar_parameter_v1"),
    loadSingleActiveConfiguration(
      TEMPLATE_KEYS.carbohydrate,
      "scalar_parameter_v1",
    ),
    loadSingleActiveConfiguration(TEMPLATE_KEYS.fat, "scalar_parameter_v1"),
    loadSingleActiveConfiguration(
      TEMPLATE_KEYS.vegetableCarbohydrate,
      "method_engine_v1",
    ),
  ]);

  return {
    reference: buildHistoricalFoodEquivalentValidationReference({
      proteinDoseConfiguration: protein.configuration,
      carbohydrateDoseConfiguration: carbohydrate.configuration,
      fatDoseConfiguration: fat.configuration,
      vegetableCarbohydrateConfiguration: vegetableCarbohydrate.configuration,
      historicalVegetableGrams: input.historicalVegetableGrams,
      historicalNonFreeItemDoseMarker: input.historicalNonFreeItemDoseMarker,
    }),
    templateVersionIds: {
      proteinDose: protein.templateVersionId,
      carbohydrateDose: carbohydrate.templateVersionId,
      fatDose: fat.templateVersionId,
      vegetableCarbohydrate: vegetableCarbohydrate.templateVersionId,
    },
  };
}
