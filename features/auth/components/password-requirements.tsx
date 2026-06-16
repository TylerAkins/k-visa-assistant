import { PASSWORD_REQUIREMENTS } from "@/features/auth/validation/password-policy";

type PasswordRequirementsProps = {
  id?: string;
};

export function PasswordRequirements({ id }: PasswordRequirementsProps) {
  return (
    <div
      id={id}
      className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
    >
      <p className="font-medium text-foreground">Password must include:</p>
      <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
        {PASSWORD_REQUIREMENTS.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
    </div>
  );
}
