import type { EmailProvider, EmailMessage } from "@/lib/email/types";
import { env } from "@/lib/env";
import { isLocalEnv } from "@/lib/env-schema";

export class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    if (isLocalEnv(env.APP_ENV)) {
      console.log(
        `[email] to=${message.to} subject=${message.subject}\n${message.text}`,
      );
      return;
    }

    console.log(`[email] to=${message.to} subject=${message.subject}`);
  }
}
