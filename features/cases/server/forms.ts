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

  const caseRecord = await updateCaseProgress(caseId);
  return { success: true, progressPercent: caseRecord.progressPercent };
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

  const caseRecord = await updateCaseProgress(caseId);
  return { success: true, progressPercent: caseRecord.progressPercent };
}

export async function savePetitioner(caseId: string, formData: FormData) {
  return upsertSinglePerson(petitioners, caseId, formData);
}

export async function saveBeneficiary(caseId: string, formData: FormData) {
  return upsertSinglePerson(beneficiaries, caseId, formData);
}

export async function saveChildren(caseId: string, formData: FormData) {
  const hasChildren = formData.get("hasChildren") === "yes";

  if (!hasChildren) {
    await db.delete(k2Children).where(eq(k2Children.caseId, caseId));
    await db
      .update(cases)
      .set({ childrenReviewed: true, updatedAt: new Date() })
      .where(eq(cases.id, caseId));

    const caseRecord = await updateCaseProgress(caseId);
    return { success: true, progressPercent: caseRecord.progressPercent };
  }

  const childCount = Number(formData.get("childCount") ?? 0);

  if (!Number.isInteger(childCount) || childCount < 1 || childCount > 10) {
    return { success: false, error: "Select how many K-2 children to add." };
  }

  const parsedChildren = Array.from({ length: childCount }, (_, index) =>
    childSchema.safeParse({
      firstName: formData.get(`children.${index}.firstName`),
      middleName: formData.get(`children.${index}.middleName`),
      lastName: formData.get(`children.${index}.lastName`),
      dateOfBirth: formData.get(`children.${index}.dateOfBirth`),
      citizenship: formData.get(`children.${index}.citizenship`),
      relationshipType: formData.get(`children.${index}.relationshipType`),
    }),
  );

  if (parsedChildren.some((parsed) => !parsed.success)) {
    return { success: false, error: "Please complete each K-2 child record." };
  }

  await db.transaction(async (tx) => {
    await tx.delete(k2Children).where(eq(k2Children.caseId, caseId));
    await tx.insert(k2Children).values(
      parsedChildren.map((parsed) => {
        if (!parsed.success) {
          throw new Error("Invalid child record.");
        }

        return {
          caseId,
          ...parsed.data,
          dateOfBirth: parsed.data.dateOfBirth
            ? new Date(parsed.data.dateOfBirth)
            : null,
          updatedAt: new Date(),
        };
      }),
    );
  });

  await db
    .update(cases)
    .set({ childrenReviewed: true, updatedAt: new Date() })
    .where(eq(cases.id, caseId));

  const caseRecord = await updateCaseProgress(caseId);
  return { success: true, progressPercent: caseRecord.progressPercent };
}
