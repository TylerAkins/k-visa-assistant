import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { beneficiaries, cases, k2Children, petitioners } from "@/db/schema";
import {
  beneficiarySchema,
  caseTitleSchema,
  childSchema,
  petitionerSchema,
} from "@/features/cases/validation/schemas";
import { updateCaseProgress } from "./cases";

export async function updateCaseTitle(caseId: string, input: FormData) {
  const parsed = caseTitleSchema.safeParse({
    title: input.get("title"),
  });

  if (!parsed.success) {
    return { success: false, error: "Please enter a valid case name." };
  }

  await db
    .update(cases)
    .set({ title: parsed.data.title, updatedAt: new Date() })
    .where(eq(cases.id, caseId));

  return { success: true };
}

export async function markChildrenReviewed(caseId: string) {
  await db
    .update(cases)
    .set({ childrenReviewed: true, updatedAt: new Date() })
    .where(eq(cases.id, caseId));

  await updateCaseProgress(caseId);
  return { success: true };
}

async function upsertSinglePerson(
  table: typeof petitioners | typeof beneficiaries,
  caseId: string,
  input: FormData,
) {
  const schema = table === petitioners ? petitionerSchema : beneficiarySchema;
  const parsed = schema.safeParse(Object.fromEntries(input.entries()));

  if (!parsed.success) {
    return { success: false, error: "Please fix the highlighted fields." };
  }

  const values = {
    caseId,
    ...parsed.data,
    dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null,
    updatedAt: new Date(),
  };

  const existing = await db
    .select({ id: table.id })
    .from(table)
    .where(eq(table.caseId, caseId))
    .limit(1);

  if (existing[0]) {
    await db.update(table).set(values).where(eq(table.caseId, caseId));
  } else {
    await db.insert(table).values(values);
  }

  await updateCaseProgress(caseId);
  return { success: true };
}

export async function savePetitioner(caseId: string, formData: FormData) {
  return upsertSinglePerson(petitioners, caseId, formData);
}

export async function saveBeneficiary(caseId: string, formData: FormData) {
  return upsertSinglePerson(beneficiaries, caseId, formData);
}

export async function addChild(caseId: string, formData: FormData) {
  const parsed = childSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return { success: false, error: "Please fix the highlighted fields." };
  }

  await db.insert(k2Children).values({
    caseId,
    ...parsed.data,
    dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null,
    updatedAt: new Date(),
  });

  await db
    .update(cases)
    .set({ childrenReviewed: true, updatedAt: new Date() })
    .where(eq(cases.id, caseId));

  await updateCaseProgress(caseId);
  return { success: true };
}
