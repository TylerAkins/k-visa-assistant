"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/features/auth/components/form-message";

type CaseActionState = {
  success: boolean;
  error?: string;
};

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

function formatDateInput(date: Date | null | undefined) {
  return date ? date.toISOString().slice(0, 10) : "";
}

function EmptyStateCard({ title, description }: { title: string; description: string }) {
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

export function CaseTitleForm({
  caseId,
  title,
  action,
}: {
  caseId: string;
  title: string;
  action: (caseId: string, formData: FormData) => Promise<CaseActionState>;
}) {
  const [state, formAction, pending] = useActionState(
    async (_state: { success: boolean }, formData: FormData) => action(caseId, formData),
    { success: false },
  );

  return (
    <div className="space-y-3">
      <FormMessage message={state.error} />
      <form action={formAction} className="flex gap-3">
        <Input name="title" defaultValue={title} required />
        <Button disabled={pending}>{pending ? "Saving..." : "Save"}</Button>
      </form>
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
          placeholder="Tyler & Van"
          required
        />
      </div>
      <Button type="submit" className="self-end">
        Create New Case
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
}: {
  caseId: string;
  title: string;
  description: string;
  values: PersonFormValues | null;
  action: (caseId: string, formData: FormData) => Promise<CaseActionState>;
}) {
  const [state, formAction, pending] = useActionState(
    async (_state: { success: boolean }, formData: FormData) => action(caseId, formData),
    { success: false },
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <FormMessage message={state.error} />
        <form action={formAction} className="grid gap-4 md:grid-cols-2">
          <p className="md:col-span-2 text-sm text-muted-foreground">{description}</p>
          <InputGroup
            label="First name"
            name="firstName"
            defaultValue={values?.firstName}
            required
          />
          <InputGroup label="Middle name" name="middleName" defaultValue={values?.middleName} />
          <InputGroup
            label="Last name"
            name="lastName"
            defaultValue={values?.lastName}
            required
          />
          <InputGroup
            label="Date of birth"
            name="dateOfBirth"
            type="date"
            defaultValue={formatDateInput(values?.dateOfBirth)}
          />
          <InputGroup label="Country of birth" name="countryOfBirth" defaultValue={values?.countryOfBirth} />
          <InputGroup label="Citizenship" name="citizenship" defaultValue={values?.citizenship} />
          <InputGroup label="Email" name="email" type="email" defaultValue={values?.email} />
          <InputGroup label="Phone" name="phone" defaultValue={values?.phone} />
          <InputGroup
            label="Street 1"
            name="street1"
            defaultValue={values?.street1}
            required
          />
          <InputGroup label="Street 2" name="street2" defaultValue={values?.street2} />
          <InputGroup
            label="City"
            name="city"
            defaultValue={values?.city}
            required
          />
          <InputGroup
            label="State / Province"
            name={title === "Beneficiary" ? "province" : "state"}
            defaultValue={title === "Beneficiary" ? values?.province : values?.state}
          />
          <InputGroup
            label="Postal code"
            name="postalCode"
            defaultValue={values?.postalCode}
            required
          />
          <InputGroup
            label="Country"
            name="country"
            defaultValue={values?.country}
            required
          />
          <Button className="md:col-span-2" disabled={pending}>
            {pending ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function ChildForm({
  caseId,
  childRecords,
  childrenReviewed,
  addAction,
  reviewAction,
}: {
  caseId: string;
  childRecords: ChildFormValues[];
  childrenReviewed: boolean;
  addAction: (caseId: string, formData: FormData) => Promise<CaseActionState>;
  reviewAction: (caseId: string) => Promise<CaseActionState>;
}) {
  const [addState, formAction, pending] = useActionState(
    async (_state: { success: boolean }, formData: FormData) =>
      addAction(caseId, formData),
    { success: false },
  );
  const [reviewState, reviewFormAction, reviewPending] = useActionState(
    async () => reviewAction(caseId),
    { success: false },
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Children</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <FormMessage message={reviewState.error ?? addState.error} />
        {childRecords.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {childRecords.map((child) => (
              <div
                key={child.id}
                className="rounded-lg border border-border bg-muted/30 p-3"
              >
                <p className="font-medium">
                  {[child.firstName, child.middleName, child.lastName]
                    .filter(Boolean)
                    .join(" ")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {child.relationshipType}
                  {child.dateOfBirth
                    ? ` · Born ${formatDateInput(child.dateOfBirth)}`
                    : ""}
                </p>
              </div>
            ))}
          </div>
        ) : null}
        <form action={reviewFormAction}>
          <Button
            type="submit"
            variant={childrenReviewed ? "secondary" : "outline"}
            disabled={reviewPending || childrenReviewed}
          >
            {childrenReviewed
              ? "Children reviewed"
              : reviewPending
                ? "Marking reviewed..."
                : "Mark children reviewed"}
          </Button>
        </form>
        <form action={formAction} className="grid gap-4 md:grid-cols-2">
          <InputGroup label="First name" name="firstName" required />
          <InputGroup label="Middle name" name="middleName" />
          <InputGroup label="Last name" name="lastName" required />
          <InputGroup label="Date of birth" name="dateOfBirth" type="date" />
          <InputGroup label="Citizenship" name="citizenship" />
          <InputGroup label="Relationship type" name="relationshipType" required />
          <Button className="md:col-span-2" disabled={pending}>
            {pending ? "Saving..." : "Add child"}
          </Button>
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
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
      />
    </div>
  );
}

export function FutureFeaturePlaceholders() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <EmptyStateCard
        title="Questionnaire"
        description="This workflow will connect in a later phase."
      />
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
