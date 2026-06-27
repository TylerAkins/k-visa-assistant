import type { QuestionnaireSectionId } from "@/features/questionnaire/sections";
import type { ChildSummary } from "@/features/cases/types";

export const questionnaireQuestionTypes = [
  "text",
  "textarea",
  "date",
  "boolean",
  "select",
] as const;

export type QuestionnaireQuestionType =
  (typeof questionnaireQuestionTypes)[number];

export type QuestionnaireAnswerValue =
  | string
  | number
  | boolean
  | null
  | QuestionnaireAnswerValue[]
  | { [key: string]: QuestionnaireAnswerValue };

export type QuestionnaireReviewStatus =
  | "not_started"
  | "in_review"
  | "approved"
  | "needs_changes";

export type QuestionnaireSelectOption = {
  label: string;
  value: string;
};

export type QuestionnaireConditionValue = string | number | boolean | null;

export type QuestionnaireVisibilityCondition = {
  questionKey: string;
  equals: QuestionnaireConditionValue;
};

export type QuestionnaireQuestionConfig =
  | null
  | {
      options?: QuestionnaireSelectOption[];
      visibleWhen?: QuestionnaireVisibilityCondition;
    };

export type QuestionnaireQuestion = {
  id: string;
  key: string;
  label: string;
  helpText: string | null;
  questionType: QuestionnaireQuestionType;
  required: boolean;
  sortOrder: number;
  config: QuestionnaireQuestionConfig;
};

export type QuestionnaireSection = {
  id: string;
  key: QuestionnaireSectionId;
  title: string;
  description: string | null;
  sortOrder: number;
  questions: QuestionnaireQuestion[];
};

export type QuestionnaireSectionProgress = {
  sectionKey: QuestionnaireSectionId;
  complete: boolean;
};

export type QuestionnaireProgress = {
  completedSections: number;
  totalSections: number;
  percent: number;
  sections: QuestionnaireSectionProgress[];
};

export type QuestionnaireAnswer = {
  caseId: string;
  questionId: string;
  questionKey: string;
  value: QuestionnaireAnswerValue;
  updatedAt: Date;
};

export type QuestionnaireCaseState = {
  caseId: string;
  completedAt: Date | null;
  reviewedAt: Date | null;
  reviewStatus: QuestionnaireReviewStatus;
  updatedAt: Date;
};

export type QuestionnaireForCase = {
  sections: QuestionnaireSection[];
  answers: QuestionnaireAnswer[];
  state: QuestionnaireCaseState | null;
  progress: QuestionnaireProgress;
  children: ChildSummary[];
  childrenReviewed: boolean;
};

export type QuestionnaireReviewAnswerStatus =
  | "answered"
  | "not_provided"
  | "missing"
  | "invalid";

export type QuestionnaireReviewQuestion = {
  key: string;
  label: string;
  displayValue: string;
  status: QuestionnaireReviewAnswerStatus;
  error: string | null;
};

export type QuestionnaireReviewSection = {
  key: QuestionnaireSectionId;
  title: string;
  description: string | null;
  complete: boolean;
  questions: QuestionnaireReviewQuestion[];
};

export type QuestionnaireReview = {
  sections: QuestionnaireReviewSection[];
};

export type QuestionnaireFieldErrors = Record<string, string[]>;

export type QuestionnaireSectionSaveResult =
  | {
      success: true;
      progressPercent: number;
      questionnaireProgress: QuestionnaireProgress;
    }
  | { success: false; fieldErrors: QuestionnaireFieldErrors };
