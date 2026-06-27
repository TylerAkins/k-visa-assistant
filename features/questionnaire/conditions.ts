import type {
  QuestionnaireAnswerValue,
  QuestionnaireQuestion,
} from "@/features/questionnaire/types";

export function isQuestionVisible(
  question: QuestionnaireQuestion,
  answersByQuestionKey: ReadonlyMap<string, QuestionnaireAnswerValue>,
) {
  const condition = question.config?.visibleWhen;

  if (!condition) {
    return true;
  }

  const answer = answersByQuestionKey.has(condition.questionKey)
    ? answersByQuestionKey.get(condition.questionKey)
    : null;

  return answer === condition.equals;
}

export function pruneResolvedHiddenAnswers(
  questions: readonly QuestionnaireQuestion[],
  answersByQuestionKey: ReadonlyMap<string, QuestionnaireAnswerValue>,
) {
  const nextAnswers = new Map(answersByQuestionKey);
  const visibleAnswers = new Map(answersByQuestionKey);
  const resolvedHiddenQuestionKeys = new Set<string>();

  for (const question of questions) {
    if (isQuestionVisible(question, visibleAnswers)) {
      continue;
    }

    const dependencyKey = question.config?.visibleWhen?.questionKey;
    const dependencyIsResolved =
      dependencyKey !== undefined &&
      (visibleAnswers.has(dependencyKey) ||
        resolvedHiddenQuestionKeys.has(dependencyKey));

    visibleAnswers.delete(question.key);

    if (dependencyIsResolved) {
      nextAnswers.delete(question.key);
      resolvedHiddenQuestionKeys.add(question.key);
    }
  }

  return nextAnswers;
}
