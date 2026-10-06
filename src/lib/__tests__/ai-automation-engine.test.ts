import { describe, it, expect } from "vitest";
import { categorizeExpense } from "@/lib/ai/categorizer";
import { checkDuplicateExpense } from "@/lib/ai/duplicate-detector";
import { detectSubscriptions } from "@/lib/ai/subscription-detector";
import { parseNaturalLanguageSearch } from "@/lib/ai/nlp-search";

describe("AI Automation Engine & Financial Intelligence (Part V-A)", () => {
  describe("SECTION 2: Smart Expense Categorization", () => {
    it("should classify food and restaurant expenses with high confidence", () => {
      const result = categorizeExpense("Dinner at Taj Restaurant with Team");
      expect(result.category).toBe("Food & Dining");
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.reasoning.toLowerCase()).toContain("dinner");
    });

    it("should classify travel and flight bookings", () => {
      const result = categorizeExpense("MakeMyTrip Flight to Goa");
      expect(result.category).toBe("Travel & Trips");
      expect(result.confidence).toBeGreaterThan(0.85);
      expect(result.suggestedTags).toContain("travel");
    });

    it("should classify digital subscriptions", () => {
      const result = categorizeExpense("Netflix 4K UHD Monthly Plan");
      expect(result.category).toBe("Subscriptions");
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it("should classify petrol and fuel expenses", () => {
      const result = categorizeExpense("HPCL Petrol Fueling");
      expect(result.category).toBe("Petrol & Fuel");
      expect(result.confidence).toBeGreaterThan(0.9);
    });
  });

  describe("SECTION 3: Duplicate Expense Detection", () => {
    const existingExpenses = [
      { id: 1, description: "Dinner at Taj", amount: 4200, date: "2026-08-28T19:30:00Z", groupId: 1, payerId: 1 },
      { id: 2, description: "Uber to Airport", amount: 850, date: "2026-08-25T10:00:00Z", groupId: 1, payerId: 1 },
    ];

    it("should flag similar amount and description within 72h as duplicate", () => {
      const candidate = {
        id: 3,
        description: "Dinner at Taj Restaurant",
        amount: 4200,
        date: "2026-08-29T10:00:00Z", // Within 24h
        groupId: 1,
        payerId: 1,
      };

      const result = checkDuplicateExpense(candidate, existingExpenses);
      expect(result.isPotentialDuplicate).toBe(true);
      expect(result.similarityScore).toBeGreaterThan(0.7);
      expect(result.matchReason).toContain("Similar amount");
    });

    it("should not flag distinct expenses as duplicates", () => {
      const candidate = {
        id: 4,
        description: "Flight to Delhi",
        amount: 5500,
        date: "2026-08-29T10:00:00Z",
        groupId: 1,
        payerId: 1,
      };

      const result = checkDuplicateExpense(candidate, existingExpenses);
      expect(result.isPotentialDuplicate).toBe(false);
    });
  });

  describe("SECTION 10: Recurring Subscription Detection", () => {
    const sampleHistory = [
      { title: "Netflix Monthly", description: "Standard Plan", amount: 649, date: "2026-08-15" },
      { title: "Spotify Premium", description: "Music Family", amount: 179, date: "2026-08-10" },
      { title: "Amazon Prime", description: "Annual", amount: 1499, date: "2026-05-01" },
    ];

    it("should identify recurring subscriptions and calculate annual run-rates in INR", () => {
      const subscriptions = detectSubscriptions(sampleHistory);

      expect(subscriptions.length).toBe(3);

      const netflix = subscriptions.find((s) => s.name === "Netflix");
      expect(netflix).toBeDefined();
      expect(netflix?.monthlyAmount).toBe(649);
      expect(netflix?.annualizedCost).toBe(649 * 12);
      expect(netflix?.nextEstimatedBillingDate).toMatch(/^2026-09-/);
    });
  });

  describe("SECTION 12: Natural Language AI Search Parsing", () => {
    it("should parse category, amount threshold, and person filters", () => {
      const parsed = parseNaturalLanguageSearch("Show food expenses above ₹1000 by Rahul");

      expect(parsed.category).toBe("Food & Dining");
      expect(parsed.minAmount).toBe(1000);
      expect(parsed.personKeyword?.toLowerCase()).toBe("rahul");
    });

    it("should parse unpaid settlement queries", () => {
      const parsed = parseNaturalLanguageSearch("Show unpaid settlements under 500");

      expect(parsed.status).toBe("pending");
      expect(parsed.maxAmount).toBe(500);
    });
  });
});
