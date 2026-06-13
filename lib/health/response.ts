export type LocalHealthResponseBody = {
  status: "ok" | "degraded";
  database: "connected" | "disconnected";
};

export type PublicHealthResponseBody = {
  status: "ok" | "degraded";
};

export type RateLimitedHealthResponseBody = {
  status: "degraded";
  reason: "rate_limited";
};

export type HealthResponseBody =
  | LocalHealthResponseBody
  | PublicHealthResponseBody
  | RateLimitedHealthResponseBody;

export type HealthResponse = {
  status: number;
  body: HealthResponseBody;
};

export function buildRateLimitedHealthResponse(): HealthResponse {
  return {
    status: 429,
    body: { status: "degraded", reason: "rate_limited" },
  };
}

export function buildHealthResponse(
  isConnected: boolean,
  exposeDatabase: boolean,
): HealthResponse {
  if (!exposeDatabase) {
    if (!isConnected) {
      return {
        status: 503,
        body: { status: "degraded" },
      };
    }

    return {
      status: 200,
      body: { status: "ok" },
    };
  }

  if (!isConnected) {
    return {
      status: 503,
      body: { status: "degraded", database: "disconnected" },
    };
  }

  return {
    status: 200,
    body: { status: "ok", database: "connected" },
  };
}
