import "server-only";

import {
  parseLiquidTaxonomyConfiguration,
  type LiquidTaxonomyConfiguration,
} from "./liquid-taxonomy";
import { createClient } from "@/lib/supabase/server";

export type LoadedLiquidTaxonomy = {
  configuration: LiquidTaxonomyConfiguration;
  templateId: string;
  templateVersionId: string;
};

export async function loadLiquidTaxonomy(): Promise<LoadedLiquidTaxonomy> {
  const supabase = await createClient();

  const { data: template, error: templateError } = await supabase
    .from("method_configuration_templates")
    .select("id, config_schema_key")
    .eq("template_key", "hydration.liquid_taxonomy")
    .maybeSingle();

  if (templateError) throw templateError;
  if (!template) throw new Error("Liquid taxonomy configuration template is missing");
  if (template.config_schema_key !== "liquid_taxonomy_v1") {
    throw new Error("Liquid taxonomy configuration schema is unsupported");
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
    throw new Error("Liquid taxonomy configuration must have exactly one active version");
  }

  const version = versions[0];

  return {
    configuration: parseLiquidTaxonomyConfiguration(version.configuration),
    templateId: template.id,
    templateVersionId: version.id,
  };
}


export type PersistedLiquidKindKey = "water" | "zero_calorie_other";

export type SupportedPersistedLiquidKind = LiquidTaxonomyConfiguration["kinds"][number] & {
  key: PersistedLiquidKindKey;
};

function isPersistedLiquidKindKey(value: string): value is PersistedLiquidKindKey {
  return value === "water" || value === "zero_calorie_other";
}

export async function loadSupportedLiquidTaxonomy(): Promise<
  LoadedLiquidTaxonomy & { kinds: SupportedPersistedLiquidKind[] }
> {
  const loaded = await loadLiquidTaxonomy();

  const kinds = loaded.configuration.kinds.map((kind) => {
    if (!isPersistedLiquidKindKey(kind.key)) {
      throw new Error(
        "Active liquid taxonomy contains a key unsupported by current persistence",
      );
    }

    return {
      ...kind,
      key: kind.key,
    };
  });

  return {
    ...loaded,
    kinds,
  };
}
