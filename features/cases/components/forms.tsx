"use client";

import type { ChangeEventHandler, FocusEvent, RefObject } from "react";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/features/auth/components/form-message";
import type { CaseOverviewData } from "@/features/cases/types";
import { kVisaCountryOptions } from "@/features/cases/types/k-visa-countries";
import { QuestionnaireWorkflow } from "@/features/questionnaire/components/questionnaire";
import type { QuestionnaireForCase } from "@/features/questionnaire/types";
import { cn } from "@/lib/utils";

type CaseActionState = {
  success: boolean;
  error?: string;
  progressPercent?: number;
};

type FormAction = (payload: FormData) => void;

type PersonFormValues = {
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: Date | null;
  countryOfBirth: string | null;
  citizenship: string | null;
  email: string | null;
  phone: string | null;
  street1: string | null;
  street2: string | null;
  city: string | null;
  state?: string | null;
  province?: string | null;
  postalCode: string | null;
  country: string | null;
};

type ChildFormValues = {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: Date | null;
  citizenship: string | null;
  relationshipType: string;
};

const relationshipOptions = ["Child", "Stepchild", "Adopted child"];

function ProgressBadge({ progressPercent }: { progressPercent: number }) {
  return (
    <Badge>
      {progressPercent === 0
        ? "Not started"
        : `${progressPercent}% complete`}
    </Badge>
  );
}

function formatDateInput(date: Date | null | undefined) {
  return date ? date.toISOString().slice(0, 10) : "";
}

function formatAutosaveTimestamp(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return [
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    date.getFullYear(),
  ].join("/") + ` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function submitAutosave(
  formRef: RefObject<HTMLFormElement | null>,
  formAction: FormAction,
) {
  const form = formRef.current;

  if (!form) {
    return;
  }

  startTransition(() => {
    formAction(new FormData(form));
  });
}

function AutosaveStatus({
  pending,
  lastSavedAt,
}: {
  pending: boolean;
  lastSavedAt: Date | null;
}) {
  if (!pending && !lastSavedAt) {
    return null;
  }

  return (
    <p className="shrink-0 text-xs font-medium text-emerald-400">
      {pending
        ? "Autosave: Saving..."
        : `Autosave: ${lastSavedAt ? formatAutosaveTimestamp(lastSavedAt) : "Not saved yet"}`}
    </p>
  );
}

function EmptyStateCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export function CaseEditor({
  overview,
  questionnaire,
  updateCaseTitleAction,
  savePetitionerAction,
  saveBeneficiaryAction,
  saveChildrenAction,
  saveQuestionnaireSectionAction,
}: {
  overview: CaseOverviewData;
  questionnaire: QuestionnaireForCase;
  updateCaseTitleAction: (
    caseId: string,
    formData: FormData,
  ) => Promise<CaseActionState>;
  savePetitionerAction: (
    caseId: string,
    formData: FormData,
  ) => Promise<CaseActionState>;
  saveBeneficiaryAction: (
    caseId: string,
    formData: FormData,
  ) => Promise<CaseActionState>;
  saveChildrenAction: (
    caseId: string,
    formData: FormData,
  ) => Promise<CaseActionState>;
  saveQuestionnaireSectionAction: (
    caseId: string,
    sectionKey: string,
    formData: FormData,
  ) => Promise<CaseActionState>;
}) {
  const [progressPercent, setProgressPercent] = useState(
    overview.case.progressPercent,
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <Card className="bg-card/80">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="text-2xl">{overview.case.title}</CardTitle>
            <Badge variant="secondary">{overview.case.status}</Badge>
            <ProgressBadge progressPercent={progressPercent} />
          </div>
          <CaseTitleForm
            caseId={overview.case.id}
            title={overview.case.title}
            action={updateCaseTitleAction}
            onProgressChange={setProgressPercent}
          />
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <PersonForm
          caseId={overview.case.id}
          title="Petitioner"
          description="Enter the U.S. citizen or lawful permanent resident petitioner details."
          values={overview.petitioner}
          action={savePetitionerAction}
          onProgressChange={setProgressPercent}
        />
        <PersonForm
          caseId={overview.case.id}
          title="Beneficiary"
          description="Enter the fiance(e) details for the K-1 case."
          values={overview.beneficiary}
          action={saveBeneficiaryAction}
          onProgressChange={setProgressPercent}
        />
      </div>

      <ChildForm
        caseId={overview.case.id}
        childRecords={overview.children}
        saveAction={saveChildrenAction}
        onProgressChange={setProgressPercent}
      />
      <QuestionnaireWorkflow
        caseId={overview.case.id}
        questionnaire={questionnaire}
        saveSectionAction={saveQuestionnaireSectionAction}
      />
      <FutureFeaturePlaceholders />
    </div>
  );
}

export function CaseTitleForm({
  caseId,
  title,
  action,
  onProgressChange,
}: {
  caseId: string;
  title: string;
  action: (caseId: string, formData: FormData) => Promise<CaseActionState>;
  onProgressChange?: (progressPercent: number) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [titleValue, setTitleValue] = useState(title);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [state, formAction, pending] = useActionState(
    async (_state: CaseActionState, formData: FormData) => {
      const result = await action(caseId, formData);

      if (result.success) {
        setLastSavedAt(new Date());
        if (typeof result.progressPercent === "number") {
          onProgressChange?.(result.progressPercent);
        }
      }

      return result;
    },
    { success: false },
  );

  return (
    <div className="space-y-2">
      <FormMessage message={state.error} />
      <form
        ref={formRef}
        action={formAction}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            submitAutosave(formRef, formAction);
          }
        }}
      >
        <Input
          name="title"
          value={titleValue}
          onChange={(event) => setTitleValue(event.currentTarget.value)}
          required
        />
      </form>
      <AutosaveStatus pending={pending} lastSavedAt={lastSavedAt} />
    </div>
  );
}

export function CreateCaseForm({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action} className="grid w-full gap-3 sm:grid-cols-[1fr_auto]">
      <div className="space-y-2">
        <Label htmlFor="create-case-title">Case name</Label>
        <Input
          id="create-case-title"
          name="title"
          placeholder="K-1 case for Alex and Sam"
          required
        />
      </div>
      <Button type="submit" className="self-end">
        Create Case
      </Button>
    </form>
  );
}

export function PersonForm({
  caseId,
  title,
  description,
  values,
  action,
  onProgressChange,
}: {
  caseId: string;
  title: string;
  description: string;
  values: PersonFormValues | null;
  action: (caseId: string, formData: FormData) => Promise<CaseActionState>;
  onProgressChange?: (progressPercent: number) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [state, formAction, pending] = useActionState(
    async (_state: CaseActionState, formData: FormData) => {
      const result = await action(caseId, formData);

      if (result.success) {
        setLastSavedAt(new Date());
        if (typeof result.progressPercent === "number") {
          onProgressChange?.(result.progressPercent);
        }
      }

      return result;
    },
    { success: false },
  );
  const isBeneficiary = title === "Beneficiary";
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueAutosave = () => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = setTimeout(() => {
      submitAutosave(formRef, formAction);
    }, 650);
  };

  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <AutosaveStatus pending={pending} lastSavedAt={lastSavedAt} />
        </div>
      </CardHeader>
      <CardContent>
        <FormMessage message={state.error} />
        <form
          ref={formRef}
          action={formAction}
          className="grid gap-4 md:grid-cols-2"
          onChange={queueAutosave}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              submitAutosave(formRef, formAction);
            }
          }}
        >
          <InputGroup
            label="First name"
            name="firstName"
            defaultValue={values?.firstName}
          />
          <InputGroup
            label="Middle name"
            name="middleName"
            defaultValue={values?.middleName}
          />
          <InputGroup
            label="Last name"
            name="lastName"
            defaultValue={values?.lastName}
          />
          <InputGroup
            label="Date of birth"
            name="dateOfBirth"
            type="date"
            defaultValue={formatDateInput(values?.dateOfBirth)}
          />
          <SelectGroup
            label="Country of birth"
            name="countryOfBirth"
            defaultValue={values?.countryOfBirth}
            options={kVisaCountryOptions}
          />
          <SelectGroup
            label="Citizenship"
            name="citizenship"
            defaultValue={values?.citizenship}
            options={kVisaCountryOptions}
          />
          <InputGroup
            label="Email"
            name="email"
            type="email"
            defaultValue={values?.email}
          />
          <InputGroup label="Phone" name="phone" defaultValue={values?.phone} />
          <InputGroup
            label="Street 1"
            name="street1"
            defaultValue={values?.street1}
          />
          <InputGroup
            label="Street 2"
            name="street2"
            defaultValue={values?.street2}
          />
          <InputGroup
            label="City"
            name="city"
            defaultValue={values?.city}
          />
          <InputGroup
            label="State / Province"
            name={isBeneficiary ? "province" : "state"}
            defaultValue={isBeneficiary ? values?.province : values?.state}
          />
          <InputGroup
            label="Postal code"
            name="postalCode"
            defaultValue={values?.postalCode}
          />
          <SelectGroup
            label="Country"
            name="country"
            defaultValue={values?.country}
            options={kVisaCountryOptions}
          />
          <button type="submit" className="sr-only">
            Save {title}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}

export function ChildForm({
  caseId,
  childRecords,
  saveAction,
  onProgressChange,
}: {
  caseId: string;
  childRecords: ChildFormValues[];
  saveAction: (caseId: string, formData: FormData) => Promise<CaseActionState>;
  onProgressChange?: (progressPercent: number) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const initialEnabled = childRecords.length > 0 ? "yes" : "no";
  const [hasChildren, setHasChildren] = useState(initialEnabled);
  const [childCount, setChildCount] = useState(Math.max(childRecords.length, 1));
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveState, formAction, pending] = useActionState(
    async (_state: CaseActionState, formData: FormData) => {
      const result = await saveAction(caseId, formData);

      if (result.success) {
        setLastSavedAt(new Date());
        if (typeof result.progressPercent === "number") {
          onProgressChange?.(result.progressPercent);
        }
      }

      return result;
    },
    { success: false },
  );
  const activeChildCount = hasChildren === "yes" ? childCount : 0;
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueAutosave = () => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = setTimeout(() => {
      submitAutosave(formRef, formAction);
    }, 650);
  };
  const saveOnSectionExit = (event: FocusEvent<HTMLFormElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      submitAutosave(formRef, formAction);
    }
  };

  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>K-2 Children</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Enable this only if the beneficiary has eligible children to include.
            </p>
          </div>
          <AutosaveStatus pending={pending} lastSavedAt={lastSavedAt} />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <FormMessage message={saveState.error} />
        <form
          ref={formRef}
          action={formAction}
          className="space-y-5"
          onChange={queueAutosave}
          onBlur={saveOnSectionExit}
        >
          <div className="grid gap-4 md:grid-cols-[1fr_12rem]">
            <SelectGroup
              label="Include K-2 children?"
              name="hasChildren"
              value={hasChildren}
              onChange={(event) => setHasChildren(event.currentTarget.value)}
              options={[
                { label: "No K-2 children", value: "no" },
                { label: "Yes, include K-2 children", value: "yes" },
              ]}
            />
            {hasChildren === "yes" ? (
              <SelectGroup
                label="How many?"
                name="childCount"
                value={String(childCount)}
                onChange={(event) =>
                  setChildCount(Number(event.currentTarget.value))
                }
                options={Array.from({ length: 10 }, (_, index) => ({
                  label: String(index + 1),
                  value: String(index + 1),
                }))}
              />
            ) : (
              <input type="hidden" name="childCount" value="0" />
            )}
          </div>

          {Array.from({ length: activeChildCount }, (_, index) => {
            const child = childRecords[index];

            return (
              <div
                key={child?.id ?? index}
                className="rounded-lg border border-border bg-muted/20 p-4"
              >
                <h3 className="mb-4 text-sm font-medium">
                  Child {index + 1}
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <InputGroup
                    label="First name"
                    name={`children.${index}.firstName`}
                    defaultValue={child?.firstName}
                  />
                  <InputGroup
                    label="Middle name"
                    name={`children.${index}.middleName`}
                    defaultValue={child?.middleName}
                  />
                  <InputGroup
                    label="Last name"
                    name={`children.${index}.lastName`}
                    defaultValue={child?.lastName}
                  />
                  <InputGroup
                    label="Date of birth"
                    name={`children.${index}.dateOfBirth`}
                    type="date"
                    defaultValue={formatDateInput(child?.dateOfBirth)}
                  />
                  <SelectGroup
                    label="Citizenship"
                    name={`children.${index}.citizenship`}
                    defaultValue={child?.citizenship}
                    options={kVisaCountryOptions}
                  />
                  <SelectGroup
                    label="Relationship type"
                    name={`children.${index}.relationshipType`}
                    defaultValue={child?.relationshipType}
                    options={relationshipOptions}
                  />
                </div>
              </div>
            );
          })}

          <button type="submit" className="sr-only" disabled={pending}>
            Save K-2 children
          </button>
        </form>
      </CardContent>
    </Card>
  );
}

function InputGroup({
  label,
  name,
  type = "text",
  defaultValue,
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | null;
  required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue ?? "");

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(event) => setValue(event.currentTarget.value)}
        required={required}
      />
    </div>
  );
}

function SelectGroup({
  label,
  name,
  options,
  defaultValue,
  value,
  onChange,
  required = false,
}: {
  label: string;
  name: string;
  options: ReadonlyArray<string | { label: string; value: string }>;
  defaultValue?: string | null;
  value?: string;
  onChange?: ChangeEventHandler<HTMLSelectElement>;
  required?: boolean;
}) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const selectedValue = value ?? internalValue;

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <div className="relative">
        <select
          id={name}
          name={name}
          value={selectedValue}
          onChange={(event) => {
            if (value === undefined) {
              setInternalValue(event.currentTarget.value);
            }

            onChange?.(event);
          }}
          required={required}
          className={cn(
            "h-9 w-full min-w-0 appearance-none rounded-md border border-input bg-input/30 px-3 pr-9 text-sm text-foreground shadow-inner outline-none transition-colors hover:border-ring/50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <option value="">Select</option>
          {options.map((option) => {
            const item =
              typeof option === "string"
                ? { label: option, value: option }
                : option;

            return (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            );
          })}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
      </div>
    </div>
  );
}

export function FutureFeaturePlaceholders() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <EmptyStateCard
        title="Evidence"
        description="Evidence uploads are intentionally disabled for now."
      />
      <EmptyStateCard
        title="PDF Generation"
        description="Document generation will be added in a future phase."
      />
    </div>
  );
}
