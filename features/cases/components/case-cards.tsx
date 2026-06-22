import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CaseOverviewData } from "@/features/cases/types";

export function DashboardCaseCards({
  cases,
}: {
  cases: CaseOverviewData["case"][];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cases.map((caseItem) => (
        <Card key={caseItem.id} className="bg-card/80">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-lg">{caseItem.title}</CardTitle>
              <Badge variant="secondary">{caseItem.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${caseItem.progressPercent}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {caseItem.progressPercent === 0
                  ? "Not started"
                  : `${caseItem.progressPercent}% complete`}
              </p>
            </div>
            <Link href={`/cases/${caseItem.id}`}>
              <Button variant="secondary" className="w-full">
                Open case
              </Button>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
