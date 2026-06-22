import { z } from "zod";

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

export const childSchema = z.object({
  firstName: draftName,
  middleName: optionalText,
  lastName: draftName,
  dateOfBirth: dateString,
  citizenship: optionalText,
  relationshipType: z.string().trim().max(40),
});

export type CaseTitleInput = z.infer<typeof caseTitleSchema>;
export type PetitionerInput = z.infer<typeof petitionerSchema>;
export type BeneficiaryInput = z.infer<typeof beneficiarySchema>;
export type ChildInput = z.infer<typeof childSchema>;
