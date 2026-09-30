export type HistoricalFoodEquivalentSourceIssue = {
  code: string;
  path: string;
  message: string;
};

export type HistoricalFoodEquivalentSourceSummary = {
  groupCount: number;
  itemCount: number;
  publishable: false;
  issues: HistoricalFoodEquivalentSourceIssue[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function validateHistoricalFoodEquivalentSource(
  value: unknown,
): HistoricalFoodEquivalentSourceSummary {
  const issues: HistoricalFoodEquivalentSourceIssue[] = [];

  if (!isRecord(value)) {
    return {
      groupCount: 0,
      itemCount: 0,
      publishable: false,
      issues: [
        {
          code: "source_not_object",
          path: "$",
          message: "Historical food equivalent source must be an object.",
        },
      ],
    };
  }

  if (value.status !== "historical_source_draft_review_required") {
    issues.push({
      code: "invalid_source_status",
      path: "$.status",
      message:
        "Historical source must remain explicitly review-required and non-publishable.",
    });
  }

  const macro = value.macro_dose_references;
  if (!isRecord(macro)) {
    issues.push({
      code: "missing_macro_references",
      path: "$.macro_dose_references",
      message: "Macro dose references are required for source reconciliation.",
    });
  } else {
    const expected = {
      protein_grams: 15,
      carbohydrate_grams: 12,
      fat_grams: 6,
      vegetable_grams: 6,
    } as const;

    for (const [key, expectedValue] of Object.entries(expected)) {
      if (macro[key] !== expectedValue) {
        issues.push({
          code: "macro_reference_mismatch",
          path: "$.macro_dose_references." + key,
          message:
            "Historical source does not match the currently confirmed dose reference.",
        });
      }
    }
  }

  const currentRules = value.confirmed_current_rules;
  if (
    !isRecord(currentRules) ||
    currentRules.vegetable_doses_per_carbohydrate_dose !== 2
  ) {
    issues.push({
      code: "vegetable_conversion_mismatch",
      path: "$.confirmed_current_rules.vegetable_doses_per_carbohydrate_dose",
      message:
        "Source reconciliation must preserve the confirmed 2 vegetable doses = 1 carbohydrate dose rule.",
    });
  }

  if (!Array.isArray(value.groups)) {
    issues.push({
      code: "groups_not_array",
      path: "$.groups",
      message: "Food groups must be an array.",
    });
    return { groupCount: 0, itemCount: 0, publishable: false, issues };
  }

  const groupKeys = new Set<string>();
  let itemCount = 0;

  value.groups.forEach((group, groupIndex) => {
    const groupPath = "$.groups[" + groupIndex + "]";

    if (!isRecord(group)) {
      issues.push({
        code: "invalid_group",
        path: groupPath,
        message: "Group must be an object.",
      });
      return;
    }

    const key = typeof group.key === "string" ? group.key.trim() : "";
    const label = typeof group.label === "string" ? group.label.trim() : "";

    if (!key) {
      issues.push({
        code: "missing_group_key",
        path: groupPath + ".key",
        message: "Group key is required.",
      });
    } else if (groupKeys.has(key)) {
      issues.push({
        code: "duplicate_group_key",
        path: groupPath + ".key",
        message: "Group key must be unique in the source draft.",
      });
    } else {
      groupKeys.add(key);
    }

    if (!label) {
      issues.push({
        code: "missing_group_label",
        path: groupPath + ".label",
        message: "Group label is required.",
      });
    }

    if (!Array.isArray(group.items)) {
      issues.push({
        code: "items_not_array",
        path: groupPath + ".items",
        message: "Group items must be an array.",
      });
      return;
    }

    const normalizedLabels = new Set<string>();

    group.items.forEach((item, itemIndex) => {
      const itemPath = groupPath + ".items[" + itemIndex + "]";
      itemCount += 1;

      if (!Array.isArray(item) || item.length !== 3) {
        issues.push({
          code: "invalid_item_tuple",
          path: itemPath,
          message: "Each historical item must preserve [label, quantity, doses].",
        });
        return;
      }

      const [rawLabel, rawQuantity, rawDoses] = item;
      const itemLabel = typeof rawLabel === "string" ? rawLabel.trim() : "";
      const quantity = typeof rawQuantity === "string" ? rawQuantity.trim() : "";
      const doses = typeof rawDoses === "string" ? rawDoses.trim() : "";

      if (!itemLabel || !quantity || !doses) {
        issues.push({
          code: "blank_item_field",
          path: itemPath,
          message: "Historical item tuple fields cannot be blank.",
        });
      }

      const normalizedLabel = itemLabel.toLocaleLowerCase("pt-BR");
      if (normalizedLabels.has(normalizedLabel)) {
        issues.push({
          code: "duplicate_item_label_within_group",
          path: itemPath + "[0]",
          message:
            "Duplicate item label within the same group requires editorial review.",
        });
      }
      normalizedLabels.add(normalizedLabel);

      if (key !== "free_foods" && doses !== "1") {
        issues.push({
          code: "unexpected_dose_marker",
          path: itemPath + "[2]",
          message:
            "Non-free historical items are expected to preserve one-dose equivalence pending review.",
        });
      }

      if (key === "free_foods" && !(quantity === "-" && doses === "-")) {
        issues.push({
          code: "free_food_marker_mismatch",
          path: itemPath,
          message:
            "Free-food historical items must preserve '-' quantity and dose markers.",
        });
      }
    });
  });

  return {
    groupCount: value.groups.length,
    itemCount,
    publishable: false,
    issues,
  };
}
