import "server-only";

import {
  parseAssessmentKindCatalogConfiguration,
  type AssessmentKindCatalogConfiguration,
} from "./assessment-kind-catalog";
import {
  parseAssessmentDefinitionConfiguration,
  type AssessmentDefinitionConfiguration,
} from "./assessment-definition";
import { isAssessmentKind, type AssessmentKind } from "./assessment-draft";
import { createClient } from "@/lib/supabase/server";

type LoadedConfiguration<T> = {
  configuration: T;
  templateId: string;
  templateVersionId: string;
};

async function loadSingleActiveConfiguration(input: {
  templateKey: string;
  configSchemaKey: string;
}) {
  const supabase = await createClient();

  const { data: template, error: templateError } = await supabase
    .from("method_configuration_templates")
    .select("id, config_schema_key")
    .eq("template_key", input.templateKey)
    .maybeSingle();

  if (templateError) throw templateError;
  if (!template) throw new Error("Assessment configuration template is missing");
  if (template.config_schema_key !== input.configSchemaKey) {
    throw new Error("Assessment configuration schema is unsupported");
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
    throw new Error("Assessment configuration must have exactly one active version");
  }

  return {
    configuration: versions[0].configuration,
    templateId: template.id,
    templateVersionId: versions[0].id,
  };
}

export async function loadAssessmentKindCatalog(): Promise<
  LoadedConfiguration<AssessmentKindCatalogConfiguration>
> {
  const loaded = await loadSingleActiveConfiguration({
    templateKey: "evaluation.assessment_kind_catalog",
    configSchemaKey: "assessment_kind_catalog_v1",
  });

  return {
    ...loaded,
    configuration: parseAssessmentKindCatalogConfiguration(loaded.configuration),
  };
}

export async function loadAssessmentDefinition(
  kindKey: "basic" | "complete",
): Promise<LoadedConfiguration<AssessmentDefinitionConfiguration>> {
  const loaded = await loadSingleActiveConfiguration({
    templateKey: "evaluation.assessment_definition." + kindKey,
    configSchemaKey: "assessment_definition_v1",
  });

  const configuration = parseAssessmentDefinitionConfiguration(
    loaded.configuration,
  );

  if (configuration.kindKey !== kindKey) {
    throw new Error("Assessment definition kind does not match its template");
  }

  return { ...loaded, configuration };
}


export type SupportedAssessmentKindOption = {
  historicalCode: AssessmentKind;
  label: string;
  semanticKey: "basic" | "complete";
};

export async function loadSupportedAssessmentKindOptions(): Promise<{
  options: SupportedAssessmentKindOption[];
  templateId: string;
  templateVersionId: string;
}> {
  const loaded = await loadAssessmentKindCatalog();

  const options = loaded.configuration.entries.map((entry) => {
    if (!isAssessmentKind(entry.historicalCode)) {
      throw new Error(
        "Active assessment catalog contains a code unsupported by current persistence",
      );
    }

    if (entry.semanticKey !== "basic" && entry.semanticKey !== "complete") {
      throw new Error(
        "Active assessment catalog contains an unsupported semantic kind",
      );
    }

    return {
      historicalCode: entry.historicalCode,
      label: entry.label,
      semanticKey: entry.semanticKey,
    };
  });

  if (options.length === 0) {
    throw new Error("Active assessment catalog has no supported options");
  }

  return {
    options,
    templateId: loaded.templateId,
    templateVersionId: loaded.templateVersionId,
  };
}

export function resolveSupportedAssessmentKindOption(
  options: SupportedAssessmentKindOption[],
  historicalCode: string | null,
) {
  if (historicalCode === null) {
    return null;
  }

  return (
    options.find((option) => option.historicalCode === historicalCode) ?? null
  );
}
