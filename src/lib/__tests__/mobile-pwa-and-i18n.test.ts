import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";

const manifest = () => {
  const content = fs.readFileSync(path.join(process.cwd(), "public", "manifest.webmanifest"), "utf8");
  return JSON.parse(content);
};
import { offlineSyncManager } from "@/lib/offline/sync-queue";
import { convertCurrency, formatMoney, SUPPORTED_CURRENCIES } from "@/lib/currency";
import { t, isRTL, SUPPORTED_LOCALES } from "@/lib/i18n";

describe("Mobile PWA, Offline Mode, Multi-Currency & Global i18n (Part V-B & V-C)", () => {
  describe("SECTION 2: Progressive Web App Manifest (Part V-B)", () => {
    it("should produce a valid standalone PWA manifest configuration", () => {
      const pwaManifest = manifest();

      expect(pwaManifest.name).toBe("SplitLedger AI - Smart Expense Sharing");
      expect(pwaManifest.short_name).toBe("SplitLedger");
      expect(pwaManifest.display).toBe("standalone");
      expect(pwaManifest.theme_color).toBe("#4f46e5");
      expect(pwaManifest.shortcuts?.length).toBeGreaterThan(0);
      expect(pwaManifest.icons?.length).toBeGreaterThan(0);
    });
  });

  describe("SECTION 3 & 4: Offline Synchronization Queue (Part V-B)", () => {
    beforeEach(() => {
      offlineSyncManager.clear();
    });

    it("should enqueue actions when offline and report queue length", () => {
      const action = offlineSyncManager.enqueue("create_transaction", {
        amount: 1500,
        title: "Team Lunch",
      });

      expect(action.id).toMatch(/^offline_/);
      expect(action.type).toBe("create_transaction");
      expect(offlineSyncManager.getQueueLength()).toBe(1);
    });

    it("should process and flush offline actions upon synchronization", async () => {
      offlineSyncManager.enqueue("add_expense", { amount: 500 });
      offlineSyncManager.enqueue("create_group", { name: "Goa Trip" });

      expect(offlineSyncManager.getQueueLength()).toBe(2);

      const syncedCount = await offlineSyncManager.syncPendingActions();
      expect(syncedCount).toBe(2);
      expect(offlineSyncManager.getQueueLength()).toBe(0);
    });
  });

  describe("SECTION 3 & 4: Multi-Currency & Exchange Rate Engine (Part V-C)", () => {
    it("should accurately convert USD to INR using cached exchange rates", () => {
      const conversion = convertCurrency(100, "USD", "INR");

      expect(conversion.from).toBe("USD");
      expect(conversion.to).toBe("INR");
      expect(conversion.convertedAmount).toBe(8450); // 100 * 84.50
      expect(conversion.rateUsed).toBe(84.5);
    });

    it("should accurately convert EUR to USD cross-currency", () => {
      const conversion = convertCurrency(100, "EUR", "USD");

      expect(conversion.from).toBe("EUR");
      expect(conversion.to).toBe("USD");
      expect(conversion.convertedAmount).toBeGreaterThan(100);
    });

    it("should format Indian Rupees in Indian numbering system (Lakhs / Crores)", () => {
      const formatted = formatMoney(100000, "INR", "en-IN");
      expect(formatted).toContain("1,00,000");
    });

    it("should respect 0 decimal places for Japanese Yen (JPY)", () => {
      expect(SUPPORTED_CURRENCIES.JPY.decimals).toBe(0);
      const conversion = convertCurrency(100, "INR", "JPY");
      expect(Number.isInteger(conversion.convertedAmount)).toBe(true);
    });
  });

  describe("SECTION 8 & 17: Multi-Language & RTL Layout Engine (Part V-C)", () => {
    it("should translate UI keys into Indian regional languages", () => {
      expect(t("dashboard", "hi")).toBe("डैशबोर्ड");
      expect(t("settle_up", "mr")).toBe("हिशोब पूर्ण करा");
      expect(t("groups", "gu")).toBe("જૂથો");
      expect(t("add_expense", "ta")).toBe("செலவைச் சேர்");
      expect(t("reports", "bn")).toBe("প্রতিবেদন");
    });

    it("should translate UI keys into International languages", () => {
      expect(t("transactions", "es")).toBe("Transacciones");
      expect(t("dashboard", "fr")).toBe("Tableau de bord");
      expect(t("ai_assistant", "de")).toBe("KI-Assistent");
      expect(t("reports", "ar")).toBe("التقارير");
    });

    it("should detect Right-to-Left (RTL) direction for Arabic", () => {
      expect(isRTL("ar")).toBe(true);
      expect(isRTL("en")).toBe(false);
      expect(isRTL("hi")).toBe(false);
    });
  });
});
