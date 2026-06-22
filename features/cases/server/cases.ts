import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  beneficiaries,
  cases,
  k2Children,
  petitioners,
} from "@/db/schema";
import { getCurrentUser } from "@/features/auth/server/session";
import type { CaseRecord, CaseStatus } from "@/features/cases/types";
import { calculateCaseProgress, getCaseProgressState } from "./progress";

function notFoundOrUnauthorized(): never {
  throw new Error("Unauthorized access to case data.");
}

export async function assertCaseOwnership(caseId: string) {
  const user = await getCurrentUser();
  if (!user) notFoundOrUnauthorized();

  const [record] = await db
    .select({ id: cases.id, userId: cases.userId })
    .from(cases)
    .where(and(eq(cases.id, caseId), eq(cases.userId, user.id)))
    .limit(1);

  if (!record) notFoundOrUnauthorized();
  return record;
}

export async function listUserCases() {
  const user = await getCurrentUser();
  if (!user) return [];

  const rows = await db
    .select()
    .from(cases)
    .where(eq(cases.userId, user.id))
    .orderBy(desc(cases.updatedAt));

  return rows.map((row) => ({
    ...row,
    status: row.status as CaseStatus,
  })) satisfies CaseRecord[];
}

export async function getCaseOverview(caseId: string) {
  await assertCaseOwnership(caseId);

  const [caseRecord] = await db
    .select()
    .from(cases)
    .where(eq(cases.id, caseId))
    .limit(1);

  if (!caseRecord) {
    notFoundOrUnauthorized();
  }

  const [petitioner] = await db
    .select()
    .from(petitioners)
    .where(eq(petitioners.caseId, caseId))
    .limit(1);

  const [beneficiary] = await db
    .select()
    .from(beneficiaries)
    .where(eq(beneficiaries.caseId, caseId))
    .limit(1);

  const children = await db
    .select()
    .from(k2Children)
    .where(eq(k2Children.caseId, caseId))
    .orderBy(asc(k2Children.createdAt));

  const progressState = getCaseProgressState({
    petitioner: petitioner
      ? {
          firstName: petitioner.firstName,
          lastName: petitioner.lastName,
          dateOfBirth: petitioner.dateOfBirth,
          countryOfBirth: petitioner.countryOfBirth,
          citizenship: petitioner.citizenship,
          email: petitioner.email,
          phone: petitioner.phone,
          street1: petitioner.street1,
          city: petitioner.city,
          postalCode: petitioner.postalCode,
          country: petitioner.country,
        }
      : null,
    beneficiary: beneficiary
      ? {
          firstName: beneficiary.firstName,
          lastName: beneficiary.lastName,
          dateOfBirth: beneficiary.dateOfBirth,
          countryOfBirth: beneficiary.countryOfBirth,
          citizenship: beneficiary.citizenship,
          email: beneficiary.email,
          phone: beneficiary.phone,
          street1: beneficiary.street1,
          city: beneficiary.city,
          postalCode: beneficiary.postalCode,
          country: beneficiary.country,
        }
      : null,
    childrenCount: children.length,
    childrenReviewed: caseRecord.childrenReviewed,
  });

  const progressPercent =
    caseRecord.progressPercent === calculateCaseProgress(progressState)
      ? caseRecord.progressPercent
      : calculateCaseProgress(progressState);

  return {
    case: { ...caseRecord, progressPercent },
    petitioner: petitioner ?? null,
    beneficiary: beneficiary ?? null,
    children,
  };
}

export async function createCase(userId: string, title: string) {
  const [caseRecord] = await db
    .insert(cases)
    .values({
      userId,
      title,
      status: "draft",
      progressPercent: 0,
    })
    .returning();

  if (!caseRecord) notFoundOrUnauthorized();
  return caseRecord;
}

export async function updateCaseProgress(caseId: string) {
  const overview = await getCaseOverview(caseId);
  const progressPercent = calculateCaseProgress(
    getCaseProgressState({
      petitioner: overview.petitioner
        ? {
            firstName: overview.petitioner.firstName,
            lastName: overview.petitioner.lastName,
            dateOfBirth: overview.petitioner.dateOfBirth,
            countryOfBirth: overview.petitioner.countryOfBirth,
            citizenship: overview.petitioner.citizenship,
            email: overview.petitioner.email,
            phone: overview.petitioner.phone,
            street1: overview.petitioner.street1,
            city: overview.petitioner.city,
            postalCode: overview.petitioner.postalCode,
            country: overview.petitioner.country,
          }
        : null,
      beneficiary: overview.beneficiary
        ? {
            firstName: overview.beneficiary.firstName,
            lastName: overview.beneficiary.lastName,
            dateOfBirth: overview.beneficiary.dateOfBirth,
            countryOfBirth: overview.beneficiary.countryOfBirth,
            citizenship: overview.beneficiary.citizenship,
            email: overview.beneficiary.email,
            phone: overview.beneficiary.phone,
            street1: overview.beneficiary.street1,
            city: overview.beneficiary.city,
            postalCode: overview.beneficiary.postalCode,
            country: overview.beneficiary.country,
          }
        : null,
      childrenCount: overview.children.length,
      childrenReviewed: overview.case.childrenReviewed,
    }),
  );

  const [updated] = await db
    .update(cases)
    .set({
      progressPercent,
      updatedAt: new Date(),
    })
    .where(eq(cases.id, caseId))
    .returning();

  return updated ?? overview.case;
}
