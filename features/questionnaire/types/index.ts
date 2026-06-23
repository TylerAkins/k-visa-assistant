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

export type QuestionnaireQuestion = {
  id: string;
  key: string;
  label: string;
  helpText: string | null;
  questionType: string;
  required: boolean;
  sortOrder: number;
  config: QuestionnaireAnswerValue | null;
};

export type QuestionnaireSection = {
  id: string;
  key: string;
  title: string;
  description: string | null;
  sortOrder: number;
  questions: QuestionnaireQuestion[];
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
};
