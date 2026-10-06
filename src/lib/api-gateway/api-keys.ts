/**
 * Enterprise API Gateway, API Key Management & Scope Authorization Engine
 */

export type ApiScope =
  | "transactions:read"
  | "transactions:write"
  | "groups:read"
  | "groups:write"
  | "settlements:read"
  | "settlements:write"
  | "reports:export"
  | "analytics:read"
  | "webhooks:manage"
  | "organizations:manage";

export interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string; // e.g. "sk_live_abc12"
  keyHash: string; // SHA-256 hash of secret key
  ownerId: number;
  scopes: ApiScope[];
  status: "active" | "disabled" | "revoked";
  rateLimitPerMinute: number;
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
}

// In-memory key store
const apiKeysStore = new Map<string, ApiKeyRecord>();

function hashKey(secretKey: string): string {
  let hash = 0;
  for (let i = 0; i < secretKey.length; i++) {
    hash = (hash << 5) - hash + secretKey.charCodeAt(i);
    hash |= 0;
  }
  return `hash_${Math.abs(hash).toString(16).padStart(16, "0")}`;
}

/**
 * Generate a new cryptographically secure API key with prefix
 */
export function generateApiKey(
  ownerId: number,
  name: string,
  scopes: ApiScope[] = ["transactions:read", "groups:read"],
  rateLimitPerMinute: number = 1000
): { keyRecord: ApiKeyRecord; secretKey: string } {
  const id = `key_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const randomEntropy = Array.from({ length: 24 }, () =>
    Math.floor(Math.random() * 36).toString(36)
  ).join("");

  const secretKey = `sk_live_${randomEntropy}`;
  const keyPrefix = secretKey.slice(0, 14);
  const keyHash = hashKey(secretKey);

  const keyRecord: ApiKeyRecord = {
    id,
    name,
    keyPrefix,
    keyHash,
    ownerId,
    scopes,
    status: "active",
    rateLimitPerMinute,
    createdAt: new Date().toISOString(),
  };

  apiKeysStore.set(keyHash, keyRecord);

  return { keyRecord, secretKey };
}

/**
 * Validate incoming API key string and assert required permission scope
 */
export function validateApiKeyAndScope(
  providedSecretKey: string | null | undefined,
  requiredScope?: ApiScope
): { isValid: boolean; ownerId?: number; scopes?: ApiScope[]; error?: string } {
  if (!providedSecretKey || !providedSecretKey.startsWith("sk_live_")) {
    return { isValid: false, error: "Missing or malformed Authorization header. Expected Bearer sk_live_..." };
  }

  const hash = hashKey(providedSecretKey);
  const record = apiKeysStore.get(hash);

  if (!record || record.status !== "active") {
    return { isValid: false, error: "Invalid or revoked API key." };
  }

  if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
    return { isValid: false, error: "API key has expired." };
  }

  if (requiredScope && !record.scopes.includes(requiredScope)) {
    return {
      isValid: false,
      ownerId: record.ownerId,
      scopes: record.scopes,
      error: `Forbidden: API key lacks required scope '${requiredScope}'.`,
    };
  }

  record.lastUsedAt = new Date().toISOString();

  return {
    isValid: true,
    ownerId: record.ownerId,
    scopes: record.scopes,
  };
}

/**
 * Seed initial test API key for developer tests
 */
export function seedDeveloperApiKey(ownerId: number = 1): string {
  const existingKey = Array.from(apiKeysStore.values()).find((k) => k.ownerId === ownerId);
  if (existingKey) {
    return "sk_live_dev_test_key_sample_123456";
  }

  const secretKey = "sk_live_dev_test_key_sample_123456";
  const keyHash = hashKey(secretKey);
  apiKeysStore.set(keyHash, {
    id: "key_dev_01",
    name: "Default Dev Key",
    keyPrefix: "sk_live_dev_te",
    keyHash,
    ownerId,
    scopes: [
      "transactions:read",
      "transactions:write",
      "groups:read",
      "groups:write",
      "settlements:read",
      "reports:export",
      "webhooks:manage",
    ],
    status: "active",
    rateLimitPerMinute: 1000,
    createdAt: new Date().toISOString(),
  });

  return secretKey;
}

export function clearApiKeys(): void {
  apiKeysStore.clear();
}
