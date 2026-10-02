import assert from "node:assert/strict";
import test from "node:test";

import {
  buildConfigurableAssessmentReadiness,
  parseAssessmentDefinitionConfiguration,
} from "./assessment-definition.ts";

const basic = {
  kindKey: "basic",
  requiredMeasurements: [
    { key: "peso", label: "Peso", aliases: ["weight"] },
    { key: "cintura", label: "Cintura", aliases: ["waist"] },
    { key: "abdomen", label: "Abdômen", aliases: ["abdominal", "abdômen"] },
    { key: "quadril", label: "Quadril", aliases: ["hip"] },
  ],
  photoRequirement: null,
};

const complete = {
  kindKey: "complete",
  requiredMeasurements: [
    { key: "peso", label: "Peso", aliases: ["weight"] },
    { key: "cintura", label: "Cintura", aliases: ["waist"] },
    { key: "abdomen", label: "Abdômen", aliases: ["abdominal", "abdômen"] },
    { key: "coxa", label: "Coxa direita", aliases: ["thigh"] },
    { key: "biceps", label: "Bíceps direito", aliases: [] },
    { key: "torax", label: "Busto/peito", aliases: ["bust", "busto", "chest", "peito"] },
    { key: "quadril", label: "Quadril", aliases: ["hip"] },
    { key: "ombros", label: "Ombros", aliases: ["ombro"] },
    { key: "panturrilhas", label: "Panturrilha direita", aliases: ["panturrilha"] },
  ],
  photoRequirement: {
    label: "Foto vinculada",
    minimumCount: 1,
  },
};

test("reproduces the confirmed Basic assessment catalog from configuration", () => {
  const result = buildConfigurableAssessmentReadiness(basic, {
    measurementKeys: ["Peso", "WAIST", "abdômen", "hip"],
    photoCount: 0,
  });

  assert.equal(result.canFinalizeDeterministically, true);
  assert.deepEqual(
    result.items.map((item) => item.key),
    ["peso", "cintura", "abdomen", "quadril"],
  );
});

test("reproduces the confirmed Complete assessment catalog and photo gate", () => {
  const result = buildConfigurableAssessmentReadiness(complete, {
    measurementKeys: [
      "weight",
      "cintura",
      "abdomen",
      "coxa",
      "biceps",
      "busto",
      "quadril",
      "ombro",
      "panturrilha",
    ],
    photoCount: 1,
  });

  assert.equal(result.canFinalizeDeterministically, true);
  assert.equal(result.items.find((item) => item.key === "torax")?.present, true);
  assert.equal(result.items.find((item) => item.key === "photo")?.present, true);
});

test("changed required measurements and photo count need no runtime change", () => {
  const changed = structuredClone(basic);
  changed.requiredMeasurements.push({
    key: "braco",
    label: "Braço",
    aliases: ["arm"],
  });
  changed.photoRequirement = {
    label: "Fotos",
    minimumCount: 2,
  };

  const result = buildConfigurableAssessmentReadiness(changed, {
    measurementKeys: ["peso", "cintura", "abdomen", "quadril", "arm"],
    photoCount: 1,
  });

  assert.equal(result.canFinalizeDeterministically, false);
  assert.equal(result.items.find((item) => item.key === "braco")?.present, true);
  assert.equal(result.items.find((item) => item.key === "photo")?.present, false);
});

test("fails closed on duplicate aliases and malformed requirements", () => {
  const duplicateAlias = structuredClone(basic);
  duplicateAlias.requiredMeasurements[1].aliases.push("weight");
  assert.throws(
    () => parseAssessmentDefinitionConfiguration(duplicateAlias),
    TypeError,
  );

  const empty = structuredClone(basic);
  empty.requiredMeasurements = [];
  assert.throws(() => parseAssessmentDefinitionConfiguration(empty), TypeError);
});

test("rejects invalid photo counts and unsupported configuration fields", () => {
  assert.throws(
    () =>
      buildConfigurableAssessmentReadiness(basic, {
        measurementKeys: [],
        photoCount: -1,
      }),
    RangeError,
  );

  assert.throws(
    () =>
      parseAssessmentDefinitionConfiguration({
        ...basic,
        automaticCadenceDays: 15,
      }),
    TypeError,
  );
});
