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
