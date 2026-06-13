import { ClipboardList, FileOutput, Images } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    step: "1",
    title: "Guided I-129F workflow",
    description:
      "Answer questions in plain language with save and resume. Your answers stay structured for review and export.",
    status: "Phase 3",
    icon: ClipboardList,
  },
  {
    step: "2",
    title: "Evidence organizer",
    description:
      "Upload photos and documents, add notes, and arrange a relationship timeline in one place.",
    status: "Phase 5",
    icon: Images,
  },
  {
    step: "3",
    title: "PDF generation",
    description:
      "Generate a filled I-129F and a organized evidence packet on demand when you are ready to file.",
    status: "Phase 4",
    icon: FileOutput,
  },
] as const;

export function FeatureGrid() {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">What you will get</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Three focused tools, built in order. No clutter, no enterprise
          dashboard noise.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;

          return (
            <Card
              key={feature.title}
              className="border-border bg-card transition-colors hover:border-primary/30"
            >
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Icon className="size-4" aria-hidden />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    Step {feature.step}
                  </span>
                </div>
                <CardTitle className="text-base leading-snug">
                  {feature.title}
                </CardTitle>
                <CardDescription className="leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="outline">Coming in {feature.status}</Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
