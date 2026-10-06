import { describe, it, expect, beforeEach } from "vitest";
import {
  generateApiKey,
  validateApiKeyAndScope,
  clearApiKeys,
} from "@/lib/api-gateway/api-keys";
import {
  generateWebhookSignature,
  verifyWebhookSignature,
  registerWebhookSubscription,
  dispatchWebhookEvent,
  clearWebhooks,
} from "@/lib/webhooks/dispatcher";
import { SplitLedgerClient } from "@/lib/sdk";

describe("Public REST API, Webhooks & SDK Platform (Part V-E)", () => {
  describe("SECTION 3, 4 & 5: API Key Management & Scopes", () => {
    beforeEach(() => {
      clearApiKeys();
    });

    it("should generate cryptographically secure API keys with prefix", () => {
      const { keyRecord, secretKey } = generateApiKey(1, "Test Integration Key", [
        "transactions:read",
        "groups:read",
      ]);

      expect(secretKey).toMatch(/^sk_live_/);
      expect(keyRecord.keyPrefix).toBe(secretKey.slice(0, 14));
      expect(keyRecord.scopes).toContain("transactions:read");
      expect(keyRecord.scopes).toContain("groups:read");
    });

    it("should validate active API keys and assert required scopes", () => {
      const { secretKey } = generateApiKey(1, "Read-Only Key", ["transactions:read"]);

      const validAuth = validateApiKeyAndScope(secretKey, "transactions:read");
      expect(validAuth.isValid).toBe(true);
      expect(validAuth.ownerId).toBe(1);

      const invalidScopeAuth = validateApiKeyAndScope(secretKey, "transactions:write");
      expect(invalidScopeAuth.isValid).toBe(false);
      expect(invalidScopeAuth.error).toContain("lacks required scope");
    });

    it("should reject invalid or malformed API keys", () => {
      const auth = validateApiKeyAndScope("invalid_token_123");
      expect(auth.isValid).toBe(false);
      expect(auth.error).toContain("Expected Bearer sk_live_");
    });
  });

  describe("SECTION 7 & 8: Webhook Architecture & HMAC Signatures", () => {
    beforeEach(() => {
      clearWebhooks();
    });

    const secret = "whsec_test_secret_key_8899";
    const payload = { id: 101, amount: 2500, currency: "INR", title: "Dinner" };

    it("should generate and verify HMAC-SHA256 signatures", () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signatureHeader = generateWebhookSignature(payload, secret, timestamp);

      expect(signatureHeader).toContain(`t=${timestamp}`);
      expect(signatureHeader).toContain("v1=");

      const isValid = verifyWebhookSignature(payload, signatureHeader, secret);
      expect(isValid).toBe(true);
    });

    it("should reject mismatched signatures or incorrect secrets", () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signatureHeader = generateWebhookSignature(payload, secret, timestamp);

      const isInvalid = verifyWebhookSignature(payload, signatureHeader, "wrong_secret");
      expect(isInvalid).toBe(false);
    });

    it("should register subscriptions and dispatch webhook events", async () => {
      const sub = registerWebhookSubscription(
        1,
        "https://api.merchant.com/splitledger-webhook",
        ["transaction.created"]
      );

      expect(sub.id).toMatch(/^whk_/);
      expect(sub.status).toBe("active");

      const dispatchResult = await dispatchWebhookEvent("transaction.created", payload, 1);
      expect(dispatchResult.totalMatched).toBe(1);
      expect(dispatchResult.dispatched).toBe(1);
    });
  });

  describe("SECTION 11: Official TypeScript SDK Client", () => {
    it("should initialize client and provide typed resource namespaces", () => {
      const client = new SplitLedgerClient({
        apiKey: "sk_live_sample_token_12345",
        baseUrl: "https://api.splitledger.ai",
      });

      expect(client.transactions).toBeDefined();
      expect(client.groups).toBeDefined();
      expect(client.settlements).toBeDefined();
      expect(client.webhooks).toBeDefined();
    });

    it("should throw an error when initialized without API key", () => {
      expect(() => new SplitLedgerClient({ apiKey: "" })).toThrow("API key");
    });
  });
});
