import { db } from "@/db";
import { checkDatabaseConnection } from "@/db/health";
import { env } from "@/lib/env";
import { isLocalEnv } from "@/lib/env-schema";
import { LocalDevStatus } from "@/components/landing/local-dev-status";

export async function LocalDevStatusSection() {
  if (!isLocalEnv(env.APP_ENV)) {
    return null;
  }

  const connected = await checkDatabaseConnection(db);

  return (
    <div className="border-t border-border pt-6">
      <LocalDevStatus connected={connected} />
    </div>
  );
}
