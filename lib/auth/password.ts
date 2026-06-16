import { hash, verify } from "@node-rs/argon2";

export const ARGON2_OPTIONS = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
  algorithm: 2 as const,
};

// Precomputed Argon2id hash of "dummy-password-for-timing" — never used as a real password.
export const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=65536,t=3,p=1$Q0BLne/xr98ABJMW1S7LsA$Wa9/LNoXFz2Ids/SZ5pw21akcNhE8EPWBofk7aIskLY";

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(passwordHash, password, ARGON2_OPTIONS);
  } catch {
    return false;
  }
}

type LoginUser = { passwordHash: string } | null;

export async function verifyLoginPassword(
  user: LoginUser,
  password: string,
): Promise<boolean> {
  const hashToVerify = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
  return verifyPassword(hashToVerify, password);
}
