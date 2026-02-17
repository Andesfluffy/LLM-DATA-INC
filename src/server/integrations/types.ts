import { decryptString, encryptString, type EncryptedPayload } from "@/lib/crypto";

export type IntegrationPlatform = "stripe" | "shopify";

export type ConnectorSyncState = {
  lastSuccessfulSyncAt?: string;
  lastSyncAttemptAt?: string;
  error?: string | null;
  status: "idle" | "syncing" | "ok" | "error";
};

export type OAuthSecret = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
};

export type IntegrationSecretInput = {
  apiKey?: string;
  oauth?: OAuthSecret;
};

export type StoredEncryptedSecret = {
  ciphertext: string;
  iv: string;
  authTag: string;
};

export type IntegrationConfig = {
  platform: IntegrationPlatform;
  mode: "api_key" | "oauth";
  encryptedSecret: StoredEncryptedSecret;
  sync: ConnectorSyncState;
};

export type IntegrationMetadataMap = Partial<Record<IntegrationPlatform, IntegrationConfig>>;

export function encryptIntegrationSecret(input: IntegrationSecretInput): StoredEncryptedSecret {
  const payload: EncryptedPayload = encryptString(JSON.stringify(input));
  return {
    ciphertext: payload.ciphertext,
    iv: payload.iv,
    authTag: payload.authTag,
  };
}

export function decryptIntegrationSecret(secret: StoredEncryptedSecret): IntegrationSecretInput {
  const raw = decryptString(secret);
  return JSON.parse(raw) as IntegrationSecretInput;
}
