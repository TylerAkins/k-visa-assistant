import "server-only";

import { ConsoleEmailProvider } from "@/lib/email/console-provider";
import type { EmailProvider } from "@/lib/email/types";
import { env } from "@/lib/env";

let provider: EmailProvider | undefined;

export function getEmailProvider(): EmailProvider {
  if (!provider) {
    switch (env.EMAIL_PROVIDER) {
      case "console":
        provider = new ConsoleEmailProvider();
        break;
      default:
        throw new Error(`Unknown email provider: ${env.EMAIL_PROVIDER}`);
    }
  }

  return provider;
}

export function resetEmailProviderForTests(): void {
  provider = undefined;
}
