import "server-only";

import { eq, lt, sql } from "drizzle-orm";

import { pendingLogins } from "@/db/schema";
import {
  MAX_PENDING_LOGIN_ATTEMPTS,
  PENDING_LOGIN_TTL_MS,
} from "@/lib/auth/constants";
import { db } from "@/db";

export type PendingLogin = {
  id: string;
  userId: string;
  attemptCount: number;
  expiresAt: Date;
};

export async function purgeExpiredPendingLogins(): Promise<void> {
  await db.delete(pendingLogins).where(lt(pendingLogins.expiresAt, new Date()));
}

export async function createPendingLogin(userId: string): Promise<PendingLogin> {
  await purgeExpiredPendingLogins();
  await deletePendingLoginsForUser(userId);

  const expiresAt = new Date(Date.now() + PENDING_LOGIN_TTL_MS);
  const [pending] = await db
    .insert(pendingLogins)
    .values({ userId, expiresAt })
    .returning();

  if (!pending) {
    throw new Error("Failed to create pending login");
  }

  return pending;
}

export async function getPendingLogin(
  id: string,
): Promise<PendingLogin | null> {
  await purgeExpiredPendingLogins();

  const [pending] = await db
    .select()
    .from(pendingLogins)
    .where(eq(pendingLogins.id, id))
    .limit(1);

  if (!pending || pending.expiresAt <= new Date()) {
    if (pending) {
      await deletePendingLogin(id);
    }
    return null;
  }

  if (pending.attemptCount >= MAX_PENDING_LOGIN_ATTEMPTS) {
    await deletePendingLogin(id);
    return null;
  }

  return pending;
}

export async function incrementPendingLoginAttempts(
  id: string,
): Promise<number> {
  const [updated] = await db
    .update(pendingLogins)
    .set({ attemptCount: sql`${pendingLogins.attemptCount} + 1` })
    .where(eq(pendingLogins.id, id))
    .returning({ attemptCount: pendingLogins.attemptCount });

  return updated?.attemptCount ?? MAX_PENDING_LOGIN_ATTEMPTS;
}

export async function deletePendingLogin(id: string): Promise<void> {
  await db.delete(pendingLogins).where(eq(pendingLogins.id, id));
}

export async function deletePendingLoginsForUser(userId: string): Promise<void> {
  await db.delete(pendingLogins).where(eq(pendingLogins.userId, userId));
}
