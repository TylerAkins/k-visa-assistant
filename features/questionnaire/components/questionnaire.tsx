"use client";

import { useActionState, useState } from "react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isQuestionVisible } from "@/features/questionnaire/conditions";
import type {
  QuestionnaireAnswer,
  QuestionnaireAnswerValue,
  QuestionnaireForCase,
  QuestionnaireProgress,
  QuestionnaireQuestion,
  QuestionnaireSection,
  QuestionnaireSectionSaveResult,
} from "@/features/questionnaire/types";
import { cn } from "@/lib/utils";

type SaveQuestionnaireSectionAction = (
  caseId: string,
  sectionKey: string,
  formData: FormData,
) => Promise<QuestionnaireSectionSaveResult>;

export function QuestionnaireWorkflow({
  caseId,
  questionnaire,
  saveSectionAction,
  onProgressChange,
}: {
  caseId: string;
  questionnaire: QuestionnaireForCase;
  saveSectionAction: SaveQuestionnaireSectionAction;
  onProgressChange?: (progressPercent: number) => void;
}) {
  const [progress, setProgress] = useState(questionnaire.progress);

  return (
    <section className="space-y-4" aria-labelledby="questionnaire-heading">
      <div className="space-y-1">
        <h2 id="questionnaire-heading" className="text-xl font-semibold">
          Questionnaire
        </h2>
        <p className="text-sm text-muted-foreground">
          Complete the active I-129F sections for this case.
        </p>
        <p className="text-sm font-medium" aria-live="polite">
          {progress.completedSections} of {progress.totalSections} sections complete
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
            complete={
              progress.sections.find((item) => item.sectionKey === section.key)
                ?.complete ?? false
            }
            onSave={(nextProgress, progressPercent) => {
              setProgress(nextProgress);
              onProgressChange?.(progressPercent);
            }}
          />
        ))}
      </div>
      <Link
        href={`/cases/${caseId}/review`}
        className={buttonVariants({ variant: "secondary" })}
      >
        Review answers
      </Link>
    </section>
  );
}

function QuestionnaireSectionForm({
  caseId,
  section,
  answers,
  action,
  complete,
  onSave,
}: {
  caseId: string;
  section: QuestionnaireSection;
  answers: QuestionnaireAnswer[];
  action: SaveQuestionnaireSectionAction;
  complete: boolean;
  onSave: (
    questionnaireProgress: QuestionnaireProgress,
    progressPercent: number,
  ) => void;
}) {
  const [state, formAction, pending] = useActionState(
    async (_state: QuestionnaireSectionSaveResult, formData: FormData) => {
      const result = await action(caseId, section.key, formData);

      if (result.success) {
        onSave(result.questionnaireProgress, result.progressPercent);
      }

      return result;
    },
    { success: false, fieldErrors: {} },
  );
  const [answersByQuestionKey, setAnswersByQuestionKey] = useState(
    () =>
      pruneHiddenAnswers(
        section,
        new Map(
          answers.map((answer) => [answer.questionKey, answer.value] as const),
        ),
      ),
  );
  const visibleQuestions = getVisibleQuestions(section, answersByQuestionKey);

  function updateAnswer(
    questionKey: string,
    value: QuestionnaireAnswerValue,
  ) {
    setAnswersByQuestionKey((currentAnswers) => {
      const nextAnswers = new Map(currentAnswers);
      nextAnswers.set(questionKey, value);
      return pruneHiddenAnswers(section, nextAnswers);
    });
  }

  return (
    <Card id={`questionnaire-section-${section.key}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{section.title}</CardTitle>
          <Badge variant={complete ? "default" : "secondary"}>
            {complete ? "Complete" : "Incomplete"}
          </Badge>
        </div>
        {section.description ? (
          <p className="text-sm text-muted-foreground">{section.description}</p>
        ) : null}
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {visibleQuestions.length > 0 ? (
            visibleQuestions.map((question) => (
              <QuestionField
                key={question.key}
                question={question}
                value={answersByQuestionKey.get(question.key)}
                error={
                  state.success
                    ? undefined
                    : state.fieldErrors[question.key]?.[0]
                }
                onValueChange={(value) => updateAnswer(question.key, value)}
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

export function QuestionField({
  question,
  value,
  error,
  onValueChange,
}: {
  question: QuestionnaireQuestion;
  value: QuestionnaireAnswerValue | undefined;
  error?: string;
  onValueChange: (value: QuestionnaireAnswerValue) => void;
}) {
  const fieldId = `question-${question.key}`;
  const helpId = question.helpText ? `${fieldId}-help` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>
        {question.label}
        {question.required ? <span className="text-destructive">*</span> : null}
      </Label>
      {question.helpText ? (
        <p id={helpId} className="text-sm text-muted-foreground">
          {question.helpText}
        </p>
      ) : null}
      <QuestionInput
        id={fieldId}
        question={question}
        value={value}
        invalid={Boolean(error)}
        describedBy={describedBy}
        onValueChange={onValueChange}
      />
      {error ? (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function QuestionInput({
  id,
  question,
  value,
  invalid,
  describedBy,
  onValueChange,
}: {
  id: string;
  question: QuestionnaireQuestion;
  value: QuestionnaireAnswerValue | undefined;
  invalid: boolean;
  describedBy?: string;
  onValueChange: (value: QuestionnaireAnswerValue) => void;
}) {
  switch (question.questionType) {
    case "text":
      return (
        <Input
          id={id}
          name={question.key}
          value={stringAnswerValue(value)}
          onChange={(event) => onValueChange(event.currentTarget.value || null)}
          required={question.required}
          aria-invalid={invalid}
          aria-describedby={describedBy}
        />
      );
    case "date":
      return (
        <Input
          id={id}
          name={question.key}
          type="date"
          value={stringAnswerValue(value)}
          onChange={(event) => onValueChange(event.currentTarget.value || null)}
          required={question.required}
          aria-invalid={invalid}
          aria-describedby={describedBy}
        />
      );
    case "textarea":
      return (
        <textarea
          id={id}
          name={question.key}
          value={stringAnswerValue(value)}
          onChange={(event) => onValueChange(event.currentTarget.value || null)}
          required={question.required}
          aria-invalid={invalid}
          aria-describedby={describedBy}
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
          value={booleanAnswerValue(value)}
          onValueChange={(nextValue) => {
            if (nextValue === "true") {
              onValueChange(true);
              return;
            }

            if (nextValue === "false") {
              onValueChange(false);
              return;
            }

            onValueChange(null);
          }}
          required={question.required}
          invalid={invalid}
          describedBy={describedBy}
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
          value={stringAnswerValue(value)}
          onValueChange={(nextValue) => onValueChange(nextValue || null)}
          required={question.required}
          invalid={invalid}
          describedBy={describedBy}
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
  value,
  onValueChange,
  required,
  invalid,
  describedBy,
}: {
  id: string;
  name: string;
  options: ReadonlyArray<{ label: string; value: string }>;
  value: string;
  onValueChange: (value: string) => void;
  required: boolean;
  invalid: boolean;
  describedBy?: string;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        name={name}
        value={value}
        onChange={(event) => onValueChange(event.currentTarget.value)}
        required={required}
        aria-invalid={invalid}
        aria-describedby={describedBy}
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

function getVisibleQuestions(
  section: QuestionnaireSection,
  answersByQuestionKey: ReadonlyMap<string, QuestionnaireAnswerValue>,
) {
  const visibleQuestions: QuestionnaireQuestion[] = [];
  const visibleAnswersByQuestionKey = new Map(answersByQuestionKey);

  for (const question of section.questions) {
    if (isQuestionVisible(question, visibleAnswersByQuestionKey)) {
      visibleQuestions.push(question);
      continue;
    }

    visibleAnswersByQuestionKey.delete(question.key);
  }

  return visibleQuestions;
}

function pruneHiddenAnswers(
  section: QuestionnaireSection,
  answersByQuestionKey: ReadonlyMap<string, QuestionnaireAnswerValue>,
) {
  const visibleAnswersByQuestionKey = new Map(answersByQuestionKey);

  for (const question of section.questions) {
    if (!isQuestionVisible(question, visibleAnswersByQuestionKey)) {
      visibleAnswersByQuestionKey.delete(question.key);
    }
  }

  return visibleAnswersByQuestionKey;
}
