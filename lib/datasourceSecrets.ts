import type { DataSource } from "@prisma/client";
import { decryptString, encryptString } from "@/lib/crypto";

export type DataSourceSecrets = {
  passwordCiphertext: string | null;
  passwordIv: string | null;
  passwordTag: string | null;
  urlCiphertext: string | null;
  urlIv: string | null;
  urlTag: string | null;
};

export type DataSourceWithSecrets = DataSource & DataSourceSecrets;

type EncryptedField = {
  ciphertext: string | null;
  iv: string | null;
  tag: string | null;
};

function requireField(field: EncryptedField, label: string): { ciphertext: string; iv: string; authTag: string } {
  const { ciphertext, iv, tag } = field;
  if (!ciphertext || !iv || !tag) {
    throw new Error(`Incomplete encrypted payload for ${label}`);
  }
  return { ciphertext, iv, authTag: tag };
}

export function decryptDataSourcePassword(ds: DataSourceSecrets): string | null {
  if (!ds.passwordCiphertext) return null;
  const payload = requireField(
    { ciphertext: ds.passwordCiphertext, iv: ds.passwordIv, tag: ds.passwordTag },
    "password"
  );
  return decryptString(payload);
}

export function decryptDataSourceUrl(ds: DataSourceSecrets): string | null {
  if (!ds.urlCiphertext) return null;
  const payload = requireField(
    { ciphertext: ds.urlCiphertext, iv: ds.urlIv, tag: ds.urlTag },
    "connection URL"
  );
  return decryptString(payload);
}

export function getDataSourceConnectionUrl(ds: DataSourceWithSecrets): string {
  const directUrl = decryptDataSourceUrl(ds);
  if (directUrl) return directUrl;
  if (!ds.host || !ds.database || !ds.user) {
    const fallback = process.env.DEFAULT_DATASOURCE_URL || process.env.DATABASE_URL;
    if (!fallback) {
      throw new Error("Data source is missing connection details and no fallback URL is configured");
    }
    return fallback;
  }
  const password = decryptDataSourcePassword(ds);
  const enc = encodeURIComponent;
  const pwdSegment = password ? `:${enc(password)}` : "";
  const port = ds.port ?? 5432;
  return `postgresql://${enc(ds.user)}${pwdSegment}@${ds.host}:${port}/${ds.database}`;
}

export function redactDataSourceSecrets<T extends DataSourceSecrets & Record<string, any>>(ds: T) {
  const {
    passwordCiphertext: _passwordCiphertext,
    passwordIv: _passwordIv,
    passwordTag: _passwordTag,
    urlCiphertext: _urlCiphertext,
    urlIv: _urlIv,
    urlTag: _urlTag,
    ...rest
  } = ds;
  return {
    ...rest,
    hasPassword: Boolean(ds.passwordCiphertext),
  };
}

export function encryptPassword(password: string) {
  return encryptString(password);
}

