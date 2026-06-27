import { z } from "zod";

import type { ChildSummary } from "@/features/cases/types";

const optionalText = z
  .string()
  .trim()
  .max(120)
  .optional()
  .or(z.literal(""))
  .transform((value) => (value ? value : undefined));

const draftName = z.string().trim().max(80);
const draftAddressLine = z.string().trim().max(120);
const draftShortText = z.string().trim().max(80);
const draftPostalCode = z.string().trim().max(20);
const blankToUndefined = (value: unknown) => (value === "" ? undefined : value);
const dateString = z.preprocess(
  blankToUndefined,
  z.string().trim().date().optional(),
);
const email = z.preprocess(
  blankToUndefined,
  z.string().trim().email().optional(),
);
const phone = optionalText;

export const caseTitleSchema = z.object({
  title: z.string().trim().min(2).max(120),
});

export const petitionerSchema = z.object({
  firstName: draftName,
  middleName: optionalText,
  lastName: draftName,
  dateOfBirth: dateString,
  countryOfBirth: optionalText,
  citizenship: optionalText,
  email,
  phone,
  street1: draftAddressLine,
  street2: optionalText,
  city: draftShortText,
  state: optionalText,
  postalCode: draftPostalCode,
  country: draftShortText,
});

export const beneficiarySchema = z.object({
  firstName: draftName,
  middleName: optionalText,
  lastName: draftName,
  dateOfBirth: dateString,
  countryOfBirth: optionalText,
  citizenship: optionalText,
  email,
  phone,
  street1: draftAddressLine,
  street2: optionalText,
  city: draftShortText,
  province: optionalText,
  postalCode: draftPostalCode,
  country: draftShortText,
});

const requiredName = z.string().trim().min(1).max(80);
const requiredShortText = z.string().trim().min(1).max(80);
const requiredAddressLine = z.string().trim().min(1).max(120);

export const childSchema = z
  .object({
    id: z.string().uuid().optional(),
    firstName: requiredName,
    middleName: optionalText,
    lastName: requiredName,
    dateOfBirth: z.string().trim().date(),
    countryOfBirth: requiredShortText,
    citizenship: optionalText,
    relationshipType: z.enum(["Child", "Stepchild", "Adopted child"]),
    residesWithBeneficiary: z
      .enum(["yes", "no"])
      .transform((value) => value === "yes"),
    street1: optionalText,
    street2: optionalText,
    city: optionalText,
    province: optionalText,
    postalCode: z.string().trim().max(20).optional().or(z.literal("")),
    country: optionalText,
  })
  .superRefine((child, context) => {
    if (child.residesWithBeneficiary) {
      return;
    }

    const requiredAddressFields = [
      ["street1", child.street1, requiredAddressLine],
      ["city", child.city, requiredShortText],
      ["postalCode", child.postalCode, z.string().trim().min(1).max(20)],
      ["country", child.country, requiredShortText],
    ] as const;

    for (const [field, value, schema] of requiredAddressFields) {
      if (!schema.safeParse(value).success) {
        context.addIssue({
          code: "custom",
          path: [field],
          message: "Required when the child lives at a different address.",
        });
      }
    }
  });

export const childrenSubmissionSchema = z.discriminatedUnion("hasChildren", [
  z.object({
    hasChildren: z.literal("no"),
    children: z.array(z.never()).length(0),
  }),
  z.object({
    hasChildren: z.literal("yes"),
    children: z.array(childSchema).min(1).max(10),
  }),
]);

export function isPersistedChildComplete(child: ChildSummary): boolean {
  return childSchema.safeParse({
    ...child,
    dateOfBirth: child.dateOfBirth?.toISOString().slice(0, 10) ?? "",
    middleName: child.middleName ?? "",
    citizenship: child.citizenship ?? "",
    street1: child.street1 ?? "",
    street2: child.street2 ?? "",
    city: child.city ?? "",
    province: child.province ?? "",
    postalCode: child.postalCode ?? "",
    country: child.country ?? "",
    residesWithBeneficiary:
      child.residesWithBeneficiary === null
        ? ""
        : child.residesWithBeneficiary
          ? "yes"
          : "no",
  }).success;
}

export type CaseTitleInput = z.infer<typeof caseTitleSchema>;
export type PetitionerInput = z.infer<typeof petitionerSchema>;
export type BeneficiaryInput = z.infer<typeof beneficiarySchema>;
export type ChildInput = z.infer<typeof childSchema>;
