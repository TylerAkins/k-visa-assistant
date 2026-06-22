import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardCaseCards } from "@/features/cases/components/case-cards";
import { createCaseAction } from "@/features/cases/actions";
import { listUserCases } from "@/features/cases/server/cases";

export default async function DashboardPage() {
  const cases = await listUserCases();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <Card className="border-border/60 bg-card/80">
        <CardHeader className="space-y-3">
          <CardTitle className="text-2xl">Welcome to your case dashboard</CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage your K-1 case from one place and track progress as you go.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <form action={createCaseAction}>
            <input type="hidden" name="title" value="New K-1 case" />
            <Button type="submit">Create New Case</Button>
          </form>
          <Link href="/account/settings">
            <Button variant="secondary">Account settings</Button>
          </Link>
        </CardContent>
      </Card>

      {cases.length ? (
        <DashboardCaseCards cases={cases} />
      ) : (
        <Card className="bg-card/80">
          <CardContent className="py-10 text-center">
            <p className="text-lg font-medium">Start your first K-1 visa case.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Create a case to begin organizing petitioner and beneficiary details.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
