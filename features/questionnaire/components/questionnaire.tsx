"use client";

import { useActionState } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/features/auth/components/form-message";
import type {
  QuestionnaireAnswer,
  QuestionnaireAnswerValue,
  QuestionnaireForCase,
  QuestionnaireQuestion,
  QuestionnaireSection,
} from "@/features/questionnaire/types";
import { cn } from "@/lib/utils";

type QuestionnaireActionState = {
  success: boolean;
  error?: string;
};

type SaveQuestionnaireSectionAction = (
  caseId: string,
  sectionKey: string,
  formData: FormData,
) => Promise<QuestionnaireActionState>;

export function QuestionnaireWorkflow({
  caseId,
  questionnaire,
  saveSectionAction,
}: {
  caseId: string;
  questionnaire: QuestionnaireForCase;
  saveSectionAction: SaveQuestionnaireSectionAction;
}) {
  return (
    <section className="space-y-4" aria-labelledby="questionnaire-heading">
      <div className="space-y-1">
        <h2 id="questionnaire-heading" className="text-xl font-semibold">
          Questionnaire
        </h2>
        <p className="text-sm text-muted-foreground">
          Complete the active I-129F sections for this case.
        </p>
      </div>
      <div className="grid gap-4">
        {questionnaire.sections.map((section) => (
          <QuestionnaireSectionForm
            key={section.key}
            caseId={caseId}
            section={section}
            answers={questionnaire.answers}
            action={saveSectionAction}
          />
        ))}
      </div>
    </section>
  );
}

function QuestionnaireSectionForm({
  caseId,
  section,
  answers,
  action,
}: {
  caseId: string;
  section: QuestionnaireSection;
  answers: QuestionnaireAnswer[];
  action: SaveQuestionnaireSectionAction;
}) {
  const [state, formAction, pending] = useActionState(
    async (_state: QuestionnaireActionState, formData: FormData) =>
      action(caseId, section.key, formData),
    { success: false },
  );
  const answersByQuestionKey = new Map(
    answers.map((answer) => [answer.questionKey, answer.value]),
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{section.title}</CardTitle>
        {section.description ? (
          <p className="text-sm text-muted-foreground">{section.description}</p>
        ) : null}
      </CardHeader>
      <CardContent>
        <FormMessage message={state.error} />
        <form action={formAction} className="space-y-4">
          {section.questions.length > 0 ? (
            section.questions.map((question) => (
              <QuestionField
                key={question.key}
                question={question}
                value={answersByQuestionKey.get(question.key)}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No active questions in this section yet.
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save section"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function QuestionField({
  question,
  value,
}: {
  question: QuestionnaireQuestion;
  value: QuestionnaireAnswerValue | undefined;
}) {
  const fieldId = `question-${question.key}`;

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>
        {question.label}
        {question.required ? <span className="text-destructive">*</span> : null}
      </Label>
      {question.helpText ? (
        <p className="text-sm text-muted-foreground">{question.helpText}</p>
      ) : null}
      <QuestionInput id={fieldId} question={question} value={value} />
    </div>
  );
}

function QuestionInput({
  id,
  question,
  value,
}: {
  id: string;
  question: QuestionnaireQuestion;
  value: QuestionnaireAnswerValue | undefined;
}) {
  switch (question.questionType) {
    case "text":
      return (
        <Input
          id={id}
          name={question.key}
          defaultValue={stringAnswerValue(value)}
          required={question.required}
        />
      );
    case "date":
      return (
        <Input
          id={id}
          name={question.key}
          type="date"
          defaultValue={stringAnswerValue(value)}
          required={question.required}
        />
      );
    case "textarea":
      return (
        <textarea
          id={id}
          name={question.key}
          defaultValue={stringAnswerValue(value)}
          required={question.required}
          className={cn(
            "min-h-28 w-full min-w-0 rounded-md border border-input bg-input/30 px-3 py-2 text-sm text-foreground shadow-inner outline-none transition-colors hover:border-ring/50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
      );
    case "boolean":
      return (
        <SelectControl
          id={id}
          name={question.key}
          defaultValue={booleanAnswerValue(value)}
          required={question.required}
          options={[
            { label: "Yes", value: "true" },
            { label: "No", value: "false" },
          ]}
        />
      );
    case "select":
      return (
        <SelectControl
          id={id}
          name={question.key}
          defaultValue={stringAnswerValue(value)}
          required={question.required}
          options={question.config?.options ?? []}
        />
      );
    default: {
      const unsupportedType: never = question.questionType;
      throw new Error(`Unsupported questionnaire question type: ${unsupportedType}.`);
    }
  }
}

function SelectControl({
  id,
  name,
  options,
  defaultValue,
  required,
}: {
  id: string;
  name: string;
  options: ReadonlyArray<{ label: string; value: string }>;
  defaultValue: string;
  required: boolean;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className={cn(
          "h-9 w-full min-w-0 appearance-none rounded-md border border-input bg-input/30 px-3 pr-9 text-sm text-foreground shadow-inner outline-none transition-colors hover:border-ring/50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

function stringAnswerValue(value: QuestionnaireAnswerValue | undefined) {
  return typeof value === "string" ? value : "";
}

function booleanAnswerValue(value: QuestionnaireAnswerValue | undefined) {
  if (typeof value !== "boolean") {
    return "";
  }

  return value ? "true" : "false";
}
