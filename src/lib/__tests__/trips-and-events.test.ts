import { describe, it, expect, vi } from "vitest";
import {
  createTrip,
  createEvent,
  addPlannedExpense,
  addChecklistItem,
  toggleChecklistItem,
  deleteTrip,
  archiveTrip,
  duplicateTrip,
  getTripDashboardSummary,
} from "@/actions/trips";

// Mock requireAuth
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    id: 1,
    clerkUserId: "user_test_trip_organizer",
    email: "dipak@splitledger.ai",
    name: "Dipak Pawar",
    defaultCurrency: "INR",
  }),
}));

describe("Trip Planning, Event Management & Expense Scheduling (Part VI-M)", () => {
  describe("MODULE 1 & 2: Dynamic Trip & Event Creation with Random 16-Char IDs", () => {
    it("should create a trip with random 16-char ID in INR", async () => {
      const trip = await createTrip({
        name: "Coorg Plantation & Coffee Estate Tour",
        destination: "Coorg, Karnataka",
        category: "road_trip",
        startDate: "2026-10-01",
        endDate: "2026-10-05",
        budgetAmount: 35000,
      });

      expect(trip.id).toMatch(/^trip_[A-Za-z0-9]{16}$/);
      expect(trip.budgetAmount).toBe(35000);
      expect(trip.currency).toBe("INR");
      expect(trip.status).toBe("upcoming");
    });

    it("should reject trip creation with ₹0 or negative budget amount", async () => {
      await expect(
        createTrip({
          name: "Invalid Zero Trip",
          destination: "Somewhere",
          category: "vacation",
          startDate: "2026-10-01",
          endDate: "2026-10-05",
          budgetAmount: 0,
        })
      ).rejects.toThrow("must be greater than ₹0");
    });

    it("should create a shared event linked to group", async () => {
      const event = await createEvent({
        name: "Diwali Festivities & Dinner Party",
        location: "Grand Hyatt Mumbai",
        eventDate: "2026-11-01",
        category: "festival",
        budgetAmount: 25000,
        groupId: 101,
      });

      expect(event.id).toMatch(/^evt_[A-Za-z0-9]{16}$/);
      expect(event.groupId).toBe(101);
      expect(event.budgetAmount).toBe(25000);
    });
  });

  describe("MODULE 3: Trip Management Operations (Delete, Archive, Duplicate)", () => {
    it("should duplicate a trip with a new random public ID", async () => {
      const trip = await createTrip({
        name: "Goa Weekend Getaway",
        destination: "Goa",
        category: "vacation",
        startDate: "2026-11-10",
        endDate: "2026-11-14",
        budgetAmount: 40000,
      });

      const copy = await duplicateTrip(trip.id);
      expect(copy.id).not.toBe(trip.id);
      expect(copy.name).toContain("(Copy)");
    });

    it("should archive a trip", async () => {
      const trip = await createTrip({
        name: "Old Archived Trip",
        destination: "Ooty",
        category: "vacation",
        startDate: "2026-05-01",
        endDate: "2026-05-05",
        budgetAmount: 20000,
      });

      const archived = await archiveTrip(trip.id, true);
      expect(archived.status).toBe("archived");
    });
  });

  describe("MODULE 6: Planned Expense Variance Engine (Actual - Estimated)", () => {
    it("should add planned expense, calculate actual vs estimated variance, and update trip totals", async () => {
      const trip = await createTrip({
        name: "Manali Skiing Vacation",
        destination: "Manali, HP",
        category: "vacation",
        startDate: "2026-12-10",
        endDate: "2026-12-15",
        budgetAmount: 50000,
      });

      // Add planned expense: Estimated ₹15,000, Actual ₹14,200 (Under budget by ₹800)
      const updatedTrip = await addPlannedExpense(trip.id, {
        title: "Solang Valley Snow Gear & Instructors",
        category: "Activities",
        estimatedAmount: 15000,
        actualAmount: 14200,
      });

      expect(updatedTrip.estimatedTotal).toBe(15000);
      expect(updatedTrip.actualTotal).toBe(14200);
      expect(updatedTrip.variance).toBe(-800); // 14,200 - 15,000 = -800
    });
  });

  describe("MODULE 9 & 11: Checklist Toggling & Dashboard Summary", () => {
    it("should add and toggle checklist item completion status", async () => {
      const trip = await createTrip({
        name: "Trek to Valley of Flowers",
        destination: "Uttarakhand",
        category: "trek",
        startDate: "2026-09-01",
        endDate: "2026-09-07",
        budgetAmount: 30000,
      });

      const tripWithItem = await addChecklistItem(trip.id, {
        title: "Trekking Shoes & Down Jacket",
        category: "Packing",
      });

      const item = tripWithItem.checklists[0];
      expect(item.isCompleted).toBe(false);

      const toggledTrip = await toggleChecklistItem(trip.id, item.id);
      expect(toggledTrip.checklists[0].isCompleted).toBe(true);
    });

    it("should compute aggregate trip dashboard metrics in INR dynamically", async () => {
      const summary = await getTripDashboardSummary();

      expect(summary.totalTripsCount).toBeGreaterThanOrEqual(0);
      expect(summary.currency).toBe("INR");
      expect(Array.isArray(summary.trips)).toBe(true);
      expect(Array.isArray(summary.events)).toBe(true);
    });
  });
});
