import type { QuestionnaireAnswerValue } from "@/features/questionnaire/types";

export type PdfMappingCondition = {
  questionKey: string;
  equals: string | number | boolean | null;
};

export type PdfMappingInput = {
  questionKey: string;
  required?: boolean;
  requiredWhen?: PdfMappingCondition;
};

type PdfMappingBase = {
  id: string;
};

export type PdfDirectMapping = PdfMappingBase &
  PdfMappingInput & {
    type: "direct";
    targetField: string;
  };

export type PdfDateMapping = PdfMappingBase &
  PdfMappingInput & {
    type: "date";
    targetField: string;
  };

export type PdfChoiceMapping = PdfMappingBase &
  PdfMappingInput & {
    type: "choice";
    targetField: string;
    values: Readonly<Record<string, string>>;
  };

export type PdfComposeInput = PdfMappingInput & {
  label: string;
  transform?: "direct" | "date";
};

export type PdfComposeMapping = PdfMappingBase & {
  type: "compose";
  targetField: string;
  inputs: readonly PdfComposeInput[];
  separator?: string;
};

export type PdfPart8Mapping = PdfMappingBase &
  PdfMappingInput & {
    type: "part8";
    targetFields: {
      page: string;
      part: string;
      item: string;
      value: string;
    };
    reference: {
      page: string;
      part: string;
      item: string;
    };
  };

export type PdfFieldMapping =
  | PdfDirectMapping
  | PdfDateMapping
  | PdfChoiceMapping
  | PdfComposeMapping
  | PdfPart8Mapping;

export type PdfMappingErrorCode =
  | "missing_required_input"
  | "invalid_input"
  | "invalid_mapping_definition"
  | "duplicate_target_field"
  | "unsupported_mapping_type";

export type PdfMappingError = {
  code: PdfMappingErrorCode;
  mappingId: string;
  mappingType: string;
  questionKeys: string[];
  targetFields: string[];
  message: string;
};

export type PdfMappingResult =
  | { success: true; fields: Record<string, string> }
  | { success: false; errors: PdfMappingError[] };

type AnswerLookup = Readonly<Record<string, QuestionnaireAnswerValue>>;

type MappingOutput = {
  fields: Record<string, string>;
  errors: PdfMappingError[];
};

function hasValue(
  value: QuestionnaireAnswerValue | undefined,
): value is Exclude<QuestionnaireAnswerValue, null> {
  return value !== undefined && value !== null && value !== "";
}

function isRequired(input: PdfMappingInput, answers: AnswerLookup): boolean {
  if (input.required) {
    return true;
  }

  if (!input.requiredWhen) {
    return false;
  }

  return answers[input.requiredWhen.questionKey] === input.requiredWhen.equals;
}

function targetFieldsForMapping(mapping: PdfFieldMapping): string[] {
  if (mapping.type === "part8") {
    return Object.values(mapping.targetFields);
  }

  return [mapping.targetField];
}

function questionKeysForMapping(mapping: PdfFieldMapping): string[] {
  if (mapping.type === "compose") {
    return mapping.inputs.map((input) => input.questionKey);
  }

  return [mapping.questionKey];
}

function mappingError(
  mapping: PdfFieldMapping,
  code: PdfMappingErrorCode,
  message: string,
  questionKeys = questionKeysForMapping(mapping),
  targetFields = targetFieldsForMapping(mapping),
): PdfMappingError {
  return {
    code,
    mappingId: mapping.id,
    mappingType: mapping.type,
    questionKeys,
    targetFields,
    message,
  };
}

function formatTextValue(value: QuestionnaireAnswerValue): string | null {
  if (typeof value === "string") {
    return value;
  }

  return null;
}

export function formatPdfDate(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return null;
  }

  return `${month}/${day}/${year}`;
}

function missingInputError(
  mapping: PdfFieldMapping,
  questionKey: string,
): PdfMappingError {
  return mappingError(
    mapping,
    "missing_required_input",
    `Required questionnaire answer "${questionKey}" is missing for PDF mapping "${mapping.id}".`,
    [questionKey],
  );
}

function invalidInputError(
  mapping: PdfFieldMapping,
  questionKey: string,
): PdfMappingError {
  return mappingError(
    mapping,
    "invalid_input",
    `Questionnaire answer "${questionKey}" is invalid for PDF mapping "${mapping.id}".`,
    [questionKey],
  );
}

function mapSingleInput(
  mapping: PdfDirectMapping | PdfDateMapping | PdfChoiceMapping,
  answers: AnswerLookup,
): MappingOutput {
  const value = answers[mapping.questionKey];

  if (!hasValue(value)) {
    return isRequired(mapping, answers)
      ? { fields: {}, errors: [missingInputError(mapping, mapping.questionKey)] }
      : { fields: {}, errors: [] };
  }

  let formattedValue: string | null = null;

  if (mapping.type === "direct") {
    formattedValue = formatTextValue(value);
  } else if (mapping.type === "date") {
    formattedValue = typeof value === "string" ? formatPdfDate(value) : null;
  } else {
    const choiceKey =
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
        ? String(value)
        : null;
    formattedValue = choiceKey === null ? null : (mapping.values[choiceKey] ?? null);
  }

  if (formattedValue === null) {
    return {
      fields: {},
      errors: [invalidInputError(mapping, mapping.questionKey)],
    };
  }

  return { fields: { [mapping.targetField]: formattedValue }, errors: [] };
}

function mapCompose(
  mapping: PdfComposeMapping,
  answers: AnswerLookup,
): MappingOutput {
  const parts: string[] = [];
  const errors: PdfMappingError[] = [];

  for (const input of mapping.inputs) {
    const value = answers[input.questionKey];

    if (!hasValue(value)) {
      if (isRequired(input, answers)) {
        errors.push(missingInputError(mapping, input.questionKey));
      }
      continue;
    }

    const formattedValue =
      input.transform === "date"
        ? typeof value === "string"
          ? formatPdfDate(value)
          : null
        : formatTextValue(value);

    if (formattedValue === null) {
      errors.push(invalidInputError(mapping, input.questionKey));
      continue;
    }

    parts.push(`${input.label}: ${formattedValue}`);
  }

  if (errors.length > 0 || parts.length === 0) {
    return { fields: {}, errors };
  }

  return {
    fields: { [mapping.targetField]: parts.join(mapping.separator ?? "\n") },
    errors: [],
  };
}

function mapPart8(
  mapping: PdfPart8Mapping,
  answers: AnswerLookup,
): MappingOutput {
  const value = answers[mapping.questionKey];

  if (!hasValue(value)) {
    return isRequired(mapping, answers)
      ? { fields: {}, errors: [missingInputError(mapping, mapping.questionKey)] }
      : { fields: {}, errors: [] };
  }

  const formattedValue = formatTextValue(value);

  if (formattedValue === null) {
    return {
      fields: {},
      errors: [invalidInputError(mapping, mapping.questionKey)],
    };
  }

  return {
    fields: {
      [mapping.targetFields.page]: mapping.reference.page,
      [mapping.targetFields.part]: mapping.reference.part,
      [mapping.targetFields.item]: mapping.reference.item,
      [mapping.targetFields.value]: formattedValue,
    },
    errors: [],
  };
}

function unsupportedMappingError(mapping: unknown): PdfMappingError {
  const candidate =
    typeof mapping === "object" && mapping !== null
      ? (mapping as { id?: unknown; type?: unknown })
      : {};
  const mappingId = typeof candidate.id === "string" ? candidate.id : "unknown";
  const mappingType =
    typeof candidate.type === "string" ? candidate.type : "unknown";

  return {
    code: "unsupported_mapping_type",
    mappingId,
    mappingType,
    questionKeys: [],
    targetFields: [],
    message: `Unsupported PDF mapping type "${mappingType}" for mapping "${mappingId}".`,
  };
}

function invalidDefinitionError(
  mappingId: string,
  mappingType: string,
): PdfMappingError {
  return {
    code: "invalid_mapping_definition",
    mappingId,
    mappingType,
    questionKeys: [],
    targetFields: [],
    message: `PDF mapping "${mappingId}" has an invalid definition for type "${mappingType}".`,
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function hasValidDefinition(mapping: PdfFieldMapping): boolean {
  if (!isNonEmptyString(mapping.id)) {
    return false;
  }

  switch (mapping.type) {
    case "direct":
    case "date":
      return (
        isNonEmptyString(mapping.questionKey) &&
        isNonEmptyString(mapping.targetField)
      );
    case "choice":
      return (
        isNonEmptyString(mapping.questionKey) &&
        isNonEmptyString(mapping.targetField) &&
        typeof mapping.values === "object" &&
        mapping.values !== null
      );
    case "compose":
      return (
        isNonEmptyString(mapping.targetField) &&
        Array.isArray(mapping.inputs) &&
        mapping.inputs.length > 0 &&
        mapping.inputs.every(
          (input) =>
            isNonEmptyString(input.questionKey) && isNonEmptyString(input.label),
        )
      );
    case "part8":
      return (
        isNonEmptyString(mapping.questionKey) &&
        typeof mapping.targetFields === "object" &&
        mapping.targetFields !== null &&
        Object.values(mapping.targetFields).every(isNonEmptyString) &&
        typeof mapping.reference === "object" &&
        mapping.reference !== null &&
        Object.values(mapping.reference).every(isNonEmptyString)
      );
    default:
      return false;
  }
}

function mapDefinition(
  mapping: PdfFieldMapping,
  answers: AnswerLookup,
): MappingOutput {
  const candidate = mapping as { id?: unknown; type?: unknown };
  const mappingId = typeof candidate.id === "string" ? candidate.id : "unknown";
  const mappingType =
    typeof candidate.type === "string" ? candidate.type : "unknown";

  if (
    !["direct", "date", "choice", "compose", "part8"].includes(mappingType)
  ) {
    return { fields: {}, errors: [unsupportedMappingError(mapping)] };
  }

  if (!hasValidDefinition(mapping)) {
    return {
      fields: {},
      errors: [invalidDefinitionError(mappingId, mappingType)],
    };
  }

  switch (mapping.type) {
    case "direct":
    case "date":
    case "choice":
      return mapSingleInput(mapping, answers);
    case "compose":
      return mapCompose(mapping, answers);
    case "part8":
      return mapPart8(mapping, answers);
    default:
      return { fields: {}, errors: [unsupportedMappingError(mapping)] };
  }
}

export function mapQuestionnaireAnswersToPdfFields(
  mappings: readonly PdfFieldMapping[],
  answers: AnswerLookup,
): PdfMappingResult {
  const fields: Record<string, string> = {};
  const errors: PdfMappingError[] = [];
  const targetOwners = new Map<string, string>();

  for (const mapping of mappings) {
    const candidate = mapping as { type?: unknown };
    const mappingType =
      typeof candidate.type === "string" ? candidate.type : "unknown";

    if (
      !["direct", "date", "choice", "compose", "part8"].includes(
        mappingType,
      ) ||
      !hasValidDefinition(mapping)
    ) {
      continue;
    }

    for (const targetField of targetFieldsForMapping(mapping)) {
      const existingOwner = targetOwners.get(targetField);

      if (existingOwner) {
        errors.push(
          mappingError(
            mapping,
            "duplicate_target_field",
            `PDF field "${targetField}" is targeted by both "${existingOwner}" and "${mapping.id}".`,
            questionKeysForMapping(mapping),
            [targetField],
          ),
        );
        continue;
      }

      targetOwners.set(targetField, mapping.id);
    }
  }

  for (const mapping of mappings) {
    const output = mapDefinition(mapping, answers);
    errors.push(...output.errors);
    Object.assign(fields, output.fields);
  }

  return errors.length > 0 ? { success: false, errors } : { success: true, fields };
}
