import type { ProgressState } from "@/features/cases/types";

export function calculateCaseProgress(state: ProgressState): number {
  let progress = 10;

  if (state.petitionerComplete) {
    progress += 30;
  }

  if (state.beneficiaryComplete) {
    progress += 30;
  }

  if (state.childrenReviewed) {
    progress += 10;
  }

  if (state.readyForQuestionnaire) {
    progress += 20;
  }

  return Math.min(100, progress);
}

export function getCaseProgressState({
  petitioner,
  beneficiary,
  childrenCount,
  childrenReviewed,
}: {
  petitioner: { firstName: string; lastName: string; street1: string | null; city: string | null; postalCode: string | null; country: string | null } | null;
  beneficiary: { firstName: string; lastName: string; street1: string | null; city: string | null; postalCode: string | null; country: string | null } | null;
  childrenCount: number;
  childrenReviewed: boolean;
}): ProgressState {
  const petitionerComplete = Boolean(
    petitioner &&
      petitioner.firstName &&
      petitioner.lastName &&
      petitioner.street1 &&
      petitioner.city &&
      petitioner.postalCode &&
      petitioner.country,
  );

  const beneficiaryComplete = Boolean(
    beneficiary &&
      beneficiary.firstName &&
      beneficiary.lastName &&
      beneficiary.street1 &&
      beneficiary.city &&
      beneficiary.postalCode &&
      beneficiary.country,
  );

  return {
    hasPetitioner: Boolean(petitioner),
    petitionerComplete,
    hasBeneficiary: Boolean(beneficiary),
    beneficiaryComplete,
    hasChildren: childrenCount > 0,
    childrenReviewed,
    readyForQuestionnaire: petitionerComplete && beneficiaryComplete,
  };
}
