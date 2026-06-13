import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card/60 p-8 md:p-10">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(114,137,218,0.18),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-16 top-1/2 size-48 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />

      <div className="relative space-y-5">
        <Badge variant="secondary" className="bg-muted text-muted-foreground">
          K-1 visa workflow
        </Badge>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground md:text-[2.5rem] md:leading-tight">
          A calm, guided path through your I-129F preparation
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Complete your petition step by step, keep relationship evidence
          organized, and generate exports when you are ready. Clear structure,
          no guesswork.
        </p>
        <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:gap-4">
          <Button disabled size="lg" className="sm:min-w-36">
            Create account
          </Button>
          <p className="text-sm text-muted-foreground">
            Sign-up and sign-in arrive in Phase 1.
          </p>
        </div>
      </div>
    </section>
  );
}
