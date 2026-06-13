const steps = [
  {
    title: "Set up your case",
    description: "Add petitioner and beneficiary details once. Revisit anytime.",
  },
  {
    title: "Work through the questionnaire",
    description: "One section at a time, with validation and a final review screen.",
  },
  {
    title: "Organize and export",
    description: "Attach evidence, then generate your forms and packet when ready.",
  },
] as const;

export function HowItWorks() {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">How it works</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A linear flow designed for a stressful process. You always know what
          comes next.
        </p>
      </div>

      <ol className="grid gap-3 md:grid-cols-3">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="flex gap-3 rounded-xl border border-border bg-muted/30 p-4"
          >
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary"
              aria-hidden
            >
              {index + 1}
            </span>
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-foreground">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
