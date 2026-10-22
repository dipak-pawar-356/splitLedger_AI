/**
 * SplitLedger AI Enterprise Trip & Event Operating System Data Types
 * Designed for enterprise-grade financial planning, multi-category budgeting,
 * collaborative expense allocation, itinerary tracking, and real-time AI forecasts.
 */

export type TripCategory =
  | "vacation"
  | "road_trip"
  | "trek"
  | "picnic"
  | "business"
  | "camping"
  | "luxury"
  | "backpacking"
  | "custom";

export type TripStatus = "planning" | "upcoming" | "ongoing" | "completed" | "cancelled" | "archived";

export type MemberRole = "Owner" | "Admin" | "Member" | "Guest";

export interface TripMember {
  id: string;
  name: string;
  email?: string;
  role: MemberRole;
  avatar?: string;
  contribution: number; // in rupees
  ownShare: number; // in rupees
  paid: number; // in rupees
  pending: number; // in rupees
  receivable: number; // in rupees
  settlementStatus: "settled" | "pending" | "overpaid";
  expenseCount: number;
}

export type BudgetCategoryKey =
  | "Transportation"
  | "Hotel"
  | "Food"
  | "Fuel"
  | "Shopping"
  | "Adventure"
  | "Entry Tickets"
  | "Medical"
  | "Emergency"
  | "Miscellaneous"
  | "Custom";

export interface CategoryBudget {
  category: BudgetCategoryKey;
  allocated: number; // in rupees
  spent: number; // in rupees
  remaining: number; // allocated - spent
  usagePct: number; // (spent / allocated) * 100
  isOverBudget: boolean;
  projectedSpend: number;
  aiForecast: string;
  color: string;
}

export interface TripExpense {
  id: string;
  title: string;
  category: BudgetCategoryKey;
  amount: number; // in rupees
  date: string;
  paidById: string;
  paidByName: string;
  isPersonal: boolean; // if true, personal only; if false, shared with group
  splitBetweenMemberIds: string[];
  paymentMethod: "UPI" | "Credit Card" | "Debit Card" | "Cash" | "Net Banking";
  receiptUrl?: string;
  location?: string;
  tags?: string[];
  notes?: string;
  status: "settled" | "pending";
  createdAt: string;
}

export interface TripSettlement {
  id: string;
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  amount: number;
  status: "completed" | "pending";
  settledAt?: string;
  paymentMethod?: string;
  notes?: string;
}

export interface ItineraryItem {
  id: string;
  dayNumber: number; // e.g. 1, 2, 3
  slot: "morning" | "afternoon" | "evening" | "night";
  time: string; // "09:00 AM"
  activity: string;
  location?: string;
  category?: string;
  notes?: string;
  estimatedCost?: number;
  status: "scheduled" | "in_progress" | "completed";
}

export interface TripEvent {
  id: string;
  title: string;
  type:
    | "flight"
    | "hotel_checkin"
    | "bus"
    | "train"
    | "dinner"
    | "trekking"
    | "camping"
    | "meeting"
    | "activity"
    | "reminder";
  startDateTime: string;
  endDateTime?: string;
  location: string;
  venue?: string;
  description?: string;
  participants: string[];
  budget: number;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  attachments?: string[];
}

export interface TripDocument {
  id: string;
  title: string;
  category:
    | "Hotel Booking"
    | "Flight Ticket"
    | "Train / Bus Ticket"
    | "Passport & Visa"
    | "Driving License / ID"
    | "Travel Insurance"
    | "Receipt / Invoice"
    | "Medical & Vaccination";
  fileName: string;
  fileType: "pdf" | "image";
  fileSize: string;
  uploadedAt: string;
  expiryDate?: string;
  notes?: string;
}

export interface TripChecklistItem {
  id: string;
  title: string;
  category:
    | "Documents"
    | "Electronics"
    | "Clothes"
    | "Medical"
    | "Food"
    | "Camping"
    | "Photography"
    | "Personal";
  priority: "High" | "Medium" | "Low";
  isPacked: boolean;
  isCompleted?: boolean;
  assignedMemberName: string;
  reminderDate?: string;
}

export interface TripPreferences {
  budgetAlertThreshold: number; // e.g. 80 (%)
  expenseApprovalThreshold: number; // e.g. 5000 (INR)
  defaultSplitMethod: "equal" | "exact" | "shares";
  settlementReminderFrequency: "daily" | "weekly" | "end_of_trip";
}

export interface TripRecord {
  id: string;
  userId: number;
  groupId?: number;
  name: string;
  destination: string;
  country: string;
  city?: string;
  category: TripCategory;
  coverImage?: string;
  description?: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  timezone: string;
  currency: string; // "INR"
  organizerName: string;
  organizerEmail?: string;
  status: TripStatus;

  // Financial Core (guaranteed mathematical reconciliation)
  budgetAmount: number; // Total budget set
  emergencyBuffer: number; // Emergency reserve buffer
  allocatedBudget: number; // Sum of category budgets
  estimatedTotal?: number; // legacy alias for allocated budget / estimated total
  actualTotal: number; // Total spent = Personal + Shared
  personalExpensesTotal: number;
  sharedExpensesTotal: number;
  remainingBudget: number; // Allocated - Actual
  variance: number; // Allocated - Actual
  budgetUsedPct: number; // (Actual / Allocated) * 100

  // Health, Risk & AI Engine
  financialHealthScore: number; // 0-100
  riskLevel: "Low Risk" | "Moderate Risk" | "High Risk";
  burnRatePerDay: number;
  recommendedDailySpend: number;
  projectedTotalSpend: number;
  potentialSavings: number;
  aiInsights: string[];

  // Nested Enterprise Modules
  categoryBudgets: CategoryBudget[];
  members: TripMember[];
  expenses: TripExpense[];
  settlements: TripSettlement[];
  itinerary: ItineraryItem[];
  events: TripEvent[];
  documents: TripDocument[];
  checklists: TripChecklistItem[];
  preferences: TripPreferences;

  // Backward compatibility aliases
  plannedExpenses?: any[];

  createdAt: string;
  updatedAt: string;
}

export interface TripDashboardMetrics {
  totalTripBudget: number;
  allocatedBudget: number;
  remainingBudget: number;
  actualExpenses: number;
  personalExpenses: number;
  sharedExpenses: number;
  budgetUtilizationPct: number;

  pendingSettlementsCount: number;
  pendingSettlementsAmount: number;
  completedSettlementsAmount: number;
  outstandingReceivables: number;

  totalTripsCount: number;
  upcomingTripsCount: number;
  activeTripsCount: number;
  completedTripsCount: number;
  totalMembersCount: number;

  avgDailySpend: number;
  estimatedFinalCost: number;
  overallHealthScore: number;
  overallRiskLevel: "Low Risk" | "Moderate Risk" | "High Risk";
  aiGlobalRecommendation: string;

  currency: string;
  trips: TripRecord[];
  events: TripEvent[];
}
