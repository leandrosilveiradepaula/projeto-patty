export const METHOD_ENGINE_MAX_EXPRESSION_DEPTH = 32;
export const METHOD_ENGINE_MAX_EXPRESSION_NODES = 256;

export const METHOD_ENGINE_UNITS = [
  "g",
  "kg",
  "ml",
  "g_per_kg",
  "ml_per_kg",
  "dose",
  "hour",
  "count",
  "ratio",
] as const;

export type MethodEngineUnit = (typeof METHOD_ENGINE_UNITS)[number];

export type MethodEngineNumericValue = {
  value: number;
  unit: MethodEngineUnit;
};

export type MethodEngineExpression =
  | {
      op: "literal";
      value: number;
      unit: MethodEngineUnit;
    }
  | {
      op: "input";
      key: string;
    }
  | {
      op: "parameter";
      key: string;
    }
  | {
      op: "add" | "subtract" | "multiply" | "divide" | "min" | "max";
      args: readonly [MethodEngineExpression, MethodEngineExpression];
    }
  | {
      op: "ceil" | "floor" | "round";
      arg: MethodEngineExpression;
    };

export type MethodEngineConfiguration = {
  inputs: Record<string, { unit: MethodEngineUnit }>;
  parameters: Record<string, MethodEngineNumericValue>;
  outputs: Record<
    string,
    {
      unit: MethodEngineUnit;
      expression: MethodEngineExpression;
    }
  >;
};

export type MethodEngineResult = {
  configuration: MethodEngineConfiguration;
  inputs: Record<string, MethodEngineNumericValue>;
  outputs: Record<string, MethodEngineNumericValue>;
};

export type MethodEngineErrorCode =
  | "DIVISION_BY_ZERO"
  | "INVALID_CONFIGURATION"
  | "INVALID_NUMBER"
  | "INVALID_RESULT"
  | "LIMIT_EXCEEDED"
  | "MISSING_INPUT_DEFINITION"
  | "MISSING_INPUT_VALUE"
  | "MISSING_PARAMETER"
  | "OUTPUT_UNIT_MISMATCH"
  | "UNIT_MISMATCH"
  | "UNKNOWN_INPUT"
  | "UNKNOWN_OPERATOR"
  | "UNKNOWN_UNIT";

export class MethodEngineError extends Error {
  readonly code: MethodEngineErrorCode;
  readonly path: string;

  constructor(code: MethodEngineErrorCode, message: string, path: string) {
    super(message);
    this.name = "MethodEngineError";
    this.code = code;
    this.path = path;
  }
}

type ParseState = {
  nodes: number;
};

const UNIT_SET = new Set<string>(METHOD_ENGINE_UNITS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function fail(
  code: MethodEngineErrorCode,
  message: string,
  path: string,
): never {
  throw new MethodEngineError(code, message, path);
}

function assertExactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
) {
  const allowedSet = new Set(allowed);

  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) {
      fail(
        "INVALID_CONFIGURATION",
        "configuration contains an unsupported field",
        path + "." + key,
      );
    }
  }
}

function readNonBlankKey(value: unknown, path: string) {
  if (typeof value !== "string" || !/^[a-z][A-Za-z0-9_-]{0,119}$/.test(value) || ["__proto__", "constructor", "prototype", "toString", "valueOf", "hasOwnProperty"].includes(value)) {
    fail("INVALID_CONFIGURATION", "key must be a safe identifier", path);
  }

  return value;
}

function readFiniteNumber(value: unknown, path: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail("INVALID_NUMBER", "value must be a finite number", path);
  }

  return value;
}

function readUnit(value: unknown, path: string): MethodEngineUnit {
  if (typeof value !== "string" || !UNIT_SET.has(value)) {
    fail("UNKNOWN_UNIT", "unit is not supported by engine v1", path);
  }

  return value as MethodEngineUnit;
}

function parseExpression(
  value: unknown,
  path: string,
  depth: number,
  state: ParseState,
): MethodEngineExpression {
  if (depth > METHOD_ENGINE_MAX_EXPRESSION_DEPTH) {
    fail(
      "LIMIT_EXCEEDED",
      "expression exceeds maximum depth",
      path,
    );
  }

  state.nodes += 1;

  if (state.nodes > METHOD_ENGINE_MAX_EXPRESSION_NODES) {
    fail(
      "LIMIT_EXCEEDED",
      "configuration exceeds maximum expression node count",
      path,
    );
  }

  if (!isRecord(value)) {
    fail(
      "INVALID_CONFIGURATION",
      "expression must be an object",
      path,
    );
  }

  const op = value.op;

  if (typeof op !== "string") {
    fail(
      "INVALID_CONFIGURATION",
      "expression operator must be a string",
      path + ".op",
    );
  }

  if (op === "literal") {
    assertExactKeys(value, ["op", "value", "unit"], path);

    return {
      op,
      value: readFiniteNumber(value.value, path + ".value"),
      unit: readUnit(value.unit, path + ".unit"),
    };
  }

  if (op === "input" || op === "parameter") {
    assertExactKeys(value, ["op", "key"], path);

    return {
      op,
      key: readNonBlankKey(value.key, path + ".key"),
    };
  }

  if (
    op === "add" ||
    op === "subtract" ||
    op === "multiply" ||
    op === "divide" ||
    op === "min" ||
    op === "max"
  ) {
    assertExactKeys(value, ["op", "args"], path);

    if (!Array.isArray(value.args) || value.args.length !== 2) {
      fail(
        "INVALID_CONFIGURATION",
        "binary operator requires exactly two arguments",
        path + ".args",
      );
    }

    return {
      op,
      args: [
        parseExpression(value.args[0], path + ".args[0]", depth + 1, state),
        parseExpression(value.args[1], path + ".args[1]", depth + 1, state),
      ],
    };
  }

  if (op === "ceil" || op === "floor" || op === "round") {
    assertExactKeys(value, ["op", "arg"], path);

    return {
      op,
      arg: parseExpression(value.arg, path + ".arg", depth + 1, state),
    };
  }

  fail("UNKNOWN_OPERATOR", "operator is not supported by engine v1", path + ".op");
}

function parseNamedRecord(
  value: unknown,
  path: string,
): Record<string, unknown> {
  if (!isRecord(value)) {
    fail(
      "INVALID_CONFIGURATION",
      "configuration section must be an object",
      path,
    );
  }

  for (const key of Object.keys(value)) {
    readNonBlankKey(key, path);
  }

  return value;
}

function validateExpressionReferences(
  expression: MethodEngineExpression,
  configuration: MethodEngineConfiguration,
  path: string,
): void {
  if (expression.op === "input") {
    if (!Object.prototype.hasOwnProperty.call(configuration.inputs, expression.key)) {
      fail(
        "MISSING_INPUT_DEFINITION",
        "expression references an undeclared input",
        path + ".key",
      );
    }

    return;
  }

  if (expression.op === "parameter") {
    if (!Object.prototype.hasOwnProperty.call(configuration.parameters, expression.key)) {
      fail(
        "MISSING_PARAMETER",
        "expression references an undeclared parameter",
        path + ".key",
      );
    }

    return;
  }

  if (expression.op === "literal") {
    return;
  }

  if (
    expression.op === "ceil" ||
    expression.op === "floor" ||
    expression.op === "round"
  ) {
    validateExpressionReferences(expression.arg, configuration, path + ".arg");
    return;
  }

  if (!("args" in expression)) {
    fail(
      "INVALID_CONFIGURATION",
      "binary expression is missing arguments",
      path,
    );
  }

  validateExpressionReferences(expression.args[0], configuration, path + ".args[0]");
  validateExpressionReferences(expression.args[1], configuration, path + ".args[1]");
}

export function validateMethodEngineConfiguration(
  value: unknown,
): MethodEngineConfiguration {
  if (!isRecord(value)) {
    fail(
      "INVALID_CONFIGURATION",
      "method configuration must be an object",
      "$",
    );
  }

  assertExactKeys(value, ["inputs", "parameters", "outputs"], "$");

  const rawInputs = parseNamedRecord(value.inputs, "$.inputs");
  const rawParameters = parseNamedRecord(value.parameters, "$.parameters");
  const rawOutputs = parseNamedRecord(value.outputs, "$.outputs");

  const inputs: MethodEngineConfiguration["inputs"] = {};

  for (const [key, rawInput] of Object.entries(rawInputs)) {
    if (!isRecord(rawInput)) {
      fail(
        "INVALID_CONFIGURATION",
        "input definition must be an object",
        "$.inputs." + key,
      );
    }

    assertExactKeys(rawInput, ["unit"], "$.inputs." + key);
    inputs[key] = {
      unit: readUnit(rawInput.unit, "$.inputs." + key + ".unit"),
    };
  }

  const parameters: MethodEngineConfiguration["parameters"] = {};

  for (const [key, rawParameter] of Object.entries(rawParameters)) {
    if (!isRecord(rawParameter)) {
      fail(
        "INVALID_CONFIGURATION",
        "parameter definition must be an object",
        "$.parameters." + key,
      );
    }

    assertExactKeys(rawParameter, ["value", "unit"], "$.parameters." + key);
    parameters[key] = {
      value: readFiniteNumber(
        rawParameter.value,
        "$.parameters." + key + ".value",
      ),
      unit: readUnit(rawParameter.unit, "$.parameters." + key + ".unit"),
    };
  }

  const outputs: MethodEngineConfiguration["outputs"] = {};
  const state: ParseState = { nodes: 0 };

  for (const [key, rawOutput] of Object.entries(rawOutputs)) {
    if (!isRecord(rawOutput)) {
      fail(
        "INVALID_CONFIGURATION",
        "output definition must be an object",
        "$.outputs." + key,
      );
    }

    assertExactKeys(
      rawOutput,
      ["unit", "expression"],
      "$.outputs." + key,
    );

    outputs[key] = {
      unit: readUnit(rawOutput.unit, "$.outputs." + key + ".unit"),
      expression: parseExpression(
        rawOutput.expression,
        "$.outputs." + key + ".expression",
        1,
        state,
      ),
    };
  }

  const configuration: MethodEngineConfiguration = {
    inputs,
    parameters,
    outputs,
  };

  for (const [key, output] of Object.entries(configuration.outputs)) {
    validateExpressionReferences(
      output.expression,
      configuration,
      "$.outputs." + key + ".expression",
    );
  }

  return configuration;
}

function sameUnit(
  left: MethodEngineNumericValue,
  right: MethodEngineNumericValue,
  path: string,
) {
  if (left.unit !== right.unit) {
    fail(
      "UNIT_MISMATCH",
      "operator requires matching units",
      path,
    );
  }

  return left.unit;
}

function multiplyUnit(
  left: MethodEngineUnit,
  right: MethodEngineUnit,
  path: string,
): MethodEngineUnit {
  if (left === "ratio") {
    return right;
  }

  if (right === "ratio") {
    return left;
  }

  if (
    (left === "kg" && right === "g_per_kg") ||
    (left === "g_per_kg" && right === "kg")
  ) {
    return "g";
  }

  if (
    (left === "kg" && right === "ml_per_kg") ||
    (left === "ml_per_kg" && right === "kg")
  ) {
    return "ml";
  }

  fail(
    "UNIT_MISMATCH",
    "unit multiplication is not supported by engine v1",
    path,
  );
}

function divideUnit(
  numerator: MethodEngineUnit,
  denominator: MethodEngineUnit,
  path: string,
): MethodEngineUnit {
  if (numerator === denominator) {
    return "ratio";
  }

  if (denominator === "ratio") {
    return numerator;
  }

  if (numerator === "g" && denominator === "kg") {
    return "g_per_kg";
  }

  if (numerator === "ml" && denominator === "kg") {
    return "ml_per_kg";
  }

  fail(
    "UNIT_MISMATCH",
    "unit division is not supported by engine v1",
    path,
  );
}

function assertFiniteResult(value: number, path: string) {
  if (!Number.isFinite(value)) {
    fail(
      "INVALID_RESULT",
      "expression produced a non-finite result",
      path,
    );
  }

  return value;
}

function roundHalfAwayFromZero(value: number) {
  return Math.sign(value) * Math.round(Math.abs(value));
}

function evaluateExpression(
  expression: MethodEngineExpression,
  configuration: MethodEngineConfiguration,
  inputs: Record<string, MethodEngineNumericValue>,
  path: string,
): MethodEngineNumericValue {
  if (expression.op === "literal") {
    return {
      value: expression.value,
      unit: expression.unit,
    };
  }

  if (expression.op === "input") {
    const input = inputs[expression.key];

    if (!input) {
      fail(
        "MISSING_INPUT_VALUE",
        "required runtime input is missing",
        path + ".key",
      );
    }

    return input;
  }

  if (expression.op === "parameter") {
    const parameter = configuration.parameters[expression.key];

    if (!parameter) {
      fail(
        "MISSING_PARAMETER",
        "required parameter is missing",
        path + ".key",
      );
    }

    return parameter;
  }

  if (
    expression.op === "ceil" ||
    expression.op === "floor" ||
    expression.op === "round"
  ) {
    const operand = evaluateExpression(
      expression.arg,
      configuration,
      inputs,
      path + ".arg",
    );
    const result =
      expression.op === "ceil"
        ? Math.ceil(operand.value)
        : expression.op === "floor"
          ? Math.floor(operand.value)
          : roundHalfAwayFromZero(operand.value);

    return {
      value: assertFiniteResult(result, path),
      unit: operand.unit,
    };
  }

  if (!("args" in expression)) {
    fail(
      "INVALID_CONFIGURATION",
      "binary expression is missing arguments",
      path,
    );
  }

  const left = evaluateExpression(
    expression.args[0],
    configuration,
    inputs,
    path + ".args[0]",
  );
  const right = evaluateExpression(
    expression.args[1],
    configuration,
    inputs,
    path + ".args[1]",
  );

  if (expression.op === "add") {
    const unit = sameUnit(left, right, path);
    return {
      value: assertFiniteResult(left.value + right.value, path),
      unit,
    };
  }

  if (expression.op === "subtract") {
    const unit = sameUnit(left, right, path);
    return {
      value: assertFiniteResult(left.value - right.value, path),
      unit,
    };
  }

  if (expression.op === "min" || expression.op === "max") {
    const unit = sameUnit(left, right, path);
    return {
      value: assertFiniteResult(
        expression.op === "min"
          ? Math.min(left.value, right.value)
          : Math.max(left.value, right.value),
        path,
      ),
      unit,
    };
  }

  if (expression.op === "multiply") {
    return {
      value: assertFiniteResult(left.value * right.value, path),
      unit: multiplyUnit(left.unit, right.unit, path),
    };
  }

  if (right.value === 0) {
    fail(
      "DIVISION_BY_ZERO",
      "division by zero is not allowed",
      path + ".args[1]",
    );
  }

  return {
    value: assertFiniteResult(left.value / right.value, path),
    unit: divideUnit(left.unit, right.unit, path),
  };
}

function validateRuntimeInputs(
  configuration: MethodEngineConfiguration,
  value: unknown,
): Record<string, MethodEngineNumericValue> {
  const rawInputs = parseNamedRecord(value, "$inputs");
  const inputs: Record<string, MethodEngineNumericValue> = {};

  for (const key of Object.keys(rawInputs)) {
    if (!Object.prototype.hasOwnProperty.call(configuration.inputs, key)) {
      fail(
        "UNKNOWN_INPUT",
        "runtime input was not declared by the configuration",
        "$inputs." + key,
      );
    }
  }

  for (const [key, definition] of Object.entries(configuration.inputs)) {
    const rawInput = rawInputs[key];

    if (!isRecord(rawInput)) {
      fail(
        "MISSING_INPUT_VALUE",
        "declared runtime input is missing",
        "$inputs." + key,
      );
    }

    assertExactKeys(rawInput, ["value", "unit"], "$inputs." + key);

    const input = {
      value: readFiniteNumber(rawInput.value, "$inputs." + key + ".value"),
      unit: readUnit(rawInput.unit, "$inputs." + key + ".unit"),
    };

    if (input.unit !== definition.unit) {
      fail(
        "UNIT_MISMATCH",
        "runtime input unit does not match its declaration",
        "$inputs." + key + ".unit",
      );
    }

    inputs[key] = input;
  }

  return inputs;
}

export function evaluateMethodEngineConfiguration(
  configurationValue: unknown,
  runtimeInputsValue: unknown,
): MethodEngineResult {
  const configuration =
    validateMethodEngineConfiguration(configurationValue);
  const inputs = validateRuntimeInputs(configuration, runtimeInputsValue);
  const outputs: Record<string, MethodEngineNumericValue> = {};

  for (const [key, output] of Object.entries(configuration.outputs)) {
    const result = evaluateExpression(
      output.expression,
      configuration,
      inputs,
      "$.outputs." + key + ".expression",
    );

    if (result.unit !== output.unit) {
      fail(
        "OUTPUT_UNIT_MISMATCH",
        "expression result unit does not match declared output unit",
        "$.outputs." + key + ".unit",
      );
    }

    outputs[key] = result;
  }

  return {
    configuration,
    inputs,
    outputs,
  };
}
