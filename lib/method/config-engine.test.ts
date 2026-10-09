import assert from "node:assert/strict";
import test from "node:test";

import {
  METHOD_ENGINE_MAX_EXPRESSION_DEPTH,
  METHOD_ENGINE_MAX_EXPRESSION_NODES,
  MethodEngineError,
  evaluateMethodEngineConfiguration,
  validateMethodEngineConfiguration,
} from "./config-engine.ts";

function assertEngineError(
  callback: () => unknown,
  code: MethodEngineError["code"],
) {
  assert.throws(callback, (error: unknown) => {
    return error instanceof MethodEngineError && error.code === code;
  });
}

test("evaluates an explicit per-unit formula without professional hardcodes", () => {
  const result = evaluateMethodEngineConfiguration(
    {
      inputs: {
        mass: { unit: "kg" },
      },
      parameters: {
        factor: { value: 3, unit: "g_per_kg" },
      },
      outputs: {
        amount: {
          unit: "g",
          expression: {
            op: "multiply",
            args: [
              { op: "input", key: "mass" },
              { op: "parameter", key: "factor" },
            ],
          },
        },
      },
    },
    {
      mass: { value: 10, unit: "kg" },
    },
  );

  assert.deepEqual(result.outputs, {
    amount: { value: 30, unit: "g" },
  });
});

test("supports the initial arithmetic allowlist with explicit units", () => {
  const result = evaluateMethodEngineConfiguration(
    {
      inputs: {},
      parameters: {
        left: { value: 7.5, unit: "g" },
        right: { value: 2.5, unit: "g" },
        ratio: { value: 2, unit: "ratio" },
      },
      outputs: {
        added: {
          unit: "g",
          expression: {
            op: "add",
            args: [
              { op: "parameter", key: "left" },
              { op: "parameter", key: "right" },
            ],
          },
        },
        subtracted: {
          unit: "g",
          expression: {
            op: "subtract",
            args: [
              { op: "parameter", key: "left" },
              { op: "parameter", key: "right" },
            ],
          },
        },
        multiplied: {
          unit: "g",
          expression: {
            op: "multiply",
            args: [
              { op: "parameter", key: "left" },
              { op: "parameter", key: "ratio" },
            ],
          },
        },
        divided: {
          unit: "ratio",
          expression: {
            op: "divide",
            args: [
              { op: "parameter", key: "left" },
              { op: "parameter", key: "right" },
            ],
          },
        },
        minimum: {
          unit: "g",
          expression: {
            op: "min",
            args: [
              { op: "parameter", key: "left" },
              { op: "parameter", key: "right" },
            ],
          },
        },
        maximum: {
          unit: "g",
          expression: {
            op: "max",
            args: [
              { op: "parameter", key: "left" },
              { op: "parameter", key: "right" },
            ],
          },
        },
        ceiling: {
          unit: "g",
          expression: {
            op: "ceil",
            arg: { op: "literal", value: 2.1, unit: "g" },
          },
        },
        floor: {
          unit: "g",
          expression: {
            op: "floor",
            arg: { op: "literal", value: 2.9, unit: "g" },
          },
        },
        roundedPositive: {
          unit: "g",
          expression: {
            op: "round",
            arg: { op: "literal", value: 2.5, unit: "g" },
          },
        },
        roundedNegative: {
          unit: "g",
          expression: {
            op: "round",
            arg: { op: "literal", value: -2.5, unit: "g" },
          },
        },
      },
    },
    {},
  );

  assert.deepEqual(result.outputs, {
    added: { value: 10, unit: "g" },
    subtracted: { value: 5, unit: "g" },
    multiplied: { value: 15, unit: "g" },
    divided: { value: 3, unit: "ratio" },
    minimum: { value: 2.5, unit: "g" },
    maximum: { value: 7.5, unit: "g" },
    ceiling: { value: 3, unit: "g" },
    floor: { value: 2, unit: "g" },
    roundedPositive: { value: 3, unit: "g" },
    roundedNegative: { value: -3, unit: "g" },
  });
});

test("supports only explicit dimensional reductions needed by engine v1", () => {
  const result = evaluateMethodEngineConfiguration(
    {
      inputs: {},
      parameters: {},
      outputs: {
        gramsPerKg: {
          unit: "g_per_kg",
          expression: {
            op: "divide",
            args: [
              { op: "literal", value: 18, unit: "g" },
              { op: "literal", value: 6, unit: "kg" },
            ],
          },
        },
        milliliters: {
          unit: "ml",
          expression: {
            op: "multiply",
            args: [
              { op: "literal", value: 5, unit: "kg" },
              { op: "literal", value: 4, unit: "ml_per_kg" },
            ],
          },
        },
      },
    },
    {},
  );

  assert.deepEqual(result.outputs, {
    gramsPerKg: { value: 3, unit: "g_per_kg" },
    milliliters: { value: 20, unit: "ml" },
  });
});

test("rejects unknown operators and unsupported fields instead of evaluating code", () => {
  assertEngineError(
    () =>
      validateMethodEngineConfiguration({
        inputs: {},
        parameters: {},
        outputs: {
          unsafe: {
            unit: "ratio",
            expression: {
              op: "eval",
              source: "2 + 2",
            },
          },
        },
      }),
    "UNKNOWN_OPERATOR",
  );

  assertEngineError(
    () =>
      validateMethodEngineConfiguration({
        inputs: {},
        parameters: {},
        outputs: {
          extra: {
            unit: "ratio",
            expression: {
              op: "literal",
              value: 1,
              unit: "ratio",
              executable: true,
            },
          },
        },
      }),
    "INVALID_CONFIGURATION",
  );
});

test("rejects undeclared references before evaluation", () => {
  assertEngineError(
    () =>
      validateMethodEngineConfiguration({
        inputs: {},
        parameters: {},
        outputs: {
          missingInput: {
            unit: "kg",
            expression: { op: "input", key: "unknown" },
          },
        },
      }),
    "MISSING_INPUT_DEFINITION",
  );

  assertEngineError(
    () =>
      validateMethodEngineConfiguration({
        inputs: {},
        parameters: {},
        outputs: {
          missingParameter: {
            unit: "ratio",
            expression: { op: "parameter", key: "unknown" },
          },
        },
      }),
    "MISSING_PARAMETER",
  );
});

test("rejects missing, unknown, non-finite, or unit-mismatched runtime inputs", () => {
  const configuration = {
    inputs: {
      mass: { unit: "kg" },
    },
    parameters: {},
    outputs: {
      echo: {
        unit: "kg",
        expression: { op: "input", key: "mass" },
      },
    },
  };

  assertEngineError(
    () => evaluateMethodEngineConfiguration(configuration, {}),
    "MISSING_INPUT_VALUE",
  );

  assertEngineError(
    () =>
      evaluateMethodEngineConfiguration(configuration, {
        mass: { value: 10, unit: "kg" },
        other: { value: 1, unit: "kg" },
      }),
    "UNKNOWN_INPUT",
  );

  assertEngineError(
    () =>
      evaluateMethodEngineConfiguration(configuration, {
        mass: { value: Number.NaN, unit: "kg" },
      }),
    "INVALID_NUMBER",
  );

  assertEngineError(
    () =>
      evaluateMethodEngineConfiguration(configuration, {
        mass: { value: 10, unit: "g" },
      }),
    "UNIT_MISMATCH",
  );
});

test("rejects invalid unit algebra and declared output mismatches", () => {
  assertEngineError(
    () =>
      evaluateMethodEngineConfiguration(
        {
          inputs: {},
          parameters: {},
          outputs: {
            invalidMultiplication: {
              unit: "g",
              expression: {
                op: "multiply",
                args: [
                  { op: "literal", value: 2, unit: "g" },
                  { op: "literal", value: 3, unit: "g" },
                ],
              },
            },
          },
        },
        {},
      ),
    "UNIT_MISMATCH",
  );

  assertEngineError(
    () =>
      evaluateMethodEngineConfiguration(
        {
          inputs: {},
          parameters: {},
          outputs: {
            wrongDeclaration: {
              unit: "ml",
              expression: { op: "literal", value: 1, unit: "g" },
            },
          },
        },
        {},
      ),
    "OUTPUT_UNIT_MISMATCH",
  );
});

test("fails closed on division by zero", () => {
  assertEngineError(
    () =>
      evaluateMethodEngineConfiguration(
        {
          inputs: {},
          parameters: {},
          outputs: {
            invalid: {
              unit: "g",
              expression: {
                op: "divide",
                args: [
                  { op: "literal", value: 10, unit: "g" },
                  { op: "literal", value: 0, unit: "ratio" },
                ],
              },
            },
          },
        },
        {},
      ),
    "DIVISION_BY_ZERO",
  );
});

test("rejects non-finite parameter values", () => {
  assertEngineError(
    () =>
      validateMethodEngineConfiguration({
        inputs: {},
        parameters: {
          invalid: { value: Number.POSITIVE_INFINITY, unit: "ratio" },
        },
        outputs: {},
      }),
    "INVALID_NUMBER",
  );
});

test("enforces the configured expression depth safety limit", () => {
  let expression: unknown = {
    op: "literal",
    value: 1,
    unit: "ratio",
  };

  for (let index = 0; index < METHOD_ENGINE_MAX_EXPRESSION_DEPTH; index += 1) {
    expression = {
      op: "ceil",
      arg: expression,
    };
  }

  assertEngineError(
    () =>
      validateMethodEngineConfiguration({
        inputs: {},
        parameters: {},
        outputs: {
          tooDeep: {
            unit: "ratio",
            expression,
          },
        },
      }),
    "LIMIT_EXCEEDED",
  );
});

test("enforces the total expression node safety limit", () => {
  function buildTree(depth: number): unknown {
    if (depth === 0) {
      return {
        op: "literal",
        value: 1,
        unit: "ratio",
      };
    }

    return {
      op: "add",
      args: [buildTree(depth - 1), buildTree(depth - 1)],
    };
  }

  const expression = buildTree(9);

  assert.ok(2 ** 10 - 1 > METHOD_ENGINE_MAX_EXPRESSION_NODES);

  assertEngineError(
    () =>
      validateMethodEngineConfiguration({
        inputs: {},
        parameters: {},
        outputs: {
          tooLarge: {
            unit: "ratio",
            expression,
          },
        },
      }),
    "LIMIT_EXCEEDED",
  );
});

test("rejects unsafe input, parameter and output identifiers", () => {
  for (const key of ["__proto__", "constructor", "toString", "bad key", "1bad", "x".repeat(121)]) {
    for (const section of ["inputs", "parameters", "outputs"] as const) {
      const config: Record<string, unknown> = { inputs: {}, parameters: {}, outputs: {} };
      Object.defineProperty(config[section], key, { enumerable: true, configurable: true, value: section === "inputs"
        ? { unit: "kg" }
        : section === "parameters"
          ? { value: 1, unit: "kg" }
          : { unit: "kg", expression: { op: "literal", value: 1, unit: "kg" } } });
      assertEngineError(() => validateMethodEngineConfiguration(config), "INVALID_CONFIGURATION");
    }
  }
});

test("rejects inherited input and parameter references", () => {
  for (const op of ["input", "parameter"]) {
    assertEngineError(() => validateMethodEngineConfiguration({
      inputs: {}, parameters: {}, outputs: {
        result: { unit: "ratio", expression: { op, key: "constructor" } },
      },
    }), "INVALID_CONFIGURATION");
  }
});

test("rejects undeclared runtime input names", () => {
  assertEngineError(() => evaluateMethodEngineConfiguration({
    inputs: {}, parameters: {}, outputs: {},
  }, { constructor: { value: 1, unit: "kg" } }), "INVALID_CONFIGURATION");
});

test("method engine retains ordinary configured identifiers and calculations", () => {
  const result = evaluateMethodEngineConfiguration({
    inputs: { weight_kg: { unit: "kg" } },
    parameters: { coefficient_v2: { value: 2, unit: "g_per_kg" } },
    outputs: { protein_g: { unit: "g", expression: { op: "multiply", args: [
      { op: "input", key: "weight_kg" },
      { op: "parameter", key: "coefficient_v2" },
    ] } } },
  }, { weight_kg: { value: 60, unit: "kg" } });
  assert.equal(result.outputs.protein_g.value, 120);
});
