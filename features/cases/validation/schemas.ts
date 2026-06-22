import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .max(120)
  .optional()
  .or(z.literal(""))
  .transform((value) => (value ? value : undefined));

const personName = z.string().trim().min(1).max(80);
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
  firstName: personName,
  middleName: optionalText,
  lastName: personName,
  dateOfBirth: dateString,
  countryOfBirth: optionalText,
  citizenship: optionalText,
  email,
  phone,
  street1: z.string().trim().min(1).max(120),
  street2: optionalText,
  city: z.string().trim().min(1).max(80),
  state: optionalText,
  postalCode: z.string().trim().min(1).max(20),
  country: z.string().trim().min(1).max(80),
});

export const beneficiarySchema = z.object({
  firstName: personName,
  middleName: optionalText,
  lastName: personName,
  dateOfBirth: dateString,
  countryOfBirth: optionalText,
  citizenship: optionalText,
  email,
  phone,
  street1: z.string().trim().min(1).max(120),
  street2: optionalText,
  city: z.string().trim().min(1).max(80),
  province: optionalText,
  postalCode: z.string().trim().min(1).max(20),
  country: z.string().trim().min(1).max(80),
});

export const childSchema = z.object({
  firstName: personName,
  middleName: optionalText,
  lastName: personName,
  dateOfBirth: dateString,
  citizenship: optionalText,
  relationshipType: z.string().trim().min(1).max(40),
});

export type CaseTitleInput = z.infer<typeof caseTitleSchema>;
export type PetitionerInput = z.infer<typeof petitionerSchema>;
export type BeneficiaryInput = z.infer<typeof beneficiarySchema>;
export type ChildInput = z.infer<typeof childSchema>;
