import "server-only";

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { randomInt } from "node:crypto";

import { generateSecret, verify } from "otplib";

import { RECOVERY_CODE_COUNT, TOTP_WINDOW_STEPS } from "@/lib/auth/constants";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { env } from "@/lib/env";

const ENCRYPTION_INFO = "kvisa-totp-secret-v1";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  return Buffer.from(
    hkdfSync(
      "sha256",
      env.ENCRYPTION_KEY,
      Buffer.alloc(0),
      ENCRYPTION_INFO,
      32,
    ),
  );
}

export function generateTotpSecret(): string {
  return generateSecret();
}

export function encryptTotpSecret(secret: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64url");
}

export function decryptTotpSecret(encrypted: string): string {
  const key = getEncryptionKey();
  const data = Buffer.from(encrypted, "base64url");
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export async function verifyTotpCode(
  secret: string,
  code: string,
): Promise<boolean> {
  const result = await verify({
    secret,
    token: code,
    epochTolerance: TOTP_WINDOW_STEPS * 30,
  });
  return result.valid;
}

export function generateRecoveryCodes(): string[] {
  const codes: string[] = [];
  for (let index = 0; index < RECOVERY_CODE_COUNT; index += 1) {
    const partA = randomInt(0, 0xffff)
      .toString(16)
      .padStart(4, "0");
    const partB = randomInt(0, 0xffff)
      .toString(16)
      .padStart(4, "0");
    codes.push(`${partA}-${partB}`);
  }
  return codes;
}

export async function hashRecoveryCode(code: string): Promise<string> {
  return hashPassword(code);
}

export async function verifyRecoveryCode(
  codeHash: string,
  code: string,
): Promise<boolean> {
  return verifyPassword(codeHash, code);
}
