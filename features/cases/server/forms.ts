import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { beneficiaries, cases, k2Children, petitioners } from "@/db/schema";
import {
  beneficiarySchema,
  caseTitleSchema,
  childrenSubmissionSchema,
  petitionerSchema,
} from "@/features/cases/validation/schemas";
import {
  getQuestionnaireForCase,
  updateQuestionnaireCaseState,
} from "@/features/questionnaire/server/questionnaire";
import { updateCaseProgress } from "./cases";

async function updateAggregateCaseProgress(caseId: string) {
  const questionnaire = await getQuestionnaireForCase(caseId);
  const isComplete = questionnaire.progress.percent === 100;

  if (
    (isComplete && !questionnaire.state?.completedAt) ||
    (!isComplete && questionnaire.state?.completedAt)
  ) {
    await updateQuestionnaireCaseState(caseId, {
      completedAt: isComplete ? new Date() : null,
    });
  }

  return updateCaseProgress(caseId, questionnaire.progress.percent / 100);
}

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

  const caseRecord = await updateAggregateCaseProgress(caseId);
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

  const caseRecord = await updateAggregateCaseProgress(caseId);
  return { success: true, progressPercent: caseRecord.progressPercent };
}

export async function savePetitioner(caseId: string, formData: FormData) {
  return upsertSinglePerson(petitioners, caseId, formData);
}

export async function saveBeneficiary(caseId: string, formData: FormData) {
  return upsertSinglePerson(beneficiaries, caseId, formData);
}

export async function saveChildren(caseId: string, formData: FormData) {
  const hasChildren = formData.get("hasChildren");
  const childCount = Number(formData.get("childCount") ?? 0);

  if (hasChildren !== "yes" && hasChildren !== "no") {
    return {
      success: false,
      error: "Select whether the beneficiary has K-2 children.",
      fieldErrors: { hasChildren: ["Select yes or no."] },
    };
  }

  if (
    !Number.isInteger(childCount) ||
    childCount < 0 ||
    childCount > 10 ||
    (hasChildren === "yes" && childCount < 1) ||
    (hasChildren === "no" && childCount !== 0)
  ) {
    return {
      success: false,
      error: "Select how many K-2 children to add.",
      fieldErrors: { childCount: ["Select between one and ten children."] },
    };
  }

  const rawChildren = Array.from({ length: childCount }, (_, index) => ({
    id: formData.get(`children.${index}.id`) || undefined,
    firstName: formData.get(`children.${index}.firstName`) ?? "",
    middleName: formData.get(`children.${index}.middleName`) ?? "",
    lastName: formData.get(`children.${index}.lastName`) ?? "",
    dateOfBirth: formData.get(`children.${index}.dateOfBirth`) ?? "",
    countryOfBirth: formData.get(`children.${index}.countryOfBirth`) ?? "",
    citizenship: formData.get(`children.${index}.citizenship`) ?? "",
    relationshipType: formData.get(`children.${index}.relationshipType`) ?? "",
    residesWithBeneficiary:
      formData.get(`children.${index}.residesWithBeneficiary`) ?? "",
    street1: formData.get(`children.${index}.street1`) ?? "",
    street2: formData.get(`children.${index}.street2`) ?? "",
    city: formData.get(`children.${index}.city`) ?? "",
    province: formData.get(`children.${index}.province`) ?? "",
    postalCode: formData.get(`children.${index}.postalCode`) ?? "",
    country: formData.get(`children.${index}.country`) ?? "",
  }));
  const parsed = childrenSubmissionSchema.safeParse({
    hasChildren,
    children: rawChildren,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
    }

    return {
      success: false,
      error: "Please complete each K-2 child record.",
      fieldErrors,
    };
  }

  const submittedIds = parsed.data.children.flatMap((child) =>
    child.id ? [child.id] : [],
  );

  if (new Set(submittedIds).size !== submittedIds.length) {
    return {
      success: false,
      error: "One or more child records do not belong to this case.",
      fieldErrors: {},
    };
  }

  const now = new Date();
  const reconciliationError = await db.transaction(async (tx) => {
    const [lockedCase] = await tx
      .select({ id: cases.id })
      .from(cases)
      .where(eq(cases.id, caseId))
      .for("update");

    if (!lockedCase) {
      throw new Error("Unable to lock case for child reconciliation.");
    }

    const existingChildren = await tx
      .select({ id: k2Children.id })
      .from(k2Children)
      .where(eq(k2Children.caseId, caseId));
    const existingIds = new Set(existingChildren.map((child) => child.id));
    const unknownId = submittedIds.find((id) => !existingIds.has(id));

    if (unknownId) {
      return {
        success: false as const,
        error: "One or more child records do not belong to this case.",
        fieldErrors: {},
      };
    }

    for (const existing of existingChildren) {
      if (!submittedIds.includes(existing.id)) {
        await tx
          .delete(k2Children)
          .where(
            and(
              eq(k2Children.id, existing.id),
              eq(k2Children.caseId, caseId),
            ),
          );
      }
    }

    for (const [index, child] of parsed.data.children.entries()) {
      const { id, ...childValues } = child;
      const values = {
        caseId,
        ...childValues,
        dateOfBirth: new Date(child.dateOfBirth),
        street1: child.residesWithBeneficiary ? null : child.street1,
        street2: child.residesWithBeneficiary ? null : child.street2,
        city: child.residesWithBeneficiary ? null : child.city,
        province: child.residesWithBeneficiary ? null : child.province,
        postalCode: child.residesWithBeneficiary ? null : child.postalCode,
        country: child.residesWithBeneficiary ? null : child.country,
        sortOrder: index,
        updatedAt: now,
      };

      if (id) {
        await tx
          .update(k2Children)
          .set(values)
          .where(
            and(eq(k2Children.id, id), eq(k2Children.caseId, caseId)),
          );
      } else {
        await tx.insert(k2Children).values(values);
      }
    }

    await tx
      .update(cases)
      .set({ childrenReviewed: true, updatedAt: now })
      .where(eq(cases.id, caseId));

    return null;
  });

  if (reconciliationError) {
    return reconciliationError;
  }

  const caseRecord = await updateAggregateCaseProgress(caseId);
  return { success: true, progressPercent: caseRecord.progressPercent };
}
