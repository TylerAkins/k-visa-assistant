import "server-only";

import { eq, lt } from "drizzle-orm";

import { sessions, users } from "@/db/schema";
import { SESSION_TTL_MS } from "@/lib/auth/constants";
import { db } from "@/db";

export type SessionUser = {
  id: string;
  email: string;
  emailVerified: boolean;
};

export type AuthSession = {
  id: string;
  userId: string;
  expiresAt: Date;
};

export type SessionResult = {
  user: SessionUser;
  session: AuthSession;
};

export async function purgeExpiredSessions(): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}

export async function createSession(userId: string): Promise<AuthSession> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const [session] = await db
    .insert(sessions)
    .values({ userId, expiresAt })
    .returning();

  if (!session) {
    throw new Error("Failed to create session");
  }

  return session;
}

export async function getSession(
  sessionId: string,
): Promise<SessionResult | null> {
  await purgeExpiredSessions();

  const result = await db
    .select({
      sessionId: sessions.id,
      userId: sessions.userId,
      expiresAt: sessions.expiresAt,
      email: users.email,
      emailVerified: users.emailVerified,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  const row = result[0];
  if (!row || row.expiresAt <= new Date()) {
    if (row) {
      await deleteSession(sessionId);
    }
    return null;
  }

  return {
    user: {
      id: row.userId,
      email: row.email,
      emailVerified: row.emailVerified,
    },
    session: {
      id: row.sessionId,
      userId: row.userId,
      expiresAt: row.expiresAt,
    },
  };
}

export async function deleteSession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function deleteUserSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function rotateSession(
  oldSessionId: string | null,
  userId: string,
): Promise<AuthSession> {
  if (oldSessionId) {
    await deleteSession(oldSessionId);
  }

  return createSession(userId);
}
