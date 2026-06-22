import Link from "next/link";

import { SiteLogo } from "@/components/layout/site-logo";
import { Button, buttonVariants } from "@/components/ui/button";
import type { SessionUser } from "@/features/auth/types";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
  user?: SessionUser | null;
};

export function AppShell({ children, user = null }: AppShellProps) {
  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="border-b border-border bg-panel">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <SiteLogo />
          <nav
            className="flex items-center gap-1 text-sm"
            aria-label="Main"
          >
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-muted-foreground",
              )}
            >
              Dashboard
            </Link>
            {user ? (
              <Link href="/account/settings">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                >
                  Account
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                  >
                    Sign in
                  </Button>
                </Link>
                <Link href="/register">
                  <Button type="button" size="sm">
                    Create account
                  </Button>
                </Link>
              </>
            )}
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
