import type { ProgressState } from "@/features/cases/types";

const PERSON_SECTION_WEIGHT = 30;
const CHILDREN_SECTION_WEIGHT = 10;
const QUESTIONNAIRE_READY_WEIGHT = 30;

type PersonProgressFields = {
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: Date | string | null;
  countryOfBirth: string | null;
  citizenship: string | null;
  email: string | null;
  phone: string | null;
  street1: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
} | null;

export function calculateCaseProgress(state: ProgressState): number {
  let progress = 0;

  progress += Math.round(
    state.petitionerCompletionRatio * PERSON_SECTION_WEIGHT,
  );
  progress += Math.round(
    state.beneficiaryCompletionRatio * PERSON_SECTION_WEIGHT,
  );

  if (state.childrenReviewed) {
    progress += CHILDREN_SECTION_WEIGHT;
  }

  if (state.readyForQuestionnaire) {
    progress += QUESTIONNAIRE_READY_WEIGHT;
  }

  return Math.min(100, progress);
}

function hasValue(value: Date | string | null | undefined) {
  return value instanceof Date || Boolean(String(value ?? "").trim());
}

function getPersonCompletionRatio(person: PersonProgressFields) {
  if (!person) {
    return 0;
  }

  const fields = [
    person.firstName,
    person.lastName,
    person.dateOfBirth,
    person.countryOfBirth,
    person.citizenship,
    person.email,
    person.phone,
    person.street1,
    person.city,
    person.postalCode,
    person.country,
  ];
  const completedFields = fields.filter(hasValue).length;

  return completedFields / fields.length;
}

export function getCaseProgressState({
  petitioner,
  beneficiary,
  childrenCount,
  childrenReviewed,
}: {
  petitioner: PersonProgressFields;
  beneficiary: PersonProgressFields;
  childrenCount: number;
  childrenReviewed: boolean;
}): ProgressState {
  const petitionerCompletionRatio = getPersonCompletionRatio(petitioner);
  const beneficiaryCompletionRatio = getPersonCompletionRatio(beneficiary);
  const petitionerComplete = petitionerCompletionRatio === 1;
  const beneficiaryComplete = beneficiaryCompletionRatio === 1;

  return {
    hasPetitioner: Boolean(petitioner),
    petitionerComplete,
    petitionerCompletionRatio,
    hasBeneficiary: Boolean(beneficiary),
    beneficiaryComplete,
    beneficiaryCompletionRatio,
    hasChildren: childrenCount > 0,
    childrenReviewed,
    readyForQuestionnaire: petitionerComplete && beneficiaryComplete,
  };
}
