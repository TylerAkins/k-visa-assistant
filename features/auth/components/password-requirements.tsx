"use client";

import { getPasswordRequirementStatuses } from "@/features/auth/validation/password-policy";
import { cn } from "@/lib/utils";

type PasswordRequirementsProps = {
  id?: string;
  password?: string;
};

export function PasswordRequirements({
  id,
  password = "",
}: PasswordRequirementsProps) {
  const statuses = getPasswordRequirementStatuses(password);

  return (
    <div
      id={id}
      className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm"
      aria-live="polite"
    >
      <p className="font-medium text-foreground">Password must include:</p>
      <ul className="mt-1.5 space-y-0.5">
        {statuses.map((rule) => (
          <li
            key={rule.id}
            className={cn(
              "flex items-center gap-2 transition-colors",
              rule.met
                ? "text-green-600 dark:text-green-400"
                : "text-muted-foreground",
            )}
          >
            <span aria-hidden="true">{rule.met ? "✓" : "•"}</span>
            <span>{rule.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
