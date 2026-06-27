export type CaseStatus = "draft" | "active" | "completed" | "archived";

export type CaseRecord = {
  id: string;
  userId: string;
  title: string;
  status: CaseStatus;
  progressPercent: number;
  childrenReviewed: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type PersonSummary = {
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: Date | null;
  countryOfBirth: string | null;
  citizenship: string | null;
  email: string | null;
  phone: string | null;
  street1: string | null;
  street2: string | null;
  city: string | null;
  state?: string | null;
  province?: string | null;
  postalCode: string | null;
  country: string | null;
};

export type ChildSummary = {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: Date | null;
  countryOfBirth: string | null;
  citizenship: string | null;
  relationshipType: string;
  residesWithBeneficiary: boolean | null;
  street1: string | null;
  street2: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
  sortOrder: number;
};

export type CaseOverviewData = {
  case: CaseRecord;
  petitioner: PersonSummary | null;
  beneficiary: PersonSummary | null;
  children: ChildSummary[];
};

export type ChildFieldErrors = Record<string, string[]>;

export type SaveChildrenResult =
  | { success: true; progressPercent: number }
  | { success: false; error?: string; fieldErrors: ChildFieldErrors };

export type ProgressState = {
  hasPetitioner: boolean;
  petitionerComplete: boolean;
  petitionerCompletionRatio: number;
  hasBeneficiary: boolean;
  beneficiaryComplete: boolean;
  beneficiaryCompletionRatio: number;
  hasChildren: boolean;
  childrenReviewed: boolean;
  readyForQuestionnaire: boolean;
  questionnaireCompletionRatio: number;
};
