"use server";

import { requireAuth } from "@/lib/auth";
import {
  TripRecord,
  TripCategory,
  TripStatus,
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
} from "@/lib/types/trips";
import { DatabaseError, ValidationError } from "@/lib/errors";
import { generatePublicId } from "@/lib/utils";

// In-memory persistent session stores per user
const tripsStore = new Map<string, TripRecord[]>();

const DEFAULT_CATEGORIES: BudgetCategoryKey[] = [
  "Transportation",
  "Hotel",
  "Food",
  "Fuel",
  "Shopping",
  "Adventure",
  "Entry Tickets",
  "Medical",
  "Emergency",
  "Miscellaneous",
];

const CATEGORY_COLORS: Record<BudgetCategoryKey, string> = {
  Transportation: "#3b82f6", // Blue
  Hotel: "#8b5cf6", // Purple
  Food: "#10b981", // Emerald
  Fuel: "#f59e0b", // Amber
  Shopping: "#ec4899", // Pink
  Adventure: "#06b6d4", // Cyan
  "Entry Tickets": "#6366f1", // Indigo
  Medical: "#ef4444", // Red
  Emergency: "#f97316", // Orange
  Miscellaneous: "#64748b", // Slate
  Custom: "#14b8a6", // Teal
};

/**
 * Recalculate all financials and health metrics for a trip
 */
function recalculateTrip(trip: TripRecord): TripRecord {
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

  // 2. Sum up category budgets
  trip.categoryBudgets = trip.categoryBudgets.map((cat) => {
    const catSpent = trip.expenses
      .filter((e) => e.category === cat.category)
      .reduce((sum, e) => sum + e.amount, 0);

    const remaining = cat.allocated - catSpent;
    const usagePct = cat.allocated > 0 ? Math.round((catSpent / cat.allocated) * 100) : 0;
    const isOver = catSpent > cat.allocated;

    return {
      ...cat,
      spent: catSpent,
      remaining,
      usagePct,
      isOverBudget: isOver,
      projectedSpend: catSpent > cat.allocated ? catSpent : Math.round(catSpent * 1.15),
      aiForecast: isOver
        ? `Over allocated budget by ₹${Math.abs(remaining).toLocaleString("en-IN")}`
        : usagePct > 80
          ? "Approaching threshold limit"
          : "Spending pace within normal limits",
    };
  });

  trip.allocatedBudget = trip.categoryBudgets.reduce((sum, c) => sum + c.allocated, 0);
  trip.estimatedTotal = trip.allocatedBudget;
  trip.remainingBudget = Math.max(0, trip.allocatedBudget - trip.actualTotal);
  trip.variance = trip.allocatedBudget - trip.actualTotal;
  trip.budgetUsedPct =
    trip.allocatedBudget > 0 ? Math.round((trip.actualTotal / trip.allocatedBudget) * 100) : 0;

  // 3. Recalculate member ledger balances
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
      const splitAmount = exp.amount / exp.splitBetweenMemberIds.length;
      exp.splitBetweenMemberIds.forEach((mId) => {
        if (memberBalances[mId]) {
          memberBalances[mId].share += splitAmount;
        }
      });
    } else if (exp.isPersonal && memberBalances[exp.paidById]) {
      memberBalances[exp.paidById].share += exp.amount;
    }
  });

  trip.members = trip.members.map((m) => {
    const data = memberBalances[m.id] || { paid: 0, share: 0, count: 0 };
    const net = data.paid - data.share;
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

  // 5. Financial Health & Risk Assessment
  let health = 100;
  if (trip.budgetUsedPct > 85) health -= 25;
  else if (trip.budgetUsedPct > 65) health -= 10;

  const overBudgetCats = trip.categoryBudgets.filter((c) => c.isOverBudget).length;
  health -= overBudgetCats * 10;
  trip.financialHealthScore = Math.max(15, Math.min(100, health));

  if (trip.financialHealthScore >= 80) trip.riskLevel = "Low Risk";
  else if (trip.financialHealthScore >= 50) trip.riskLevel = "Moderate Risk";
  else trip.riskLevel = "High Risk";

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

  const highestCat = [...trip.categoryBudgets].sort((a, b) => b.spent - a.spent)[0];
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
        { id: "evt_1", title: "Dabolim Airport Land & Transfer", type: "flight", startDateTime: new Date(Date.now() + 5 * 86400000).toISOString(), location: "Goa Airport", venue: "Terminal 1 Gate 4", description: "Flight 6E-204 scheduled landing", participants: ["All Members"], budget: 1500, status: "upcoming" },
        { id: "evt_2", title: "Sunset Beach Barbeque & Music", type: "dinner", startDateTime: new Date(Date.now() + 6 * 86400000).toISOString(), location: "Anjuna Shore", venue: "Curlies Bay Lounge", description: "Private table overlooking sunset beach", participants: ["All Members"], budget: 4500, status: "upcoming" },
      ],

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
      events: [],
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

  const allEvents = trips.flatMap((t) => t.events);

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
  category: TripCategory;
  coverImage?: string;
  description?: string;
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

  const newTrip: TripRecord = {
    id: generatePublicId("trip"),
    userId: user.id,
    name: data.name.trim(),
    destination: data.destination.trim() || "Destination",
    country: data.country?.trim() || "India",
    city: data.city?.trim(),
    category: data.category || "vacation",
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

  trip.expenses = trip.expenses.filter((e) => e.id !== expenseId);
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
    description?: string;
    budget: number;
  }
): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) throw new DatabaseError("Trip not found.");

  const event: TripEvent = {
    id: generatePublicId("evt"),
    title: data.title.trim(),
    type: data.type || "activity",
    startDateTime: data.startDateTime,
    endDateTime: data.endDateTime,
    location: data.location.trim(),
    venue: data.venue?.trim(),
    description: data.description?.trim(),
    participants: ["All Members"],
    budget: data.budget || 0,
    status: "upcoming",
  };

  trip.events.unshift(event);
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
 * Update Category Allocation
 */
export async function updateCategoryBudget(
  tripId: string,
  category: BudgetCategoryKey,
  newAllocated: number
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
    });
  }

  recalculateTrip(trip);
  return trip;
}

/**
 * Add / Invite Member to Trip
 */
export async function addTripMember(
  tripId: string,
  data: { name: string; email?: string; role: "Owner" | "Admin" | "Member" | "Guest" }
): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id, user.name || "User");
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) throw new DatabaseError("Trip not found.");

  const newMember: TripMember = {
    id: generatePublicId("mem"),
    name: data.name.trim(),
    email: data.email?.trim(),
    role: data.role || "Member",
    contribution: 0,
    ownShare: 0,
    paid: 0,
    pending: 0,
    receivable: 0,
    settlementStatus: "settled",
    expenseCount: 0,
  };

  trip.members.push(newMember);
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
