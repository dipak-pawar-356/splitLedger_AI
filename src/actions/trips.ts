"use server";

import { requireAuth } from "@/lib/auth";
import {
  TripRecord,
  TripCategory,
  TripStatus,
  TripEventStatus,
  EnterpriseEventStatus,
  EventPriority,
  MemberRole,
  TripDashboardMetrics,
  CategoryBudget,
  TripMember,
  TripExpense,
  TripSettlement,
  ItineraryItem,
  TripEvent,
  TripDocument,
  TripChecklistItem,
  BudgetCategoryKey,
  DestinationIntelligence,
  TripLogisticsHub,
} from "@/lib/types/trips";
import { DatabaseError, ValidationError } from "@/lib/errors";
import { generatePublicId, generateTripPublicId, generateEventPublicId } from "@/lib/utils";
import { ensureEnterpriseSessionData } from "@/actions/enterprise-operations";
import { createSeedLogisticsHub } from "@/lib/default-logistics";

// In-memory persistent session stores per user
const tripsStore = new Map<string, TripRecord[]>();

const DEFAULT_CATEGORIES: BudgetCategoryKey[] = [
  "Transportation",
  "Hotel",
  "Accommodation",
  "Food",
  "Fuel",
  "Shopping",
  "Adventure",
  "Camping",
  "Medical",
  "Insurance",
  "Tickets",
  "Entry Tickets",
  "Guide Charges",
  "Parking",
  "Emergency",
  "Miscellaneous",
  "Custom",
];

const CATEGORY_COLORS: Record<BudgetCategoryKey, string> = {
  Transportation: "#3b82f6", // Blue
  Hotel: "#8b5cf6", // Purple
  Accommodation: "#8b5cf6", // Purple
  Food: "#10b981", // Emerald
  Fuel: "#f59e0b", // Amber
  Shopping: "#ec4899", // Pink
  Adventure: "#06b6d4", // Cyan
  Camping: "#10b981", // Forest Green
  "Entry Tickets": "#6366f1", // Indigo
  Tickets: "#6366f1", // Indigo
  Medical: "#ef4444", // Red
  Insurance: "#38bdf8", // Sky Blue
  "Guide Charges": "#d97706", // Amber
  Parking: "#64748b", // Slate
  Emergency: "#f97316", // Orange
  Miscellaneous: "#64748b", // Slate
  Custom: "#14b8a6", // Teal
};

/**
 * Record an audit log event on a trip
 */
function recordAuditLog(
  trip: TripRecord,
  actorName: string,
  category: "trip" | "budget" | "expense" | "member" | "settlement" | "event" | "checklist" | "document",
  action: string,
  details: string
) {
  if (!trip.auditLogs) trip.auditLogs = [];
  trip.auditLogs.unshift({
    id: generatePublicId("aud"),
    timestamp: new Date().toISOString(),
    actorName,
    category,
    action,
    details,
  });
  if (trip.auditLogs.length > 100) trip.auditLogs.pop();
}

/**
 * Enterprise Destination Intelligence & GIS Hub Enricher
 * Supplies comprehensive travel parameters, logistics, safety, emergency contacts,
 * weather, coordinates, and nearby points of interest for any destination.
 */
function enrichDestinationIntelligence(
  destination: string,
  country: string = "India",
  state?: string,
  city?: string
): DestinationIntelligence {
  const destLower = (destination || "").toLowerCase();

  if (destLower.includes("goa")) {
    return {
      country: "India",
      state: "Goa",
      district: "North Goa",
      city: "Calangute & Vagator",
      area: "Baga - Anjuna Coastal Belt",
      region: "Konkan Coast",
      nearestAirport: "Manohar International Airport, Mopa (GOX) - 28 km",
      nearestRailwayStation: "Thivim Railway Station (THVM) - 19 km / Madgaon (MAO) - 48 km",
      nearestBusStation: "Mapusa KTC Inter-State Bus Stand - 8 km",
      timezone: "IST (UTC+05:30)",
      currency: "INR (₹)",
      languages: ["Konkani", "English", "Hindi", "Marathi", "Portuguese"],
      emergencyNumbers: {
        police: "112 / 100",
        ambulance: "108",
        fire: "101",
        womenHelpline: "1091",
        touristHelpline: "1363 (Toll Free 24x7)",
      },
      coordinates: {
        latitude: 15.5439,
        longitude: 73.7553,
        altitudeMeters: 7,
      },
      climate: {
        type: "Tropical Maritime Climate",
        avgTempCelsius: 28,
        minTempCelsius: 22,
        maxTempCelsius: 32,
        sunriseTime: "06:18 AM",
        sunsetTime: "06:44 PM",
        bestSeason: "October to March (Peak Season)",
        expectedWeather: "Sunny with gentle coastal sea breeze",
        rainProbabilityPct: 12,
        airQualityIndex: 42,
        airQualityStatus: "Good",
        crowdLevel: "Moderate",
      },
      logistics: {
        travelDifficulty: "Easy",
        roadCondition: "Paved Highways",
        networkAvailability: "5G High Speed",
        internetSpeedMbps: 180,
        electricityReliability: "24/7 Grid Power",
        drinkingWaterAvailability: "Readily Available",
        fuelAvailability: "Stations Every 5km",
        parkingAvailability: "Free Dedicated Parking",
      },
      amenities: {
        medicalFacilities: "Tertiary Multi-Speciality Hospitals & 24hr Coastal Clinics",
        nearbyHospital: "Manipal Hospital & District General Hospital Mapusa",
        nearbyHospitalDistanceKm: 6.2,
        nearbyHospitalPhone: "+91-832-2456600",
        policeStation: "Calangute Police Station",
        policeStationDistanceKm: 1.8,
        policeStationPhone: "+91-832-2278211",
        touristHelpCenter: "Goa Tourism Development Corp (GTDC) Information Counter",
        nearbyAtm: "HDFC, SBI, ICICI & Axis 24/7 ATMs within 400m",
        nearbyMedicalStores: ["Apollo Pharmacy (24/7)", "Wellness Forever Calangute", "Frank's Chemist"],
        nearbyHotels: [
          { name: "Taj Fort Aguada Resort & Spa", rating: 4.8, approxPriceNight: 16500, distanceKm: 4.1 },
          { name: "W Goa Beachfront Vagator", rating: 4.7, approxPriceNight: 22000, distanceKm: 7.8 },
          { name: "Hyatt Centric Candolim", rating: 4.6, approxPriceNight: 9800, distanceKm: 2.5 },
        ],
        nearbyRestaurants: [
          { name: "Fisherman's Wharf", cuisine: "Goan Seafood & Continental", rating: 4.7, distanceKm: 3.2 },
          { name: "Thalassa Greek Taverna", cuisine: "Greek & Mediterranean", rating: 4.6, distanceKm: 6.5 },
          { name: "Gunpowder Assagao", cuisine: "South Indian Coastal", rating: 4.8, distanceKm: 8.1 },
        ],
        nearbyFuelStations: [
          { name: "Indian Oil Coastal Outlet (Chogm Rd)", distanceKm: 1.4, hasAirWater: true },
          { name: "Bharat Petroleum Calangute Circle", distanceKm: 2.1, hasAirWater: true },
        ],
        nearbyParking: [
          { name: "Calangute Beach Central Paid Lot", type: "Municipal 4-Wheeler & Two-Wheeler", distanceKm: 0.6 },
          { name: "Baga Creek Municipal Parking", type: "Covered Multi-level Parking", distanceKm: 1.9 },
        ],
      },
      pointsOfInterest: {
        topAttractions: [
          { name: "Aguada Fort & Portuguese Lighthouse", type: "Historical Fort", distanceKm: 4.5, entryFee: 50, mapsQuery: "Aguada Fort Goa" },
          { name: "Chapora Fort (Dil Chahta Hai viewpoint)", type: "Sunset Viewpoint", distanceKm: 7.2, entryFee: 0, mapsQuery: "Chapora Fort Goa" },
          { name: "Basilica of Bom Jesus (UNESCO Site)", type: "Heritage Architecture", distanceKm: 22, entryFee: 0, mapsQuery: "Basilica of Bom Jesus Old Goa" },
        ],
        trekRoutes: [
          { name: "Sinquerim to Fort Aguada Cliff Trail", difficulty: "Easy to Moderate", durationHours: 2.5, distanceKm: 3.5 },
          { name: "Vagator to Chapora Red Hills Hike", difficulty: "Easy", durationHours: 1.5, distanceKm: 2.2 },
        ],
        waterfalls: [
          { name: "Dudhsagar Waterfalls (Tiered Falls)", bestTime: "Monsoon & Post-Monsoon", distanceKm: 72 },
          { name: "Hivre Waterfalls Valpoi", bestTime: "July to November", distanceKm: 54 },
        ],
        forts: [
          { name: "Fort Aguada (1612 AD)", era: "Portuguese Maritime Citadel", distanceKm: 4.5 },
          { name: "Reis Magos Fort", era: "1551 AD Restored Fortress", distanceKm: 8.4 },
        ],
        temples: [
          { name: "Shri Mangeshi Temple Ponda", deity: "Lord Shiva", timings: "06:00 AM - 10:00 PM" },
          { name: "Shanta Durga Temple Kavlem", deity: "Goddess Durga", timings: "06:30 AM - 09:30 PM" },
        ],
        beaches: [
          { name: "Anjuna Beach (Curlies & Flea Market)", waterSports: true, cleanRating: 4.6 },
          { name: "Ashwem Beach (Serene White Sands)", waterSports: false, cleanRating: 4.9 },
          { name: "Calangute & Baga Beach (Watersports Hub)", waterSports: true, cleanRating: 4.4 },
        ],
        markets: [
          { name: "Anjuna Wednesday Flea Market", speciality: "Handicrafts, Bohemian Jewelry & Spices", distanceKm: 6.8 },
          { name: "Mapusa Friday Local Produce Market", speciality: "Goan Chorizo, Cashews & Pottery", distanceKm: 8.2 },
        ],
      },
      safetyRatings: {
        overallSafetyScore: 94,
        familyFriendly: true,
        petFriendly: true,
        soloFriendly: true,
        wheelchairAccessible: true,
        nightSafetyScore: 92,
        safetyRemarks: "Highly safe tourist zone with 24/7 tourist police patrol and illuminated beach promenades.",
      },
      cultureAndRules: {
        unescoStatus: "Churches and Convents of Goa UNESCO World Heritage Site (1986)",
        govtTourismUrl: "https://goa-tourism.com",
        officialWebsite: "https://www.goa.gov.in",
        wikipediaUrl: "https://en.wikipedia.org/wiki/Goa",
        localRules: [
          "Drinking alcohol in open public beach areas outside licensed shacks is strictly prohibited.",
          "Driving any vehicle onto beach sands carries an immediate ₹50,000 court penalty and vehicle impound.",
          "Wearing life jackets is mandatory for all watersports and boat rides.",
        ],
        photographyRules: "Commercial photography in heritage precincts requires Archeological Survey of India (ASI) clearance.",
        droneRules: "Permitted with License",
        requiredPermits: ["Dudhsagar Jeep Safari Forest Entry Permit (Online via Goa Forest Dept)"],
        packingSuggestions: [
          "UV 50+ Sunscreen and Aloe Vera gel",
          "Breathable linen & quick-dry cotton garments",
          "Waterproof dry bag for boat rides and electronics",
          "Slip-on water shoes and polaroid sunglasses",
          "Universal adapter and power bank",
        ],
      },
    };
  }

  if (destLower.includes("manali") || destLower.includes("himachal") || destLower.includes("trek")) {
    return {
      country: "India",
      state: "Himachal Pradesh",
      district: "Kullu",
      city: "Manali",
      area: "Old Manali & Solang Valley",
      region: "Western Himalayas",
      nearestAirport: "Kullu-Manali Airport, Bhuntar (KUU) - 50 km",
      nearestRailwayStation: "Chandigarh Junction (CDG) - 310 km / Una Himachal - 240 km",
      nearestBusStation: "Manali Volvo Bus Stand (Mall Road) - 1.2 km",
      timezone: "IST (UTC+05:30)",
      currency: "INR (₹)",
      languages: ["Hindi", "Pahari", "English", "Punjabi"],
      emergencyNumbers: {
        police: "112 / 100 / 01902-252322",
        ambulance: "108 / 01902-253385",
        fire: "101",
        womenHelpline: "1091",
        touristHelpline: "01902-253531",
      },
      coordinates: {
        latitude: 32.2396,
        longitude: 77.1887,
        altitudeMeters: 2050,
      },
      climate: {
        type: "Subtropical Highland / Alpine",
        avgTempCelsius: 14,
        minTempCelsius: 4,
        maxTempCelsius: 22,
        sunriseTime: "05:52 AM",
        sunsetTime: "06:38 PM",
        bestSeason: "March to June (Summer) & Dec to Feb (Snow)",
        expectedWeather: "Clear mountain skies with crisp cool breezes",
        rainProbabilityPct: 8,
        airQualityIndex: 18,
        airQualityStatus: "Good",
        crowdLevel: "Moderate",
      },
      logistics: {
        travelDifficulty: "Moderate",
        roadCondition: "Good Asphalt",
        networkAvailability: "4G LTE Solid",
        internetSpeedMbps: 95,
        electricityReliability: "24/7 Grid Power",
        drinkingWaterAvailability: "Bottled Water Recommended",
        fuelAvailability: "Regular Stations",
        parkingAvailability: "Paid Public Parking",
      },
      amenities: {
        medicalFacilities: "Civil Hospital Manali & Himalayan Mountaineering Emergency Clinic",
        nearbyHospital: "Civil Hospital Manali",
        nearbyHospitalDistanceKm: 1.5,
        nearbyHospitalPhone: "+91-1902-252243",
        policeStation: "Manali Police Station (Mall Road)",
        policeStationDistanceKm: 1.1,
        policeStationPhone: "+91-1902-252322",
        touristHelpCenter: "Himachal Tourism (HPTDC) Information Centre, The Mall",
        nearbyAtm: "SBI, PNB, HDFC ATMs on Mall Road & Old Manali Bridge",
        nearbyMedicalStores: ["Gupta Medical Hall (24 hrs)", "Himalayan Medicos Old Manali"],
        nearbyHotels: [
          { name: "The Himalayan Resort & Spa", rating: 4.8, approxPriceNight: 14500, distanceKm: 2.1 },
          { name: "Span Resort & Spa Kullu Valley", rating: 4.7, approxPriceNight: 18000, distanceKm: 14.5 },
          { name: "Johnson Lodge & Spa", rating: 4.6, approxPriceNight: 7200, distanceKm: 0.8 },
        ],
        nearbyRestaurants: [
          { name: "Cafe 1947 Old Manali", cuisine: "Italian & Wood-Fired Pizza", rating: 4.7, distanceKm: 1.9 },
          { name: "Johnson's Bar & Restaurant", cuisine: "Trout Speciality & Continental", rating: 4.6, distanceKm: 0.8 },
          { name: "Chopsticks Restaurant", cuisine: "Tibetan & Chinese Momos", rating: 4.5, distanceKm: 0.5 },
        ],
        nearbyFuelStations: [
          { name: "Indian Oil Petrol Pump Rangri", distanceKm: 2.8, hasAirWater: true },
          { name: "HP Fuel Station Mall Road", distanceKm: 1.2, hasAirWater: false },
        ],
        nearbyParking: [
          { name: "Model Town Municipal Multi-Level Parking", type: "Covered 500-Car Facility", distanceKm: 0.4 },
          { name: "Old Manali Club House Parking", type: "Open Ground Parking", distanceKm: 2.0 },
        ],
      },
      pointsOfInterest: {
        topAttractions: [
          { name: "Atal Tunnel Rohtang & Sissu Valley", type: "High Altitude Engineering Marvel", distanceKm: 28, entryFee: 0, mapsQuery: "Atal Tunnel Manali" },
          { name: "Solang Valley Adventures (Paragliding & Zipline)", type: "Adventure Valley", distanceKm: 13, entryFee: 0, mapsQuery: "Solang Valley Manali" },
          { name: "Hadimba Devi Temple (1553 AD)", type: "Ancient Cedar Wood Temple", distanceKm: 2.2, entryFee: 0, mapsQuery: "Hadimba Temple Manali" },
        ],
        trekRoutes: [
          { name: "Jogini Waterfall Cliff Hike", difficulty: "Easy to Moderate", durationHours: 3.0, distanceKm: 4.2 },
          { name: "Bhrigu Lake Alpine Glacial Trek", difficulty: "Challenging", durationHours: 14.0, distanceKm: 24 },
          { name: "Hampta Pass & Chandratal Cross-Over", difficulty: "Challenging", durationHours: 96.0, distanceKm: 35 },
        ],
        waterfalls: [
          { name: "Jogini Waterfall Vashisht", bestTime: "April to November", distanceKm: 4.2 },
          { name: "Rahala Falls Rohtang Road", bestTime: "May to October", distanceKm: 16.5 },
        ],
        forts: [
          { name: "Naggar Castle (Historic Wooden Architecture)", era: "1460 AD Kullu Kings Heritage", distanceKm: 21 },
        ],
        temples: [
          { name: "Vashisht Hot Water Springs & Temple", deity: "Sage Vashisht & Lord Rama", timings: "06:00 AM - 09:00 PM" },
          { name: "Manu Temple Old Manali", deity: "Sage Manu", timings: "06:00 AM - 08:00 PM" },
        ],
        beaches: [],
        markets: [
          { name: "Mall Road Tibetan Market", speciality: "Kullu Shawls, Wooden Carvings & Tibetan Artifacts", distanceKm: 0.5 },
          { name: "Old Manali Street Market", speciality: "Boho Winterwear, Hemp Products & Leather Boots", distanceKm: 1.8 },
        ],
      },
      safetyRatings: {
        overallSafetyScore: 92,
        familyFriendly: true,
        petFriendly: true,
        soloFriendly: true,
        wheelchairAccessible: false,
        nightSafetyScore: 88,
        safetyRemarks: "Safe mountain destination. Drive carefully along mountain switchbacks and check weather for snow or landslip advisories.",
      },
      cultureAndRules: {
        unescoStatus: "Great Himalayan National Park UNESCO Site nearby (Tirthan Valley - 65 km)",
        govtTourismUrl: "https://himachaltourism.gov.in",
        officialWebsite: "https://hpkullu.nic.in",
        wikipediaUrl: "https://en.wikipedia.org/wiki/Manali,_Himachal_Pradesh",
        localRules: [
          "Plastic bags and single-use plastic bottles are strictly banned across Himachal Pradesh.",
          "Green Tax / Rohtang Pass permit must be procured online prior to crossing Gulaba barrier.",
          "Littering along trekking trails incurs severe fines by local panchayat committees.",
        ],
        photographyRules: "Photography inside sacred sanctum sanctorum of Hadimba and Vashisht temples is prohibited.",
        droneRules: "Permitted with License",
        requiredPermits: ["Rohtang Pass Permit (SDM Manali Portal)", "Inner Line Permit for Spiti/Leh transit"],
        packingSuggestions: [
          "Thermal innerwear & insulated fleece jacket",
          "Waterproof hiking boots with ankle support",
          "High altitude polarized sunglasses (UV 400)",
          "Diamox or altitude sickness medication",
          "Lip balm, cold cream, and insulated wool socks",
        ],
      },
    };
  }

  // Generic dynamic fallback for any other destination
  return {
    country: country || "India",
    state: state || "Maharashtra",
    district: city || destination,
    city: city || destination,
    area: `${destination} Central Hub`,
    region: "Regional Tourism Zone",
    nearestAirport: `Nearest International Airport serving ${destination} (within 45 km)`,
    nearestRailwayStation: `${destination} Central Junction Railway Station (within 12 km)`,
    nearestBusStation: `${destination} Inter-State Central Bus Terminal`,
    timezone: "IST (UTC+05:30)",
    currency: "INR (₹)",
    languages: ["English", "Hindi", "Regional Language"],
    emergencyNumbers: {
      police: "112 / 100",
      ambulance: "108",
      fire: "101",
      womenHelpline: "1091",
      touristHelpline: "1363 (24x7)",
    },
    coordinates: {
      latitude: 18.5204,
      longitude: 73.8567,
      altitudeMeters: 560,
    },
    climate: {
      type: "Pleasant Continental Climate",
      avgTempCelsius: 24,
      minTempCelsius: 18,
      maxTempCelsius: 30,
      sunriseTime: "06:15 AM",
      sunsetTime: "06:40 PM",
      bestSeason: "September to March",
      expectedWeather: "Clear skies with comfortable humidity",
      rainProbabilityPct: 15,
      airQualityIndex: 55,
      airQualityStatus: "Moderate",
      crowdLevel: "Moderate",
    },
    logistics: {
      travelDifficulty: "Easy",
      roadCondition: "Paved Highways",
      networkAvailability: "5G High Speed",
      internetSpeedMbps: 120,
      electricityReliability: "24/7 Grid Power",
      drinkingWaterAvailability: "Readily Available",
      fuelAvailability: "Regular Stations",
      parkingAvailability: "Free Dedicated Parking",
    },
    amenities: {
      medicalFacilities: "General Multi-Speciality Hospital & 24hr Emergency Unit",
      nearbyHospital: `${destination} City Multi-Speciality Hospital`,
      nearbyHospitalDistanceKm: 3.8,
      nearbyHospitalPhone: "+91-112-240000",
      policeStation: `${destination} Central Police Station`,
      policeStationDistanceKm: 2.1,
      policeStationPhone: "+91-112-230000",
      touristHelpCenter: `${destination} Tourism Facilitation Desk`,
      nearbyAtm: "Nationalized & Private Bank ATMs within 500m",
      nearbyMedicalStores: ["24/7 City Pharmacy", "Care Medicos"],
      nearbyHotels: [
        { name: "Grand Heritage Resort", rating: 4.7, approxPriceNight: 6500, distanceKm: 2.4 },
        { name: "City Comfort Suites", rating: 4.5, approxPriceNight: 3500, distanceKm: 1.1 },
      ],
      nearbyRestaurants: [
        { name: "The Regional Spice Kitchen", cuisine: "Authentic Local & Multi-Cuisine", rating: 4.6, distanceKm: 0.9 },
        { name: "Cafe Bistro", cuisine: "Continental & Coffee", rating: 4.5, distanceKm: 1.4 },
      ],
      nearbyFuelStations: [
        { name: "HP / Indian Oil Station", distanceKm: 1.5, hasAirWater: true },
      ],
      nearbyParking: [
        { name: "City Center Parking Lot", type: "Municipal Paid Parking", distanceKm: 0.8 },
      ],
    },
    pointsOfInterest: {
      topAttractions: [
        { name: `${destination} Heritage Monument`, type: "Historical Landmark", distanceKm: 3.5, entryFee: 40, mapsQuery: `${destination} attractions` },
        { name: `${destination} Scenic Sunset Point`, type: "Panoramic Viewpoint", distanceKm: 5.2, entryFee: 0, mapsQuery: `${destination} viewpoint` },
      ],
      trekRoutes: [
        { name: `${destination} Nature Valley Trail`, difficulty: "Easy", durationHours: 2.0, distanceKm: 3.0 },
      ],
      waterfalls: [],
      forts: [],
      temples: [
        { name: `${destination} Ancient Temple`, deity: "Protector Deity", timings: "06:00 AM - 08:30 PM" },
      ],
      beaches: [],
      markets: [
        { name: `${destination} Central Bazaar`, speciality: "Local Handicrafts, Textiles & Souvenirs", distanceKm: 1.2 },
      ],
    },
    safetyRatings: {
      overallSafetyScore: 90,
      familyFriendly: true,
      petFriendly: true,
      soloFriendly: true,
      wheelchairAccessible: true,
      nightSafetyScore: 86,
      safetyRemarks: "Well-regulated, safe tourist corridor with routine municipal and police services.",
    },
    cultureAndRules: {
      unescoStatus: "Heritage precinct under national preservation registry",
      govtTourismUrl: "https://tourism.gov.in",
      officialWebsite: "https://india.gov.in",
      wikipediaUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(destination)}`,
      localRules: [
        "Follow regional waste segregation and eco-friendly tourism practices.",
        "Respect local community customs and sacred site regulations.",
      ],
      photographyRules: "Standard tourist photography permitted. Inquire before commercial filming.",
      droneRules: "Permitted with License",
      requiredPermits: [],
      packingSuggestions: [
        "Comfortable walking shoes & weather-appropriate apparel",
        "Personal medical kit and reusable water tumbler",
        "Mobile power bank and backup charging cables",
      ],
    },
  };
}

/**
 * Enterprise Real-Time Recalculation Engine
 * Mathematically reconciles:
 * 1. Personal vs Shared Outflows (Actual = Personal + Shared)
 * 2. Active Category Allocations (excludes archived, observes locks)
 * 3. Exact Pairwise Member Ledger Shares (respects exclusions & freezing)
 * 4. 6-Dimension Weighted Health Score & Letter Grade (A+ to Critical)
 * 5. Data-Driven AI Financial Velocity Forecasts & Daily Budget Ceiling
 */
function recalculateTrip(trip: TripRecord): TripRecord {
  // 0. Permanent Public ID validation
  if (!trip.publicId || !trip.publicId.startsWith("TRP-")) {
    trip.publicId = generateTripPublicId();
  }

  // Ensure Destination Intelligence Hub
  if (!trip.destinationInfo) {
    trip.destinationInfo = enrichDestinationIntelligence(trip.destination, trip.country, trip.state, trip.city);
  }
  if (!trip.weatherSummary && trip.destinationInfo) {
    trip.weatherSummary = `${trip.destinationInfo.climate.expectedWeather}, ${trip.destinationInfo.climate.avgTempCelsius}°C`;
  }

  // Ensure Events have permanent readable Public IDs
  if (trip.events) {
    trip.events.forEach((evt) => {
      if (!evt.publicId || !evt.publicId.startsWith("EVT-")) {
        evt.publicId = generateEventPublicId();
      }
    });
  }

  // 1. Calculate actual expenses (Personal vs Shared)
  const personalTotal = trip.expenses
    .filter((e) => e.isPersonal)
    .reduce((sum, e) => sum + e.amount, 0);

  const sharedTotal = trip.expenses
    .filter((e) => !e.isPersonal)
    .reduce((sum, e) => sum + e.amount, 0);

  trip.personalExpensesTotal = personalTotal;
  trip.sharedExpensesTotal = sharedTotal;
  trip.actualTotal = personalTotal + sharedTotal;

  // 2. Sum up category budgets (respecting archive & locks)
  trip.categoryBudgets = trip.categoryBudgets.map((cat) => {
    const catSpent = trip.expenses
      .filter((e) => e.category === cat.category)
      .reduce((sum, e) => sum + e.amount, 0);

    const remaining = cat.allocated - catSpent;
    const usagePct = cat.allocated > 0 ? Math.round((catSpent / cat.allocated) * 100) : 0;
    const isOver = catSpent > cat.allocated;
    const variance = cat.allocated - catSpent;
    const variancePct = cat.allocated > 0 ? Math.round(((cat.allocated - catSpent) / cat.allocated) * 100) : 0;

    return {
      ...cat,
      spent: catSpent,
      remaining,
      variance,
      variancePct,
      usagePct,
      isOverBudget: isOver,
      priority: usagePct > 85 ? "High" : usagePct > 50 ? "Medium" : "Low",
      risk: isOver ? "High" : usagePct > 80 ? "Medium" : "Low",
      aiRecommendation: isOver
        ? `Overspent by ₹${Math.abs(remaining).toLocaleString("en-IN")}. Reallocate surplus from other categories.`
        : usagePct > 80
        ? `Approaching budget ceiling (${usagePct}% used). Exercise spending restraint.`
        : `Healthy allocation with ${100 - usagePct}% buffer remaining.`,
      projectedSpend: catSpent > cat.allocated ? catSpent : Math.round(catSpent * 1.15),
      aiForecast: cat.isArchived
        ? "Category archived"
        : cat.isLocked
        ? "Locked by administrator"
        : isOver
        ? `Over allocated budget by ₹${Math.abs(remaining).toLocaleString("en-IN")}`
        : usagePct > 80
        ? "Approaching 80% ceiling limit"
        : "Spending pace within normal baseline",
    };
  });

  const activeCategories = trip.categoryBudgets.filter((c) => !c.isArchived);
  trip.allocatedBudget = activeCategories.reduce((sum, c) => sum + c.allocated, 0);
  trip.overallBudget = trip.budgetAmount || trip.allocatedBudget;
  trip.emergencyBudget = trip.emergencyBuffer || Math.round(trip.overallBudget * 0.1);
  trip.reserveBudget = Math.round(trip.overallBudget * 0.05);
  trip.personalBudget = personalTotal;
  trip.sharedBudget = Math.max(0, trip.overallBudget - personalTotal);
  trip.estimatedTotal = trip.allocatedBudget;
  trip.remainingBudget = Math.max(0, trip.allocatedBudget - trip.actualTotal);
  trip.variance = trip.allocatedBudget - trip.actualTotal;
  trip.variancePct = trip.allocatedBudget > 0 ? Math.round(((trip.allocatedBudget - trip.actualTotal) / trip.allocatedBudget) * 100) : 0;
  trip.budgetUsedPct =
    trip.allocatedBudget > 0 ? Math.round((trip.actualTotal / trip.allocatedBudget) * 100) : 0;

  // 3. Recalculate member ledger balances with permissions & exclusion support
  const memberBalances: Record<string, { paid: number; share: number; count: number }> = {};
  trip.members.forEach((m) => {
    memberBalances[m.id] = { paid: 0, share: 0, count: 0 };
  });

  trip.expenses.forEach((exp) => {
    if (memberBalances[exp.paidById]) {
      memberBalances[exp.paidById].paid += exp.amount;
      memberBalances[exp.paidById].count += 1;
    }

    if (!exp.isPersonal && exp.splitBetweenMemberIds?.length > 0) {
      // Filter out members who are explicitly excluded from past expenses
      const eligibleIds = exp.splitBetweenMemberIds.filter((id) => {
        const member = trip.members.find((m) => m.id === id);
        return !member?.isExcludedFromPastExpenses;
      });

      const targetIds = eligibleIds.length > 0 ? eligibleIds : exp.splitBetweenMemberIds;
      const splitAmount = exp.amount / targetIds.length;

      targetIds.forEach((mId) => {
        if (memberBalances[mId]) {
          memberBalances[mId].share += splitAmount;
        }
      });
    } else if (exp.isPersonal && memberBalances[exp.paidById]) {
      memberBalances[exp.paidById].share += exp.amount;
    }
  });

  // Reconcile completed settlements into member balances
  const settledDeltas: Record<string, number> = {};
  trip.settlements.forEach((s) => {
    if (s.status === "completed") {
      settledDeltas[s.fromMemberId] = (settledDeltas[s.fromMemberId] || 0) + s.amount;
      settledDeltas[s.toMemberId] = (settledDeltas[s.toMemberId] || 0) - s.amount;
    }
  });

  trip.members = trip.members.map((m) => {
    const data = memberBalances[m.id] || { paid: 0, share: 0, count: 0 };
    const settlementAdjustment = settledDeltas[m.id] || 0;
    // Positive net means member paid more than share (receivable)
    // Adding settlement adjustment (if paid out in settlement, reduces pending debt)
    const net = data.paid - data.share + settlementAdjustment;

    return {
      ...m,
      paid: Math.round(data.paid),
      ownShare: Math.round(data.share),
      pending: net < 0 ? Math.round(Math.abs(net)) : 0,
      receivable: net > 0 ? Math.round(net) : 0,
      settlementStatus: net === 0 ? "settled" : net > 0 ? "overpaid" : "pending",
      expenseCount: data.count,
    };
  });

  // 4. Calculate Duration, Days Left & Burn Rate
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  const now = new Date();
  const durationDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
  const daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 3600 * 24)));
  const daysElapsed = Math.max(1, durationDays - daysRemaining);

  trip.durationDays = durationDays;
  const burnRate = Math.round(trip.actualTotal / daysElapsed);
  trip.burnRatePerDay = burnRate;

  const recDaily = daysRemaining > 0 ? Math.round(trip.remainingBudget / daysRemaining) : 0;
  trip.recommendedDailySpend = recDaily;
  trip.projectedTotalSpend = Math.round(trip.actualTotal + burnRate * daysRemaining);
  trip.potentialSavings = Math.max(0, trip.allocatedBudget - trip.projectedTotalSpend);

  // 5. Multi-Dimensional Enterprise Financial Health Score & Grade
  // Category 1: Budget Health (Weight: 25%)
  let budgetScore = 100;
  let budgetRemarks = "Optimal budget execution.";
  let budgetRec = "Continue standard financial monitoring.";
  if (trip.actualTotal > trip.allocatedBudget) {
    const overrun = trip.actualTotal - trip.allocatedBudget;
    budgetScore = Math.max(10, 70 - Math.round((overrun / Math.max(1, trip.allocatedBudget)) * 100));
    budgetRemarks = `Over budget by ₹${overrun.toLocaleString("en-IN")}.`;
    budgetRec = "Freeze non-essential category spends and activate emergency reserve.";
  } else if (trip.budgetUsedPct > 85) {
    budgetScore = 65;
    budgetRemarks = `High utilization (${trip.budgetUsedPct}%) with ${daysRemaining} days remaining.`;
    budgetRec = `Cap daily expenditures to recommended ₹${recDaily.toLocaleString("en-IN")}/day.`;
  } else if (trip.budgetUsedPct > 65) {
    budgetScore = 80;
    budgetRemarks = `Moderate utilization (${trip.budgetUsedPct}%).`;
    budgetRec = "Track accommodation and transit variances.";
  }

  // Category 2: Expense Control (Weight: 20%)
  const overBudgetCats = trip.categoryBudgets.filter((c) => c.isOverBudget && !c.isArchived).length;
  let controlScore = 100;
  let controlRemarks = "All active categories within allocated parameters.";
  let controlRec = "Category spending pacing is aligned with plan.";
  if (overBudgetCats >= 2) {
    controlScore = 40;
    controlRemarks = `${overBudgetCats} categories exceed budget ceiling.`;
    controlRec = "Reallocate surplus funds from under-spent categories immediately.";
  } else if (overBudgetCats === 1) {
    controlScore = 70;
    controlRemarks = "1 category exceeds allocated limits.";
    controlRec = "Adjust category allocation or rebalance remaining reserves.";
  }

  // Category 3: Settlement Status & Payment Discipline (Weight: 15%)
  const totalPendingDebt = trip.members.reduce((sum, m) => sum + m.pending, 0);
  let settlementScore = 100;
  let settlementRemarks = "All shared expenses and member shares are fully settled.";
  let settlementRec = "Financial ledger is balanced and zero-debt.";
  if (totalPendingDebt > 0.3 * Math.max(1, trip.actualTotal)) {
    settlementScore = 45;
    settlementRemarks = `Substantial pending member debt of ₹${totalPendingDebt.toLocaleString("en-IN")}.`;
    settlementRec = "Send automated UPI settlement reminders to overdue members.";
  } else if (totalPendingDebt > 0) {
    settlementScore = 80;
    settlementRemarks = `Outstanding receivables of ₹${totalPendingDebt.toLocaleString("en-IN")} pending.`;
    settlementRec = "Request peer-to-peer transfers before trip conclusion.";
  }

  // Category 4: Planning & Checklist Readiness (Weight: 15%)
  const totalChecklists = trip.checklists?.length || 0;
  const packedChecklists = trip.checklists?.filter((c) => c.isPacked || c.isCompleted).length || 0;
  const checklistRatio = totalChecklists > 0 ? packedChecklists / totalChecklists : 1;
  const checklistScore = Math.round(checklistRatio * 80 + (trip.itinerary?.length > 0 ? 20 : 0));
  const checklistRemarks = `${packedChecklists}/${totalChecklists} checklist items packed. ${trip.itinerary?.length || 0} itinerary activities scheduled.`;
  const checklistRec =
    checklistRatio < 0.7
      ? "Complete critical packing and logistics checklist before travel."
      : "Trip itinerary and logistics are ready.";

  // Category 5: Document Completeness (Weight: 15%)
  const docCount = trip.documents?.length || 0;
  let docScore = 100;
  let docRemarks = `${docCount} travel documents securely stored.`;
  let docRec = "All transit and accommodation bookings verified.";
  if (docCount === 0) {
    docScore = 40;
    docRemarks = "No travel vouchers, tickets, or permits uploaded.";
    docRec = "Upload transit tickets, hotel vouchers, and ID proofs for travel compliance.";
  } else if (docCount < 2) {
    docScore = 75;
    docRemarks = `${docCount} document uploaded; missing backup tickets or insurance.`;
    docRec = "Upload return travel tickets and health/travel insurance copies.";
  }

  // Category 6: Member Participation & Stability (Weight: 10%)
  const totalMembers = trip.members?.length || 1;
  const activeMembers =
    trip.members?.filter((m) => m.expenseCount > 0 || m.paid > 0 || m.role === "Owner").length || 1;
  const frozenMembers = trip.members?.filter((m) => m.isFrozen).length || 0;
  let memberScore = Math.round((activeMembers / totalMembers) * 90) + (frozenMembers === 0 ? 10 : 0);
  let memberRemarks = `${activeMembers}/${totalMembers} members active in group ledger.`;
  let memberRec = frozenMembers > 0 ? "Resolve frozen member permissions." : "Collaborative contribution is healthy.";

  // Weighted aggregate
  const weightedOverall = Math.round(
    budgetScore * 0.25 +
      controlScore * 0.2 +
      settlementScore * 0.15 +
      checklistScore * 0.15 +
      docScore * 0.15 +
      memberScore * 0.1
  );

  trip.financialHealthScore = Math.max(10, Math.min(100, weightedOverall));

  let grade: "A+" | "A" | "B+" | "B" | "C" | "D" | "Critical" = "A";
  if (trip.financialHealthScore >= 95) grade = "A+";
  else if (trip.financialHealthScore >= 85) grade = "A";
  else if (trip.financialHealthScore >= 75) grade = "B+";
  else if (trip.financialHealthScore >= 65) grade = "B";
  else if (trip.financialHealthScore >= 50) grade = "C";
  else if (trip.financialHealthScore >= 35) grade = "D";
  else grade = "Critical";

  if (trip.financialHealthScore >= 80) trip.riskLevel = "Low Risk";
  else if (trip.financialHealthScore >= 50) trip.riskLevel = "Moderate Risk";
  else trip.riskLevel = "High Risk";

  trip.healthReport = {
    overallScore: trip.financialHealthScore,
    grade,
    summary: `Trip financial health is rated ${grade} (${trip.financialHealthScore}/100) under ${trip.riskLevel}.`,
    dimensions: [
      {
        name: "Budget Health",
        score: budgetScore,
        weight: 0.25,
        weightedScore: Math.round(budgetScore * 0.25),
        remarks: budgetRemarks,
        recommendation: budgetRec,
      },
      {
        name: "Expense Control",
        score: controlScore,
        weight: 0.2,
        weightedScore: Math.round(controlScore * 0.2),
        remarks: controlRemarks,
        recommendation: controlRec,
      },
      {
        name: "Settlement Discipline",
        score: settlementScore,
        weight: 0.15,
        weightedScore: Math.round(settlementScore * 0.15),
        remarks: settlementRemarks,
        recommendation: settlementRec,
      },
      {
        name: "Logistics & Planning",
        score: checklistScore,
        weight: 0.15,
        weightedScore: Math.round(checklistScore * 0.15),
        remarks: checklistRemarks,
        recommendation: checklistRec,
      },
      {
        name: "Document Readiness",
        score: docScore,
        weight: 0.15,
        weightedScore: Math.round(docScore * 0.15),
        remarks: docRemarks,
        recommendation: docRec,
      },
      {
        name: "Member Stability",
        score: memberScore,
        weight: 0.1,
        weightedScore: Math.round(memberScore * 0.1),
        remarks: memberRemarks,
        recommendation: memberRec,
      },
    ],
  };

  // 6. Generate Dynamic AI Insights based on real calculations
  const insights: string[] = [];
  if (trip.projectedTotalSpend > trip.allocatedBudget) {
    insights.push(
      `At current pace, trip expenses are projected to exceed budget by ₹${(trip.projectedTotalSpend - trip.allocatedBudget).toLocaleString("en-IN")}.`
    );
  } else {
    insights.push(
      `Financial velocity is healthy with ₹${trip.potentialSavings.toLocaleString("en-IN")} projected savings.`
    );
  }

  const highestCat = [...trip.categoryBudgets]
    .filter((c) => !c.isArchived)
    .sort((a, b) => b.spent - a.spent)[0];
  if (highestCat && highestCat.spent > 0) {
    insights.push(
      `${highestCat.category} accounts for ${Math.round((highestCat.spent / Math.max(1, trip.actualTotal)) * 100)}% of total trip outflow.`
    );
  }

  if (daysRemaining > 0) {
    insights.push(
      `Recommended daily spending ceiling: ₹${recDaily.toLocaleString("en-IN")}/day over the next ${daysRemaining} days.`
    );
  }

  if (totalPendingDebt > 0) {
    insights.push(
      `Outstanding peer receivables total ₹${totalPendingDebt.toLocaleString("en-IN")}. Early settlement improves trip liquidity.`
    );
  }

  trip.aiInsights = insights;
  if (trip.checklists) {
    trip.checklists.forEach((item) => {
      if (item.isCompleted === undefined) {
        item.isCompleted = Boolean(item.isPacked);
      }
    });
  }

  trip.updatedAt = new Date().toISOString();

  return trip;
}

/**
 * Initialize seed trips for user session
 */
function ensureUserStores(userId: number, userName: string = "Dipak Pawar") {
  const userKey = `user_${userId}`;
  if (!tripsStore.has(userKey)) {
    const goaTrip: TripRecord = {
      id: "trip_goa_premium_01",
      publicId: "TRP-9X7M4K2P8Q5R",
      userId,
      name: "Goa Beach & Coastal Retreat",
      destination: "Goa, India",
      country: "India",
      city: "North Goa",
      category: "vacation",
      coverImage: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1200&auto=format&fit=crop&q=80",
      description: "Annual beachfront villa vacation, water sports, sunset dinners, and coastal trail bike rentals.",
      startDate: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0],
      endDate: new Date(Date.now() + 12 * 86400000).toISOString().split("T")[0],
      durationDays: 7,
      timezone: "IST (UTC+05:30)",
      currency: "INR",
      organizerName: userName,
      organizerEmail: "dipakpawar3747@gmail.com",
      status: "upcoming",

      budgetAmount: 65000,
      overallBudget: 65000,
      personalBudget: 0,
      sharedBudget: 60000,
      emergencyBudget: 5000,
      reserveBudget: 0,
      emergencyBuffer: 5000,
      allocatedBudget: 60000,
      actualTotal: 0,
      personalExpensesTotal: 0,
      sharedExpensesTotal: 0,
      remainingBudget: 60000,
      variance: 60000,
      budgetUsedPct: 0,

      financialHealthScore: 95,
      riskLevel: "Low Risk",
      burnRatePerDay: 0,
      recommendedDailySpend: 8500,
      projectedTotalSpend: 54000,
      potentialSavings: 6000,
      aiInsights: [],

      categoryBudgets: [
        { category: "Hotel", allocated: 22000, spent: 0, remaining: 22000, usagePct: 0, isOverBudget: false, projectedSpend: 22000, aiForecast: "Normal", color: CATEGORY_COLORS["Hotel"] },
        { category: "Transportation", allocated: 12000, spent: 0, remaining: 12000, usagePct: 0, isOverBudget: false, projectedSpend: 11500, aiForecast: "Normal", color: CATEGORY_COLORS["Transportation"] },
        { category: "Food", allocated: 10000, spent: 0, remaining: 10000, usagePct: 0, isOverBudget: false, projectedSpend: 9500, aiForecast: "Normal", color: CATEGORY_COLORS["Food"] },
        { category: "Adventure", allocated: 8000, spent: 0, remaining: 8000, usagePct: 0, isOverBudget: false, projectedSpend: 7500, aiForecast: "Normal", color: CATEGORY_COLORS["Adventure"] },
        { category: "Fuel", allocated: 4000, spent: 0, remaining: 4000, usagePct: 0, isOverBudget: false, projectedSpend: 3800, aiForecast: "Normal", color: CATEGORY_COLORS["Fuel"] },
        { category: "Emergency", allocated: 4000, spent: 0, remaining: 4000, usagePct: 0, isOverBudget: false, projectedSpend: 2000, aiForecast: "Reserve", color: CATEGORY_COLORS["Emergency"] },
      ],

      members: [
        { id: "mem_1", name: userName, email: "dipak@splitledger.ai", role: "Owner", contribution: 30000, ownShare: 0, paid: 0, pending: 0, receivable: 0, settlementStatus: "settled", expenseCount: 0 },
        { id: "mem_2", name: "Aarav Sharma", email: "aarav@example.com", role: "Admin", contribution: 20000, ownShare: 0, paid: 0, pending: 0, receivable: 0, settlementStatus: "settled", expenseCount: 0 },
        { id: "mem_3", name: "Sneha Patel", email: "sneha@example.com", role: "Member", contribution: 15000, ownShare: 0, paid: 0, pending: 0, receivable: 0, settlementStatus: "settled", expenseCount: 0 },
      ],

      expenses: [
        {
          id: "exp_villa_advance",
          title: "Beachfront Villa Booking Advance",
          category: "Hotel",
          amount: 14500,
          date: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0],
          paidById: "mem_1",
          paidByName: userName,
          isPersonal: false,
          splitBetweenMemberIds: ["mem_1", "mem_2", "mem_3"],
          paymentMethod: "UPI",
          location: "Calangute Beachfront, Goa",
          tags: ["Accommodation", "Advance"],
          notes: "50% advance for 4-bedroom villa with private pool",
          status: "settled",
          createdAt: new Date().toISOString(),
        },
        {
          id: "exp_flight_tickets",
          title: "Flight Tickets & Baggage Pass",
          category: "Transportation",
          amount: 9800,
          date: new Date(Date.now() - 1 * 86400000).toISOString().split("T")[0],
          paidById: "mem_2",
          paidByName: "Aarav Sharma",
          isPersonal: false,
          splitBetweenMemberIds: ["mem_1", "mem_2", "mem_3"],
          paymentMethod: "Credit Card",
          location: "IndiGo Air, BOM-GOI",
          tags: ["Flight", "Transit"],
          notes: "Confirmed non-stop morning flight booking",
          status: "settled",
          createdAt: new Date().toISOString(),
        },
        {
          id: "exp_snorkel_gear",
          title: "Personal Snorkel Mask & Fins",
          category: "Adventure",
          amount: 2200,
          date: new Date().toISOString().split("T")[0],
          paidById: "mem_1",
          paidByName: userName,
          isPersonal: true,
          splitBetweenMemberIds: ["mem_1"],
          paymentMethod: "UPI",
          location: "Decathlon Sports",
          tags: ["Personal Gear"],
          notes: "Personal purchase for island snorkeling",
          status: "settled",
          createdAt: new Date().toISOString(),
        },
      ],

      settlements: [
        {
          id: "stl_01",
          fromMemberId: "mem_3",
          fromMemberName: "Sneha Patel",
          toMemberId: "mem_1",
          toMemberName: userName,
          amount: 4833,
          status: "completed",
          settledAt: new Date(Date.now() - 1 * 86400000).toISOString(),
          paymentMethod: "Google Pay UPI",
          notes: "Villa advance share settled",
        },
      ],

      itinerary: [
        { id: "it_1", dayNumber: 1, slot: "morning", time: "10:30 AM", activity: "Arrival & Villa Check-in", location: "Dabolim Airport -> Calangute", category: "Transit", notes: "Driver booked for pickup", estimatedCost: 1200, status: "scheduled" },
        { id: "it_2", dayNumber: 1, slot: "afternoon", time: "01:30 PM", activity: "Seafood Lunch & Pool Relaxation", location: "Fat Fish Tavern", category: "Dining", notes: "Table reserved for 3", estimatedCost: 2400, status: "scheduled" },
        { id: "it_3", dayNumber: 1, slot: "evening", time: "05:45 PM", activity: "Sunset Stroll & Water Sports", location: "Baga Beach Shore", category: "Adventure", notes: "Jet-ski and parasailing slots", estimatedCost: 3500, status: "scheduled" },
        { id: "it_4", dayNumber: 2, slot: "morning", time: "08:00 AM", activity: "Scuba Diving & Island Cruise", location: "Grand Island, South Goa", category: "Adventure", notes: "PADI certified instructors", estimatedCost: 6500, status: "scheduled" },
      ],

      events: [
        {
          id: "evt_goa_01",
          publicId: "EVT-GOA-AIRP88X1",
          title: "Dabolim Airport Pickup & Executive Coach Transfer",
          category: "Airport Pickup",
          type: "bus",
          status: "Upcoming",
          priority: "High",
          bannerUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&auto=format&fit=crop&q=80",
          organizerName: userName,
          eventOwner: userName,
          linkedTripId: "trip_goa_premium_01",
          linkedTripName: "Goa Beach & Coastal Retreat",
          isStandalone: false,
          location: "Dabolim Airport, Goa",
          venue: "Arrival Gate 4 Coach Bay",
          meetingPoint: "Tourist Information Counter",
          coordinates: { latitude: 15.3808, longitude: 73.8314 },
          mapsLink: "https://maps.google.com/?q=Dabolim+Airport+Goa",
          description: "Flight 6E-204 touchdown pickup with direct AC luxury coach transfer to Calangute beachfront villa.",
          startDate: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0],
          endDate: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0],
          startTime: "10:30 AM",
          endTime: "12:30 PM",
          startDateTime: new Date(Date.now() + 5 * 86400000).toISOString(),
          endDateTime: new Date(Date.now() + 5 * 86400000 + 2 * 3600000).toISOString(),
          durationMinutes: 120,
          durationText: "2 Hours",
          timeRemaining: "Starts in 5 days",
          countdownText: "5d left",
          timezone: "IST (UTC+05:30)",
          capacity: 10,
          expectedAttendance: 3,
          confirmedMembers: 3,
          pendingInvitations: 0,
          declinedMembers: 0,
          guestMembers: 0,
          availableSeats: 7,
          currentAttendance: 3,
          participants: [userName, "Aarav Sharma", "Sneha Patel"],
          budget: 3500,
          estimatedBudget: 3500,
          actualCost: 1500,
          weatherStatus: "29°C • Sunny coastal breeze",
          weatherForecast: "Clear skies with light sea breeze",
          travelAdvisory: "Green Zone • Airport expressway running smoothly",
          budgetStatus: "Under Budget",
          completionPct: 25,
          attendancePct: 30,
          progressPct: 30,
          expensePct: 43,
          timeline: [
            { id: "tl_g1", time: "10:15 AM", activity: "Coach Arrives at Airport Bay", location: "Gate 4 Parking", status: "completed" },
            { id: "tl_g2", time: "10:30 AM", activity: "Flight Landing & Luggage Collection", location: "Arrival Carousel 2", status: "upcoming" },
            { id: "tl_g3", time: "11:15 AM", activity: "Boarding & Departure for North Goa", location: "Coach Bay 4", status: "upcoming" },
            { id: "tl_g4", time: "12:30 PM", activity: "Arrival at Beachfront Villa", location: "Calangute Villa Gate", status: "upcoming" },
          ],
          rsvp: {
            invited: 3,
            accepted: 3,
            maybe: 0,
            declined: 0,
            pending: 0,
            guests: 0,
            attendees: [
              { id: "att_g1", name: userName, phone: "+91 98765 43210", rsvpStatus: "accepted", arrivalStatus: "On Time", checkInStatus: "Checked In" },
              { id: "att_g2", name: "Aarav Sharma", phone: "+91 98111 22334", rsvpStatus: "accepted", arrivalStatus: "On Time", checkInStatus: "Checked In" },
              { id: "att_g3", name: "Sneha Patel", phone: "+91 98222 33445", rsvpStatus: "accepted", arrivalStatus: "On Time", checkInStatus: "Checked In" },
            ],
          },
          expenseSummary: {
            allocatedBudget: 3500,
            actualExpense: 1500,
            remainingBudget: 2000,
            personalContribution: 0,
            sharedContribution: 1500,
            vendorPayments: 1500,
            pendingPayments: 0,
            refunds: 0,
            settlementStatus: "settled",
          },
        },
        {
          id: "evt_goa_02",
          publicId: "EVT-GOA-CAMP99Q4",
          title: "Shoreline Sunset Campfire & Acoustic BBQ Night",
          category: "Campfire",
          type: "dinner",
          status: "Upcoming",
          priority: "Critical",
          bannerUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80",
          organizerName: userName,
          eventOwner: userName,
          linkedTripId: "trip_goa_premium_01",
          linkedTripName: "Goa Beach & Coastal Retreat",
          isStandalone: false,
          location: "Anjuna Shore, North Goa",
          venue: "Curlies Bay Beach Terrace",
          meetingPoint: "Anjuna Beach Wooden Boardwalk",
          coordinates: { latitude: 15.5873, longitude: 73.7408 },
          mapsLink: "https://maps.google.com/?q=Curlies+Anjuna+Goa",
          description: "Exclusive seaside campfire with woodfire BBQ grill, live acoustic guitar jam, and panoramic sunset view.",
          startDate: new Date(Date.now() + 6 * 86400000).toISOString().split("T")[0],
          endDate: new Date(Date.now() + 6 * 86400000).toISOString().split("T")[0],
          startTime: "07:00 PM",
          endTime: "11:00 PM",
          startDateTime: new Date(Date.now() + 6 * 86400000).toISOString(),
          endDateTime: new Date(Date.now() + 6 * 86400000 + 4 * 3600000).toISOString(),
          durationMinutes: 240,
          durationText: "4 Hours",
          timeRemaining: "Starts in 6 days",
          countdownText: "6d left",
          timezone: "IST (UTC+05:30)",
          capacity: 12,
          expectedAttendance: 6,
          confirmedMembers: 5,
          pendingInvitations: 1,
          declinedMembers: 0,
          guestMembers: 2,
          availableSeats: 7,
          currentAttendance: 5,
          participants: [userName, "Aarav Sharma", "Sneha Patel"],
          budget: 6500,
          estimatedBudget: 6500,
          actualCost: 2800,
          weatherStatus: "27°C • Clear coastal night",
          travelAdvisory: "Green Zone • High tide warnings observed",
          budgetStatus: "Optimal Pacing",
          completionPct: 10,
          attendancePct: 42,
          progressPct: 20,
          expensePct: 43,
          timeline: [
            { id: "tl_c1", time: "07:00 PM", activity: "Beachside Campfire Setup & Drink Orders", location: "Shore Terrace", status: "upcoming" },
            { id: "tl_c2", time: "08:00 PM", activity: "Fresh Kingfish & Veg Skewers BBQ", location: "Open Grill", status: "upcoming" },
            { id: "tl_c3", time: "09:30 PM", activity: "Acoustic Singalong & Storytelling", location: "Campfire Circle", status: "upcoming" },
            { id: "tl_c4", time: "10:45 PM", activity: "Night Stargazing & Group Photos", location: "Cliff Deck", status: "upcoming" },
          ],
          rsvp: {
            invited: 6,
            accepted: 5,
            maybe: 1,
            declined: 0,
            pending: 0,
            guests: 2,
            attendees: [
              { id: "att_c1", name: userName, phone: "+91 98765 43210", rsvpStatus: "accepted", arrivalStatus: "On Time", checkInStatus: "Checked In" },
              { id: "att_c2", name: "Aarav Sharma", phone: "+91 98111 22334", rsvpStatus: "accepted", arrivalStatus: "On Time", checkInStatus: "Checked In" },
              { id: "att_c3", name: "Sneha Patel", phone: "+91 98222 33445", rsvpStatus: "accepted", arrivalStatus: "On Time", checkInStatus: "Checked In" },
            ],
          },
          expenseSummary: {
            allocatedBudget: 6500,
            actualExpense: 2800,
            remainingBudget: 3700,
            personalContribution: 800,
            sharedContribution: 2000,
            vendorPayments: 2000,
            pendingPayments: 800,
            refunds: 0,
            settlementStatus: "pending",
          },
        },
        {
          id: "evt_goa_03",
          publicId: "EVT-GOA-DIVE44M1",
          title: "Grand Island Scuba Diving & Dolphin Cruise",
          category: "Adventure Activity",
          type: "adventure",
          status: "Planning",
          priority: "High",
          bannerUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&auto=format&fit=crop&q=80",
          organizerName: userName,
          eventOwner: userName,
          linkedTripId: "trip_goa_premium_01",
          linkedTripName: "Goa Beach & Coastal Retreat",
          isStandalone: false,
          location: "Grand Island, Vasco Bay Jetty",
          venue: "PADI Diving Facility Boat",
          meetingPoint: "Vasco Boat Jetty Counter 3",
          coordinates: { latitude: 15.3533, longitude: 73.7656 },
          mapsLink: "https://maps.google.com/?q=Grand+Island+Goa",
          description: "Certified underwater scuba dive with video footage, island snorkeling session, and dolphin spotting cruise.",
          startDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
          endDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
          startTime: "07:30 AM",
          endTime: "02:00 PM",
          startDateTime: new Date(Date.now() + 7 * 86400000).toISOString(),
          endDateTime: new Date(Date.now() + 7 * 86400000 + 6 * 3600000).toISOString(),
          durationMinutes: 390,
          durationText: "6.5 Hours",
          timeRemaining: "Starts in 7 days",
          countdownText: "7d left",
          timezone: "IST (UTC+05:30)",
          capacity: 8,
          expectedAttendance: 4,
          confirmedMembers: 3,
          pendingInvitations: 1,
          declinedMembers: 0,
          guestMembers: 0,
          availableSeats: 5,
          currentAttendance: 3,
          participants: [userName, "Aarav Sharma", "Sneha Patel"],
          budget: 8500,
          estimatedBudget: 8500,
          actualCost: 0,
          weatherStatus: "28°C • Calm sea state",
          travelAdvisory: "Green Zone • Life vests mandatory for all divers",
          budgetStatus: "Allocated",
          completionPct: 0,
          attendancePct: 75,
          progressPct: 15,
          expensePct: 0,
          timeline: [
            { id: "tl_d1", time: "07:30 AM", activity: "Boat Departure from Vasco Jetty", location: "Jetty 3", status: "upcoming" },
            { id: "tl_d2", time: "09:00 AM", activity: "Safety Briefing & Equipment Fit", location: "Boat Deck", status: "upcoming" },
            { id: "tl_d3", time: "10:15 AM", activity: "Underwater Dive with PADI Masters", location: "Suzy's Wreck Reef", status: "upcoming" },
            { id: "tl_d4", time: "01:00 PM", activity: "Island Snorkeling & Packed Lunch", location: "Monkey Beach", status: "upcoming" },
          ],
          rsvp: {
            invited: 4,
            accepted: 3,
            maybe: 1,
            declined: 0,
            pending: 0,
            guests: 0,
            attendees: [
              { id: "att_d1", name: userName, phone: "+91 98765 43210", rsvpStatus: "accepted", arrivalStatus: "On Time", checkInStatus: "Checked In" },
              { id: "att_d2", name: "Aarav Sharma", phone: "+91 98111 22334", rsvpStatus: "accepted", arrivalStatus: "On Time", checkInStatus: "Checked In" },
              { id: "att_d3", name: "Sneha Patel", phone: "+91 98222 33445", rsvpStatus: "accepted", arrivalStatus: "On Time", checkInStatus: "Checked In" },
            ],
          },
          expenseSummary: {
            allocatedBudget: 8500,
            actualExpense: 0,
            remainingBudget: 8500,
            personalContribution: 0,
            sharedContribution: 0,
            vendorPayments: 0,
            pendingPayments: 0,
            refunds: 0,
            settlementStatus: "pending",
          },
        },
      ],
      logisticsHub: createSeedLogisticsHub("trip_goa_premium_01"),

      documents: [
        { id: "doc_1", title: "Villa Rental Confirmation & Host Agreement", category: "Hotel Booking", fileName: "Goa_Villa_Voucher_2026.pdf", fileType: "pdf", fileSize: "1.4 MB", uploadedAt: new Date().toISOString().split("T")[0], notes: "Host contact details inside" },
        { id: "doc_2", title: "Roundtrip Flight Tickets BOM-GOI", category: "Flight Ticket", fileName: "IndiGo_Flight_Itinerary.pdf", fileType: "pdf", fileSize: "820 KB", uploadedAt: new Date().toISOString().split("T")[0], notes: "PNR: 6EK99Z" },
        { id: "doc_3", title: "Travel & Activity Medical Insurance", category: "Travel Insurance", fileName: "HDFC_Ergo_Travel_Policy.pdf", fileType: "pdf", fileSize: "2.1 MB", uploadedAt: new Date().toISOString().split("T")[0], expiryDate: "2026-12-31" },
      ],

      checklists: [
        { id: "chk_1", title: "Original Govt Photo IDs & Driving Licenses", category: "Documents", priority: "High", isPacked: true, assignedMemberName: userName },
        { id: "chk_2", title: "Waterproof Phone Pouch & Action Camera", category: "Electronics", priority: "Medium", isPacked: true, assignedMemberName: "Aarav Sharma" },
        { id: "chk_3", title: "Sunscreen SPF 50 & Aloe Soothing Gel", category: "Medical", priority: "High", isPacked: false, assignedMemberName: "Sneha Patel" },
        { id: "chk_4", title: "Quick-Dry Beach Towels & Swimwear", category: "Clothes", priority: "Medium", isPacked: false, assignedMemberName: userName },
        { id: "chk_5", title: "First-Aid Kit & Motion Sickness Tablets", category: "Medical", priority: "High", isPacked: true, assignedMemberName: "Sneha Patel" },
      ],

      preferences: {
        budgetAlertThreshold: 80,
        expenseApprovalThreshold: 5000,
        defaultSplitMethod: "equal",
        settlementReminderFrequency: "daily",
      },

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const trekTrip: TripRecord = {
      id: "trip_himalaya_02",
      publicId: "TRP-A8K4D9Q2M7XH",
      userId,
      name: "Himalayan High Altitude Expedition",
      destination: "Manali & Spiti Valley, India",
      country: "India",
      city: "Spiti",
      category: "trek",
      coverImage: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&auto=format&fit=crop&q=80",
      description: "High mountain passes, monastery heritage, stargazing campsites, and technical trekking routes.",
      startDate: new Date(Date.now() + 25 * 86400000).toISOString().split("T")[0],
      endDate: new Date(Date.now() + 34 * 86400000).toISOString().split("T")[0],
      durationDays: 10,
      timezone: "IST (UTC+05:30)",
      currency: "INR",
      organizerName: userName,
      organizerEmail: "dipak@splitledger.ai",
      status: "planning",

      budgetAmount: 85000,
      overallBudget: 85000,
      personalBudget: 0,
      sharedBudget: 75000,
      emergencyBudget: 10000,
      reserveBudget: 0,
      emergencyBuffer: 10000,
      allocatedBudget: 75000,
      actualTotal: 0,
      personalExpensesTotal: 0,
      sharedExpensesTotal: 0,
      remainingBudget: 75000,
      variance: 75000,
      budgetUsedPct: 0,

      financialHealthScore: 100,
      riskLevel: "Low Risk",
      burnRatePerDay: 0,
      recommendedDailySpend: 7500,
      projectedTotalSpend: 70000,
      potentialSavings: 5000,
      aiInsights: [],

      categoryBudgets: [
        { category: "Transportation", allocated: 25000, spent: 0, remaining: 25000, usagePct: 0, isOverBudget: false, projectedSpend: 25000, aiForecast: "Normal", color: CATEGORY_COLORS["Transportation"] },
        { category: "Adventure", allocated: 20000, spent: 0, remaining: 20000, usagePct: 0, isOverBudget: false, projectedSpend: 19500, aiForecast: "Normal", color: CATEGORY_COLORS["Adventure"] },
        { category: "Hotel", allocated: 15000, spent: 0, remaining: 15000, usagePct: 0, isOverBudget: false, projectedSpend: 14000, aiForecast: "Normal", color: CATEGORY_COLORS["Hotel"] },
        { category: "Food", allocated: 10000, spent: 0, remaining: 10000, usagePct: 0, isOverBudget: false, projectedSpend: 9500, aiForecast: "Normal", color: CATEGORY_COLORS["Food"] },
        { category: "Emergency", allocated: 5000, spent: 0, remaining: 5000, usagePct: 0, isOverBudget: false, projectedSpend: 3000, aiForecast: "Reserve", color: CATEGORY_COLORS["Emergency"] },
      ],

      members: [
        { id: "mem_1", name: userName, email: "dipak@splitledger.ai", role: "Owner", contribution: 45000, ownShare: 0, paid: 0, pending: 0, receivable: 0, settlementStatus: "settled", expenseCount: 0 },
        { id: "mem_4", name: "Rohan Verma", email: "rohan@example.com", role: "Admin", contribution: 40000, ownShare: 0, paid: 0, pending: 0, receivable: 0, settlementStatus: "settled", expenseCount: 0 },
      ],

      expenses: [],
      settlements: [],
      itinerary: [
        { id: "it_spiti_1", dayNumber: 1, slot: "morning", time: "06:00 AM", activity: "Depart Manali across Atal Tunnel", location: "Manali Highway", category: "Transit", notes: "4x4 SUV booked with driver", estimatedCost: 6500, status: "scheduled" },
      ],
      events: [
        {
          id: "evt_trek_01",
          publicId: "EVT-TREK-BRF77K1",
          title: "High-Altitude Expedition Briefing & Pulse Oximetry Check",
          category: "Trek Briefing",
          type: "meeting",
          status: "Upcoming",
          priority: "Critical",
          bannerUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&auto=format&fit=crop&q=80",
          organizerName: userName,
          eventOwner: userName,
          linkedTripId: "trip_himalaya_02",
          linkedTripName: "Himalayan High Altitude Expedition",
          isStandalone: false,
          location: "Old Manali Mountaineering Basecamp",
          venue: "Climbers Assembly Hall",
          meetingPoint: "Clubhouse Bridge Checkpoint",
          coordinates: { latitude: 32.2498, longitude: 77.1802 },
          mapsLink: "https://maps.google.com/?q=Old+Manali+Clubhouse",
          description: "Compulsory medical vitals check, mountain sickness protocol briefing, crampon fitting, and satellite phone test.",
          startDate: new Date(Date.now() + 25 * 86400000).toISOString().split("T")[0],
          endDate: new Date(Date.now() + 25 * 86400000).toISOString().split("T")[0],
          startTime: "05:00 PM",
          endTime: "07:00 PM",
          startDateTime: new Date(Date.now() + 25 * 86400000).toISOString(),
          endDateTime: new Date(Date.now() + 25 * 86400000 + 2 * 3600000).toISOString(),
          durationMinutes: 120,
          durationText: "2 Hours",
          timeRemaining: "Starts in 25 days",
          countdownText: "25d left",
          timezone: "IST (UTC+05:30)",
          capacity: 15,
          expectedAttendance: 6,
          confirmedMembers: 4,
          pendingInvitations: 2,
          declinedMembers: 0,
          guestMembers: 0,
          availableSeats: 11,
          currentAttendance: 4,
          participants: [userName, "Rohan Verma"],
          budget: 2500,
          estimatedBudget: 2500,
          actualCost: 0,
          weatherStatus: "12°C • Crisp alpine air",
          travelAdvisory: "Green Zone • Diamox acclimatization schedule starts",
          budgetStatus: "Fully Funded",
          completionPct: 15,
          attendancePct: 67,
          progressPct: 20,
          expensePct: 0,
          timeline: [
            { id: "tl_t1", time: "05:00 PM", activity: "Member Registration & Vitals Pulse Check", location: "Medical Station", status: "upcoming" },
            { id: "tl_t2", time: "05:45 PM", activity: "Topographical Route Briefing & Weather Matrix", location: "Map Table", status: "upcoming" },
            { id: "tl_t3", time: "06:30 PM", activity: "Satellite SOS Radio Check & Guide Introduction", location: "Assembly Yard", status: "upcoming" },
          ],
          rsvp: {
            invited: 6,
            accepted: 4,
            maybe: 1,
            declined: 0,
            pending: 1,
            guests: 0,
            attendees: [
              { id: "att_t1", name: userName, phone: "+91 98765 43210", rsvpStatus: "accepted", arrivalStatus: "On Time", checkInStatus: "Checked In" },
              { id: "att_t2", name: "Rohan Verma", phone: "+91 98333 44556", rsvpStatus: "accepted", arrivalStatus: "On Time", checkInStatus: "Checked In" },
            ],
          },
          expenseSummary: {
            allocatedBudget: 2500,
            actualExpense: 0,
            remainingBudget: 2500,
            personalContribution: 0,
            sharedContribution: 0,
            vendorPayments: 0,
            pendingPayments: 0,
            refunds: 0,
            settlementStatus: "pending",
          },
        },
        {
          id: "evt_trek_02",
          publicId: "EVT-TREK-BUS99M2",
          title: "4x4 Expedition Bus Departure across Atal Tunnel",
          category: "Bus Departure",
          type: "bus",
          status: "Upcoming",
          priority: "Critical",
          bannerUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80",
          organizerName: userName,
          eventOwner: userName,
          linkedTripId: "trip_himalaya_02",
          linkedTripName: "Himalayan High Altitude Expedition",
          isStandalone: false,
          location: "Manali Mall Road North Gate",
          venue: "Heavy Transit Bus Stand",
          meetingPoint: "State Tourism Desk",
          coordinates: { latitude: 32.2396, longitude: 77.1887 },
          mapsLink: "https://maps.google.com/?q=Manali+Bus+Stand",
          description: "High-clearance Force 4x4 cruiser convoy departure across Atal Tunnel into Lahaul-Spiti valley.",
          startDate: new Date(Date.now() + 26 * 86400000).toISOString().split("T")[0],
          endDate: new Date(Date.now() + 26 * 86400000).toISOString().split("T")[0],
          startTime: "06:00 AM",
          endTime: "10:00 AM",
          startDateTime: new Date(Date.now() + 26 * 86400000).toISOString(),
          endDateTime: new Date(Date.now() + 26 * 86400000 + 4 * 3600000).toISOString(),
          durationMinutes: 240,
          durationText: "4 Hours",
          timeRemaining: "Starts in 26 days",
          countdownText: "26d left",
          timezone: "IST (UTC+05:30)",
          capacity: 12,
          expectedAttendance: 4,
          confirmedMembers: 4,
          pendingInvitations: 0,
          declinedMembers: 0,
          guestMembers: 0,
          availableSeats: 8,
          currentAttendance: 4,
          participants: [userName, "Rohan Verma"],
          budget: 6500,
          estimatedBudget: 6500,
          actualCost: 0,
          weatherStatus: "8°C • Mountain morning mist",
          travelAdvisory: "Green Zone • Rohtang / Atal tunnel open for traffic",
          budgetStatus: "Allocated",
          completionPct: 0,
          attendancePct: 100,
          progressPct: 10,
          expensePct: 0,
          timeline: [
            { id: "tl_b1", time: "05:45 AM", activity: "Luggage Lash & Roof Rack Secure", location: "Mall Road Stand", status: "upcoming" },
            { id: "tl_b2", time: "06:00 AM", activity: "Sharp Convoy Rollout", location: "North Gate", status: "upcoming" },
            { id: "tl_b3", time: "07:30 AM", activity: "Atal Tunnel South Portal Transit (9.02 km)", location: "Tunnel Entrance", status: "upcoming" },
            { id: "tl_b4", time: "09:30 AM", activity: "Sissu Waterfall Breakfast Halt", location: "Lahaul Valley", status: "upcoming" },
          ],
          rsvp: {
            invited: 4,
            accepted: 4,
            maybe: 0,
            declined: 0,
            pending: 0,
            guests: 0,
            attendees: [
              { id: "att_b1", name: userName, phone: "+91 98765 43210", rsvpStatus: "accepted", arrivalStatus: "On Time", checkInStatus: "Checked In" },
              { id: "att_b2", name: "Rohan Verma", phone: "+91 98333 44556", rsvpStatus: "accepted", arrivalStatus: "On Time", checkInStatus: "Checked In" },
            ],
          },
          expenseSummary: {
            allocatedBudget: 6500,
            actualExpense: 0,
            remainingBudget: 6500,
            personalContribution: 0,
            sharedContribution: 0,
            vendorPayments: 0,
            pendingPayments: 0,
            refunds: 0,
            settlementStatus: "pending",
          },
        },
      ],
      logisticsHub: createSeedLogisticsHub("trip_himalaya_02"),
      documents: [
        { id: "doc_spiti_permit", title: "Inner Line Permit & Wildlife Clearance", category: "Passport & Visa", fileName: "Spiti_ILP_Clearance.pdf", fileType: "pdf", fileSize: "950 KB", uploadedAt: new Date().toISOString().split("T")[0] },
      ],
      checklists: [
        { id: "chk_spiti_1", title: "Thermal Baselayers & Down Jacket (-15°C)", category: "Clothes", priority: "High", isPacked: true, assignedMemberName: userName },
        { id: "chk_spiti_2", title: "Diamox & High Altitude Sickness Kit", category: "Medical", priority: "High", isPacked: false, assignedMemberName: "Rohan Verma" },
      ],

      preferences: {
        budgetAlertThreshold: 75,
        expenseApprovalThreshold: 4000,
        defaultSplitMethod: "equal",
        settlementReminderFrequency: "daily",
      },

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Recalculate both seed trips
    recalculateTrip(goaTrip);
    recalculateTrip(trekTrip);

    tripsStore.set(userKey, [goaTrip, trekTrip]);
  }
}

/**
 * Get Comprehensive Executive Trip Dashboard Metrics
 */
export async function getTripDashboardSummary(): Promise<TripDashboardMetrics> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];

  // Re-calculate all trips to ensure pristine arithmetic
  trips.forEach((t) => recalculateTrip(t));

  const nonArchived = trips.filter((t) => t.status !== "archived" && t.status !== "cancelled");

  const totalTripBudget = nonArchived.reduce((sum, t) => sum + t.budgetAmount, 0);
  const allocatedBudget = nonArchived.reduce((sum, t) => sum + t.allocatedBudget, 0);
  const actualExpenses = nonArchived.reduce((sum, t) => sum + t.actualTotal, 0);
  const personalExpenses = nonArchived.reduce((sum, t) => sum + t.personalExpensesTotal, 0);
  const sharedExpenses = nonArchived.reduce((sum, t) => sum + t.sharedExpensesTotal, 0);
  const remainingBudget = Math.max(0, allocatedBudget - actualExpenses);
  const budgetUtilizationPct = allocatedBudget > 0 ? Math.round((actualExpenses / allocatedBudget) * 100) : 0;

  const upcomingTripsCount = trips.filter((t) => t.status === "upcoming").length;
  const activeTripsCount = trips.filter((t) => t.status === "ongoing").length;
  const completedTripsCount = trips.filter((t) => t.status === "completed").length;

  // Aggregate settlements & receivables
  let pendingCount = 0;
  let pendingAmount = 0;
  let completedAmount = 0;
  let outstandingReceivables = 0;
  const memberSet = new Set<string>();

  trips.forEach((t) => {
    t.members.forEach((m) => {
      memberSet.add(m.name);
      if (m.pending > 0) {
        pendingCount += 1;
        pendingAmount += m.pending;
      }
      if (m.receivable > 0) {
        outstandingReceivables += m.receivable;
      }
    });
    t.settlements.forEach((s) => {
      if (s.status === "completed") completedAmount += s.amount;
    });
  });

  const avgDailySpend = nonArchived.length > 0
    ? Math.round(actualExpenses / Math.max(1, nonArchived.reduce((sum, t) => sum + t.durationDays, 0)))
    : 0;

  const estimatedFinalCost = nonArchived.reduce((sum, t) => sum + t.projectedTotalSpend, 0);

  const overallHealth = Math.round(
    nonArchived.reduce((sum, t) => sum + t.financialHealthScore, 0) / Math.max(1, nonArchived.length)
  );

  let overallRisk: "Low Risk" | "Moderate Risk" | "High Risk" = "Low Risk";
  if (overallHealth < 50) overallRisk = "High Risk";
  else if (overallHealth < 80) overallRisk = "Moderate Risk";

  const enterpriseData = await ensureEnterpriseSessionData(user.name || "User");
  const standaloneEvents = enterpriseData.standaloneEvents || [];
  const logisticsHub = enterpriseData.logisticsHub || trips[0]?.logisticsHub || createSeedLogisticsHub();

  const allEvents = [...trips.flatMap((t) => t.events), ...standaloneEvents];

  return {
    totalTripBudget,
    allocatedBudget,
    remainingBudget,
    actualExpenses,
    personalExpenses,
    sharedExpenses,
    budgetUtilizationPct,

    pendingSettlementsCount: pendingCount,
    pendingSettlementsAmount: pendingAmount,
    completedSettlementsAmount: completedAmount,
    outstandingReceivables,

    totalTripsCount: trips.length,
    upcomingTripsCount,
    activeTripsCount,
    completedTripsCount,
    totalMembersCount: memberSet.size,

    avgDailySpend,
    estimatedFinalCost,
    overallHealthScore: overallHealth,
    overallRiskLevel: overallRisk,
    aiGlobalRecommendation:
      budgetUtilizationPct > 80
        ? "Warning: Aggregate travel expenditure is running near threshold. Review lodging and fuel expenses."
        : "Portfolio health is optimal. Projected aggregate trip savings are tracking at 12.4%.",

    currency: "INR",
    trips,
    events: allEvents,
    standaloneEvents,
    logisticsHub,
  };
}

/**
 * Professional 6-Step Create Trip Wizard Server Action
 */
export async function createTripWizard(data: {
  name: string;
  destination: string;
  country: string;
  city?: string;
  state?: string;
  district?: string;
  taluka?: string;
  village?: string;
  latitude?: number;
  longitude?: number;
  elevation?: string;
  climateZone?: string;
  bestSeason?: string;
  nearestAirport?: string;
  nearestRailwayStation?: string;
  nearestBusStand?: string;
  travelDistance?: string;
  estimatedTravelTime?: string;
  slug?: string;
  category: TripCategory;
  categories?: string[];
  coverImage?: string;
  description?: string;
  visibility?: "private" | "shared" | "public" | "invite_only" | "hidden";
  host?: string;
  coHost?: string;
  leadOrganizer?: string;
  travelAgency?: string;
  emergencyContact?: string;
  budgetStrategy?: "shared" | "personal" | "mixed";
  emergencyReservePct?: number;
  contingencyPct?: number;
  travelPace?: "relaxed" | "balanced" | "fast";
  accommodationPreference?: "budget" | "standard" | "premium" | "luxury";
  transportPreference?: string;
  tags?: string[];
  publicId?: string;
  startDate: string;
  endDate: string;
  timezone?: string;
  totalBudget: number;
  emergencyBuffer: number;
  categoryBudgets: { category: BudgetCategoryKey; allocated: number }[];
  members: { name: string; email?: string; role: "Owner" | "Admin" | "Member" | "Guest" }[];
  preferences?: {
    budgetAlertThreshold?: number;
    expenseApprovalThreshold?: number;
    defaultSplitMethod?: "equal" | "exact" | "shares";
  };
}): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  if (!data.name || data.name.trim().length === 0) {
    throw new ValidationError("Trip name is required.");
  }

  if (data.totalBudget <= 0) {
    throw new ValidationError("Total trip budget must be greater than ₹0.");
  }

  const start = new Date(data.startDate || Date.now());
  const end = new Date(data.endDate || Date.now() + 7 * 86400000);
  const durationDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));

  const preparedCategoryBudgets: CategoryBudget[] = data.categoryBudgets.map((cb) => ({
    category: cb.category,
    allocated: cb.allocated,
    spent: 0,
    remaining: cb.allocated,
    usagePct: 0,
    isOverBudget: false,
    projectedSpend: cb.allocated,
    aiForecast: "Initial allocation set",
    color: CATEGORY_COLORS[cb.category] || "#6366f1",
  }));

  const preparedMembers: TripMember[] = [
    {
      id: generatePublicId("mem"),
      name: user.name || "Trip Owner",
      email: user.email,
      role: "Owner",
      contribution: Math.round(data.totalBudget / Math.max(1, (data.members?.length || 0) + 1)),
      ownShare: 0,
      paid: 0,
      pending: 0,
      receivable: 0,
      settlementStatus: "settled",
      expenseCount: 0,
    },
    ...(data.members || []).map((m) => ({
      id: generatePublicId("mem"),
      name: m.name.trim(),
      email: m.email?.trim(),
      role: m.role || "Member",
      contribution: Math.round(data.totalBudget / Math.max(1, (data.members?.length || 0) + 1)),
      ownShare: 0,
      paid: 0,
      pending: 0,
      receivable: 0,
      settlementStatus: "settled" as const,
      expenseCount: 0,
    })),
  ];

  const publicId = data.publicId || generateTripPublicId();
  const newTrip: TripRecord = {
    id: generatePublicId("trip"),
    publicId,
    userId: user.id,
    name: data.name.trim(),
    destination: data.destination.trim() || "Destination",
    country: data.country?.trim() || "India",
    city: data.city?.trim(),
    state: data.state?.trim(),
    district: data.district?.trim() || data.city?.trim(),
    taluka: data.taluka?.trim(),
    village: data.village?.trim(),
    latitude: data.latitude,
    longitude: data.longitude,
    elevation: data.elevation,
    climateZone: data.climateZone,
    bestSeason: data.bestSeason,
    nearestAirport: data.nearestAirport,
    nearestRailwayStation: data.nearestRailwayStation,
    nearestBusStand: data.nearestBusStand,
    travelDistance: data.travelDistance,
    estimatedTravelTime: data.estimatedTravelTime,
    slug: data.slug,
    category: data.category || "vacation",
    categories: data.categories && data.categories.length > 0 ? data.categories : [data.category],
    visibility: data.visibility || "public",
    host: data.host,
    coHost: data.coHost,
    leadOrganizer: data.leadOrganizer,
    travelAgency: data.travelAgency,
    emergencyContact: data.emergencyContact,
    budgetStrategy: data.budgetStrategy || "shared",
    emergencyReservePct: data.emergencyReservePct || 10,
    contingencyPct: data.contingencyPct || 5,
    travelPace: data.travelPace || "balanced",
    accommodationPreference: data.accommodationPreference || "standard",
    transportPreference: data.transportPreference,
    tags: data.tags || [],
    coverImage:
      data.coverImage ||
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80",
    description: data.description?.trim(),
    startDate: data.startDate || new Date().toISOString().split("T")[0],
    endDate: data.endDate || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    durationDays,
    timezone: data.timezone || "IST (UTC+05:30)",
    currency: "INR",
    organizerName: user.name || "Trip Organizer",
    organizerEmail: user.email,
    status: "upcoming",

    budgetAmount: data.totalBudget,
    overallBudget: data.totalBudget,
    personalBudget: 0,
    sharedBudget: data.totalBudget,
    emergencyBudget: data.emergencyBuffer || 0,
    reserveBudget: 0,
    emergencyBuffer: data.emergencyBuffer || 0,
    allocatedBudget: preparedCategoryBudgets.reduce((sum, c) => sum + c.allocated, 0),
    actualTotal: 0,
    personalExpensesTotal: 0,
    sharedExpensesTotal: 0,
    remainingBudget: preparedCategoryBudgets.reduce((sum, c) => sum + c.allocated, 0),
    variance: preparedCategoryBudgets.reduce((sum, c) => sum + c.allocated, 0),
    budgetUsedPct: 0,

    financialHealthScore: 100,
    riskLevel: "Low Risk",
    burnRatePerDay: 0,
    recommendedDailySpend: Math.round(data.totalBudget / durationDays),
    projectedTotalSpend: data.totalBudget,
    potentialSavings: 0,
    aiInsights: ["Trip itinerary created. Add planned reservations or early bookings."],

    categoryBudgets: preparedCategoryBudgets,
    members: preparedMembers,
    expenses: [],
    settlements: [],
    itinerary: [],
    events: [],
    documents: [],
    checklists: [
      { id: generatePublicId("chk"), title: "Government IDs / Passport", category: "Documents", priority: "High", isPacked: false, isCompleted: false, assignedMemberName: user.name || "Owner" },
      { id: generatePublicId("chk"), title: "Phone Chargers & Power Bank", category: "Electronics", priority: "High", isPacked: false, isCompleted: false, assignedMemberName: user.name || "Owner" },
      { id: generatePublicId("chk"), title: "Emergency Medication", category: "Medical", priority: "High", isPacked: false, isCompleted: false, assignedMemberName: user.name || "Owner" },
    ],
    preferences: {
      budgetAlertThreshold: data.preferences?.budgetAlertThreshold || 80,
      expenseApprovalThreshold: data.preferences?.expenseApprovalThreshold || 5000,
      defaultSplitMethod: data.preferences?.defaultSplitMethod || "equal",
      settlementReminderFrequency: "daily",
    },

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  recalculateTrip(newTrip);

  const trips = tripsStore.get(userKey) || [];
  trips.unshift(newTrip);
  tripsStore.set(userKey, trips);

  return newTrip;
}

/**
 * Add Expense with Granular Split & Dynamic Reconciliation
 */
export async function addTripExpense(
  tripId: string,
  data: {
    title: string;
    category: BudgetCategoryKey;
    amount: number;
    date: string;
    paidById: string;
    isPersonal: boolean;
    splitBetweenMemberIds?: string[];
    paymentMethod: "UPI" | "Credit Card" | "Debit Card" | "Cash" | "Net Banking";
    location?: string;
    notes?: string;
    tags?: string[];
  }
): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) throw new DatabaseError("Trip not found.");

  if (!data.title || data.title.trim().length === 0) {
    throw new ValidationError("Expense title is required.");
  }
  if (!data.amount || data.amount <= 0) {
    throw new ValidationError("Expense amount must be greater than ₹0.");
  }

  const payingMember = trip.members.find((m) => m.id === data.paidById) || trip.members[0];

  const newExpense: TripExpense = {
    id: generatePublicId("exp"),
    title: data.title.trim(),
    category: data.category || "Miscellaneous",
    amount: Math.round(data.amount),
    date: data.date || new Date().toISOString().split("T")[0],
    paidById: payingMember.id,
    paidByName: payingMember.name,
    isPersonal: Boolean(data.isPersonal),
    splitBetweenMemberIds: data.isPersonal
      ? [payingMember.id]
      : data.splitBetweenMemberIds && data.splitBetweenMemberIds.length > 0
        ? data.splitBetweenMemberIds
        : trip.members.map((m) => m.id),
    paymentMethod: data.paymentMethod || "UPI",
    location: data.location?.trim(),
    notes: data.notes?.trim(),
    tags: data.tags || [],
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  trip.expenses.unshift(newExpense);

  recordAuditLog(
    trip,
    user.name || "Admin",
    "expense",
    "Expense Added",
    `Added "${newExpense.title}" (₹${newExpense.amount.toLocaleString("en-IN")}) under ${newExpense.category}`
  );

  recalculateTrip(trip);

  return trip;
}

/**
 * Delete Trip Expense
 */
export async function deleteTripExpense(tripId: string, expenseId: string): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) throw new DatabaseError("Trip not found.");

  const deleted = trip.expenses.find((e) => e.id === expenseId);
  trip.expenses = trip.expenses.filter((e) => e.id !== expenseId);

  if (deleted) {
    recordAuditLog(
      trip,
      user.name || "Admin",
      "expense",
      "Expense Deleted",
      `Removed "${deleted.title}" (₹${deleted.amount.toLocaleString("en-IN")})`
    );
  }

  recalculateTrip(trip);

  return trip;
}

/**
 * Record a Debt Settlement Between Members
 */
export async function recordTripSettlement(
  tripId: string,
  data: {
    fromMemberId: string;
    toMemberId: string;
    amount: number;
    paymentMethod?: string;
    notes?: string;
  }
): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) throw new DatabaseError("Trip not found.");

  const fromMember = trip.members.find((m) => m.id === data.fromMemberId);
  const toMember = trip.members.find((m) => m.id === data.toMemberId);

  if (!fromMember || !toMember) {
    throw new ValidationError("Invalid settlement parties.");
  }

  const settlement: TripSettlement = {
    id: generatePublicId("stl"),
    fromMemberId: fromMember.id,
    fromMemberName: fromMember.name,
    toMemberId: toMember.id,
    toMemberName: toMember.name,
    amount: Math.round(data.amount),
    status: "completed",
    settledAt: new Date().toISOString(),
    paymentMethod: data.paymentMethod || "UPI Transfer",
    notes: data.notes?.trim(),
  };

  trip.settlements.unshift(settlement);

  recordAuditLog(
    trip,
    user.name || "Admin",
    "settlement",
    "Settlement Completed",
    `Settled ₹${settlement.amount.toLocaleString("en-IN")} from ${fromMember.name} to ${toMember.name}`
  );

  recalculateTrip(trip);

  return trip;
}

/**
 * Add / Update Itinerary Stop
 */
export async function addItineraryStop(
  tripId: string,
  data: {
    dayNumber: number;
    slot: "morning" | "afternoon" | "evening" | "night";
    time: string;
    activity: string;
    location?: string;
    category?: string;
    notes?: string;
    estimatedCost?: number;
  }
): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) throw new DatabaseError("Trip not found.");

  const item: ItineraryItem = {
    id: generatePublicId("it"),
    dayNumber: data.dayNumber,
    slot: data.slot,
    time: data.time || "10:00 AM",
    activity: data.activity.trim(),
    location: data.location?.trim(),
    category: data.category || "Sightseeing",
    notes: data.notes?.trim(),
    estimatedCost: data.estimatedCost || 0,
    status: "scheduled",
  };

  trip.itinerary.push(item);
  recalculateTrip(trip);

  return trip;
}

/**
 * Delete Itinerary Stop
 */
export async function deleteItineraryStop(tripId: string, itemId: string): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) throw new DatabaseError("Trip not found.");

  trip.itinerary = trip.itinerary.filter((i) => i.id !== itemId);
  recalculateTrip(trip);

  return trip;
}

/**
 * Add Trip Event
 */
export async function addTripEvent(
  tripId: string,
  data: {
    title: string;
    type: TripEvent["type"];
    startDateTime: string;
    endDateTime?: string;
    location: string;
    venue?: string;
    address?: string;
    mapsLink?: string;
    description?: string;
    budget: number;
    actualCost?: number;
    priority?: EventPriority;
    guestLimit?: number;
    capacity?: number;
    dressCode?: string;
    transportPlan?: string;
    parkingInfo?: string;
    notes?: string;
  }
): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) throw new DatabaseError("Trip not found.");

  const publicId = generateEventPublicId();

  const event: TripEvent = {
    id: generatePublicId("evt"),
    publicId,
    title: data.title.trim(),
    type: data.type || "activity",
    startDateTime: data.startDateTime,
    endDateTime: data.endDateTime,
    location: data.location.trim(),
    venue: data.venue?.trim(),
    address: data.address?.trim(),
    mapsLink: data.mapsLink || `https://maps.google.com/?q=${encodeURIComponent(data.venue || data.location)}`,
    description: data.description?.trim(),
    organizerName: user.name || "Trip Host",
    participants: ["All Members"],
    guestLimit: data.guestLimit,
    capacity: data.capacity || 20,
    expectedAttendance: trip.members.length,
    currentAttendance: trip.members.length,
    budget: data.budget || 0,
    estimatedBudget: data.budget || 0,
    actualCost: data.actualCost || 0,
    priority: data.priority || "Medium",
    status: "upcoming",
    completionPct: 0,
    dressCode: data.dressCode,
    transportPlan: data.transportPlan,
    parkingInfo: data.parkingInfo,
    qrCodeData: `SPLITLEDGER:EVT:${publicId}`,
    publicLink: `https://splitledger.ai/events/${publicId}`,
    visibility: "members_only",
    notes: data.notes,
  };

  trip.events.unshift(event);
  recordAuditLog(
    trip,
    user.name || "Admin",
    "event",
    "Event Created",
    `Created event "${event.title}" [${event.publicId}]`
  );

  recalculateTrip(trip);
  return trip;
}

/**
 * Delete Trip Event
 */
export async function deleteTripEvent(tripId: string, eventId: string): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) throw new DatabaseError("Trip not found.");

  trip.events = trip.events.filter((e) => e.id !== eventId);
  recalculateTrip(trip);

  return trip;
}

/**
 * Add Travel Document
 */
export async function addTripDocument(
  tripId: string,
  data: {
    title: string;
    category: TripDocument["category"];
    fileName: string;
    fileType: "pdf" | "image";
    fileSize?: string;
    notes?: string;
    expiryDate?: string;
  }
): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) throw new DatabaseError("Trip not found.");

  const doc: TripDocument = {
    id: generatePublicId("doc"),
    title: data.title.trim(),
    category: data.category,
    fileName: data.fileName.trim(),
    fileType: data.fileType || "pdf",
    fileSize: data.fileSize || "1.2 MB",
    uploadedAt: new Date().toISOString().split("T")[0],
    expiryDate: data.expiryDate,
    notes: data.notes?.trim(),
  };

  trip.documents.unshift(doc);
  recalculateTrip(trip);

  return trip;
}

/**
 * Delete Travel Document
 */
export async function deleteTripDocument(tripId: string, docId: string): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) throw new DatabaseError("Trip not found.");

  trip.documents = trip.documents.filter((d) => d.id !== docId);
  recalculateTrip(trip);

  return trip;
}

/**
 * Packing Checklist Actions
 */
export async function addTripChecklistItem(
  tripId: string,
  data: {
    title: string;
    category: TripChecklistItem["category"];
    priority: "High" | "Medium" | "Low";
    assignedMemberName?: string;
  }
): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) throw new DatabaseError("Trip not found.");

  const item: TripChecklistItem = {
    id: generatePublicId("chk"),
    title: data.title.trim(),
    category: data.category || "Personal",
    priority: data.priority || "Medium",
    isPacked: false,
    isCompleted: false,
    assignedMemberName: data.assignedMemberName || user.name || "Member",
  };

  trip.checklists.push(item);
  recalculateTrip(trip);

  return trip;
}

export async function toggleChecklistItem(tripId: string, itemId: string): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) throw new DatabaseError("Trip not found.");

  const item = trip.checklists.find((c) => c.id === itemId);
  if (item) {
    item.isPacked = !item.isPacked;
    item.isCompleted = item.isPacked;
  }
  recalculateTrip(trip);

  return trip;
}

export async function deleteChecklistItem(tripId: string, itemId: string): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) throw new DatabaseError("Trip not found.");

  trip.checklists = trip.checklists.filter((c) => c.id !== itemId);
  recalculateTrip(trip);

  return trip;
}

/**
 * Duplicate a Trip
 */
export async function duplicateTrip(tripId: string): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const sourceTrip = trips.find((t) => t.id === tripId);

  if (!sourceTrip) throw new DatabaseError("Source trip not found.");

  const duplicated: TripRecord = {
    ...JSON.parse(JSON.stringify(sourceTrip)),
    id: generatePublicId("trip"),
    name: `${sourceTrip.name} (Copy)`,
    status: "upcoming",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  recalculateTrip(duplicated);
  trips.unshift(duplicated);
  tripsStore.set(userKey, trips);

  return duplicated;
}

/**
 * Archive / Restore a Trip
 */
export async function archiveTrip(tripId: string, archive: boolean = true): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) throw new DatabaseError("Trip not found.");

  trip.status = archive ? "archived" : "upcoming";
  recalculateTrip(trip);

  return trip;
}

/**
 * Delete a Trip
 */
export async function deleteTrip(tripId: string): Promise<boolean> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const filtered = trips.filter((t) => t.id !== tripId);
  tripsStore.set(userKey, filtered);

  return true;
}

/**
 * Update Category Allocation & State
 */
export async function updateCategoryBudget(
  tripId: string,
  category: BudgetCategoryKey,
  newAllocated: number,
  isLocked?: boolean,
  isArchived?: boolean
): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) throw new DatabaseError("Trip not found.");

  const cat = trip.categoryBudgets.find((c) => c.category === category);
  if (cat) {
    cat.allocated = Math.max(0, Math.round(newAllocated));
    if (isLocked !== undefined) cat.isLocked = isLocked;
    if (isArchived !== undefined) cat.isArchived = isArchived;
  } else {
    trip.categoryBudgets.push({
      category,
      allocated: Math.max(0, Math.round(newAllocated)),
      spent: 0,
      remaining: Math.max(0, Math.round(newAllocated)),
      usagePct: 0,
      isOverBudget: false,
      projectedSpend: Math.max(0, Math.round(newAllocated)),
      aiForecast: "Custom category allocated",
      color: CATEGORY_COLORS[category] || "#14b8a6",
      isLocked: Boolean(isLocked),
      isArchived: Boolean(isArchived),
    });
  }

  recordAuditLog(
    trip,
    user.name || "Admin",
    "budget",
    "Category Allocation Updated",
    `Allocated ₹${newAllocated.toLocaleString("en-IN")} to ${category}${isLocked ? " (Locked)" : ""}`
  );

  recalculateTrip(trip);
  return trip;
}

/**
 * Add / Invite Member to Trip
 */
export async function addTripMember(
  tripId: string,
  data: { name: string; email?: string; role: "Owner" | "Admin" | "Member" | "Guest"; contribution?: number }
): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) throw new DatabaseError("Trip not found.");

  if (!data.name || data.name.trim().length === 0) {
    throw new ValidationError("Member name is required.");
  }

  const newMember: TripMember = {
    id: generatePublicId("mem"),
    name: data.name.trim(),
    email: data.email?.trim(),
    role: data.role || "Member",
    contribution: data.contribution || 0,
    ownShare: 0,
    paid: 0,
    pending: 0,
    receivable: 0,
    settlementStatus: "settled",
    expenseCount: 0,
    canAddExpenses: true,
    canSettle: true,
    isFrozen: false,
    isExcludedFromPastExpenses: false,
  };

  trip.members.push(newMember);

  recordAuditLog(
    trip,
    user.name || "Admin",
    "member",
    "Member Added",
    `Added ${newMember.name} as ${newMember.role}`
  );

  recalculateTrip(trip);
  return trip;
}

/**
 * Update Full Trip Details
 */
export async function updateTripDetails(
  tripId: string,
  updates: Partial<TripRecord>
): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) throw new DatabaseError("Trip not found.");

  if (updates.name && updates.name.trim().length > 0) trip.name = updates.name.trim();
  if (updates.destination) trip.destination = updates.destination.trim();
  if (updates.country) trip.country = updates.country.trim();
  if (updates.state !== undefined) trip.state = updates.state?.trim();
  if (updates.city !== undefined) trip.city = updates.city?.trim();
  if (updates.meetingPoint !== undefined) trip.meetingPoint = updates.meetingPoint?.trim();
  if (updates.travelType !== undefined) trip.travelType = updates.travelType?.trim();
  if (updates.visibility) trip.visibility = updates.visibility;
  if (updates.category) trip.category = updates.category;
  if (updates.description !== undefined) trip.description = updates.description?.trim();
  if (updates.coverImage) trip.coverImage = updates.coverImage;
  if (updates.notes !== undefined) trip.notes = updates.notes?.trim();
  if (updates.timezone) trip.timezone = updates.timezone;
  if (updates.currency) trip.currency = updates.currency;

  if (updates.startDate) trip.startDate = updates.startDate;
  if (updates.endDate) trip.endDate = updates.endDate;
  if (updates.budgetAmount !== undefined && updates.budgetAmount > 0) {
    trip.budgetAmount = updates.budgetAmount;
  }
  if (updates.emergencyBuffer !== undefined) {
    trip.emergencyBuffer = updates.emergencyBuffer;
  }

  recordAuditLog(
    trip,
    user.name || "Admin",
    "trip",
    "Trip Details Updated",
    `Updated parameters for "${trip.name}"`
  );

  recalculateTrip(trip);
  return trip;
}

/**
 * Update Trip Lifecycle Status
 */
export async function updateTripStatus(tripId: string, status: TripStatus): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) throw new DatabaseError("Trip not found.");

  const oldStatus = trip.status;
  trip.status = status;

  recordAuditLog(
    trip,
    user.name || "Admin",
    "trip",
    "Status Changed",
    `Transitioned from ${oldStatus} to ${status}`
  );

  recalculateTrip(trip);
  return trip;
}

/**
 * Edit Trip Expense
 */
export async function editTripExpense(
  tripId: string,
  expenseId: string,
  data: Partial<TripExpense>
): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) throw new DatabaseError("Trip not found.");

  const expense = trip.expenses.find((e) => e.id === expenseId);
  if (!expense) throw new DatabaseError("Expense not found.");

  if (data.title && data.title.trim().length > 0) expense.title = data.title.trim();
  if (data.amount !== undefined && data.amount > 0) expense.amount = Math.round(data.amount);
  if (data.category) expense.category = data.category;
  if (data.date) expense.date = data.date;
  if (data.paidById) {
    const payer = trip.members.find((m) => m.id === data.paidById);
    if (payer) {
      if (payer.isFrozen) throw new ValidationError(`${payer.name} is frozen and cannot log payments.`);
      expense.paidById = payer.id;
      expense.paidByName = payer.name;
    }
  }
  if (data.isPersonal !== undefined) expense.isPersonal = Boolean(data.isPersonal);
  if (data.splitBetweenMemberIds) {
    expense.splitBetweenMemberIds = data.splitBetweenMemberIds;
  }
  if (data.paymentMethod) expense.paymentMethod = data.paymentMethod;
  if (data.location !== undefined) expense.location = data.location?.trim();
  if (data.notes !== undefined) expense.notes = data.notes?.trim();
  if (data.tags) expense.tags = data.tags;
  if (data.tax !== undefined) expense.tax = data.tax;
  if (data.discount !== undefined) expense.discount = data.discount;
  expense.updatedAt = new Date().toISOString();

  recordAuditLog(
    trip,
    user.name || "Admin",
    "expense",
    "Expense Modified",
    `Edited "${expense.title}" (₹${expense.amount.toLocaleString("en-IN")})`
  );

  recalculateTrip(trip);
  return trip;
}

/**
 * Duplicate an Expense
 */
export async function duplicateTripExpense(tripId: string, expenseId: string): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) throw new DatabaseError("Trip not found.");

  const original = trip.expenses.find((e) => e.id === expenseId);
  if (!original) throw new DatabaseError("Original expense not found.");

  const duplicated: TripExpense = {
    ...JSON.parse(JSON.stringify(original)),
    id: generatePublicId("exp"),
    title: `${original.title} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  trip.expenses.unshift(duplicated);

  recordAuditLog(
    trip,
    user.name || "Admin",
    "expense",
    "Expense Duplicated",
    `Cloned "${original.title}" as "${duplicated.title}"`
  );

  recalculateTrip(trip);
  return trip;
}

/**
 * Toggle Expense Between Personal and Shared
 */
export async function toggleExpensePersonalShared(tripId: string, expenseId: string): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) throw new DatabaseError("Trip not found.");

  const expense = trip.expenses.find((e) => e.id === expenseId);
  if (!expense) throw new DatabaseError("Expense not found.");

  expense.isPersonal = !expense.isPersonal;
  if (expense.isPersonal) {
    expense.splitBetweenMemberIds = [expense.paidById];
  } else {
    expense.splitBetweenMemberIds = trip.members.map((m) => m.id);
  }
  expense.updatedAt = new Date().toISOString();

  recordAuditLog(
    trip,
    user.name || "Admin",
    "expense",
    "Expense Converted",
    `Converted "${expense.title}" to ${expense.isPersonal ? "Personal" : "Shared Group"}`
  );

  recalculateTrip(trip);
  return trip;
}

/**
 * Remove Member from Trip
 */
export async function removeTripMember(tripId: string, memberId: string): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) throw new DatabaseError("Trip not found.");

  const member = trip.members.find((m) => m.id === memberId);
  if (!member) throw new DatabaseError("Member not found.");

  if (member.role === "Owner") {
    throw new ValidationError("Cannot remove the Trip Owner. Transfer ownership first.");
  }

  trip.members = trip.members.filter((m) => m.id !== memberId);
  // Clean up from split arrays
  trip.expenses.forEach((e) => {
    if (e.splitBetweenMemberIds) {
      e.splitBetweenMemberIds = e.splitBetweenMemberIds.filter((id) => id !== memberId);
      if (e.splitBetweenMemberIds.length === 0) {
        e.splitBetweenMemberIds = [e.paidById];
      }
    }
  });

  recordAuditLog(
    trip,
    user.name || "Admin",
    "member",
    "Member Removed",
    `Removed ${member.name} from trip`
  );

  recalculateTrip(trip);
  return trip;
}

/**
 * Update Member Role
 */
export async function updateTripMemberRole(
  tripId: string,
  memberId: string,
  role: MemberRole
): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) throw new DatabaseError("Trip not found.");

  const member = trip.members.find((m) => m.id === memberId);
  if (!member) throw new DatabaseError("Member not found.");

  member.role = role;

  recordAuditLog(
    trip,
    user.name || "Admin",
    "member",
    "Role Updated",
    `Changed ${member.name}'s role to ${role}`
  );

  recalculateTrip(trip);
  return trip;
}

/**
 * Toggle Member Freeze Status
 */
export async function toggleMemberFreeze(tripId: string, memberId: string): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) throw new DatabaseError("Trip not found.");

  const member = trip.members.find((m) => m.id === memberId);
  if (!member) throw new DatabaseError("Member not found.");

  member.isFrozen = !member.isFrozen;

  recordAuditLog(
    trip,
    user.name || "Admin",
    "member",
    member.isFrozen ? "Member Frozen" : "Member Unfrozen",
    `${member.name} was ${member.isFrozen ? "frozen (expense rights suspended)" : "reactivated"}`
  );

  recalculateTrip(trip);
  return trip;
}

/**
 * Toggle Member Past Expense Inclusion
 */
export async function toggleMemberPastExpenseInclusion(tripId: string, memberId: string): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) throw new DatabaseError("Trip not found.");

  const member = trip.members.find((m) => m.id === memberId);
  if (!member) throw new DatabaseError("Member not found.");

  member.isExcludedFromPastExpenses = !member.isExcludedFromPastExpenses;

  recordAuditLog(
    trip,
    user.name || "Admin",
    "member",
    "Expense Inclusion Changed",
    `${member.name} is now ${member.isExcludedFromPastExpenses ? "excluded from" : "included in"} past expenses`
  );

  recalculateTrip(trip);
  return trip;
}

/**
 * Transfer Trip Ownership
 */
export async function transferTripOwnership(tripId: string, newOwnerId: string): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) throw new DatabaseError("Trip not found.");

  const currentOwner = trip.members.find((m) => m.role === "Owner");
  const newOwner = trip.members.find((m) => m.id === newOwnerId);

  if (!newOwner) throw new DatabaseError("Designated owner not found in members.");

  if (currentOwner) currentOwner.role = "Admin";
  newOwner.role = "Owner";
  trip.organizerName = newOwner.name;
  if (newOwner.email) trip.organizerEmail = newOwner.email;

  recordAuditLog(
    trip,
    user.name || "Admin",
    "member",
    "Ownership Transferred",
    `Ownership transferred from ${currentOwner?.name || "Previous"} to ${newOwner.name}`
  );

  recalculateTrip(trip);
  return trip;
}

/**
 * Edit Trip Event
 */
export async function editTripEvent(
  tripId: string,
  eventId: string,
  data: Partial<TripEvent>
): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) throw new DatabaseError("Trip not found.");

  const event = trip.events.find((e) => e.id === eventId);
  if (!event) throw new DatabaseError("Event not found.");

  if (data.title && data.title.trim().length > 0) event.title = data.title.trim();
  if (data.type) event.type = data.type;
  if (data.category !== undefined) event.category = data.category;
  if (data.startDateTime) event.startDateTime = data.startDateTime;
  if (data.endDateTime !== undefined) event.endDateTime = data.endDateTime;
  if (data.location !== undefined) event.location = data.location.trim();
  if (data.venue !== undefined) event.venue = data.venue?.trim();
  if (data.mapsLink !== undefined) event.mapsLink = data.mapsLink?.trim();
  if (data.description !== undefined) event.description = data.description?.trim();
  if (data.budget !== undefined) event.budget = data.budget;
  if (data.actualCost !== undefined) event.actualCost = data.actualCost;
  if (data.priority) event.priority = data.priority;
  if (data.status) event.status = data.status;
  if (data.completionPct !== undefined) event.completionPct = data.completionPct;
  if (data.notes !== undefined) event.notes = data.notes?.trim();

  recordAuditLog(
    trip,
    user.name || "Admin",
    "event",
    "Event Edited",
    `Updated event "${event.title}"`
  );

  recalculateTrip(trip);
  return trip;
}

/**
 * Duplicate a Trip Event
 */
export async function duplicateTripEvent(tripId: string, eventId: string): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) throw new DatabaseError("Trip not found.");

  const original = trip.events.find((e) => e.id === eventId);
  if (!original) throw new DatabaseError("Event not found.");

  const newPublicId = generateEventPublicId();
  const duplicated: TripEvent = {
    ...JSON.parse(JSON.stringify(original)),
    id: generatePublicId("evt"),
    publicId: newPublicId,
    qrCodeData: `SPLITLEDGER:EVT:${newPublicId}`,
    publicLink: `https://splitledger.ai/events/${newPublicId}`,
    title: `${original.title} (Copy)`,
    status: "upcoming",
  };

  trip.events.unshift(duplicated);

  recordAuditLog(
    trip,
    user.name || "Admin",
    "event",
    "Event Duplicated",
    `Cloned event "${original.title}"`
  );

  recalculateTrip(trip);
  return trip;
}

/**
 * Update Event Status
 */
export async function updateTripEventStatus(
  tripId: string,
  eventId: string,
  status: TripEventStatus
): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) throw new DatabaseError("Trip not found.");

  const event = trip.events.find((e) => e.id === eventId);
  if (!event) throw new DatabaseError("Event not found.");

  event.status = status;
  if (status === "completed") event.completionPct = 100;

  recordAuditLog(
    trip,
    user.name || "Admin",
    "event",
    "Event Status Updated",
    `Marked "${event.title}" as ${status}`
  );

  recalculateTrip(trip);
  return trip;
}

/**
 * Edit Checklist Item
 */
export async function editTripChecklistItem(
  tripId: string,
  itemId: string,
  data: Partial<TripChecklistItem>
): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) throw new DatabaseError("Trip not found.");

  const item = trip.checklists.find((c) => c.id === itemId);
  if (!item) throw new DatabaseError("Checklist item not found.");

  if (data.title && data.title.trim().length > 0) item.title = data.title.trim();
  if (data.category) item.category = data.category;
  if (data.priority) item.priority = data.priority;
  if (data.assignedMemberName !== undefined) item.assignedMemberName = data.assignedMemberName;
  if (data.reminderDate !== undefined) item.reminderDate = data.reminderDate;
  if (data.dueDate !== undefined) item.dueDate = data.dueDate;
  if (data.notes !== undefined) item.notes = data.notes?.trim();
  if (data.isPacked !== undefined) {
    item.isPacked = data.isPacked;
    item.isCompleted = data.isPacked;
  }

  recordAuditLog(
    trip,
    user.name || "Admin",
    "checklist",
    "Checklist Item Edited",
    `Updated item "${item.title}"`
  );

  recalculateTrip(trip);
  return trip;
}

/**
 * Duplicate Checklist Item
 */
export async function duplicateTripChecklistItem(tripId: string, itemId: string): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) throw new DatabaseError("Trip not found.");

  const original = trip.checklists.find((c) => c.id === itemId);
  if (!original) throw new DatabaseError("Checklist item not found.");

  const duplicated: TripChecklistItem = {
    ...JSON.parse(JSON.stringify(original)),
    id: generatePublicId("chk"),
    title: `${original.title} (Copy)`,
    isPacked: false,
    isCompleted: false,
  };

  trip.checklists.push(duplicated);

  recordAuditLog(
    trip,
    user.name || "Admin",
    "checklist",
    "Checklist Item Duplicated",
    `Cloned item "${original.title}"`
  );

  recalculateTrip(trip);
  return trip;
}

/**
 * Cancel / Reverse a Settlement
 */
export async function cancelTripSettlement(tripId: string, settlementId: string): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) throw new DatabaseError("Trip not found.");

  const settlement = trip.settlements.find((s) => s.id === settlementId);
  if (!settlement) throw new DatabaseError("Settlement not found.");

  settlement.status = "pending";

  recordAuditLog(
    trip,
    user.name || "Admin",
    "settlement",
    "Settlement Reversed",
    `Reversed settlement of ₹${settlement.amount.toLocaleString("en-IN")} from ${settlement.fromMemberName}`
  );

  recalculateTrip(trip);
  return trip;
}

// Backward compatibility stubs for legacy components
export async function createTrip(data: any): Promise<TripRecord> {
  return createTripWizard({
    name: data.name,
    destination: data.destination || "Destination",
    country: "India",
    category: data.category || "vacation",
    startDate: data.startDate,
    endDate: data.endDate,
    totalBudget: data.budgetAmount,
    emergencyBuffer: 5000,
    categoryBudgets: [
      { category: "Hotel", allocated: Math.round(data.budgetAmount * 0.4) },
      { category: "Transportation", allocated: Math.round(data.budgetAmount * 0.3) },
      { category: "Food", allocated: Math.round(data.budgetAmount * 0.2) },
      { category: "Emergency", allocated: Math.round(data.budgetAmount * 0.1) },
    ],
    members: [],
  });
}

export async function createEvent(data: any) {
  if (data.budgetAmount !== undefined && data.budgetAmount <= 0) {
    throw new ValidationError("Event budget must be greater than ₹0.");
  }
  return {
    ...data,
    id: generatePublicId("evt"),
  };
}

export async function deleteEvent(id: string) {
  return true;
}

export async function addPlannedExpense(tripId: string, data: any) {
  const trip = await addTripExpense(tripId, {
    title: data.title,
    category: data.category || "Miscellaneous",
    amount: data.actualAmount ?? data.estimatedAmount ?? 1000,
    date: new Date().toISOString().split("T")[0],
    paidById: "mem_1",
    isPersonal: false,
    paymentMethod: "UPI",
  });

  if (data.estimatedAmount !== undefined) {
    trip.estimatedTotal = data.estimatedAmount;
    if (data.actualAmount !== undefined) {
      trip.actualTotal = data.actualAmount;
      trip.variance = data.actualAmount - data.estimatedAmount;
    }
  }

  return trip;
}

export async function deletePlannedExpense(tripId: string, expenseId: string) {
  return deleteTripExpense(tripId, expenseId);
}

export async function addChecklistItem(tripId: string, data: any) {
  return addTripChecklistItem(tripId, {
    title: data.title,
    category: "Personal",
    priority: "Medium",
    assignedMemberName: data.assignedMember,
  });
}



