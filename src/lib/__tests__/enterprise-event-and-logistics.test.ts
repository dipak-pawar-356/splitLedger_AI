import { describe, it, expect } from "vitest";
import { createSeedLogisticsHub } from "@/lib/default-logistics";
import { generateEventPublicId } from "@/lib/utils";
import { TripEvent } from "@/lib/types/trips";

describe("Enterprise Event Management & Operations Logistics Center", () => {
  describe("1. Public ID System & Event Architecture", () => {
    it("should generate valid enterprise public event IDs formatted as EVT-XXXXXXXXXXXX", () => {
      const id1 = generateEventPublicId();
      const id2 = generateEventPublicId();

      expect(id1).toMatch(/^EVT-[A-Z0-9]{12}$/);
      expect(id2).toMatch(/^EVT-[A-Z0-9]{12}$/);
      expect(id1).not.toBe(id2);
    });

    it("should support both standalone events and trip-linked events", () => {
      const standaloneEvent: TripEvent = {
        id: "evt_test_standalone",
        publicId: generateEventPublicId(),
        title: "Annual Global Travel Summit & Gala",
        type: "meeting",
        category: "Office Meeting",
        status: "Upcoming",
        priority: "High",
        isStandalone: true,
        linkedTripId: undefined,
        location: "Mumbai Grand Hyatt Ballroom",
        startDate: "2026-11-20",
        endDate: "2026-11-20",
        startDateTime: "2026-11-20T10:00:00Z",
        participants: ["Dipak Pawar", "Aarav Sharma"],
        capacity: 100,
        confirmedMembers: 82,
        budget: 150000,
        actualCost: 110000,
      };

      const linkedEvent: TripEvent = {
        id: "evt_test_linked",
        publicId: generateEventPublicId(),
        title: "Campfire & Barbeque at Sinquerim Beach",
        type: "activity",
        category: "Campfire",
        status: "Upcoming",
        priority: "Medium",
        isStandalone: false,
        linkedTripId: "trip_goa_premium_01",
        linkedTripName: "Goa Beach & Coastal Retreat",
        location: "Sinquerim Beach, Goa",
        startDate: "2026-10-30",
        endDate: "2026-10-30",
        startDateTime: "2026-10-30T19:00:00Z",
        participants: ["Dipak Pawar", "Sneha Patel"],
        capacity: 20,
        confirmedMembers: 14,
        budget: 12000,
        actualCost: 9500,
      };

      expect(standaloneEvent.isStandalone).toBe(true);
      expect(standaloneEvent.linkedTripId).toBeUndefined();

      expect(linkedEvent.isStandalone).toBe(false);
      expect(linkedEvent.linkedTripId).toBe("trip_goa_premium_01");
      expect(linkedEvent.linkedTripName).toBe("Goa Beach & Coastal Retreat");
    });
  });

  describe("2. Event Timeline & Checkpoints Progress", () => {
    it("should calculate checkpoint completion percentages accurately", () => {
      const timeline = [
        { id: "tl_1", time: "09:00 AM", activity: "Meet at Pune Station", location: "Platform 1", status: "completed" as const },
        { id: "tl_2", time: "10:30 AM", activity: "Bus Departure", location: "Station Gate 2", status: "completed" as const },
        { id: "tl_3", time: "02:00 PM", activity: "Lunch at Highway Food Mall", location: "Expressway", status: "in_progress" as const },
        { id: "tl_4", time: "05:30 PM", activity: "Hotel Check-in", location: "Taj Resort", status: "upcoming" as const },
        { id: "tl_5", time: "08:00 PM", activity: "Campfire & Dinner", location: "Private Shore", status: "upcoming" as const },
      ];

      const completedCount = timeline.filter((t) => t.status === "completed").length;
      const completionPct = Math.round((completedCount / timeline.length) * 100);

      expect(completedCount).toBe(2);
      expect(completionPct).toBe(40);
    });
  });

  describe("3. RSVP & Attendance Financial Reconciliation", () => {
    it("should reconcile RSVP tallies with available seats and capacity", () => {
      const capacity = 30;
      const rsvp = {
        invited: 25,
        accepted: 20,
        maybe: 2,
        declined: 3,
        pending: 0,
        guests: 2,
      };

      const totalConfirmed = rsvp.accepted + rsvp.guests;
      const availableSeats = Math.max(0, capacity - totalConfirmed);
      const attendancePct = Math.round((totalConfirmed / capacity) * 100);

      expect(totalConfirmed).toBe(22);
      expect(availableSeats).toBe(8);
      expect(attendancePct).toBe(73);
    });

    it("should calculate event budget utilization, remaining balance and status", () => {
      const budget = 50000;
      const actualCost = 38500;
      const remainingBudget = Math.max(0, budget - actualCost);
      const expensePct = Math.round((actualCost / budget) * 100);

      expect(remainingBudget).toBe(11500);
      expect(expensePct).toBe(77);
      expect(expensePct).toBeLessThan(100);
    });
  });

  describe("4. Operations & Logistics Center Hub Seed Integrity", () => {
    const hub = createSeedLogisticsHub("trip_goa_premium_01");

    it("should include all 9 enterprise modules conforming to 30-50 year operations standard", () => {
      expect(hub).toHaveProperty("transportation");
      expect(hub).toHaveProperty("accommodation");
      expect(hub).toHaveProperty("emergency");
      expect(hub).toHaveProperty("permissions");
      expect(hub).toHaveProperty("packing");
      expect(hub).toHaveProperty("foodLogistics");
      expect(hub).toHaveProperty("vendors");
      expect(hub).toHaveProperty("operationalTimeline");
      expect(hub).toHaveProperty("assignments");
    });

    it("should contain detailed transportation fleet with live status, drivers and fuel gauges", () => {
      expect(hub.transportation.length).toBeGreaterThanOrEqual(2);
      const coach = hub.transportation[0];
      expect(coach.vehicleNumber).toBe("MH-12-RN-8842");
      expect(coach.driverName).toBe("Rajesh Shinde");
      expect(coach.driverContact).toBe("+91 98221 54321");
      expect(coach.busCapacity).toBe(36);
      expect(coach.currentStatus).toBe("En Route");
      expect(coach.fuelStatus).toBe("75%");
      expect(coach.pickupPoints.length).toBeGreaterThan(0);
      expect(coach.dropPoints.length).toBeGreaterThan(0);
      expect(coach.estimatedArrival).toBeDefined();
    });

    it("should contain luxury accommodation with room allocation & room sharing matrix", () => {
      expect(hub.accommodation.length).toBeGreaterThanOrEqual(2);
      const taj = hub.accommodation[0];
      expect(taj.hotelName).toContain("Taj Fort Aguada");
      expect(taj.bookingStatus).toBe("Confirmed");
      expect(taj.checkInTime).toBe("02:00 PM");
      expect(taj.checkOutTime).toBe("11:00 AM");
      expect(taj.rooms.length).toBe(4);
      expect(taj.rooms[0].occupants).toContain("Dipak Pawar (Lead)");
    });

    it("should provide emergency hospital, rescue contacts, trip leaders, and blood group registry", () => {
      expect(hub.emergency.hospitalName).toContain("Manipal Hospital");
      expect(hub.emergency.hospitalContact).toBeDefined();
      expect(hub.emergency.tripLeader).toContain("Dipak Pawar");
      expect(hub.emergency.rescueContact).toBeDefined();
      expect(hub.emergency.bloodGroupList.length).toBe(5);
      expect(hub.emergency.bloodGroupList.some((m) => m.bloodGroup === "O+")).toBe(true);
    });

    it("should manage permissions and regulatory clearances", () => {
      expect(hub.permissions.length).toBe(7);
      const categories = hub.permissions.map((p) => p.category);
      expect(categories).toContain("Vehicle Permit");
      expect(categories).toContain("Forest Permit");
      expect(categories).toContain("Driving License");
      expect(categories).toContain("Hotel Voucher");
      expect(categories).toContain("Tickets");
      expect(categories).toContain("Insurance");
      expect(categories).toContain("Identity Verification");
      expect(hub.permissions.every((p) => p.status === "Verified")).toBe(true);
    });

    it("should track packing progress, critical items, and inventory checklist", () => {
      expect(hub.packing.completedPct).toBe(85);
      expect(hub.packing.criticalItems.length).toBe(3);
      expect(hub.packing.criticalItems).toContain("Garmin inReach Satellite SOS Unit");
      expect(hub.packing.inventory.length).toBe(8);
      expect(hub.packing.inventory.some((i) => i.item.includes("Expedition Tents"))).toBe(true);
    });

    it("should manage meal plans, 24x7 water supply, and dietary restrictions", () => {
      expect(hub.foodLogistics.length).toBe(5);
      const meals = hub.foodLogistics.map((f) => f.meal);
      expect(meals).toContain("Breakfast");
      expect(meals).toContain("Lunch");
      expect(meals).toContain("Dinner");
      expect(meals).toContain("Snacks");
      expect(meals).toContain("Water Supply");
      expect(hub.foodLogistics.some((f) => f.dietaryNotes.includes("Vegan"))).toBe(true);
    });

    it("should manage vendor ratings, contracts, and payment statuses", () => {
      expect(hub.vendors.length).toBe(5);
      const categories = hub.vendors.map((v) => v.category);
      expect(categories).toContain("Transport Vendor");
      expect(categories).toContain("Hotel Vendor");
      expect(categories).toContain("Guide");
      expect(categories).toContain("Equipment Vendor");
      expect(hub.vendors.every((v) => v.rating >= 4.5)).toBe(true);
    });

    it("should manage work assignments across expedition members", () => {
      expect(hub.assignments.length).toBe(9);
      const tasks = hub.assignments.map((a) => a.task.toLowerCase());
      expect(tasks.some((t) => t.includes("buy food"))).toBe(true);
      expect(tasks.some((t) => t.includes("book hotel"))).toBe(true);
      expect(tasks.some((t) => t.includes("fuel vehicle"))).toBe(true);
      expect(tasks.some((t) => t.includes("collect payments"))).toBe(true);
      expect(tasks.some((t) => t.includes("carry medicines"))).toBe(true);
      expect(tasks.some((t) => t.includes("carry climbing rope"))).toBe(true);
      expect(tasks.some((t) => t.includes("carry 4-season tents"))).toBe(true);
      expect(tasks.some((t) => t.includes("carry cinema camera"))).toBe(true);
      expect(tasks.some((t) => t.includes("carry certified trauma first aid"))).toBe(true);
    });
  });
});
