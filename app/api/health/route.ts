import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { checkDatabaseConnection } from "@/lib/db/health";
import { env } from "@/lib/env";
import { isLocalEnv } from "@/lib/env-schema";
import { getSafeErrorMessage } from "@/lib/errors";
import {
  buildHealthResponse,
  buildRateLimitedHealthResponse,
} from "@/lib/health/response";
import { getRequestClientIp } from "@/lib/security/client-ip";
import { checkRateLimit } from "@/lib/security/rate-limit";

const HEALTH_RATE_LIMIT = 60;
const HEALTH_RATE_WINDOW_MS = 60_000;

export async function GET() {
  const exposeDatabase = isLocalEnv(env.APP_ENV);
  const clientIp = await getRequestClientIp({
    trustProxy: !exposeDatabase,
  });
  const rateLimit = checkRateLimit(
    `health:${clientIp}`,
    HEALTH_RATE_LIMIT,
    HEALTH_RATE_WINDOW_MS,
  );

  if (!rateLimit.allowed) {
    const { status, body } = buildRateLimitedHealthResponse();

    return NextResponse.json(body, {
      status,
      headers: {
        "Retry-After": String(rateLimit.retryAfterSeconds),
      },
    });
  }

  try {
    const isConnected = await checkDatabaseConnection(db);
    const { status, body } = buildHealthResponse(isConnected, exposeDatabase);

    if (!isConnected) {
      console.error("Health check failed: database connection unavailable");
    }

    return NextResponse.json(body, { status });
  } catch (error) {
    console.error("Health check failed:", getSafeErrorMessage(error));
    const { status, body } = buildHealthResponse(false, exposeDatabase);
    return NextResponse.json(body, { status });
  }
}
