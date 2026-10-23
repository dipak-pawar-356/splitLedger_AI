import {
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

/**
 * Creates comprehensive seed logistics hub for 30-50 year caliber enterprise travel operations
 */
export function createSeedLogisticsHub(tripId: string = "trip_goa_premium_01"): TripLogisticsHub {
  const vehicles: LogisticsVehicle[] = [
    {
      id: "veh_01",
      vehicleNumber: "MH-12-RN-8842",
      type: "Volvo 9600 Multi-Axle Luxury Sleeper Coach",
      driverName: "Rajesh Shinde",
      driverContact: "+91 98221 54321",
      busCapacity: 36,
      currentStatus: "En Route",
      fuelStatus: "75%",
      pickupPoints: ["Pune Swargate (20:00)", "Mumbai Airport T2 (23:30)"],
      dropPoints: ["Mapusa Bus Terminal", "Calangute Circle Central"],
      estimatedArrival: "Today, 08:30 AM",
      liveStatus: "Cruising Western Ghats smoothly. Tire pressure verified at 110 PSI.",
    },
    {
      id: "veh_02",
      vehicleNumber: "HP-01-AX-4099",
      type: "Force Traveller 4x4 Mountain Cruiser (High-Clearance)",
      driverName: "Tenzing Norbu",
      driverContact: "+91 98055 12345",
      busCapacity: 14,
      currentStatus: "Scheduled",
      fuelStatus: "Full",
      pickupPoints: ["Manali Mall Road (06:00 AM)"],
      dropPoints: ["Atal Tunnel Portal", "Sissu Valley Basecamp", "Kaza High Camp"],
      estimatedArrival: "Tomorrow, 06:00 AM Departure",
      liveStatus: "Snow chains inspected & mounted. Auxiliary engine heater operational.",
    },
  ];

  const accommodation: LogisticsAccommodation[] = [
    {
      id: "acc_01",
      hotelName: "Taj Fort Aguada Beachfront Resort & Spa",
      checkInDate: "2026-10-28",
      checkOutDate: "2026-11-04",
      checkInTime: "02:00 PM",
      checkOutTime: "11:00 AM",
      totalRooms: 4,
      bookingStatus: "Confirmed",
      hotelContact: "+91 832 6645858 (Manager: Vivian D'Souza)",
      address: "Sinquerim Beach, Candolim, North Goa 403515",
      rooms: [
        { roomNumber: "Cottage 101", roomType: "Sea-Facing Deluxe King", occupants: ["Dipak Pawar (Lead)", "Aarav Sharma"], status: "Occupied", capacity: 2 },
        { roomNumber: "Cottage 102", roomType: "Garden View Deluxe Twin", occupants: ["Sneha Patel", "Ananya Deshmukh"], status: "Occupied", capacity: 2 },
        { roomNumber: "Cottage 103", roomType: "Executive Heritage Suite", occupants: ["Rohan Verma", "Vikram Joshi"], status: "Reserved", capacity: 2 },
        { roomNumber: "Cottage 104", roomType: "Private Pool Villa Pavilion", occupants: ["Guest Member 1", "Guest Member 2"], status: "Reserved", capacity: 2 },
      ],
    },
    {
      id: "acc_02",
      hotelName: "Himalayan Ridge Wooden Chalet & Campsite",
      checkInDate: "2026-11-15",
      checkOutDate: "2026-11-22",
      checkInTime: "01:00 PM",
      checkOutTime: "10:00 AM",
      totalRooms: 6,
      bookingStatus: "Confirmed",
      hotelContact: "+91 1902 254122 (Host: Stanzin Dorje)",
      address: "Old Manali Clubhouse Road, Upper Manali, HP 175131",
      rooms: [
        { roomNumber: "Alpine Hut A1", roomType: "Insulated Cedar Wood Chalet", occupants: ["Dipak Pawar", "Rohan Verma"], status: "Reserved", capacity: 2 },
        { roomNumber: "Alpine Hut A2", roomType: "Insulated Cedar Wood Chalet", occupants: ["Aarav Sharma"], status: "Vacant", capacity: 2 },
      ],
    },
  ];

  const emergency: LogisticsEmergency = {
    hospitalName: "Manipal Hospital Goa (Tertiary 24x7 Multi-Speciality Emergency)",
    hospitalContact: "+91 832 3048800 / Emergency ICU Ext 108",
    hospitalDistanceKm: 6.2,
    policeContact: "Calangute Police Station (+91 832 2278211 / Dial 112)",
    tripLeader: "Dipak Pawar (+91 98765 43210)",
    tripLeaderContact: "+91 98765 43210",
    coLeader: "Aarav Sharma (+91 98111 22334)",
    coLeaderContact: "+91 98111 22334",
    rescueContact: "Drishti Marine Coastal Lifeguard Dispatch & Mountain SAR (Toll-Free 108 / +91 832 2456600)",
    bloodGroupList: [
      { memberName: "Dipak Pawar", bloodGroup: "O+", allergies: "None known", emergencyContact: "+91 98220 11223" },
      { memberName: "Aarav Sharma", bloodGroup: "B+", allergies: "Penicillin sensitive", emergencyContact: "+91 98111 99887" },
      { memberName: "Sneha Patel", bloodGroup: "A+", allergies: "Mild dust & shellfish", emergencyContact: "+91 98222 88776" },
      { memberName: "Rohan Verma", bloodGroup: "AB+", allergies: "None known", emergencyContact: "+91 98333 77665" },
      { memberName: "Ananya Deshmukh", bloodGroup: "O+", allergies: "Lactose intolerance", emergencyContact: "+91 98444 66554" },
    ],
    medicalNotes: [
      "Level-3 expedition trauma kit assigned to Co-Leader Aarav Sharma.",
      "Portable pulse-oximeter, Diamox blister packs, and ORS sachets sealed in waterproof pouches.",
      "Hospital emergency credit line established with Manipal Hospital Goa billing desk.",
    ],
  };

  const permissions: LogisticsPermitItem[] = [
    { id: "prm_01", title: "Commercial Tourist Heavy Vehicle Inter-State Permit (MH to GA)", category: "Vehicle Permit", status: "Verified", holderName: "Rajesh Shinde", expiryDate: "2027-04-15", documentNumber: "MH-RTO-2026-99182" },
    { id: "prm_02", title: "Goa Forest Dept Dudhsagar Waterfall Jeep Safari Entry Pass", category: "Forest Permit", status: "Verified", expiryDate: "2026-11-02", documentNumber: "GOA-FOR-DU-8821" },
    { id: "prm_03", title: "Commercial Driver Heavy Passenger Endorsement License", category: "Driving License", status: "Verified", holderName: "Rajesh Shinde", expiryDate: "2029-08-10", documentNumber: "DL-1220140028192" },
    { id: "prm_04", title: "Taj Fort Aguada Executive Hotel Booking Voucher", category: "Hotel Voucher", status: "Verified", expiryDate: "2026-11-04", documentNumber: "TAJ-AGU-CONF-98441" },
    { id: "prm_05", title: "IndiGo Group Passenger Travel PNR 6EK99Z", category: "Tickets", status: "Verified", expiryDate: "2026-11-05", documentNumber: "6EK99Z" },
    { id: "prm_06", title: "HDFC ERGO Comprehensive Travel & Adventure Medical Policy", category: "Insurance", status: "Verified", expiryDate: "2026-12-31", documentNumber: "POL-2026-HDFC-99218" },
    { id: "prm_07", title: "Member Govt Aadhaar / Passport Identity Verification", category: "Identity Verification", status: "Verified", expiryDate: "Lifetime", documentNumber: "Verified 10/10 Members" },
  ];

  const packing: LogisticsPackingInventory = {
    sharedPackingPct: 82,
    completedPct: 85,
    missingItems: ["High-power 65W GaN multi-chargers", "Reserve 12V headlight halogen bulbs"],
    criticalItems: ["Garmin inReach Satellite SOS Unit", "Level-3 Wilderness Trauma First Aid Kit", "Heavy-Duty 5-Ton Kinetic Tow Strap"],
    inventory: [
      { id: "inv_01", item: "4-Season Windproof Expedition Tents", category: "Shelter", quantity: 3, packed: true, owner: "Dipak Pawar", isCritical: true },
      { id: "inv_02", item: "11mm Dynamic Climbing & Safety Rope (60m)", category: "Technical Gear", quantity: 1, packed: true, owner: "Rohan Verma", isCritical: true },
      { id: "inv_03", item: "Level-3 Wilderness Trauma First Aid Kit", category: "Medical", quantity: 2, packed: true, owner: "Aarav Sharma", isCritical: true },
      { id: "inv_04", item: "Garmin inReach Explorer Satellite SOS Communicator", category: "Comms", quantity: 1, packed: true, owner: "Dipak Pawar", isCritical: true },
      { id: "inv_05", item: "Sony FX3 4K Cinema Camera & Waterproof Housing", category: "Electronics", quantity: 1, packed: true, owner: "Aarav Sharma", isCritical: false },
      { id: "inv_06", item: "Coleman Multi-Fuel Camping Stove & Burners", category: "Catering", quantity: 2, packed: false, owner: "Sneha Patel", isCritical: false },
      { id: "inv_07", item: "Heavy-Duty 5-Ton Kinetic Vehicle Tow Strap", category: "Automotive", quantity: 1, packed: true, owner: "Rajesh (Driver)", isCritical: true },
      { id: "inv_08", item: "Waterproof Floating Walkie-Talkies (5W Dual-Band)", category: "Comms", quantity: 4, packed: true, owner: "Dipak Pawar", isCritical: true },
    ],
  };

  const foodLogistics: LogisticsMealItem[] = [
    {
      meal: "Breakfast",
      timing: "08:00 AM - 10:00 AM",
      menu: "Continental Buffet, Poori Bhaji, Fresh Tropical Juices, Eggs to Order, South Indian Dosa & Filter Coffee",
      vendorName: "Taj Villa Kitchen & Executive Chef",
      dietaryNotes: "2 Vegan, 1 Gluten-Free, 7 Regular",
      vendorStatus: "Confirmed",
    },
    {
      meal: "Lunch",
      timing: "01:30 PM - 03:00 PM",
      menu: "Goan Kingfish Coastal Curry, Steamed Rice, Vegetable Pulao, Paneer Tikka Masala, Butter Naan",
      vendorName: "Fisherman's Wharf Shore Catering Service",
      dietaryNotes: "3 Jain (No onion/garlic), 7 Coastal Seafood",
      vendorStatus: "In Preparation",
    },
    {
      meal: "Dinner",
      timing: "08:30 PM - 10:30 PM",
      menu: "Beachfront Seafood & Vegetarian Barbeque, Wood-Fired Sourdough Pizzas, Caesar Salad, Dessert Platter",
      vendorName: "Curlies Bay Kitchen & Grill",
      dietaryNotes: "All individual dietary preferences pre-labeled",
      vendorStatus: "Confirmed",
    },
    {
      meal: "Snacks",
      timing: "05:00 PM - 06:00 PM",
      menu: "Electrolyte Coconut Water, Cashew Nut Clusters, Energy Granola Bars, Masala Chai",
      vendorName: "Coastal Fresh Produce Wholesale",
      dietaryNotes: "High-energy trail nutrition",
      vendorStatus: "Delivered",
    },
    {
      meal: "Water Supply",
      timing: "Continuous 24x7",
      menu: "20L Sealed Bisleri Mineral Water Jars & Stainless Steel Vacuum Flasks",
      vendorName: "Goa Beverage Logistics Depot",
      dietaryNotes: "100% Certified Potable Mineral Water",
      vendorStatus: "Delivered",
    },
  ];

  const vendors: LogisticsVendorItem[] = [
    { id: "vnd_01", name: "Goa Coastal Luxury Coach Transporters", category: "Transport Vendor", contact: "+91 98221 44556", paymentStatus: "Paid", rating: 4.9, amount: 18500 },
    { id: "vnd_02", name: "Taj Fort Aguada Hospitality Desk", category: "Hotel Vendor", contact: "+91 832 6645858", paymentStatus: "Partial Advance", rating: 4.8, amount: 45000 },
    { id: "vnd_03", name: "Himalayan Certified Mountaineering Guides Association", category: "Guide", contact: "+91 98055 33441", paymentStatus: "Pending", rating: 5.0, amount: 14000 },
    { id: "vnd_04", name: "Decathlon High-Altitude Adventure Gear Rentals", category: "Equipment Vendor", contact: "+91 80 4646 1234", paymentStatus: "Settled", rating: 4.7, amount: 8500 },
    { id: "vnd_05", name: "Fisherman's Wharf Shore Catering Logistics", category: "Catering", contact: "+91 832 2490001", paymentStatus: "Partial Advance", rating: 4.8, amount: 12000 },
  ];

  const assignments: LogisticsTaskItem[] = [
    { id: "tsk_01", task: "Buy food & trail energy rations", owner: "Sneha Patel", deadline: "Today, 18:00", status: "In Progress", completionPct: 75 },
    { id: "tsk_02", task: "Book hotel & reconfirm late check-in voucher", owner: "Dipak Pawar", deadline: "Yesterday", status: "Completed", completionPct: 100 },
    { id: "tsk_03", task: "Fuel vehicle & verify highway tire pressures", owner: "Rajesh (Driver)", deadline: "Today, 14:00", status: "Completed", completionPct: 100 },
    { id: "tsk_04", task: "Collect payments & reconcile UPI advances", owner: "Aarav Sharma", deadline: "Tomorrow, 12:00", status: "In Progress", completionPct: 80 },
    { id: "tsk_05", task: "Carry medicines, bandages & blister kits", owner: "Sneha Patel", deadline: "Today, 20:00", status: "Completed", completionPct: 100 },
    { id: "tsk_06", task: "Carry climbing rope, harnesses & carabiners", owner: "Rohan Verma", deadline: "Tomorrow, 08:00", status: "In Progress", completionPct: 60 },
    { id: "tsk_07", task: "Carry 4-season tents & thermal ground pads", owner: "Dipak Pawar", deadline: "Tomorrow, 09:00", status: "In Progress", completionPct: 70 },
    { id: "tsk_08", task: "Carry cinema camera, drone & spare batteries", owner: "Aarav Sharma", deadline: "Today, 19:00", status: "Completed", completionPct: 100 },
    { id: "tsk_09", task: "Carry certified trauma first aid kit & oximeter", owner: "Sneha Patel", deadline: "Today, 20:00", status: "Completed", completionPct: 100 },
  ];

  const operationalTimeline = {
    upcomingTasks: assignments.filter((a) => a.status === "Upcoming" || a.status === "In Progress"),
    pendingTasks: assignments.filter((a) => a.status === "Pending"),
    completedTasks: assignments.filter((a) => a.status === "Completed"),
    delayedTasks: assignments.filter((a) => a.status === "Delayed"),
  };

  return {
    id: `logistics_${tripId}`,
    tripId,
    transportation: vehicles,
    accommodation,
    emergency,
    permissions,
    packing,
    foodLogistics,
    vendors,
    operationalTimeline,
    assignments,
  };
}
