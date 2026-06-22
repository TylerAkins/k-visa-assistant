export type CaseStatus = "draft" | "active" | "completed" | "archived";

export type CaseRecord = {
  id: string;
  userId: string;
  title: string;
  status: CaseStatus;
  progressPercent: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PersonSummary = {
  firstName: string;
  middleName: string | null;
  lastName: string;
  email: string | null;
  phone: string | null;
};

export type ChildSummary = {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: Date | null;
  citizenship: string | null;
  relationshipType: string;
};

export type CaseOverviewData = {
  case: CaseRecord;
  petitioner: PersonSummary | null;
  beneficiary: PersonSummary | null;
  children: ChildSummary[];
};

export type ProgressState = {
  hasPetitioner: boolean;
  petitionerComplete: boolean;
  hasBeneficiary: boolean;
  beneficiaryComplete: boolean;
  hasChildren: boolean;
  childrenReviewed: boolean;
  readyForQuestionnaire: boolean;
};
