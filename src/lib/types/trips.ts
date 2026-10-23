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

export type TripStatus =
  | "draft"
  | "planning"
  | "upcoming"
  | "active"
  | "ongoing"
  | "paused"
  | "completed"
  | "cancelled"
  | "archived";

export type MemberRole = "Owner" | "Admin" | "Member" | "Guest";

export interface TripMember {
  id: string;
  name: string;
  email?: string;
  role: MemberRole;
  avatar?: string;
  contribution: number; // in rupees
  contributionPct?: number; // optional target % of budget
  ownShare: number; // in rupees
  paid: number; // in rupees
  pending: number; // in rupees
  receivable: number; // in rupees
  settlementStatus: "settled" | "pending" | "overpaid";
  expenseCount: number;
  canAddExpenses?: boolean;
  canSettle?: boolean;
  isFrozen?: boolean;
  isExcludedFromPastExpenses?: boolean;
}

export type BudgetCategoryKey =
  | "Transportation"
  | "Hotel"
  | "Accommodation"
  | "Food"
  | "Fuel"
  | "Shopping"
  | "Adventure"
  | "Camping"
  | "Medical"
  | "Insurance"
  | "Tickets"
  | "Entry Tickets"
  | "Guide Charges"
  | "Parking"
  | "Emergency"
  | "Miscellaneous"
  | "Custom";

export interface CategoryBudget {
  category: BudgetCategoryKey;
  allocated: number; // in rupees
  spent: number; // in rupees
  remaining: number; // allocated - spent
  usagePct: number; // (spent / allocated) * 100
  variance?: number; // allocated - spent
  variancePct?: number; // ((allocated - spent) / allocated) * 100
  priority?: "High" | "Medium" | "Low";
  risk?: "Low" | "Medium" | "High";
  aiRecommendation?: string;
  isOverBudget: boolean;
  projectedSpend: number;
  aiForecast: string;
  color: string;
  isLocked?: boolean;
  isArchived?: boolean;
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
  splitMethod?: "equal" | "exact" | "shares";
  tax?: number;
  discount?: number;
  paymentMethod: "UPI" | "Credit Card" | "Debit Card" | "Cash" | "Net Banking";
  receiptUrl?: string;
  location?: string;
  tags?: string[];
  notes?: string;
  status: "settled" | "pending";
  createdAt: string;
  updatedAt?: string;
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

export type TripEventStatus =
  | "upcoming"
  | "ongoing"
  | "completed"
  | "cancelled"
  | "missed"
  | "rescheduled";

export type TripEventType =
  | "flight"
  | "train"
  | "bus"
  | "hotel"
  | "hotel_checkin"
  | "check_in"
  | "check_out"
  | "dinner"
  | "breakfast"
  | "lunch"
  | "trek"
  | "trekking"
  | "camping"
  | "adventure"
  | "sightseeing"
  | "meeting"
  | "photography"
  | "shopping"
  | "festival"
  | "temple_visit"
  | "beach_visit"
  | "water_sports"
  | "emergency"
  | "reminder"
  | "activity"
  | "custom";

export type EnterpriseEventStatus =
  | "Upcoming"
  | "Live"
  | "Planning"
  | "Completed"
  | "Cancelled"
  | "Delayed"
  | "Rescheduled"
  | "Full"
  | "Draft"
  | "Archived";

export type EventPriority = "Low" | "Medium" | "High" | "Critical";

export interface EventTimelineItem {
  id: string;
  time: string; // e.g. "09:00 AM"
  activity: string;
  location?: string;
  status: "upcoming" | "in_progress" | "completed" | "missed";
  notes?: string;
  durationMinutes?: number;
  order?: number;
}

export interface EventAttendee {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  rsvpStatus: "invited" | "accepted" | "maybe" | "declined" | "pending";
  isGuest?: boolean;
  emergencyContact?: string;
  arrivalStatus: "On Time" | "Delayed" | "Arrived" | "Departed" | "No Show";
  checkInStatus: "Checked In" | "Pending Check-In" | "Late Arrival" | "No Show";
  checkedInAt?: string;
  notes?: string;
}

export interface EventRsvpSummary {
  invited: number;
  accepted: number;
  maybe: number;
  declined: number;
  pending: number;
  guests: number;
  attendees: EventAttendee[];
}

export interface EventExpenseSummary {
  allocatedBudget: number;
  actualExpense: number;
  remainingBudget: number;
  personalContribution: number;
  sharedContribution: number;
  vendorPayments: number;
  pendingPayments: number;
  refunds: number;
  settlementStatus: "settled" | "pending";
}

export interface TripEvent {
  id: string;
  publicId?: string; // EVT-H4P9X7K2Q8ZM
  title: string;
  type: TripEventType;
  category?: string;
  startDateTime: string;
  endDateTime?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  timezone?: string;
  durationMinutes?: number;
  durationText?: string;
  timeRemaining?: string;
  countdownText?: string;
  location: string;
  venue?: string;
  meetingPoint?: string;
  address?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  mapsLink?: string;
  description?: string;
  bannerUrl?: string;
  organizerName?: string;
  eventOwner?: string;
  linkedTripId?: string;
  linkedTripName?: string;
  isStandalone?: boolean;
  participants: string[];
  guestLimit?: number;
  capacity?: number;
  expectedAttendance?: number;
  confirmedMembers?: number;
  pendingInvitations?: number;
  declinedMembers?: number;
  guestMembers?: number;
  availableSeats?: number;
  currentAttendance?: number;
  budget: number;
  estimatedBudget?: number;
  actualCost?: number;
  priority?: "High" | "Medium" | "Low" | "Critical";
  status: TripEventStatus | EnterpriseEventStatus;
  completionPct?: number;
  attendancePct?: number;
  progressPct?: number;
  expensePct?: number;
  weatherForecast?: string;
  weatherStatus?: string;
  travelAdvisory?: string;
  budgetStatus?: string;
  dressCode?: string;
  transportPlan?: string;
  parkingInfo?: string;
  qrCodeData?: string;
  publicLink?: string;
  visibility?: "public" | "private" | "members_only";
  requiredDocuments?: string[];
  checklist?: string[];
  emergencyContact?: string;
  reminderDate?: string;
  notes?: string;
  attachments?: string[];
  timeline?: EventTimelineItem[];
  rsvp?: EventRsvpSummary;
  expenseSummary?: EventExpenseSummary;
  documentsList?: { id: string; title: string; type: string; url?: string }[];
  photos?: string[];
  activityLog?: { timestamp: string; actor: string; action: string }[];
  reminders?: string[];
}

export interface LogisticsVehicle {
  id: string;
  vehicleNumber: string;
  type: string;
  driverName: string;
  driverContact: string;
  busCapacity: number;
  currentStatus: "En Route" | "Parked" | "Maintenance" | "Scheduled" | "Completed";
  fuelStatus: "Full" | "75%" | "Half" | "25%" | "Low";
  pickupPoints: string[];
  dropPoints: string[];
  estimatedArrival: string;
  liveStatus: string;
}

export interface LogisticsRoomSharing {
  roomNumber: string;
  roomType: string;
  occupants: string[];
  status: "Occupied" | "Vacant" | "Reserved";
  capacity: number;
}

export interface LogisticsAccommodation {
  id: string;
  hotelName: string;
  checkInDate: string;
  checkOutDate: string;
  checkInTime: string;
  checkOutTime: string;
  totalRooms: number;
  bookingStatus: "Confirmed" | "Tentative" | "Paid" | "Pending";
  hotelContact: string;
  address: string;
  rooms: LogisticsRoomSharing[];
}

export interface LogisticsBloodGroupItem {
  memberName: string;
  bloodGroup: string;
  allergies?: string;
  emergencyContact: string;
}

export interface LogisticsEmergency {
  hospitalName: string;
  hospitalContact: string;
  hospitalDistanceKm: number;
  policeContact: string;
  tripLeader: string;
  tripLeaderContact: string;
  coLeader: string;
  coLeaderContact: string;
  rescueContact: string;
  bloodGroupList: LogisticsBloodGroupItem[];
  medicalNotes: string[];
}

export interface LogisticsPermitItem {
  id: string;
  title: string;
  category: "Driving License" | "Vehicle Permit" | "Forest Permit" | "Tickets" | "Hotel Voucher" | "Insurance" | "Identity Verification";
  status: "Verified" | "Pending" | "Expiring Soon" | "Action Required";
  holderName?: string;
  expiryDate?: string;
  documentNumber?: string;
}

export interface LogisticsPackingInventory {
  sharedPackingPct: number;
  completedPct: number;
  missingItems: string[];
  criticalItems: string[];
  inventory: {
    id: string;
    item: string;
    category: string;
    quantity: number;
    packed: boolean;
    owner: string;
    isCritical: boolean;
  }[];
}

export interface LogisticsMealItem {
  meal: "Breakfast" | "Lunch" | "Dinner" | "Snacks" | "Water Supply" | "Special Diet";
  timing: string;
  menu: string;
  vendorName: string;
  dietaryNotes: string;
  vendorStatus: "Confirmed" | "In Preparation" | "Delivered" | "Pending";
}

export interface LogisticsVendorItem {
  id: string;
  name: string;
  category: "Transport Vendor" | "Hotel Vendor" | "Guide" | "Equipment Vendor" | "Catering";
  contact: string;
  paymentStatus: "Paid" | "Partial Advance" | "Pending" | "Settled";
  rating: number;
  amount: number;
}

export interface LogisticsTaskItem {
  id: string;
  task: string;
  owner: string;
  deadline: string;
  status: "Upcoming" | "Pending" | "In Progress" | "Completed" | "Delayed";
  completionPct: number;
}

export interface TripLogisticsHub {
  id: string;
  tripId?: string;
  transportation: LogisticsVehicle[];
  accommodation: LogisticsAccommodation[];
  emergency: LogisticsEmergency;
  permissions: LogisticsPermitItem[];
  packing: LogisticsPackingInventory;
  foodLogistics: LogisticsMealItem[];
  vendors: LogisticsVendorItem[];
  operationalTimeline: {
    upcomingTasks: LogisticsTaskItem[];
    pendingTasks: LogisticsTaskItem[];
    completedTasks: LogisticsTaskItem[];
    delayedTasks: LogisticsTaskItem[];
  };
  assignments: LogisticsTaskItem[];
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
  dueDate?: string;
  notes?: string;
}

export interface TripPreferences {
  budgetAlertThreshold: number; // e.g. 80 (%)
  expenseApprovalThreshold: number; // e.g. 5000 (INR)
  defaultSplitMethod: "equal" | "exact" | "shares";
  settlementReminderFrequency: "daily" | "weekly" | "end_of_trip";
}

export interface TripAuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  category: "trip" | "budget" | "expense" | "member" | "settlement" | "event" | "checklist" | "document";
  action: string;
  details: string;
}

export type HealthGrade = "A+" | "A" | "B+" | "B" | "C" | "D" | "Critical";

export interface TripHealthDimension {
  name: string;
  score: number; // 0 - 100
  weight: number; // e.g. 0.25 for 25%
  weightedScore: number;
  remarks: string;
  recommendation: string;
}

export interface TripHealthReport {
  overallScore: number;
  grade: HealthGrade;
  dimensions: TripHealthDimension[];
  summary: string;
}

export interface DestinationIntelligence {
  country: string;
  state: string;
  district?: string;
  city: string;
  area?: string;
  region?: string;
  nearestAirport: string | { name: string; iataCode?: string; distanceKm?: number; driveTimeHours?: number };
  nearestRailwayStation: string | { name: string; stationCode?: string; distanceKm?: number };
  nearestBusStation: string | { name: string; distanceKm?: number };
  timezone: string;
  timeZone?: string;
  currency: string;
  languages: string[];
  language?: string;
  emergencyNumbers: {
    police: string;
    ambulance: string;
    fire: string;
    womenHelpline: string;
    touristHelpline: string;
    nationalEmergency?: string;
  };
  coordinates: {
    latitude: number;
    longitude: number;
    altitudeMeters?: number;
  };
  climate: {
    type: string;
    avgTempCelsius: number;
    minTempCelsius: number;
    maxTempCelsius: number;
    sunriseTime: string;
    sunsetTime: string;
    bestSeason: string;
    expectedWeather: string;
    rainProbabilityPct: number;
    airQualityIndex: number;
    airQualityStatus: "Good" | "Moderate" | "Poor" | "Unhealthy";
    crowdLevel: "Low" | "Moderate" | "High" | "Peak Season";
  };
  logistics: {
    travelDifficulty: "Easy" | "Moderate" | "Challenging" | "Expert";
    roadCondition: "Paved Highways" | "Good Asphalt" | "Mixed Terrain" | "Offroad / 4x4 Recommended";
    networkAvailability: "5G High Speed" | "4G LTE Solid" | "Spotty Cellular" | "No Cell Signal";
    internetSpeedMbps: number;
    electricityReliability: "24/7 Grid Power" | "Occasional Power Cuts" | "Generator Backup Only";
    drinkingWaterAvailability: "Readily Available" | "Bottled Water Recommended" | "Purification Required";
    fuelAvailability: "Stations Every 5km" | "Regular Stations" | "Sparse Stations (Carry Extra Fuel)";
    parkingAvailability: "Free Dedicated Parking" | "Paid Public Parking" | "Limited Street Parking";
  };
  amenities: {
    medicalFacilities: string;
    nearbyHospital: string;
    nearbyHospitalDistanceKm: number;
    nearbyHospitalPhone: string;
    policeStation: string;
    policeStationDistanceKm: number;
    policeStationPhone: string;
    touristHelpCenter: string;
    nearbyAtm: string;
    nearbyMedicalStores: string[];
    nearbyHotels: Array<{ name: string; rating: number; approxPriceNight: number; distanceKm: number }>;
    nearbyRestaurants: Array<{ name: string; cuisine: string; rating: number; distanceKm: number }>;
    nearbyFuelStations: Array<{ name: string; distanceKm: number; hasAirWater: boolean }>;
    nearbyParking: Array<{ name: string; type: string; distanceKm: number }>;
  };
  pointsOfInterest: {
    topAttractions: Array<{ name: string; type: string; distanceKm: number; entryFee: number; mapsQuery: string }>;
    trekRoutes?: Array<{ name: string; difficulty: string; durationHours: number; distanceKm: number }>;
    waterfalls?: Array<{ name: string; bestTime: string; distanceKm: number }>;
    forts?: Array<{ name: string; era: string; distanceKm: number }>;
    temples?: Array<{ name: string; deity: string; timings: string }>;
    beaches?: Array<{ name: string; waterSports: boolean; cleanRating: number }>;
    markets?: Array<{ name: string; speciality: string; distanceKm: number }>;
  };
  safetyRatings: {
    overallSafetyScore: number;
    familyFriendly: boolean;
    petFriendly: boolean;
    soloFriendly: boolean;
    wheelchairAccessible: boolean;
    nightSafetyScore: number;
    safetyRemarks: string;
  };
  cultureAndRules: {
    unescoStatus?: string;
    govtTourismUrl?: string;
    officialWebsite?: string;
    wikipediaUrl?: string;
    localRules: string[];
    photographyRules: string;
    droneRules: "Permitted with License" | "Permitted Without Permit" | "Strictly Prohibited" | "National Park Ban";
    requiredPermits: string[];
    packingSuggestions: string[];
  };
}

export interface TripRecord {
  id: string;
  publicId: string; // TRP-9X7M4K2P8Q5R
  userId: number;
  groupId?: number;
  name: string;
  destination: string;
  country: string;
  state?: string;
  city?: string;
  district?: string;
  area?: string;
  region?: string;
  meetingPoint?: string;
  travelType?: string;
  visibility?: "private" | "shared" | "public";
  category: TripCategory;
  coverImage?: string;
  description?: string;
  notes?: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  timezone: string;
  currency: string; // "INR"
  organizerName: string;
  organizerEmail?: string;
  status: TripStatus;

  // Financial Core (guaranteed mathematical reconciliation)
  budgetAmount: number; // legacy alias
  overallBudget: number; // Total budget set
  personalBudget: number;
  sharedBudget: number;
  emergencyBudget: number; // Emergency reserve buffer
  reserveBudget: number; // Contingency reserve
  emergencyBuffer: number; // legacy alias
  allocatedBudget: number; // Sum of category budgets
  estimatedTotal?: number; // legacy alias for allocated budget / estimated total
  actualTotal: number; // Total spent = Personal + Shared
  personalExpensesTotal: number;
  sharedExpensesTotal: number;
  remainingBudget: number; // Allocated - Actual
  variance: number; // Allocated - Actual
  variancePct?: number;
  budgetUsedPct: number; // (Actual / Allocated) * 100

  // Destination Intelligence
  destinationInfo?: DestinationIntelligence;
  weatherSummary?: string;

  // Health, Risk & AI Engine
  financialHealthScore: number; // 0-100
  riskLevel: "Low Risk" | "Moderate Risk" | "High Risk";
  healthReport?: TripHealthReport;
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
  auditLogs?: TripAuditLog[];
  logisticsHub?: TripLogisticsHub;

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
  standaloneEvents?: TripEvent[];
  logisticsHub?: TripLogisticsHub;
}
