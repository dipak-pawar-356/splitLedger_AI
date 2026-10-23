"use server";

import { requireAuth } from "@/lib/auth";
import {
  TripEvent,
  EnterpriseEventStatus,
  EventPriority,
  EventTimelineItem,
  EventAttendee,
  EventRsvpSummary,
  EventExpenseSummary,
  TripLogisticsHub,
  LogisticsVehicle,
  LogisticsAccommodation,
  LogisticsEmergency,
  LogisticsPermitItem,
  LogisticsPackingInventory,
  LogisticsMealItem,
  LogisticsVendorItem,
  LogisticsTaskItem,
} from "@/lib/types/trips";
import { DatabaseError, ValidationError } from "@/lib/errors";
import { generatePublicId, generateEventPublicId } from "@/lib/utils";
import { createSeedLogisticsHub } from "@/lib/default-logistics";

// Session stores for Standalone Events and Logistics Hub
const standaloneEventsStore = new Map<string, TripEvent[]>();
const logisticsStore = new Map<string, TripLogisticsHub>();

/**
 * Creates seed standalone events reflecting 30-50 years of travel & expedition operations
 */
function createSeedStandaloneEvents(userName: string): TripEvent[] {
  const now = Date.now();
  const dayMs = 86400000;

  const bdayEvent: TripEvent = {
    id: "evt_standalone_bday",
    publicId: "EVT-BDAY99X2M4K8",
    title: "Dipak's 30th Birthday Celebration & Rooftop Gala",
    category: "Birthday",
    type: "dinner",
    status: "Upcoming",
    priority: "High",
    bannerUrl: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&auto=format&fit=crop&q=80",
    organizerName: userName,
    eventOwner: userName,
    linkedTripId: undefined,
    linkedTripName: undefined,
    isStandalone: true,
    location: "Koregaon Park, Pune, Maharashtra",
    venue: "The Sky Deck Rooftop Lounge & Terrace",
    meetingPoint: "South Entrance Lobby Elevators",
    coordinates: { latitude: 18.5362, longitude: 73.894 },
    mapsLink: "https://maps.google.com/?q=Koregaon+Park+Pune",
    description: "Milestone birthday celebration featuring live acoustic performance, curated mocktails, multi-cuisine dinner banquet, and awards.",
    startDate: new Date(now + 6 * dayMs).toISOString().split("T")[0],
    endDate: new Date(now + 6 * dayMs).toISOString().split("T")[0],
    startTime: "07:30 PM",
    endTime: "11:30 PM",
    startDateTime: new Date(now + 6 * dayMs).toISOString(),
    endDateTime: new Date(now + 6 * dayMs + 4 * 3600000).toISOString(),
    durationMinutes: 240,
    durationText: "4 Hours",
    timeRemaining: "Starts in 6 days",
    countdownText: "6d 4h left",
    timezone: "IST (UTC+05:30)",
    capacity: 35,
    expectedAttendance: 28,
    confirmedMembers: 24,
    pendingInvitations: 3,
    declinedMembers: 1,
    guestMembers: 6,
    availableSeats: 7,
    currentAttendance: 24,
    participants: [userName, "Aarav Sharma", "Sneha Patel", "Rohan Verma", "Ananya Deshmukh", "Vikram Joshi"],
    budget: 35000,
    estimatedBudget: 35000,
    actualCost: 14200,
    weatherStatus: "24°C • Pleasant clear evening",
    weatherForecast: "Clear skies with light evening breeze",
    travelAdvisory: "Green Zone • City center parking valet active",
    budgetStatus: "Under Budget",
    completionPct: 60,
    attendancePct: 86,
    progressPct: 70,
    expensePct: 41,
    timeline: [
      { id: "tl_b1", time: "07:30 PM", activity: "Guest Red Carpet Arrival & Welcome Drinks", location: "Sky Deck Foyer", status: "upcoming" },
      { id: "tl_b2", time: "08:15 PM", activity: "Cake Cutting Ceremony & Champagne Toast", location: "Central Terrace", status: "upcoming" },
      { id: "tl_b3", time: "09:00 PM", activity: "Live Acoustic Musical Performance", location: "Acoustic Lounge", status: "upcoming" },
      { id: "tl_b4", time: "09:45 PM", activity: "Gourmet Dinner Buffet & Live Pasta Station", location: "Banquet Dining Hall", status: "upcoming" },
      { id: "tl_b5", time: "11:00 PM", activity: "Group Photo Session & Return Gift Distribution", location: "Photo Wall", status: "upcoming" },
    ],
    rsvp: {
      invited: 28,
      accepted: 24,
      maybe: 2,
      declined: 1,
      pending: 1,
      guests: 6,
      attendees: [
        { id: "att_b1", name: userName, phone: "+91 98765 43210", rsvpStatus: "accepted", arrivalStatus: "On Time", checkInStatus: "Checked In", emergencyContact: "+91 98220 11223" },
        { id: "att_b2", name: "Aarav Sharma", phone: "+91 98111 22334", rsvpStatus: "accepted", arrivalStatus: "On Time", checkInStatus: "Checked In", emergencyContact: "+91 98111 99887" },
        { id: "att_b3", name: "Sneha Patel", phone: "+91 98222 33445", rsvpStatus: "accepted", arrivalStatus: "Delayed", checkInStatus: "Pending Check-In", emergencyContact: "+91 98222 88776" },
        { id: "att_b4", name: "Rohan Verma", phone: "+91 98333 44556", rsvpStatus: "accepted", arrivalStatus: "On Time", checkInStatus: "Pending Check-In", emergencyContact: "+91 98333 77665" },
        { id: "att_b5", name: "Ananya Deshmukh", phone: "+91 98444 55667", rsvpStatus: "maybe", arrivalStatus: "Delayed", checkInStatus: "Pending Check-In", emergencyContact: "+91 98444 66554" },
        { id: "att_b6", name: "Vikram Joshi", phone: "+91 98555 66778", rsvpStatus: "declined", arrivalStatus: "No Show", checkInStatus: "No Show", emergencyContact: "+91 98555 55443" },
      ],
    },
    expenseSummary: {
      allocatedBudget: 35000,
      actualExpense: 14200,
      remainingBudget: 20800,
      personalContribution: 5000,
      sharedContribution: 9200,
      vendorPayments: 10000,
      pendingPayments: 4200,
      refunds: 0,
      settlementStatus: "pending",
    },
    checklist: ["Confirm cake delivery time", "Coordinate DJ audio plug-in", "Check terrace heating lamps", "Prepare name badges"],
    documentsList: [
      { id: "doc_b1", title: "Rooftop Banquet Booking Contract", type: "PDF Contract", url: "#" },
      { id: "doc_b2", title: "Catering Invoice & Menu Card", type: "Receipt", url: "#" },
    ],
  };

  const meetingEvent: TripEvent = {
    id: "evt_standalone_meeting",
    publicId: "EVT-MEET48K1P9X3",
    title: "Quarterly Travel Operations & Logistics Strategy Briefing",
    category: "Office Meeting",
    type: "meeting",
    status: "Live",
    priority: "Critical",
    bannerUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&auto=format&fit=crop&q=80",
    organizerName: userName,
    eventOwner: userName,
    linkedTripId: undefined,
    linkedTripName: undefined,
    isStandalone: true,
    location: "WeWork Cyber City, Magarpatta, Pune",
    venue: "Executive Boardroom Alpha & Hybrid Zoom Room",
    meetingPoint: "4th Floor Reception Desk",
    coordinates: { latitude: 18.5158, longitude: 73.9272 },
    mapsLink: "https://maps.google.com/?q=Magarpatta+Cybercity+Pune",
    description: "Comprehensive review of cross-country expedition logistics, vehicle vendor contracts, emergency hospital tie-ups, and Q4 budget allocations.",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    startTime: "10:00 AM",
    endTime: "01:00 PM",
    startDateTime: new Date().toISOString(),
    endDateTime: new Date(now + 3 * 3600000).toISOString(),
    durationMinutes: 180,
    durationText: "3 Hours",
    timeRemaining: "In Session Now",
    countdownText: "Live Session",
    timezone: "IST (UTC+05:30)",
    capacity: 15,
    expectedAttendance: 10,
    confirmedMembers: 10,
    pendingInvitations: 0,
    declinedMembers: 0,
    guestMembers: 1,
    availableSeats: 5,
    currentAttendance: 10,
    participants: [userName, "Aarav Sharma", "Sneha Patel", "Rohan Verma"],
    budget: 8000,
    estimatedBudget: 8000,
    actualCost: 3400,
    weatherStatus: "28°C • Clear business day",
    travelAdvisory: "Green Zone • High-speed Wi-Fi active",
    budgetStatus: "Optimal Pacing",
    completionPct: 40,
    attendancePct: 100,
    progressPct: 50,
    expensePct: 42,
    timeline: [
      { id: "tl_m1", time: "10:00 AM", activity: "Quarterly Travel Portfolio Expenditure Audit", location: "Boardroom Alpha", status: "completed" },
      { id: "tl_m2", time: "10:45 AM", activity: "Fleet Vendor Safety & RTO Compliance Verification", location: "Boardroom Alpha", status: "in_progress" },
      { id: "tl_m3", time: "11:30 AM", activity: "High-Altitude Medical Rescue & Evacuation Protocol", location: "Boardroom Alpha", status: "upcoming" },
      { id: "tl_m4", time: "12:30 PM", activity: "Action Item Allocation & Budget Signoff", location: "Boardroom Alpha", status: "upcoming" },
    ],
    rsvp: {
      invited: 10,
      accepted: 10,
      maybe: 0,
      declined: 0,
      pending: 0,
      guests: 1,
      attendees: [
        { id: "att_m1", name: userName, phone: "+91 98765 43210", rsvpStatus: "accepted", arrivalStatus: "Arrived", checkInStatus: "Checked In", emergencyContact: "+91 98220 11223" },
        { id: "att_m2", name: "Aarav Sharma", phone: "+91 98111 22334", rsvpStatus: "accepted", arrivalStatus: "Arrived", checkInStatus: "Checked In", emergencyContact: "+91 98111 99887" },
        { id: "att_m3", name: "Sneha Patel", phone: "+91 98222 33445", rsvpStatus: "accepted", arrivalStatus: "Arrived", checkInStatus: "Checked In", emergencyContact: "+91 98222 88776" },
      ],
    },
    expenseSummary: {
      allocatedBudget: 8000,
      actualExpense: 3400,
      remainingBudget: 4600,
      personalContribution: 0,
      sharedContribution: 3400,
      vendorPayments: 3400,
      pendingPayments: 0,
      refunds: 0,
      settlementStatus: "settled",
    },
  };

  const deadlineEvent: TripEvent = {
    id: "evt_standalone_deadline",
    publicId: "EVT-PAYM77D2N8Q1",
    title: "Expedition Advance Payment & Escrow Settlement Deadline",
    category: "Payment Deadline",
    type: "reminder",
    status: "Planning",
    priority: "Critical",
    bannerUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&auto=format&fit=crop&q=80",
    organizerName: userName,
    eventOwner: userName,
    linkedTripId: undefined,
    linkedTripName: undefined,
    isStandalone: true,
    location: "SplitLedger AI Financial Portal",
    venue: "Online Automated Escrow Clearing",
    meetingPoint: "Digital Portal Payment Hub",
    coordinates: { latitude: 18.5204, longitude: 73.8567 },
    mapsLink: "https://splitledger.ai/settlements",
    description: "Hard deadline for members to settle all pending hotel advances, bus hire deposits, and wildlife safari permits.",
    startDate: new Date(now + 3 * dayMs).toISOString().split("T")[0],
    endDate: new Date(now + 3 * dayMs).toISOString().split("T")[0],
    startTime: "05:00 PM",
    endTime: "11:59 PM",
    startDateTime: new Date(now + 3 * dayMs).toISOString(),
    endDateTime: new Date(now + 3 * dayMs + 7 * 3600000).toISOString(),
    durationMinutes: 420,
    durationText: "7 Hours",
    timeRemaining: "Due in 3 days",
    countdownText: "3d 12h left",
    timezone: "IST (UTC+05:30)",
    capacity: 20,
    expectedAttendance: 14,
    confirmedMembers: 11,
    pendingInvitations: 3,
    declinedMembers: 0,
    guestMembers: 0,
    availableSeats: 6,
    currentAttendance: 11,
    participants: [userName, "Aarav Sharma", "Sneha Patel", "Rohan Verma"],
    budget: 50000,
    estimatedBudget: 50000,
    actualCost: 38500,
    weatherStatus: "N/A • Online Settlement",
    travelAdvisory: "UPI Server Active • Instant Reconciliation",
    budgetStatus: "77% Reconciled",
    completionPct: 77,
    attendancePct: 78,
    progressPct: 80,
    expensePct: 77,
    timeline: [
      { id: "tl_p1", time: "09:00 AM", activity: "Automated UPI Payment Link Dispatched", location: "SplitLedger SMS/WhatsApp Gateway", status: "completed" },
      { id: "tl_p2", time: "02:00 PM", activity: "First Settlement Batch Clearance & Ledger Rebalance", location: "Escrow Core", status: "upcoming" },
      { id: "tl_p3", time: "05:00 PM", activity: "Secondary SMS Alert to Pending Debtors", location: "Notification Engine", status: "upcoming" },
      { id: "tl_p4", time: "11:59 PM", activity: "Ledger Lock & Final Payment Reconciliation Signoff", location: "Audit Vault", status: "upcoming" },
    ],
    rsvp: {
      invited: 14,
      accepted: 11,
      maybe: 1,
      declined: 0,
      pending: 2,
      guests: 0,
      attendees: [
        { id: "att_p1", name: userName, phone: "+91 98765 43210", rsvpStatus: "accepted", arrivalStatus: "On Time", checkInStatus: "Checked In" },
        { id: "att_p2", name: "Aarav Sharma", phone: "+91 98111 22334", rsvpStatus: "accepted", arrivalStatus: "On Time", checkInStatus: "Checked In" },
        { id: "att_p3", name: "Sneha Patel", phone: "+91 98222 33445", rsvpStatus: "pending", arrivalStatus: "Delayed", checkInStatus: "Pending Check-In" },
      ],
    },
    expenseSummary: {
      allocatedBudget: 50000,
      actualExpense: 38500,
      remainingBudget: 11500,
      personalContribution: 0,
      sharedContribution: 38500,
      vendorPayments: 35000,
      pendingPayments: 3500,
      refunds: 0,
      settlementStatus: "pending",
    },
  };

  const settlementMeetEvent: TripEvent = {
    id: "evt_standalone_settlement",
    publicId: "EVT-SETTL99B1Z4M",
    title: "Post-Tour Peer Expense Rebalancing & Photo Swap",
    category: "Settlement Meeting",
    type: "meeting",
    status: "Upcoming",
    priority: "Medium",
    bannerUrl: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&auto=format&fit=crop&q=80",
    organizerName: userName,
    eventOwner: userName,
    linkedTripId: undefined,
    linkedTripName: undefined,
    isStandalone: true,
    location: "Blue Tokai Coffee Roasters, FC Road, Pune",
    venue: "Main Lounge Community Table",
    meetingPoint: "Coffee Counter Foyer",
    coordinates: { latitude: 18.5284, longitude: 73.8428 },
    mapsLink: "https://maps.google.com/?q=Blue+Tokai+FC+Road+Pune",
    description: "Casual meet to swap 4K drone footage, verify offline cash receipts, reconcile outstanding peer transfers, and sign off the shared ledger.",
    startDate: new Date(now + 14 * dayMs).toISOString().split("T")[0],
    endDate: new Date(now + 14 * dayMs).toISOString().split("T")[0],
    startTime: "04:30 PM",
    endTime: "06:30 PM",
    startDateTime: new Date(now + 14 * dayMs).toISOString(),
    endDateTime: new Date(now + 14 * dayMs + 2 * 3600000).toISOString(),
    durationMinutes: 120,
    durationText: "2 Hours",
    timeRemaining: "Starts in 14 days",
    countdownText: "14d left",
    timezone: "IST (UTC+05:30)",
    capacity: 12,
    expectedAttendance: 8,
    confirmedMembers: 8,
    pendingInvitations: 0,
    declinedMembers: 0,
    guestMembers: 0,
    availableSeats: 4,
    currentAttendance: 8,
    participants: [userName, "Aarav Sharma", "Sneha Patel"],
    budget: 3500,
    estimatedBudget: 3500,
    actualCost: 0,
    weatherStatus: "26°C • Pleasant late afternoon",
    travelAdvisory: "Green Zone • Free 2-wheeler & car parking available",
    budgetStatus: "Fully Funded",
    completionPct: 10,
    attendancePct: 100,
    progressPct: 20,
    expensePct: 0,
    timeline: [
      { id: "tl_s1", time: "04:30 PM", activity: "Arrival & Speciality Brew Order", location: "Counter", status: "upcoming" },
      { id: "tl_s2", time: "05:00 PM", activity: "Raw Footage Airdrop & Drive Cloud Transfer", location: "Community Table", status: "upcoming" },
      { id: "tl_s3", time: "05:45 PM", activity: "1-Tap UPI Mutual Clearances & Zero Balance Verification", location: "SplitLedger App", status: "upcoming" },
    ],
    rsvp: {
      invited: 8,
      accepted: 8,
      maybe: 0,
      declined: 0,
      pending: 0,
      guests: 0,
      attendees: [
        { id: "att_s1", name: userName, phone: "+91 98765 43210", rsvpStatus: "accepted", arrivalStatus: "On Time", checkInStatus: "Checked In" },
        { id: "att_s2", name: "Aarav Sharma", phone: "+91 98111 22334", rsvpStatus: "accepted", arrivalStatus: "On Time", checkInStatus: "Checked In" },
      ],
    },
    expenseSummary: {
      allocatedBudget: 3500,
      actualExpense: 0,
      remainingBudget: 3500,
      personalContribution: 0,
      sharedContribution: 0,
      vendorPayments: 0,
      pendingPayments: 0,
      refunds: 0,
      settlementStatus: "pending",
    },
  };

  return [bdayEvent, meetingEvent, deadlineEvent, settlementMeetEvent];
}



/**
 * Ensure user session has initialized standalone events and logistics hub
 */
export async function ensureEnterpriseSessionData(userName: string = "Dipak Pawar") {
  const user = await requireAuth();
  const userKey = `user_${user.id}`;

  if (!standaloneEventsStore.has(userKey)) {
    standaloneEventsStore.set(userKey, createSeedStandaloneEvents(user.name || userName));
  }

  if (!logisticsStore.has(userKey)) {
    logisticsStore.set(userKey, createSeedLogisticsHub());
  }

  return {
    standaloneEvents: standaloneEventsStore.get(userKey) || [],
    logisticsHub: logisticsStore.get(userKey) || createSeedLogisticsHub(),
  };
}

/**
 * Get all Enterprise Events & Logistics Hub
 */
export async function getEnterpriseEventsAndLogistics() {
  const user = await requireAuth();
  const userKey = `user_${user.id}`;
  await ensureEnterpriseSessionData(user.name || "Dipak Pawar");

  const standaloneEvents = standaloneEventsStore.get(userKey) || [];
  const logisticsHub = logisticsStore.get(userKey) || createSeedLogisticsHub();

  return {
    standaloneEvents,
    logisticsHub,
  };
}

/**
 * Create a new Enterprise Event (Standalone or Trip-Linked)
 */
export async function createEnterpriseEvent(data: Partial<TripEvent>): Promise<TripEvent> {
  const user = await requireAuth();
  const userKey = `user_${user.id}`;
  await ensureEnterpriseSessionData(user.name || "User");

  if (!data.title || data.title.trim().length === 0) {
    throw new ValidationError("Event title is required.");
  }

  const publicId = generateEventPublicId();
  const newEvent: TripEvent = {
    id: generatePublicId("evt"),
    publicId,
    title: data.title.trim(),
    type: data.type || "activity",
    category: data.category || "Custom Event",
    status: (data.status as EnterpriseEventStatus) || "Upcoming",
    priority: (data.priority as EventPriority) || "Medium",
    bannerUrl: data.bannerUrl || "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&auto=format&fit=crop&q=80",
    organizerName: user.name || "Organizer",
    eventOwner: user.name || "Owner",
    linkedTripId: data.linkedTripId,
    linkedTripName: data.linkedTripName,
    isStandalone: !data.linkedTripId,
    location: data.location?.trim() || "Location TBA",
    venue: data.venue?.trim() || "Venue TBA",
    meetingPoint: data.meetingPoint?.trim() || "Meeting Point TBA",
    coordinates: data.coordinates || { latitude: 18.5204, longitude: 73.8567 },
    mapsLink: data.mapsLink || `https://maps.google.com/?q=${encodeURIComponent(data.location || "Pune")}`,
    description: data.description?.trim() || "Event description",
    startDate: data.startDate || new Date().toISOString().split("T")[0],
    endDate: data.endDate || new Date().toISOString().split("T")[0],
    startTime: data.startTime || "10:00 AM",
    endTime: data.endTime || "01:00 PM",
    startDateTime: data.startDateTime || new Date().toISOString(),
    endDateTime: data.endDateTime || new Date(Date.now() + 3 * 3600000).toISOString(),
    durationMinutes: data.durationMinutes || 180,
    durationText: data.durationText || "3 Hours",
    timeRemaining: "Scheduled",
    countdownText: "Scheduled",
    timezone: data.timezone || "IST (UTC+05:30)",
    capacity: data.capacity || 20,
    expectedAttendance: data.expectedAttendance || 10,
    confirmedMembers: data.confirmedMembers || 5,
    pendingInvitations: data.pendingInvitations || 2,
    declinedMembers: data.declinedMembers || 0,
    guestMembers: data.guestMembers || 0,
    availableSeats: (data.capacity || 20) - (data.confirmedMembers || 5),
    currentAttendance: data.confirmedMembers || 5,
    participants: data.participants || [user.name || "User"],
    budget: data.budget || 5000,
    estimatedBudget: data.budget || 5000,
    actualCost: 0,
    weatherStatus: data.weatherStatus || "25°C • Pleasant skies",
    travelAdvisory: data.travelAdvisory || "Standard Travel Conditions",
    budgetStatus: "Allocated",
    completionPct: 0,
    attendancePct: Math.round(((data.confirmedMembers || 5) / Math.max(1, data.capacity || 20)) * 100),
    progressPct: 0,
    expensePct: 0,
    timeline: data.timeline || [
      { id: generatePublicId("tl"), time: data.startTime || "10:00 AM", activity: `${data.title} Begins`, location: data.venue || "Venue", status: "upcoming" },
      { id: generatePublicId("tl"), time: data.endTime || "01:00 PM", activity: `${data.title} Concludes`, location: data.venue || "Venue", status: "upcoming" },
    ],
    rsvp: data.rsvp || {
      invited: data.expectedAttendance || 10,
      accepted: data.confirmedMembers || 5,
      maybe: 1,
      declined: 0,
      pending: data.pendingInvitations || 2,
      guests: 0,
      attendees: [
        {
          id: generatePublicId("att"),
          name: user.name || "Organizer",
          phone: "+91 98765 43210",
          rsvpStatus: "accepted",
          arrivalStatus: "On Time",
          checkInStatus: "Checked In",
        },
      ],
    },
    expenseSummary: data.expenseSummary || {
      allocatedBudget: data.budget || 5000,
      actualExpense: 0,
      remainingBudget: data.budget || 5000,
      personalContribution: 0,
      sharedContribution: 0,
      vendorPayments: 0,
      pendingPayments: 0,
      refunds: 0,
      settlementStatus: "pending",
    },
    checklist: data.checklist || ["Confirm venue arrangement", "Send invitation links"],
    documentsList: data.documentsList || [],
  };

  const list = standaloneEventsStore.get(userKey) || [];
  list.unshift(newEvent);
  standaloneEventsStore.set(userKey, list);

  return newEvent;
}

/**
 * Edit an Enterprise Event
 */
export async function editEnterpriseEvent(eventId: string, updates: Partial<TripEvent>): Promise<TripEvent> {
  const user = await requireAuth();
  const userKey = `user_${user.id}`;
  await ensureEnterpriseSessionData(user.name || "User");

  const list = standaloneEventsStore.get(userKey) || [];
  const event = list.find((e) => e.id === eventId || e.publicId === eventId);

  if (!event) {
    throw new DatabaseError("Event not found in standalone store.");
  }

  Object.assign(event, updates);
  if (updates.budget !== undefined) {
    event.expenseSummary = {
      ...event.expenseSummary,
      allocatedBudget: updates.budget,
      remainingBudget: Math.max(0, updates.budget - (event.actualCost || 0)),
      actualExpense: event.actualCost || 0,
      personalContribution: event.expenseSummary?.personalContribution || 0,
      sharedContribution: event.expenseSummary?.sharedContribution || 0,
      vendorPayments: event.expenseSummary?.vendorPayments || 0,
      pendingPayments: event.expenseSummary?.pendingPayments || 0,
      refunds: 0,
      settlementStatus: (event.actualCost || 0) === 0 ? "settled" : "pending",
    };
  }

  return event;
}

/**
 * Delete an Enterprise Event
 */
export async function deleteEnterpriseEvent(eventId: string): Promise<boolean> {
  const user = await requireAuth();
  const userKey = `user_${user.id}`;

  const list = standaloneEventsStore.get(userKey) || [];
  const filtered = list.filter((e) => e.id !== eventId && e.publicId !== eventId);
  standaloneEventsStore.set(userKey, filtered);

  return true;
}

/**
 * Duplicate an Enterprise Event
 */
export async function duplicateEnterpriseEvent(eventId: string): Promise<TripEvent> {
  const user = await requireAuth();
  const userKey = `user_${user.id}`;
  await ensureEnterpriseSessionData(user.name || "User");

  const list = standaloneEventsStore.get(userKey) || [];
  const source = list.find((e) => e.id === eventId || e.publicId === eventId);

  if (!source) throw new DatabaseError("Event not found to duplicate.");

  const newPublicId = generateEventPublicId();
  const cloned: TripEvent = {
    ...JSON.parse(JSON.stringify(source)),
    id: generatePublicId("evt"),
    publicId: newPublicId,
    title: `${source.title} (Copy)`,
    status: "Upcoming",
  };

  list.unshift(cloned);
  standaloneEventsStore.set(userKey, list);

  return cloned;
}

/**
 * Toggle or update an Event Timeline checkpoint status
 */
export async function updateEventTimelineCheckpoint(
  eventId: string,
  checkpointId: string,
  newStatus: "upcoming" | "in_progress" | "completed" | "missed"
): Promise<TripEvent> {
  const user = await requireAuth();
  const userKey = `user_${user.id}`;

  const list = standaloneEventsStore.get(userKey) || [];
  const event = list.find((e) => e.id === eventId || e.publicId === eventId);

  if (!event) throw new DatabaseError("Event not found.");

  if (event.timeline) {
    const item = event.timeline.find((t) => t.id === checkpointId);
    if (item) {
      item.status = newStatus;
      const completedCount = event.timeline.filter((t) => t.status === "completed").length;
      event.completionPct = Math.round((completedCount / event.timeline.length) * 100);
      event.progressPct = event.completionPct;
    }
  }

  return event;
}

/**
 * Update Event RSVP and Attendance
 */
export async function updateEventRsvpStatus(
  eventId: string,
  attendeeId: string,
  updates: Partial<EventAttendee>
): Promise<TripEvent> {
  const user = await requireAuth();
  const userKey = `user_${user.id}`;

  const list = standaloneEventsStore.get(userKey) || [];
  const event = list.find((e) => e.id === eventId || e.publicId === eventId);

  if (!event || !event.rsvp) throw new DatabaseError("Event or RSVP data not found.");

  const attendee = event.rsvp.attendees.find((a) => a.id === attendeeId);
  if (attendee) {
    Object.assign(attendee, updates);

    // Recalculate RSVP tallies
    event.rsvp.accepted = event.rsvp.attendees.filter((a) => a.rsvpStatus === "accepted").length;
    event.rsvp.declined = event.rsvp.attendees.filter((a) => a.rsvpStatus === "declined").length;
    event.rsvp.maybe = event.rsvp.attendees.filter((a) => a.rsvpStatus === "maybe").length;
    event.rsvp.pending = event.rsvp.attendees.filter((a) => a.rsvpStatus === "pending").length;
    event.confirmedMembers = event.rsvp.accepted;
    event.attendancePct = Math.round((event.confirmedMembers / Math.max(1, event.capacity || 20)) * 100);
  }

  return event;
}

/**
 * Update Vehicle in Logistics Hub
 */
export async function updateLogisticsVehicle(
  vehicleId: string,
  updates: Partial<LogisticsVehicle>
): Promise<TripLogisticsHub> {
  const user = await requireAuth();
  const userKey = `user_${user.id}`;
  await ensureEnterpriseSessionData(user.name || "User");

  const hub = logisticsStore.get(userKey)!;
  const vehicle = hub.transportation.find((v) => v.id === vehicleId);

  if (vehicle) {
    Object.assign(vehicle, updates);
  }

  return hub;
}

/**
 * Update Room Allocation & Sharing in Logistics Hub
 */
export async function updateLogisticsRoomSharing(
  roomNumber: string,
  occupants: string[],
  status: "Occupied" | "Vacant" | "Reserved"
): Promise<TripLogisticsHub> {
  const user = await requireAuth();
  const userKey = `user_${user.id}`;
  await ensureEnterpriseSessionData(user.name || "User");

  const hub = logisticsStore.get(userKey)!;
  hub.accommodation.forEach((acc) => {
    const room = acc.rooms.find((r) => r.roomNumber === roomNumber);
    if (room) {
      room.occupants = occupants;
      room.status = status;
    }
  });

  return hub;
}

/**
 * Update Work Assignment status & completion % in Logistics Hub
 */
export async function updateLogisticsTaskAssignment(
  taskId: string,
  status: "Upcoming" | "Pending" | "In Progress" | "Completed" | "Delayed",
  completionPct: number
): Promise<TripLogisticsHub> {
  const user = await requireAuth();
  const userKey = `user_${user.id}`;
  await ensureEnterpriseSessionData(user.name || "User");

  const hub = logisticsStore.get(userKey)!;
  const task = hub.assignments.find((t) => t.id === taskId);

  if (task) {
    task.status = status;
    task.completionPct = completionPct;

    // Refresh operational timeline groupings
    hub.operationalTimeline = {
      upcomingTasks: hub.assignments.filter((a) => a.status === "Upcoming" || a.status === "In Progress"),
      pendingTasks: hub.assignments.filter((a) => a.status === "Pending"),
      completedTasks: hub.assignments.filter((a) => a.status === "Completed"),
      delayedTasks: hub.assignments.filter((a) => a.status === "Delayed"),
    };
  }

  return hub;
}

/**
 * Toggle Packing Inventory Item
 */
export async function toggleLogisticsInventoryItem(itemId: string): Promise<TripLogisticsHub> {
  const user = await requireAuth();
  const userKey = `user_${user.id}`;
  await ensureEnterpriseSessionData(user.name || "User");

  const hub = logisticsStore.get(userKey)!;
  const item = hub.packing.inventory.find((i) => i.id === itemId);

  if (item) {
    item.packed = !item.packed;

    const total = hub.packing.inventory.length;
    const packed = hub.packing.inventory.filter((i) => i.packed).length;
    hub.packing.completedPct = Math.round((packed / Math.max(1, total)) * 100);
    hub.packing.sharedPackingPct = hub.packing.completedPct;
  }

  return hub;
}

/**
 * Add a new Work Assignment
 */
export async function addLogisticsAssignment(data: {
  task: string;
  owner: string;
  deadline: string;
  category?: string;
  priority?: "Critical" | "High" | "Medium" | "Low";
  budget?: number;
  notes?: string;
}): Promise<TripLogisticsHub> {
  const user = await requireAuth();
  const userKey = `user_${user.id}`;
  await ensureEnterpriseSessionData(user.name || "User");

  const hub = logisticsStore.get(userKey)!;
  const newTask: LogisticsTaskItem = {
    id: generatePublicId("tsk"),
    task: data.task.trim(),
    owner: data.owner.trim() || user.name || "Member",
    deadline: data.deadline.trim() || "Tomorrow",
    status: "In Progress",
    completionPct: 0,
    category: data.category?.trim() || "General Operations",
    priority: data.priority || "High",
    budget: typeof data.budget === "number" ? data.budget : 0,
    notes: data.notes?.trim() || "",
  };

  hub.assignments.unshift(newTask);
  hub.operationalTimeline = {
    upcomingTasks: hub.assignments.filter((a) => a.status === "Upcoming" || a.status === "In Progress"),
    pendingTasks: hub.assignments.filter((a) => a.status === "Pending"),
    completedTasks: hub.assignments.filter((a) => a.status === "Completed"),
    delayedTasks: hub.assignments.filter((a) => a.status === "Delayed"),
  };

  return hub;
}
