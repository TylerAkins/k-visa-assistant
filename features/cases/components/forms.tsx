"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  action: (caseId: string, formData: FormData) => Promise<{ success: boolean }>;
}) {
  const [, formAction, pending] = useActionState(
    async (_state: { success: boolean }, formData: FormData) => action(caseId, formData),
    { success: false },
  );

  return (
    <form action={formAction} className="flex gap-3">
      <Input name="title" defaultValue={title} />
      <Button disabled={pending}>{pending ? "Saving..." : "Save"}</Button>
    </form>
  );
}

export function PersonForm({
  caseId,
  title,
  description,
  action,
}: {
  caseId: string;
  title: string;
  description: string;
  action: (caseId: string, formData: FormData) => Promise<{ success: boolean }>;
}) {
  const [, formAction, pending] = useActionState(
    async (_state: { success: boolean }, formData: FormData) => action(caseId, formData),
    { success: false },
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 md:grid-cols-2">
          <p className="md:col-span-2 text-sm text-muted-foreground">{description}</p>
          <InputGroup label="First name" name="firstName" />
          <InputGroup label="Middle name" name="middleName" />
          <InputGroup label="Last name" name="lastName" />
          <InputGroup label="Date of birth" name="dateOfBirth" type="date" />
          <InputGroup label="Country of birth" name="countryOfBirth" />
          <InputGroup label="Citizenship" name="citizenship" />
          <InputGroup label="Email" name="email" type="email" />
          <InputGroup label="Phone" name="phone" />
          <InputGroup label="Street 1" name="street1" />
          <InputGroup label="Street 2" name="street2" />
          <InputGroup label="City" name="city" />
          <InputGroup label="State / Province" name={title === "Beneficiary" ? "province" : "state"} />
          <InputGroup label="Postal code" name="postalCode" />
          <InputGroup label="Country" name="country" />
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
  action,
}: {
  caseId: string;
  action: (caseId: string, formData: FormData) => Promise<{ success: boolean }>;
}) {
  const [, formAction, pending] = useActionState(
    async (_state: { success: boolean }, formData: FormData) => action(caseId, formData),
    { success: false },
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Children</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 md:grid-cols-2">
          <InputGroup label="First name" name="firstName" />
          <InputGroup label="Middle name" name="middleName" />
          <InputGroup label="Last name" name="lastName" />
          <InputGroup label="Date of birth" name="dateOfBirth" type="date" />
          <InputGroup label="Citizenship" name="citizenship" />
          <InputGroup label="Relationship type" name="relationshipType" />
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
}: {
  label: string;
  name: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} />
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
