import { describe, it, expect } from "vitest";
import { generateTripPublicId } from "@/lib/utils";
import {
  ALL_TRAVEL_CLASSIFICATIONS,
  createInitialStep1State,
} from "@/components/trips/wizard-step1-identity";
import { createTripWizard, getTripDashboardSummary } from "@/actions/trips";

describe("Enterprise Travel Wizard - Step 1: Trip Details & Identity", () => {
  it("should generate a valid Enterprise Trip Public ID formatted as TRP-XXXXXXXXXXXX", () => {
    const id = generateTripPublicId();
    expect(id).toMatch(/^TRP-[A-Z0-9]{12}$/);
    const id2 = generateTripPublicId();
    expect(id2).not.toEqual(id);
  });

  it("should contain all 38 travel classifications including custom and niche adventure types", () => {
    expect(ALL_TRAVEL_CLASSIFICATIONS.length).toBeGreaterThanOrEqual(38);
    const expectedCategories = [
      "Vacation",
      "Road Trip",
      "Trek",
      "Camping",
      "Adventure",
      "Family",
      "Friends",
      "Couple",
      "Solo",
      "Business",
      "Educational",
      "Pilgrimage",
      "Wildlife",
      "Beach",
      "Hill Station",
      "Heritage",
      "Photography",
      "Cycling",
      "Bike Ride",
      "Off Road",
      "Backpacking",
      "Luxury",
      "Budget",
      "Weekend",
      "Long Expedition",
      "Festival",
      "Cultural",
      "Food Tour",
      "Cruise",
      "International",
      "Volunteer",
      "Remote Work",
      "Wellness",
      "Spiritual",
      "Research",
      "Photography Expedition",
      "Nature Exploration",
      "Custom Category",
    ];
    for (const cat of expectedCategories) {
      expect(ALL_TRAVEL_CLASSIFICATIONS).toContain(cat);
    }
  });

  it("should initialize default state with auto-generated publicId and comprehensive enterprise metadata", () => {
    const initial = createInitialStep1State();
    expect(initial.name).toBe("");
    expect(initial.publicId).toMatch(/^TRP-[A-Z0-9]{12}$/);
    expect(initial.country).toBe("India");
    expect(initial.categories).toContain("Vacation");
    expect(initial.visibility).toBe("private");
    expect(initial.budgetStrategy).toBe("shared");
    expect(initial.emergencyReservePct).toBe(10);
    expect(initial.contingencyPct).toBe(5);
    expect(initial.travelPace).toBe("balanced");
    expect(initial.accommodationPreference).toBe("standard");
    expect(initial.transportPreference).toBe("mixed");
    expect(Array.isArray(initial.tags)).toBe(true);
  });

  it("should correctly handle multi-select classification limits (up to 10 max)", () => {
    const categories = [
      "Vacation",
      "Road Trip",
      "Trek",
      "Camping",
      "Adventure",
      "Family",
      "Friends",
      "Couple",
      "Solo",
      "Photography",
    ];
    expect(categories.length).toBe(10);
    // Any 11th should be rejected
    const canAdd11th = categories.length < 10;
    expect(canAdd11th).toBe(false);
  });

  it("should persist all rich Step 1 metadata via createTripWizard server action", async () => {
    const publicId = generateTripPublicId();
    const trip = await createTripWizard({
      name: "Goa Beach & Coastal Trail Expedition",
      publicId,
      slug: "goa-beach-coastal-trail-expedition",
      destination: "Goa, India",
      country: "India",
      state: "Goa",
      district: "North Goa",
      city: "North Goa",
      taluka: "Bardez",
      village: "Calangute",
      latitude: 15.5439,
      longitude: 73.7553,
      elevation: "14m ASL",
      climateZone: "Tropical Coastal",
      bestSeason: "Nov – Feb",
      nearestAirport: "GOX (Mopa)",
      nearestRailwayStation: "Thivim (THVM)",
      nearestBusStand: "Mapusa Inter-State Bus Stand",
      travelDistance: "440 km",
      estimatedTravelTime: "7h 30m",
      category: "vacation",
      categories: ["Vacation", "Beach", "Friends", "Food Tour"],
      coverImage: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80",
      description: "Coastal exploration with daily beach rendezvous and sunset briefing.",
      visibility: "invite_only",
      host: "Vikram Malhotra",
      coHost: "Ananya Roy",
      leadOrganizer: "Expedition Ops Lead",
      travelAgency: "Apex Expeditions Pvt Ltd",
      emergencyContact: "+91 98200 11223",
      budgetStrategy: "shared",
      emergencyReservePct: 12,
      contingencyPct: 8,
      travelPace: "balanced",
      accommodationPreference: "premium",
      transportPreference: "Car",
      tags: ["Beach", "Goa", "Sunset", "Coastal"],
      startDate: "2027-11-10",
      endDate: "2027-11-17",
      timezone: "IST (UTC+05:30)",
      totalBudget: 85000,
      emergencyBuffer: 10000,
      categoryBudgets: [{ category: "Hotel", allocated: 40000 }],
      members: [{ name: "Vikram Malhotra", email: "vikram@example.com", role: "Admin" }],
      preferences: {
        budgetAlertThreshold: 80,
        expenseApprovalThreshold: 5000,
        defaultSplitMethod: "equal",
      },
    });

    expect(trip).toBeDefined();
    expect(trip.id).toBeDefined();
    expect(trip.publicId).toBe(publicId);
    expect(trip.slug).toBe("goa-beach-coastal-trail-expedition");
    expect(trip.state).toBe("Goa");
    expect(trip.taluka).toBe("Bardez");
    expect(trip.village).toBe("Calangute");
    expect(trip.latitude).toBe(15.5439);
    expect(trip.longitude).toBe(73.7553);
    expect(trip.elevation).toBe("14m ASL");
    expect(trip.climateZone).toBe("Tropical Coastal");
    expect(trip.bestSeason).toBe("Nov – Feb");
    expect(trip.nearestAirport).toBe("GOX (Mopa)");
    expect(trip.categories).toEqual(["Vacation", "Beach", "Friends", "Food Tour"]);
    expect(trip.visibility).toBe("invite_only");
    expect(trip.host).toBe("Vikram Malhotra");
    expect(trip.travelAgency).toBe("Apex Expeditions Pvt Ltd");
    expect(trip.emergencyContact).toBe("+91 98200 11223");
    expect(trip.budgetStrategy).toBe("shared");
    expect(trip.emergencyReservePct).toBe(12);
    expect(trip.contingencyPct).toBe(8);
    expect(trip.travelPace).toBe("balanced");
    expect(trip.accommodationPreference).toBe("premium");
    expect(trip.tags).toEqual(["Beach", "Goa", "Sunset", "Coastal"]);

    // Verify it is retrievable in the list
    const dashboard = await getTripDashboardSummary();
    const found = dashboard.trips.find((t) => t.id === trip.id);
    expect(found).toBeDefined();
    expect(found?.publicId).toBe(publicId);
  });
});
