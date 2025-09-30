import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
let cachedKey: Buffer | null = null;

function decodeKey(raw: string): Buffer {
  const trimmed = raw.trim();
  if (trimmed.length === 64 && /^[0-9a-fA-F]+$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }
  try {
    const base64 = Buffer.from(trimmed, "base64");
    if (base64.length === KEY_LENGTH) {
      return base64;
    }
  } catch (_err) {
    // Ignore and fall back to utf8 handling below.
  }
  return Buffer.from(trimmed, "utf8");
}

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = process.env.DATASOURCE_SECRET_KEY;
  if (!secret) {
    throw new Error("DATASOURCE_SECRET_KEY env var must be set to enable data source encryption.");
  }
  const key = decodeKey(secret);
  if (key.length !== KEY_LENGTH) {
    throw new Error("DATASOURCE_SECRET_KEY must decode to exactly 32 bytes (256 bits).");
  }
  cachedKey = key;
  return key;
}

export type EncryptedPayload = {
  ciphertext: string;
  iv: string;
  authTag: string;
};

export function encryptString(plaintext: string): EncryptedPayload {
  if (typeof plaintext !== "string") {
    throw new TypeError("encryptString expects a string input");
  }
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptString(payload: { ciphertext?: string | null; iv?: string | null; authTag?: string | null }): string {
  const { ciphertext, iv, authTag } = payload;
  if (!ciphertext) {
    throw new Error("Missing ciphertext for decryption");
  }
  if (!iv || !authTag) {
    throw new Error("Missing IV or authTag for decryption");
  }
  const key = getKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function clearCachedKey() {
  cachedKey = null;
}
