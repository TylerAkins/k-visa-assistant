import { describe, expect, it } from "vitest";

import type { PdfFieldMapping } from "@/lib/pdf/mappings";
import {
  formatPdfDate,
  mapQuestionnaireAnswersToPdfFields,
} from "@/lib/pdf/mappings";

describe("PDF field mappings", () => {
  it("maps direct, date, choice, composed, and Part 8 values", () => {
    const mappings = [
      {
        id: "name",
        type: "direct",
        questionKey: "name",
        required: true,
        targetField: "NameField",
      },
      {
        id: "date",
        type: "date",
        questionKey: "date",
        required: true,
        targetField: "DateField",
      },
      {
        id: "choice",
        type: "choice",
        questionKey: "choice",
        required: true,
        targetField: "ChoiceField",
        values: { true: "Y", false: "N" },
      },
      {
        id: "narrative",
        type: "compose",
        targetField: "NarrativeField",
        inputs: [
          { questionKey: "date", label: "Date", transform: "date" },
          { questionKey: "details", label: "Details", required: true },
        ],
      },
      {
        id: "overflow",
        type: "part8",
        questionKey: "overflow",
        targetFields: {
          page: "PageField",
          part: "PartField",
          item: "ItemField",
          value: "OverflowField",
        },
        reference: { page: "1", part: "2", item: "3" },
      },
    ] as const satisfies readonly PdfFieldMapping[];

    expect(
      mapQuestionnaireAnswersToPdfFields(mappings, {
        name: "Taylor Example",
        date: "2026-06-28",
        choice: true,
        details: "Met while traveling.",
        overflow: "Additional details",
      }),
    ).toEqual({
      success: true,
      fields: {
        NameField: "Taylor Example",
        DateField: "06/28/2026",
        ChoiceField: "Y",
        NarrativeField: "Date: 06/28/2026\nDetails: Met while traveling.",
        PageField: "1",
        PartField: "2",
        ItemField: "3",
        OverflowField: "Additional details",
      },
    });
  });

  it("omits optional null answers", () => {
    const mappings = [
      {
        id: "optional",
        type: "direct",
        questionKey: "optional",
        targetField: "OptionalField",
      },
    ] as const satisfies readonly PdfFieldMapping[];

    expect(mapQuestionnaireAnswersToPdfFields(mappings, { optional: null })).toEqual(
      { success: true, fields: {} },
    );
  });

  it("collects every missing required input without returning partial fields", () => {
    const mappings = [
      {
        id: "first",
        type: "direct",
        questionKey: "first_secret_answer",
        required: true,
        targetField: "FirstField",
      },
      {
        id: "second",
        type: "date",
        questionKey: "second_secret_answer",
        required: true,
        targetField: "SecondField",
      },
    ] as const satisfies readonly PdfFieldMapping[];

    const result = mapQuestionnaireAnswersToPdfFields(mappings, {
      unrelated: "must-not-appear",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.errors.map((error) => error.code)).toEqual([
      "missing_required_input",
      "missing_required_input",
    ]);
    expect(result.errors.map((error) => error.questionKeys)).toEqual([
      ["first_secret_answer"],
      ["second_secret_answer"],
    ]);
    expect(JSON.stringify(result.errors)).not.toContain("must-not-appear");
    expect(result).not.toHaveProperty("fields");
  });

  it("reports invalid dates and unknown choices without exposing values", () => {
    const mappings = [
      {
        id: "date",
        type: "date",
        questionKey: "date",
        targetField: "DateField",
      },
      {
        id: "choice",
        type: "choice",
        questionKey: "choice",
        targetField: "ChoiceField",
        values: { expected: "A" },
      },
    ] as const satisfies readonly PdfFieldMapping[];
    const result = mapQuestionnaireAnswersToPdfFields(mappings, {
      date: "2026-02-30",
      choice: "sensitive-unknown-choice",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.errors.map((error) => error.code)).toEqual([
      "invalid_input",
      "invalid_input",
    ]);
    expect(JSON.stringify(result.errors)).not.toContain("2026-02-30");
    expect(JSON.stringify(result.errors)).not.toContain(
      "sensitive-unknown-choice",
    );
  });

  it("reports duplicate targets even when their answers are absent", () => {
    const mappings = [
      {
        id: "first",
        type: "direct",
        questionKey: "first",
        targetField: "SharedField",
      },
      {
        id: "second",
        type: "direct",
        questionKey: "second",
        targetField: "SharedField",
      },
    ] as const satisfies readonly PdfFieldMapping[];

    const result = mapQuestionnaireAnswersToPdfFields(mappings, {});

    expect(result).toMatchObject({
      success: false,
      errors: [{ code: "duplicate_target_field", mappingId: "second" }],
    });
    expect(result).not.toHaveProperty("fields");
  });

  it("reports duplicate targets within one Part 8 mapping", () => {
    const mappings = [
      {
        id: "overflow",
        type: "part8",
        questionKey: "overflow",
        targetFields: {
          page: "SharedField",
          part: "SharedField",
          item: "ItemField",
          value: "ValueField",
        },
        reference: { page: "1", part: "2", item: "3" },
      },
    ] as const satisfies readonly PdfFieldMapping[];

    expect(mapQuestionnaireAnswersToPdfFields(mappings, {})).toMatchObject({
      success: false,
      errors: [
        {
          code: "duplicate_target_field",
          mappingId: "overflow",
          targetFields: ["SharedField"],
        },
      ],
    });
  });

  it("reports unsupported mapping types and malformed definitions", () => {
    const mappings = [
      { id: "unsupported", type: "mystery" },
      { id: "malformed", type: "direct", questionKey: "name" },
    ] as unknown as readonly PdfFieldMapping[];

    expect(mapQuestionnaireAnswersToPdfFields(mappings, { name: "secret" })).toEqual({
      success: false,
      errors: [
        {
          code: "unsupported_mapping_type",
          mappingId: "unsupported",
          mappingType: "mystery",
          questionKeys: [],
          targetFields: [],
          message:
            'Unsupported PDF mapping type "mystery" for mapping "unsupported".',
        },
        {
          code: "invalid_mapping_definition",
          mappingId: "malformed",
          mappingType: "direct",
          questionKeys: [],
          targetFields: [],
          message:
            'PDF mapping "malformed" has an invalid definition for type "direct".',
        },
      ],
    });
  });

  it("validates calendar dates", () => {
    expect(formatPdfDate("2024-02-29")).toBe("02/29/2024");
    expect(formatPdfDate("2023-02-29")).toBeNull();
    expect(formatPdfDate("06/28/2026")).toBeNull();
  });
});
