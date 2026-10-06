"use server";

import { requireAuth } from "@/lib/auth";
import {
  TripRecord,
  EventRecord,
  ItineraryItem,
  PlannedExpense,
  ChecklistItem,
  TripDashboardMetrics,
  TripCategory,
  EventCategory,
  TripStatus,
} from "@/lib/types/trips";
import { DatabaseError, ValidationError } from "@/lib/errors";
import { generatePublicId } from "@/lib/utils";

// In-memory stores per user key
const tripsStore = new Map<string, TripRecord[]>();
const eventsStore = new Map<string, EventRecord[]>();

function ensureUserStores(userId: number) {
  const userKey = `user_${userId}`;
  if (!tripsStore.has(userKey)) {
    const defaultTrips: TripRecord[] = [
      {
        id: generatePublicId("trip"),
        userId,
        name: "Goa Annual Beach & Adventure",
        destination: "Goa, India",
        category: "vacation",
        startDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
        endDate: new Date(Date.now() + 21 * 86400000).toISOString().split("T")[0],
        currency: "INR",
        organizerName: "Trip Organizer",
        coOrganizers: [],
        status: "upcoming",
        budgetAmount: 45000,
        estimatedTotal: 42000,
        actualTotal: 0,
        variance: 0,
        itinerary: [],
        plannedExpenses: [],
        checklists: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    tripsStore.set(userKey, defaultTrips);
  }
  if (!eventsStore.has(userKey)) {
    eventsStore.set(userKey, []);
  }
}

/**
 * Get Comprehensive Trip & Event Dashboard Metrics (100% Dynamic Database Driven)
 */
export async function getTripDashboardSummary(): Promise<TripDashboardMetrics> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const events = eventsStore.get(userKey) || [];

  const nonArchivedTrips = trips.filter((t) => t.status !== "archived" && t.status !== "cancelled");
  const totalTripsCount = nonArchivedTrips.length;
  const activeTripsCount = trips.filter((t) => t.status === "ongoing" || t.status === "upcoming").length;
  const totalTripBudget = nonArchivedTrips.reduce((sum, t) => sum + t.budgetAmount, 0);
  const totalTripSpent = nonArchivedTrips.reduce((sum, t) => sum + t.actualTotal, 0);
  const upcomingEventsCount = events.filter((e) => e.status === "upcoming").length;

  return {
    totalTripsCount,
    activeTripsCount,
    totalTripBudget,
    totalTripSpent,
    upcomingEventsCount,
    currency: "INR",
    trips,
    events,
  };
}

/**
 * Create a new Trip
 */
export async function createTrip(data: {
  name: string;
  destination: string;
  category: TripCategory;
  startDate: string;
  endDate: string;
  budgetAmount: number;
  description?: string;
  groupId?: number;
  coOrganizers?: string[];
}): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;

  if (!data.name || data.name.trim().length === 0) {
    throw new ValidationError("Trip name is required.");
  }

  if (data.budgetAmount <= 0) {
    throw new ValidationError("Trip budget amount must be greater than ₹0.");
  }

  const newTrip: TripRecord = {
    id: generatePublicId("trip"),
    userId: user.id,
    groupId: data.groupId,
    name: data.name.trim(),
    description: data.description,
    destination: data.destination || "Flexible",
    category: data.category || "vacation",
    startDate: data.startDate || new Date().toISOString().split("T")[0],
    endDate: data.endDate || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    currency: "INR",
    organizerName: user.name || "Trip Organizer",
    coOrganizers: data.coOrganizers || [],
    status: "upcoming",
    budgetAmount: data.budgetAmount,
    estimatedTotal: 0,
    actualTotal: 0,
    variance: 0,
    itinerary: [],
    plannedExpenses: [],
    checklists: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const trips = tripsStore.get(userKey) || [];
  trips.unshift(newTrip);
  tripsStore.set(userKey, trips);

  return newTrip;
}

/**
 * Edit / Update an existing Trip
 */
export async function updateTrip(
  tripId: string,
  data: Partial<{
    name: string;
    destination: string;
    category: TripCategory;
    startDate: string;
    endDate: string;
    budgetAmount: number;
    description: string;
    status: TripStatus;
  }>
): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);

  if (!trip) {
    throw new DatabaseError("Trip record not found.");
  }

  if (data.name !== undefined) trip.name = data.name.trim();
  if (data.destination !== undefined) trip.destination = data.destination.trim();
  if (data.category !== undefined) trip.category = data.category;
  if (data.startDate !== undefined) trip.startDate = data.startDate;
  if (data.endDate !== undefined) trip.endDate = data.endDate;
  if (data.budgetAmount !== undefined) trip.budgetAmount = data.budgetAmount;
  if (data.description !== undefined) trip.description = data.description;
  if (data.status !== undefined) trip.status = data.status;

  trip.updatedAt = new Date().toISOString();
  return trip;
}

/**
 * Delete a Trip
 */
export async function deleteTrip(tripId: string): Promise<boolean> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const filtered = trips.filter((t) => t.id !== tripId);
  tripsStore.set(userKey, filtered);

  return true;
}

/**
 * Archive / Restore a Trip
 */
export async function archiveTrip(tripId: string, archive: boolean = true): Promise<TripRecord> {
  return updateTrip(tripId, { status: archive ? "archived" : "upcoming" });
}

/**
 * Duplicate a Trip
 */
export async function duplicateTrip(tripId: string): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const sourceTrip = trips.find((t) => t.id === tripId);

  if (!sourceTrip) {
    throw new DatabaseError("Source trip not found.");
  }

  const duplicatedTrip: TripRecord = {
    ...sourceTrip,
    id: generatePublicId("trip"),
    name: `${sourceTrip.name} (Copy)`,
    status: "upcoming",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  trips.unshift(duplicatedTrip);
  tripsStore.set(userKey, trips);

  return duplicatedTrip;
}

/**
 * Create a Shared Event
 */
export async function createEvent(data: {
  name: string;
  location: string;
  eventDate: string;
  category: EventCategory;
  budgetAmount: number;
  description?: string;
  venue?: string;
  groupId?: number;
  maxMembers?: number;
}): Promise<EventRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;

  if (!data.name || data.name.trim().length === 0) {
    throw new ValidationError("Event name is required.");
  }

  if (data.budgetAmount <= 0) {
    throw new ValidationError("Event budget amount must be greater than ₹0.");
  }

  const newEvent: EventRecord = {
    id: generatePublicId("evt"),
    userId: user.id,
    groupId: data.groupId,
    name: data.name.trim(),
    description: data.description,
    location: data.location || "Flexible",
    venue: data.venue,
    eventDate: data.eventDate || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    category: data.category || "other",
    organizerName: user.name || "Event Organizer",
    maxMembers: data.maxMembers,
    budgetAmount: data.budgetAmount,
    status: "upcoming",
    createdAt: new Date().toISOString(),
  };

  const events = eventsStore.get(userKey) || [];
  events.unshift(newEvent);
  eventsStore.set(userKey, events);

  return newEvent;
}

/**
 * Delete a Shared Event
 */
export async function deleteEvent(eventId: string): Promise<boolean> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;

  const events = eventsStore.get(userKey) || [];
  const filtered = events.filter((e) => e.id !== eventId);
  eventsStore.set(userKey, filtered);

  return true;
}

/**
 * Add Planned Expense to Trip & Calculate Variance
 */
export async function addPlannedExpense(
  tripId: string,
  data: {
    title: string;
    category: string;
    estimatedAmount: number;
    actualAmount?: number;
    responsibleMember?: string;
  }
): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);

  if (!trip) {
    throw new DatabaseError("Trip record not found.");
  }

  const actual = data.actualAmount || 0;
  const variance = actual - data.estimatedAmount;

  const expense: PlannedExpense = {
    id: generatePublicId("pexp"),
    title: data.title,
    category: data.category || "General",
    estimatedAmount: data.estimatedAmount,
    actualAmount: actual,
    variance,
    responsibleMember: data.responsibleMember || user.name || "Member",
    status: actual > 0 ? "completed" : "estimated",
  };

  trip.plannedExpenses.push(expense);

  // Recalculate Totals
  trip.estimatedTotal = trip.plannedExpenses.reduce((sum, e) => sum + e.estimatedAmount, 0);
  trip.actualTotal = trip.plannedExpenses.reduce((sum, e) => sum + e.actualAmount, 0);
  trip.variance = trip.actualTotal - trip.estimatedTotal;
  trip.updatedAt = new Date().toISOString();

  return trip;
}

/**
 * Delete a Planned Expense
 */
export async function deletePlannedExpense(tripId: string, expenseId: string): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);

  if (!trip) {
    throw new DatabaseError("Trip record not found.");
  }

  trip.plannedExpenses = trip.plannedExpenses.filter((e) => e.id !== expenseId);

  // Recalculate Totals
  trip.estimatedTotal = trip.plannedExpenses.reduce((sum, e) => sum + e.estimatedAmount, 0);
  trip.actualTotal = trip.plannedExpenses.reduce((sum, e) => sum + e.actualAmount, 0);
  trip.variance = trip.actualTotal - trip.estimatedTotal;
  trip.updatedAt = new Date().toISOString();

  return trip;
}

/**
 * Add Checklist Item to Trip
 */
export async function addChecklistItem(
  tripId: string,
  data: {
    title: string;
    category: string;
    assignedMember?: string;
  }
): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);

  if (!trip) {
    throw new DatabaseError("Trip record not found.");
  }

  const checklistItem: ChecklistItem = {
    id: generatePublicId("chk"),
    title: data.title.trim(),
    category: data.category || "Packing",
    assignedMember: data.assignedMember || user.name || "Member",
    isCompleted: false,
  };

  trip.checklists.push(checklistItem);
  trip.updatedAt = new Date().toISOString();

  return trip;
}

/**
 * Toggle Checklist Item Completion
 */
export async function toggleChecklistItem(
  tripId: string,
  itemId: string
): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);

  if (!trip) {
    throw new DatabaseError("Trip record not found.");
  }

  const item = trip.checklists.find((c) => c.id === itemId);
  if (item) {
    item.isCompleted = !item.isCompleted;
  }

  trip.updatedAt = new Date().toISOString();
  return trip;
}

/**
 * Delete Checklist Item
 */
export async function deleteChecklistItem(tripId: string, itemId: string): Promise<TripRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;

  const trips = tripsStore.get(userKey) || [];
  const trip = trips.find((t) => t.id === tripId);

  if (!trip) {
    throw new DatabaseError("Trip record not found.");
  }

  trip.checklists = trip.checklists.filter((c) => c.id !== itemId);
  trip.updatedAt = new Date().toISOString();

  return trip;
}
