export type LocalHealthResponseBody = {
  status: "ok" | "degraded";
  database: "connected" | "disconnected";
};

export type PublicHealthResponseBody = {
  status: "ok" | "degraded";
};

export type HealthResponseBody =
  | LocalHealthResponseBody
  | PublicHealthResponseBody;

export type HealthResponse = {
  status: number;
  body: HealthResponseBody;
};

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
