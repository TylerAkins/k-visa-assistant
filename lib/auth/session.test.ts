import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { mockState } = vi.hoisted(() => ({
  mockState: {
    sessionRow: {
      sessionId: "session-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 60_000),
      email: "user@example.com",
      emailVerified: true,
    } as {
      sessionId: string;
      userId: string;
      expiresAt: Date;
      email: string;
      emailVerified: boolean;
    } | null,
  },
}));

const mockDelete = vi.fn();

vi.mock("@/db", () => ({
  db: {
    delete: (...args: unknown[]) => {
      mockDelete(...args);
      return { where: vi.fn().mockResolvedValue(undefined) };
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: "session-new",
            userId: "user-1",
            expiresAt: new Date(Date.now() + 60_000),
          },
        ]),
      }),
    }),
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(async () =>
              mockState.sessionRow ? [mockState.sessionRow] : [],
            ),
          }),
        }),
      }),
    })),
  },
}));

import {
  createSession,
  deleteSession,
  deleteUserSessions,
  getSession,
  reissueUserSession,
  rotateSession,
} from "@/lib/auth/session";

describe("session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.sessionRow = {
      sessionId: "session-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 60_000),
      email: "user@example.com",
      emailVerified: true,
    };
  });

  it("creates a session", async () => {
    const session = await createSession("user-1");
    expect(session.id).toBe("session-new");
  });

  it("returns session with user", async () => {
    const result = await getSession("session-1");
    expect(result?.user.email).toBe("user@example.com");
  });

  it("returns null when session is missing", async () => {
    mockState.sessionRow = null;
    await expect(getSession("missing")).resolves.toBeNull();
  });

  it("returns null for expired sessions", async () => {
    mockState.sessionRow = {
      sessionId: "session-expired",
      userId: "user-1",
      expiresAt: new Date(Date.now() - 60_000),
      email: "user@example.com",
      emailVerified: true,
    };

    await expect(getSession("session-expired")).resolves.toBeNull();
    expect(mockDelete).toHaveBeenCalled();
  });

  it("deletes a session", async () => {
    await deleteSession("session-1");
    expect(mockDelete).toHaveBeenCalled();
  });

  it("rotates session by deleting old and creating new", async () => {
    const session = await rotateSession("session-old", "user-1");
    expect(session.id).toBe("session-new");
  });

  it("rotates session without old id", async () => {
    const session = await rotateSession(null, "user-1");
    expect(session.id).toBe("session-new");
  });

  it("deletes all sessions for a user", async () => {
    await deleteUserSessions("user-1");
    expect(mockDelete).toHaveBeenCalled();
  });

  it("reissues a fresh session after deleting all user sessions", async () => {
    const session = await reissueUserSession("user-1");
    expect(session.id).toBe("session-new");
    expect(mockDelete).toHaveBeenCalled();
  });
});
