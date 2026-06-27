import { notFound } from "next/navigation";

import { CaseAccessError } from "@/features/cases/server/cases";
import { QuestionnaireReviewScreen } from "@/features/questionnaire/components/review";
import { buildQuestionnaireReview } from "@/features/questionnaire/review";
import { getQuestionnaireForCase } from "@/features/questionnaire/server/questionnaire";

export default async function QuestionnaireReviewPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  let questionnaire;

  try {
    questionnaire = await getQuestionnaireForCase(caseId);
  } catch (error) {
    if (error instanceof CaseAccessError) {
      notFound();
    }

    throw error;
  }

  return (
    <QuestionnaireReviewScreen
      caseId={caseId}
      review={buildQuestionnaireReview(questionnaire)}
    />
  );
}
