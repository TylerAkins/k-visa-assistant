import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { QuestionnaireReview } from "@/features/questionnaire/types";
import { cn } from "@/lib/utils";

export function QuestionnaireReviewScreen({
  caseId,
  review,
}: {
  caseId: string;
  review: QuestionnaireReview;
}) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="space-y-3">
        <Link
          href={`/cases/${caseId}`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Back to case
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Review questionnaire answers</h1>
          <p className="text-sm text-muted-foreground">
            Check each section and correct any missing or invalid answers before
            generating forms.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {review.sections.map((section) => {
          const headingId = `review-section-${section.key}`;

          return (
            <section key={section.key} aria-labelledby={headingId}>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle id={headingId}>{section.title}</CardTitle>
                    <Badge variant={section.complete ? "default" : "destructive"}>
                      {section.complete ? "Complete" : "Needs attention"}
                    </Badge>
                  </div>
                  {section.description ? (
                    <p className="text-sm text-muted-foreground">
                      {section.description}
                    </p>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-4">
                  {section.questions.length > 0 ? (
                    <dl className="grid gap-3">
                      {section.questions.map((question) => {
                        const needsAttention =
                          question.status === "missing" ||
                          question.status === "invalid";

                        return (
                          <div
                            key={question.key}
                            className={cn(
                              "rounded-lg border p-3",
                              needsAttention && "border-destructive/60 bg-destructive/10",
                            )}
                          >
                            <dt className="text-sm font-medium">{question.label}</dt>
                            <dd
                              className={cn(
                                "mt-1 whitespace-pre-wrap text-sm",
                                question.status === "not_provided" &&
                                  "text-muted-foreground",
                                needsAttention && "text-destructive",
                              )}
                            >
                              {question.displayValue}
                              {question.error ? (
                                <span className="mt-1 block font-medium" role="alert">
                                  {question.error}
                                </span>
                              ) : null}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No active questions in this section.
                    </p>
                  )}

                  <Link
                    href={`/cases/${caseId}#questionnaire-section-${section.key}`}
                    className={buttonVariants({ variant: "secondary" })}
                  >
                    Edit {section.title} section
                  </Link>
                </CardContent>
              </Card>
            </section>
          );
        })}
      </div>
    </main>
  );
}
