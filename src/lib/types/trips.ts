/**
 * Trip Planning, Event Management, Shared Events & Expense Scheduling Types
 */

export type TripCategory = "vacation" | "road_trip" | "trek" | "picnic" | "business" | "camping" | "custom";
export type TripStatus = "planning" | "upcoming" | "ongoing" | "completed" | "cancelled" | "archived";
export type EventCategory = "birthday" | "wedding" | "festival" | "party" | "conference" | "office" | "custom";
export type EventStatus = "upcoming" | "ongoing" | "completed" | "cancelled";

export interface ItineraryItem {
  id: string;
  dayNumber: number;
  time: string;
  activity: string;
  location?: string;
  notes?: string;
}

export interface PlannedExpense {
  id: string;
  title: string;
  category: string;
  estimatedAmount: number; // in rupees
  actualAmount: number; // in rupees
  variance: number; // actualAmount - estimatedAmount
  responsibleMember: string;
  dueDate?: string;
  status: "estimated" | "approved" | "completed";
}

export interface ChecklistItem {
  id: string;
  title: string;
  category: string;
  assignedMember: string;
  isCompleted: boolean;
}

export interface TripRecord {
  id: string; // Random 16-char ID (trip_...)
  userId: number;
  groupId?: number;
  name: string;
  description?: string;
  destination: string;
  category: TripCategory;
  startDate: string;
  endDate: string;
  currency: string; // Default: INR
  organizerName: string;
  coOrganizers?: string[];
  status: TripStatus;
  budgetAmount: number; // in rupees
  estimatedTotal: number; // in rupees
  actualTotal: number; // in rupees
  variance: number; // actualTotal - estimatedTotal
  itinerary: ItineraryItem[];
  plannedExpenses: PlannedExpense[];
  checklists: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface EventRecord {
  id: string; // Random 16-char ID (evt_...)
  userId: number;
  groupId?: number;
  name: string;
  description?: string;
  location: string;
  venue?: string;
  eventDate: string;
  category: EventCategory;
  organizerName: string;
  maxMembers?: number;
  budgetAmount: number; // in rupees
  status: EventStatus;
  createdAt: string;
}

export interface TripDashboardMetrics {
  totalTripsCount: number;
  activeTripsCount: number;
  totalTripBudget: number; // in rupees
  totalTripSpent: number; // in rupees
  upcomingEventsCount: number;
  currency: string;
  trips: TripRecord[];
  events: EventRecord[];
}
