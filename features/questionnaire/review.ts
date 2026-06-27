import { isQuestionVisible } from "@/features/questionnaire/conditions";
import { isPersistedChildComplete } from "@/features/cases/validation/schemas";
import { isQuestionnaireSectionComplete } from "@/features/questionnaire/progress";
import type {
  QuestionnaireAnswerValue,
  QuestionnaireForCase,
  QuestionnaireQuestion,
  QuestionnaireReview,
  QuestionnaireReviewQuestion,
} from "@/features/questionnaire/types";
import { parseQuestionnaireAnswer } from "@/features/questionnaire/validation/answers";

const notProvidedLabel = "Not provided";

export function buildQuestionnaireReview(
  questionnaire: QuestionnaireForCase,
): QuestionnaireReview {
  const answersByQuestionKey = new Map<string, QuestionnaireAnswerValue>(
    questionnaire.answers.map((answer) => [answer.questionKey, answer.value]),
  );

  return {
    sections: questionnaire.sections.map((section) => {
      if (section.key === "children") {
        const complete =
          questionnaire.progress.sections.find(
            (item) => item.sectionKey === "children",
          )?.complete ?? false;
        const questions: QuestionnaireReviewQuestion[] =
          questionnaire.children.length === 0
            ? [
                {
                  key: "children",
                  label: "K-2 children",
                  displayValue: questionnaire.childrenReviewed
                    ? "No K-2 children"
                    : notProvidedLabel,
                  status: questionnaire.childrenReviewed ? "answered" : "missing",
                  error: questionnaire.childrenReviewed
                    ? null
                    : "Review whether the beneficiary has K-2 children.",
                },
              ]
            : questionnaire.children.map((child, index) => {
                const childComplete = isPersistedChildComplete(child);

                return {
                  key: `child-${child.id}`,
                  label: `Child ${index + 1}: ${[child.firstName, child.middleName, child.lastName].filter(Boolean).join(" ")}`,
                  displayValue: formatChildSummary(child),
                  status: childComplete ? "answered" : "invalid",
                  error: childComplete
                    ? null
                    : "Complete all required identity and residence details.",
                };
              });

        return {
          key: section.key,
          title: section.title,
          description: section.description,
          complete,
          questions,
        };
      }

      const visibleAnswers = new Map(answersByQuestionKey);
      const questions: QuestionnaireReviewQuestion[] = [];

      for (const question of section.questions) {
        if (!isQuestionVisible(question, visibleAnswers)) {
          visibleAnswers.delete(question.key);
          continue;
        }

        questions.push(buildReviewQuestion(question, visibleAnswers));
      }

      return {
        key: section.key,
        title: section.title,
        description: section.description,
        complete: isQuestionnaireSectionComplete(
          section,
          answersByQuestionKey,
        ),
        questions,
      };
    }),
  };
}

function formatChildSummary(
  child: QuestionnaireForCase["children"][number],
): string {
  const details = [
    child.dateOfBirth
      ? `Date of birth: ${child.dateOfBirth.toISOString().slice(0, 10)}`
      : "Date of birth: Not provided",
    `Country of birth: ${child.countryOfBirth ?? notProvidedLabel}`,
    `Relationship: ${child.relationshipType || notProvidedLabel}`,
    child.residesWithBeneficiary === null
      ? "Lives with beneficiary: Not provided"
      : `Lives with beneficiary: ${child.residesWithBeneficiary ? "Yes" : "No"}`,
  ];

  if (child.residesWithBeneficiary === false) {
    details.push(
      `Address: ${[
        child.street1,
        child.street2,
        child.city,
        child.province,
        child.postalCode,
        child.country,
      ]
        .filter(Boolean)
        .join(", ") || notProvidedLabel}`,
    );
  }

  return details.join("\n");
}

function buildReviewQuestion(
  question: QuestionnaireQuestion,
  answersByQuestionKey: ReadonlyMap<string, QuestionnaireAnswerValue>,
): QuestionnaireReviewQuestion {
  if (!answersByQuestionKey.has(question.key)) {
    const missingAnswer = parseQuestionnaireAnswer(question, null);

    return {
      key: question.key,
      label: question.label,
      displayValue: notProvidedLabel,
      status: question.required ? "missing" : "not_provided",
      error:
        question.required && !missingAnswer.success ? missingAnswer.error : null,
    };
  }

  const answer = answersByQuestionKey.get(question.key);
  const parsed = parseQuestionnaireAnswer(question, answer);

  if (!parsed.success) {
    return {
      key: question.key,
      label: question.label,
      displayValue: formatStoredAnswer(answer),
      status: "invalid",
      error: parsed.error,
    };
  }

  if (parsed.value === null) {
    return {
      key: question.key,
      label: question.label,
      displayValue: notProvidedLabel,
      status: "not_provided",
      error: null,
    };
  }

  return {
    key: question.key,
    label: question.label,
    displayValue: formatAnswer(question, parsed.value),
    status: "answered",
    error: null,
  };
}

function formatAnswer(
  question: QuestionnaireQuestion,
  value: QuestionnaireAnswerValue,
): string {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (question.questionType === "select" && typeof value === "string") {
    return (
      question.config?.options?.find((option) => option.value === value)?.label ??
      value
    );
  }

  return formatStoredAnswer(value);
}

function formatStoredAnswer(value: QuestionnaireAnswerValue | undefined): string {
  if (value === null || value === undefined || value === "") {
    return notProvidedLabel;
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return JSON.stringify(value);
}
