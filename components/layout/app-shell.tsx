import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { SiteLogo } from "@/components/layout/site-logo";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="border-b border-border bg-panel">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <SiteLogo />
          <nav
            className="flex items-center gap-1 text-sm"
            aria-label="Main"
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled
              className="text-muted-foreground"
              title="Available after Phase 2"
            >
              Dashboard
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled
              className="text-muted-foreground"
              title="Available after Phase 1"
            >
              Sign in
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-panel">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <p className="text-sm text-muted-foreground">
            KVisaAssistant provides guided workflow tools. This is not legal
            advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
