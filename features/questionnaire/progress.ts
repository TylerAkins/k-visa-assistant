import { isQuestionVisible } from "@/features/questionnaire/conditions";
import type {
  QuestionnaireAnswer,
  QuestionnaireAnswerValue,
  QuestionnaireProgress,
  QuestionnaireSection,
} from "@/features/questionnaire/types";
import { parseQuestionnaireAnswer } from "@/features/questionnaire/validation/answers";

export function calculateQuestionnaireProgress(
  sections: readonly QuestionnaireSection[],
  answers: readonly QuestionnaireAnswer[],
): QuestionnaireProgress {
  const answersByQuestionKey = new Map<string, QuestionnaireAnswerValue>(
    answers.map((answer) => [answer.questionKey, answer.value]),
  );
  const sectionProgress = sections.map((section) => ({
    sectionKey: section.key,
    complete: isQuestionnaireSectionComplete(section, answersByQuestionKey),
  }));
  const completedSections = sectionProgress.filter(
    (section) => section.complete,
  ).length;

  return {
    completedSections,
    totalSections: sectionProgress.length,
    percent:
      sectionProgress.length === 0
        ? 0
        : Math.round((completedSections / sectionProgress.length) * 100),
    sections: sectionProgress,
  };
}

export function isQuestionnaireSectionComplete(
  section: QuestionnaireSection,
  answersByQuestionKey: ReadonlyMap<string, QuestionnaireAnswerValue>,
): boolean {
  if (section.questions.length === 0) {
    return false;
  }

  for (const question of section.questions) {
    if (!isQuestionVisible(question, answersByQuestionKey)) {
      continue;
    }

    if (!answersByQuestionKey.has(question.key)) {
      return false;
    }

    const parsed = parseQuestionnaireAnswer(
      question,
      answersByQuestionKey.get(question.key),
    );
    if (!parsed.success) {
      return false;
    }
  }

  return true;
}
