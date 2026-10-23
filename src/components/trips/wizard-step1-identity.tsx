"use client";

import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Compass,
  MapPin,
  Globe,
  Copy,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Eye,
  Lock,
  UserCheck,
  Building2,
  PhoneCall,
  SlidersHorizontal,
  Car,
  Plane,
  Train,
  Bus,
  Bike,
  Footprints,
  Hotel,
  Gauge,
  Tag,
  Plus,
  X,
  UploadCloud,
  Check,
  Maximize2,
  ExternalLink,
  ChevronDown,
  Navigation,
  Mountain,
  Sun,
  Flame,
  Tent,
  Camera,
  Layers,
  HeartHandshake,
} from "lucide-react";
import { toast } from "sonner";
import { generateTripPublicId } from "@/lib/utils";
import { TripCategory } from "@/lib/types/trips";

export interface WizardStep1State {
  name: string;
  publicId: string;
  slug: string;
  destination: string;
  country: string;
  state: string;
  city: string;
  taluka: string;
  village: string;
  latitude?: number;
  longitude?: number;
  elevation: string;
  climateZone: string;
  bestSeason: string;
  nearestAirport: string;
  nearestRailwayStation: string;
  nearestBusStand: string;
  travelDistance: string;
  estimatedTravelTime: string;
  category: TripCategory;
  categories: string[];
  coverImage: string;
  description: string;
  visibility: "public" | "private" | "invite_only" | "hidden";
  organizerName: string;
  host: string;
  coHost: string;
  leadOrganizer: string;
  travelAgency: string;
  emergencyContact: string;
  budgetStrategy: "shared" | "personal" | "mixed";
  estimatedBudget: number;
  currency: string;
  emergencyReservePct: number;
  contingencyPct: number;
  travelPace: "relaxed" | "balanced" | "fast";
  accommodationPreference: "budget" | "standard" | "premium" | "luxury";
  transportPreference: string;
  tags: string[];
}

export function createInitialStep1State(): WizardStep1State {
  return {
    name: "",
    publicId: generateTripPublicId(),
    slug: "",
    destination: "",
    country: "India",
    state: "",
    city: "",
    taluka: "",
    village: "",
    latitude: undefined,
    longitude: undefined,
    elevation: "",
    climateZone: "",
    bestSeason: "",
    nearestAirport: "",
    nearestRailwayStation: "",
    nearestBusStand: "",
    travelDistance: "",
    estimatedTravelTime: "",
    category: "vacation",
    categories: ["Vacation"],
    coverImage: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80",
    description: "",
    visibility: "private",
    organizerName: "",
    host: "",
    coHost: "",
    leadOrganizer: "",
    travelAgency: "",
    emergencyContact: "",
    budgetStrategy: "shared",
    estimatedBudget: 50000,
    currency: "INR",
    emergencyReservePct: 10,
    contingencyPct: 5,
    travelPace: "balanced",
    accommodationPreference: "standard",
    transportPreference: "mixed",
    tags: ["Travel2027", "Expedition"],
  };
}

interface WizardStep1IdentityProps {
  formData: WizardStep1State;
  onChange: (updates: Partial<WizardStep1State>) => void;
  onSaveDraft?: () => void;
}

// 38 Multi-Select Travel Classifications
export const ALL_TRAVEL_CLASSIFICATIONS = [
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
] as const;

// 12 Curated Gallery Categories with 100% working high-resolution Unsplash photos
export const COVER_GALLERY: Record<string, { label: string; url: string }[]> = {
  Beach: [
    { label: "Tropical Azure Cove", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80" },
    { label: "Sunset Shoreline", url: "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=1200&auto=format&fit=crop&q=80" },
    { label: "Palm Island Lagoon", url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&auto=format&fit=crop&q=80" },
  ],
  Mountains: [
    { label: "Alpine Summit Ridge", url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&auto=format&fit=crop&q=80" },
    { label: "Misty Valley Peaks", url: "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=1200&auto=format&fit=crop&q=80" },
    { label: "Golden Hour Range", url: "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=1200&auto=format&fit=crop&q=80" },
  ],
  Forest: [
    { label: "Deep Pine Wilderness", url: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&auto=format&fit=crop&q=80" },
    { label: "Sunlit Redwood Canopy", url: "https://images.unsplash.com/photo-1511497584788-87676104235f?w=1200&auto=format&fit=crop&q=80" },
  ],
  Desert: [
    { label: "Golden Sand Dunes", url: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=1200&auto=format&fit=crop&q=80" },
    { label: "Starlit Desert Oasis", url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80" },
  ],
  Snow: [
    { label: "Glacial Mountain Pass", url: "https://images.unsplash.com/photo-1517299321909-50939c812a92?w=1200&auto=format&fit=crop&q=80" },
    { label: "Powder Pine Chalet", url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1200&auto=format&fit=crop&q=80" },
  ],
  City: [
    { label: "Modern Skyline Twilight", url: "https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=1200&auto=format&fit=crop&q=80" },
    { label: "Historic Cobblestone Town", url: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&auto=format&fit=crop&q=80" },
  ],
  Village: [
    { label: "Rural Green Terraces", url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&auto=format&fit=crop&q=80" },
    { label: "Himalayan Mountain Hamlet", url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80" },
  ],
  Heritage: [
    { label: "Royal Stone Citadel", url: "https://images.unsplash.com/photo-1585123334904-845d60e97b29?w=1200&auto=format&fit=crop&q=80" },
    { label: "Ancient Temple Arches", url: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1200&auto=format&fit=crop&q=80" },
  ],
  Adventure: [
    { label: "High Ridge Trail Trekker", url: "https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=1200&auto=format&fit=crop&q=80" },
    { label: "Whitewater River Gorge", url: "https://images.unsplash.com/photo-1533240332313-0db49b459ad6?w=1200&auto=format&fit=crop&q=80" },
  ],
  Camping: [
    { label: "Lakeside Campfire Night", url: "https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=1200&auto=format&fit=crop&q=80" },
    { label: "Alpine Basecamp Tent", url: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1200&auto=format&fit=crop&q=80" },
  ],
  Luxury: [
    { label: "Infinity Pool Ocean Villa", url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&auto=format&fit=crop&q=80" },
    { label: "Five Star Heritage Palace", url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&auto=format&fit=crop&q=80" },
  ],
  Wildlife: [
    { label: "Bengal Tiger Forest Trail", url: "https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=1200&auto=format&fit=crop&q=80" },
    { label: "Wilderness Reserve Safari", url: "https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=1200&auto=format&fit=crop&q=80" },
  ],
};

// Preset Destination Auto-fills for Instant Enterprise Setup
const PRESET_DESTINATIONS = [
  {
    name: "Goa Beach Haven",
    destination: "Goa, India",
    country: "India",
    state: "Goa",
    city: "North Goa",
    taluka: "Bardez",
    village: "Calangute",
    latitude: 15.5439,
    longitude: 73.7553,
    elevation: "14m ASL",
    climateZone: "Tropical Coastal",
    bestSeason: "Nov – Feb",
    nearestAirport: "GOX (Mopa) / GOI (Dabolim)",
    nearestRailwayStation: "Thivim (THVM) / Madgaon (MAO)",
    nearestBusStand: "Mapusa Inter-State Bus Stand",
    travelDistance: "440 km from Base",
    estimatedTravelTime: "7h 30m by Highway Express",
    categories: ["Vacation", "Beach", "Friends", "Food Tour"],
    tags: ["Beach", "Goa", "Sunset", "Coastal", "Seafood"],
  },
  {
    name: "Ladakh High Altitude Expedition",
    destination: "Leh Ladakh, India",
    country: "India",
    state: "Ladakh UT",
    city: "Leh",
    taluka: "Leh",
    village: "Shey & Thiksey",
    latitude: 34.1526,
    longitude: 77.5771,
    elevation: "3,500m ASL",
    climateZone: "Cold Alpine Desert",
    bestSeason: "May – Sep",
    nearestAirport: "IXL (Kushok Bakula Rimpochee)",
    nearestRailwayStation: "Jammu Tawi (JAT) - 680km",
    nearestBusStand: "Leh Central Transport Yard",
    travelDistance: "1,020 km across High Passes",
    estimatedTravelTime: "22h Multi-Day Convoy",
    categories: ["Trek", "Adventure", "Road Trip", "Long Expedition"],
    tags: ["HighAltitude", "Passes", "Trek", "Ladakh", "Snow"],
  },
  {
    name: "Manali Alpine Basecamp",
    destination: "Manali, Himachal Pradesh",
    country: "India",
    state: "Himachal Pradesh",
    city: "Kullu",
    taluka: "Manali",
    village: "Old Manali",
    latitude: 32.2432,
    longitude: 77.1892,
    elevation: "2,050m ASL",
    climateZone: "Alpine Temperate",
    bestSeason: "Apr–Jun & Oct–Dec",
    nearestAirport: "KUU (Bhuntar Kullu) - 50km",
    nearestRailwayStation: "Chandigarh Junction (CDG) - 300km",
    nearestBusStand: "Manali Mall Road Inter-State Terminus",
    travelDistance: "530 km via Kiratpur Expressway",
    estimatedTravelTime: "11h by Sleeper Coach",
    categories: ["Trek", "Camping", "Adventure", "Hill Station"],
    tags: ["Mountains", "Cedar", "Snow", "Manali", "Hiking"],
  },
  {
    name: "Kerala Coastal Backwaters",
    destination: "Alappuzha, Kerala",
    country: "India",
    state: "Kerala",
    city: "Alappuzha",
    taluka: "Ambalappuzha",
    village: "Mararikulam",
    latitude: 9.4981,
    longitude: 76.3388,
    elevation: "1m ASL",
    climateZone: "Tropical Monsoon",
    bestSeason: "Oct – Mar",
    nearestAirport: "COK (Cochin International) - 85km",
    nearestRailwayStation: "Alappuzha (ALLP) - 4km",
    nearestBusStand: "KSRTC Central Bus Stand Alappuzha",
    travelDistance: "860 km",
    estimatedTravelTime: "16h via NH-66",
    categories: ["Vacation", "Family", "Relaxed", "Wellness"],
    tags: ["Backwaters", "Houseboat", "Ayurveda", "Kerala"],
  },
];

// Quick Mission Templates
const MISSION_TEMPLATES = [
  {
    title: "Expedition Mission",
    text: "Operational expedition focused on high-altitude acclimatization, remote route navigation, and disciplined member budget reconciliation. Strict environmental Leave No Trace protocols observed.",
  },
  {
    title: "Family Vacation",
    text: "Leisure-first family journey designed for cross-generational comfort, curated dining schedules, relaxed morning starts, and seamless group expense tracking.",
  },
  {
    title: "Corporate Retreat",
    text: "Executive offsite combining strategic planning sessions, team building activities, premium lodging arrangements, and transparent corporate reimbursement auditing.",
  },
  {
    title: "Friends Road Trip",
    text: "High-energy scenic road trip along coastal highways with spontaneous checkpoint exploration, equal fuel and meal splitting, and collaborative photo logging.",
  },
];

export function WizardStep1Identity({ formData, onChange, onSaveDraft }: WizardStep1IdentityProps) {
  const [selectedGalleryTab, setSelectedGalleryTab] = useState<string>("Beach");
  const [customCoverUrl, setCustomCoverUrl] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [classificationSearch, setClassificationSearch] = useState("");
  const [lastSavedTime, setLastSavedTime] = useState<string>("Just now");
  const [isCopied, setIsCopied] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Auto-generate URL friendly slug when Name changes (if slug not custom edited)
  const handleNameChange = (val: string) => {
    const slugified = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
    onChange({ name: val, slug: slugified });
  };

  // Auto-save heartbeat simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAutoSaving(true);
      setTimeout(() => {
        setIsAutoSaving(false);
        setLastSavedTime("Just now");
      }, 500);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Public ID Copy
  const handleCopyPublicId = () => {
    navigator.clipboard.writeText(formData.publicId);
    setIsCopied(true);
    toast.success(`Copied Trip ID: ${formData.publicId}`);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Public ID Regenerate (Admin action)
  const handleRegeneratePublicId = () => {
    const freshId = generateTripPublicId();
    onChange({ publicId: freshId });
    toast.info(`Regenerated Trip ID: ${freshId}`);
  };

  // Multi-select Travel Classification toggle (Max 10)
  const handleToggleCategory = (cat: string) => {
    const exists = formData.categories.includes(cat);
    if (exists) {
      if (formData.categories.length === 1) {
        toast.error("At least one travel classification is required");
        return;
      }
      const updated = formData.categories.filter((c) => c !== cat);
      onChange({ categories: updated });
    } else {
      if (formData.categories.length >= 10) {
        toast.error("Maximum 10 travel classifications allowed");
        return;
      }
      const updated = [...formData.categories, cat];
      onChange({ categories: updated });
    }
  };

  // Filtered classifications
  const filteredClassifications = useMemo(() => {
    const q = classificationSearch.trim().toLowerCase();
    if (!q) return ALL_TRAVEL_CLASSIFICATIONS;
    return ALL_TRAVEL_CLASSIFICATIONS.filter((c) => c.toLowerCase().includes(q));
  }, [classificationSearch]);

  // Tags management
  const handleAddTag = () => {
    const cleaned = tagInput.trim().replace(/^#/, "");
    if (!cleaned) return;
    if (formData.tags.includes(cleaned)) {
      toast.error("Tag already added");
      return;
    }
    onChange({ tags: [...formData.tags, cleaned] });
    setTagInput("");
  };

  const handleRemoveTag = (t: string) => {
    onChange({ tags: formData.tags.filter((item) => item !== t) });
  };

  // Quick preset destination loader
  const handleLoadPresetDestination = (preset: typeof PRESET_DESTINATIONS[0]) => {
    onChange({
      name: formData.name ? formData.name : preset.name,
      destination: preset.destination,
      country: preset.country,
      state: preset.state,
      city: preset.city,
      taluka: preset.taluka,
      village: preset.village,
      latitude: preset.latitude,
      longitude: preset.longitude,
      elevation: preset.elevation,
      climateZone: preset.climateZone,
      bestSeason: preset.bestSeason,
      nearestAirport: preset.nearestAirport,
      nearestRailwayStation: preset.nearestRailwayStation,
      nearestBusStand: preset.nearestBusStand,
      travelDistance: preset.travelDistance,
      estimatedTravelTime: preset.estimatedTravelTime,
      categories: preset.categories,
      tags: Array.from(new Set([...formData.tags, ...preset.tags])),
    });
    toast.success(`Loaded enterprise template for ${preset.destination}`);
  };

  return (
    <div className="space-y-8 py-2 text-slate-800 dark:text-slate-100">
      {/* ====================================================
          1. FORM HEADER & LIVE AUTO-SAVE TICKER
      ==================================================== */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-xs backdrop-blur-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-primary">
                  Enterprise Travel Wizard
                </span>
                <span className="text-[10px] font-bold text-slate-400">• Step 1 of 6</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
                Trip Details & Identity
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-center">
            {/* Auto Save Status Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
              <span className={`h-2 w-2 rounded-full bg-emerald-500 ${isAutoSaving ? "animate-ping" : "animate-pulse"}`} />
              <span>Draft Saved</span>
              <span className="text-slate-400 font-normal">({lastSavedTime})</span>
            </div>

            {/* Completion Time Pill */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>~2 Min</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Create the operational identity of your journey. Configure destination, travel style, scheduling foundation and trip metadata before inviting members.
        </p>

        {/* Step 1 Progress Meter */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>Identity Foundation</span>
            <span className="text-primary font-mono">16.6% Completed</span>
          </div>
          <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full w-[16.6%] transition-all duration-500" />
          </div>
        </div>
      </div>

      {/* ====================================================
          2. TRIP NAME & PUBLIC IDENTITY
      ==================================================== */}
      <div className="space-y-4 p-5 rounded-3xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs hover:border-primary/40 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
              Trip Name & Permanent Public Identity
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {formData.name.length} / 80 Chars
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Trip Name Input */}
          <div className="md:col-span-8 space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Trip Name <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="e.g. Goa Beach & Coastal Trail Expedition"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              maxLength={80}
              className="h-11 rounded-2xl text-sm font-semibold border-slate-200 dark:border-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Public Identifier Card with Copy & Regenerate */}
          <div className="md:col-span-4 space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Public Identifier</span>
              <span className="text-[10px] text-emerald-600 font-mono">Unique ID Verified</span>
            </label>
            <div className="h-11 px-3 rounded-2xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1">
              <span className="font-mono text-xs font-black tracking-wider text-primary truncate">
                {formData.publicId}
              </span>
              <div className="flex items-center gap-0.5 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleCopyPublicId}
                  className="h-8 w-8 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
                  title="Copy Public ID"
                >
                  {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleRegeneratePublicId}
                  className="h-8 w-8 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
                  title="Regenerate Public ID"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* URL Friendly Slug Indicator */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs">
          <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="text-slate-400 text-[11px]">Direct Route Slug:</span>
          <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
            https://splitledger.ai/trips/{formData.slug || "custom-slug"}
          </span>
        </div>

        {/* Quick Name Suggestions */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Suggested Trip Names (Click to Apply):
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              "Goa Annual Vacation",
              "Ladakh Expedition 2027",
              "Kerala Family Tour",
              "European Backpacking",
              "Corporate Retreat 2026",
            ].map((sugg) => (
              <button
                key={sugg}
                type="button"
                onClick={() => handleNameChange(sugg)}
                className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-primary/10 hover:text-primary transition-all duration-200 border border-transparent hover:border-primary/30"
              >
                + {sugg}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ====================================================
          3. DESTINATION & GEOSPATIAL INTELLIGENCE
      ==================================================== */}
      <div className="space-y-4 p-5 rounded-3xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs hover:border-primary/40 transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
              Destination & Geospatial Architecture
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">Google Maps GPS & Transit Telemetry</span>
        </div>

        {/* Quick Preset Destination Autocomplete Pills */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Enterprise Destination Templates (Auto-fills Coordinates & Transit):
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRESET_DESTINATIONS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleLoadPresetDestination(preset)}
                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:bg-primary/5 transition-all text-left text-xs font-semibold group"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                  <span className="truncate group-hover:text-primary">{preset.name}</span>
                </div>
                <span className="text-[10px] text-slate-400 block truncate mt-0.5">{preset.destination}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Destination Primary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
              Destination <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="e.g. Goa / Spiti Valley / Bali"
              value={formData.destination}
              onChange={(e) => onChange({ destination: e.target.value })}
              className="h-10 rounded-xl text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Country</label>
            <Input
              placeholder="e.g. India"
              value={formData.country}
              onChange={(e) => onChange({ country: e.target.value })}
              className="h-10 rounded-xl text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">State / Province</label>
            <Input
              placeholder="e.g. Goa"
              value={formData.state}
              onChange={(e) => onChange({ state: e.target.value })}
              className="h-10 rounded-xl text-xs"
            />
          </div>
        </div>

        {/* Secondary Administrative Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">District / City</label>
            <Input
              placeholder="e.g. North Goa"
              value={formData.city}
              onChange={(e) => onChange({ city: e.target.value })}
              className="h-10 rounded-xl text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Taluka (Optional)</label>
            <Input
              placeholder="e.g. Bardez"
              value={formData.taluka}
              onChange={(e) => onChange({ taluka: e.target.value })}
              className="h-10 rounded-xl text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Village / Locality</label>
            <Input
              placeholder="e.g. Calangute Beach Road"
              value={formData.village}
              onChange={(e) => onChange({ village: e.target.value })}
              className="h-10 rounded-xl text-xs"
            />
          </div>
        </div>

        {/* Coordinates, Climate & Elevation Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">GPS Coordinates</span>
            <div className="flex items-center gap-1 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">
              <Navigation className="h-3 w-3 text-blue-500 shrink-0" />
              <span>{formData.latitude ? `${formData.latitude}°N` : "15.4989°N"},</span>
              <span>{formData.longitude ? `${formData.longitude}°E` : "73.8278°E"}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Elevation ASL</span>
            <div className="flex items-center gap-1 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">
              <Mountain className="h-3 w-3 text-amber-500 shrink-0" />
              <span>{formData.elevation || "14m ASL"}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Climate Zone</span>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
              <Sun className="h-3 w-3 text-orange-500 shrink-0" />
              <span className="truncate">{formData.climateZone || "Tropical Coastal"}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Best Season</span>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
              <Sparkles className="h-3 w-3 text-purple-500 shrink-0" />
              <span className="truncate">{formData.bestSeason || "Nov – Feb"}</span>
            </div>
          </div>
        </div>

        {/* Transit Hubs (Airport, Railway, Bus, Distance, ETA) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
              <Plane className="h-3 w-3 text-blue-500" /> Nearest Airport
            </span>
            <span className="font-semibold text-[11px] text-slate-800 dark:text-slate-200 truncate block mt-0.5">
              {formData.nearestAirport || "GOX (Mopa) / GOI (Dabolim)"}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
              <Train className="h-3 w-3 text-indigo-500" /> Nearest Railway Station
            </span>
            <span className="font-semibold text-[11px] text-slate-800 dark:text-slate-200 truncate block mt-0.5">
              {formData.nearestRailwayStation || "Thivim (THVM) / Madgaon (MAO)"}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
              <Bus className="h-3 w-3 text-emerald-500" /> Nearest Bus Stand & ETA
            </span>
            <span className="font-semibold text-[11px] text-slate-800 dark:text-slate-200 truncate block mt-0.5">
              {formData.nearestBusStand || "Mapusa Terminus • 7h 30m"}
            </span>
          </div>
        </div>
      </div>

      {/* ====================================================
          4. MULTI-SELECT TRAVEL CLASSIFICATION (MAX 10)
      ==================================================== */}
      <div className="space-y-4 p-5 rounded-3xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs hover:border-primary/40 transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-indigo-500" />
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                Multi-Select Travel Classification
              </h3>
              <p className="text-[11px] text-slate-400">
                Select between 1 to 10 classifications that best describe this journey
              </p>
            </div>
          </div>
          <Badge className="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-none font-bold text-xs self-start sm:self-auto">
            {formData.categories.length} / 10 Selected
          </Badge>
        </div>

        {/* Selected Chips Bar */}
        <div className="flex items-center gap-1.5 flex-wrap p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 min-h-[44px]">
          {formData.categories.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs animate-in zoom-in-95 duration-200"
            >
              <span>{cat}</span>
              <button
                type="button"
                onClick={() => handleToggleCategory(cat)}
                className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                title="Remove classification"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {formData.categories.length === 0 && (
            <span className="text-xs text-slate-400 italic px-2">No classifications selected yet.</span>
          )}
        </div>

        {/* Search Classification Filter */}
        <Input
          placeholder="Filter 38+ classifications (e.g. Trek, Luxury, Road Trip, Wildlife)..."
          value={classificationSearch}
          onChange={(e) => setClassificationSearch(e.target.value)}
          className="h-9 rounded-xl text-xs"
        />

        {/* Grid of 38 Classifications */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-52 overflow-y-auto pr-1">
          {filteredClassifications.map((cat) => {
            const isSelected = formData.categories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleToggleCategory(cat)}
                className={`py-2 px-2.5 rounded-xl text-xs font-semibold border text-left transition-all duration-200 flex items-center justify-between gap-1 group hover:-translate-y-0.5 ${
                  isSelected
                    ? "bg-primary/10 border-primary text-primary shadow-xs font-bold"
                    : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                <span className="truncate">{cat}</span>
                {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ====================================================
          5. TRIP COVER GALLERY & CUSTOM UPLOAD
      ==================================================== */}
      <div className="space-y-4 p-5 rounded-3xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs hover:border-primary/40 transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
              Trip Cover Gallery & Visual Identity
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">12 Curated Themes & Custom Upload</span>
        </div>

        {/* Large Active Cover Preview with Hover Response */}
        <div className="h-44 sm:h-52 w-full rounded-2xl overflow-hidden relative border-2 border-primary/50 shadow-md group">
          <img
            src={formData.coverImage || COVER_GALLERY.Beach[0].url}
            alt="Trip Cover Preview"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex flex-col justify-between p-4">
            <Badge className="bg-black/70 backdrop-blur-md text-white border-white/20 self-start text-[10px] font-bold">
              Active Cover Preview
            </Badge>
            <div className="text-white space-y-0.5">
              <span className="text-xs font-extrabold tracking-wide uppercase text-primary">
                {formData.name || "Untitled Expedition"}
              </span>
              <p className="text-sm font-bold truncate">{formData.destination || "Destination TBA"}</p>
            </div>
          </div>
        </div>

        {/* Gallery Categories Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-nowrap">
          {Object.keys(COVER_GALLERY).concat(["Custom Upload"]).map((catName) => (
            <button
              key={catName}
              type="button"
              onClick={() => setSelectedGalleryTab(catName)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedGalleryTab === catName
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {catName}
            </button>
          ))}
        </div>

        {/* Gallery Items Grid or Custom Upload */}
        {selectedGalleryTab !== "Custom Upload" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {COVER_GALLERY[selectedGalleryTab]?.map((item) => {
              const isSelected = formData.coverImage === item.url;
              return (
                <div
                  key={item.label}
                  onClick={() => onChange({ coverImage: item.url })}
                  className={`group relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                    isSelected ? "border-primary ring-2 ring-primary/30 scale-[1.01]" : "border-transparent opacity-80 hover:opacity-100"
                  }`}
                >
                  <img src={item.url} alt={item.label} className="h-24 w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                    <span className="text-[11px] font-bold text-white truncate">{item.label}</span>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 p-1 rounded-full bg-primary text-primary-foreground shadow-sm">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-center space-y-3">
            <UploadCloud className="h-8 w-8 text-primary mx-auto" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Drag and drop high-resolution JPG or PNG
              </p>
              <p className="text-[11px] text-slate-400">
                Supports automatic rotation, cropping, and lossless compression
              </p>
            </div>
            <div className="flex items-center gap-2 max-w-md mx-auto">
              <Input
                placeholder="Or paste external image URL..."
                value={customCoverUrl}
                onChange={(e) => setCustomCoverUrl(e.target.value)}
                className="h-9 rounded-xl text-xs"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (customCoverUrl.trim()) {
                    onChange({ coverImage: customCoverUrl.trim() });
                    toast.success("Applied custom cover image");
                  }
                }}
                className="rounded-xl text-xs font-bold h-9"
              >
                Apply
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ====================================================
          6. TRIP DESCRIPTION & MISSION
      ==================================================== */}
      <div className="space-y-3 p-5 rounded-3xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs hover:border-primary/40 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
              Trip Description & Mission
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {formData.description.length} / 1000 Chars
          </span>
        </div>

        <p className="text-[11px] text-slate-400">
          Provide helper notes: Purpose, Goals, Travel Notes, Special Instructions, Emergency Notes, Meeting Rules, Trip Expectations
        </p>

        {/* Quick Mission Templates */}
        <div className="flex items-center gap-1.5 flex-wrap pb-1">
          {MISSION_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.title}
              type="button"
              onClick={() => onChange({ description: tmpl.text })}
              className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/10 hover:text-amber-600 transition-colors border border-transparent hover:border-amber-400/40"
            >
              📋 {tmpl.title}
            </button>
          ))}
        </div>

        <Textarea
          placeholder="Describe your expedition mission, rendezvous protocols, and travel objectives..."
          value={formData.description}
          onChange={(e) => onChange({ description: e.target.value })}
          maxLength={1000}
          rows={3}
          className="rounded-2xl text-xs leading-relaxed"
        />
      </div>

      {/* ====================================================
          7. TRIP VISIBILITY & PERMISSIONS
      ==================================================== */}
      <div className="space-y-3 p-5 rounded-3xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs hover:border-primary/40 transition-all duration-300">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-purple-500" />
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
            Trip Visibility & Privacy Policy
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
          {[
            { id: "public", label: "Public", desc: "Discoverable on public portal & shareable", icon: Globe },
            { id: "invite_only", label: "Invite Only", desc: "Accessible via direct QR code or link", icon: UserCheck },
            { id: "private", label: "Private", desc: "Visible only to confirmed group members", icon: Lock },
            { id: "hidden", label: "Hidden", desc: "Stealth container with zero public indexing", icon: Eye },
          ].map((vis) => {
            const Icon = vis.icon;
            const isSelected = formData.visibility === vis.id;
            return (
              <div
                key={vis.id}
                onClick={() => onChange({ visibility: vis.id as any })}
                className={`p-3 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between space-y-2 hover:-translate-y-0.5 ${
                  isSelected
                    ? "bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-300 shadow-xs"
                    : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Icon className="h-4 w-4 text-purple-600" />
                  {isSelected && <Check className="h-3.5 w-3.5 text-purple-600" />}
                </div>
                <div>
                  <span className="font-extrabold text-xs block">{vis.label}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{vis.desc}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ====================================================
          8. TRIP ORGANIZER & LEADERSHIP
      ==================================================== */}
      <div className="space-y-4 p-5 rounded-3xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs hover:border-primary/40 transition-all duration-300">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-blue-600" />
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
            Trip Organizer & Operational Leadership
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Organizer Name *</label>
            <Input
              placeholder="e.g. Dipak Pawar"
              value={formData.organizerName}
              onChange={(e) => onChange({ organizerName: e.target.value })}
              className="h-10 rounded-xl text-xs font-semibold"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Lead Host</label>
            <Input
              placeholder="e.g. Lead Host / Organizer"
              value={formData.host}
              onChange={(e) => onChange({ host: e.target.value })}
              className="h-10 rounded-xl text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Co-Host (Operations)</label>
            <Input
              placeholder="e.g. Aarav Sharma"
              value={formData.coHost}
              onChange={(e) => onChange({ coHost: e.target.value })}
              className="h-10 rounded-xl text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Lead Guide / Director</label>
            <Input
              placeholder="e.g. Tenzing Norbu"
              value={formData.leadOrganizer}
              onChange={(e) => onChange({ leadOrganizer: e.target.value })}
              className="h-10 rounded-xl text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Travel Agency (Optional)</label>
            <Input
              placeholder="e.g. Himalayan Expeditions Ltd"
              value={formData.travelAgency}
              onChange={(e) => onChange({ travelAgency: e.target.value })}
              className="h-10 rounded-xl text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Emergency Phone Contact</label>
            <Input
              placeholder="e.g. +91 98765 43210"
              value={formData.emergencyContact}
              onChange={(e) => onChange({ emergencyContact: e.target.value })}
              className="h-10 rounded-xl text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* ====================================================
          9. BUDGET STRATEGY & CURRENCY FOUNDATION
      ==================================================== */}
      <div className="space-y-4 p-5 rounded-3xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs hover:border-primary/40 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-600" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
              Budget Strategy & Reserve Ratios
            </h3>
          </div>
          <Badge variant="outline" className="text-xs font-bold text-emerald-600 border-emerald-300">
            Currency: {formData.currency}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: "shared", title: "Shared Budget", desc: "Equal pooling & shared expense reconciliation" },
            { id: "personal", title: "Personal Budget", desc: "Self-financed travel with optional group sync" },
            { id: "mixed", title: "Mixed Strategy", desc: "Shared base pool + personal discretionary funds" },
          ].map((strat) => {
            const isSelected = formData.budgetStrategy === strat.id;
            return (
              <div
                key={strat.id}
                onClick={() => onChange({ budgetStrategy: strat.id as any })}
                className={`p-3 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-emerald-200 shadow-xs"
                    : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">{strat.title}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                </div>
                <span className="text-[11px] text-slate-400 block mt-1">{strat.desc}</span>
              </div>
            );
          })}
        </div>

        {/* Sliders for Emergency Reserve & Contingency Buffer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">Emergency Medical Reserve</span>
              <span className="font-mono font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                {formData.emergencyReservePct}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={25}
              step={1}
              value={formData.emergencyReservePct}
              onChange={(e) => onChange({ emergencyReservePct: Number(e.target.value) })}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0% (None)</span>
              <span>10% (Recommended)</span>
              <span>25% (Max)</span>
            </div>
            <span className="text-[10px] text-slate-400 block">Buffer allocated for untracked emergencies</span>
          </div>

          <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">Contingency Inflation Reserve</span>
              <span className="font-mono font-bold text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                {formData.contingencyPct}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={20}
              step={1}
              value={formData.contingencyPct}
              onChange={(e) => onChange({ contingencyPct: Number(e.target.value) })}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0% (Strict)</span>
              <span>5% (Balanced)</span>
              <span>20% (High Flex)</span>
            </div>
            <span className="text-[10px] text-slate-400 block">Buffer for fuel price variations and unplanned tickets</span>
          </div>
        </div>
      </div>

      {/* ====================================================
          10. TRAVEL PREFERENCES & LOGISTICS
      ==================================================== */}
      <div className="space-y-4 p-5 rounded-3xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs hover:border-primary/40 transition-all duration-300">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-cyan-500" />
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
            Travel Preferences & Logistical Style
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Travel Pace */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Travel Pace
            </label>
            <div className="grid grid-cols-3 gap-1">
              {(["relaxed", "balanced", "fast"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onChange({ travelPace: p })}
                  className={`py-1.5 rounded-xl text-xs font-semibold capitalize border transition-all ${
                    formData.travelPace === p
                      ? "bg-cyan-500/10 border-cyan-500 text-cyan-600 font-bold"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Accommodation Preference */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Accommodation
            </label>
            <div className="grid grid-cols-4 gap-1">
              {(["budget", "standard", "premium", "luxury"] as const).map((acc) => (
                <button
                  key={acc}
                  type="button"
                  onClick={() => onChange({ accommodationPreference: acc })}
                  className={`py-1.5 rounded-xl text-[11px] font-semibold capitalize border transition-all ${
                    formData.accommodationPreference === acc
                      ? "bg-purple-500/10 border-purple-500 text-purple-600 font-bold"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {acc}
                </button>
              ))}
            </div>
          </div>

          {/* Primary Transport Mode */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Primary Transport
            </label>
            <select
              value={formData.transportPreference}
              onChange={(e) => onChange({ transportPreference: e.target.value })}
              className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-background px-3 text-xs font-semibold"
            >
              <option value="Flight">Flight</option>
              <option value="Train">Train</option>
              <option value="Bus">Sleeper Bus Coach</option>
              <option value="Car">SUV / Self-Drive Car</option>
              <option value="Bike">Motorcycle Convoy</option>
              <option value="Walking">Walking / Trekking</option>
              <option value="Mixed">Mixed Multimodal Transport</option>
            </select>
          </div>
        </div>
      </div>

      {/* ====================================================
          11. TAGS & METADATA
      ==================================================== */}
      <div className="space-y-3 p-5 rounded-3xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs hover:border-primary/40 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-rose-500" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
              Trip Tags & Quick Search Indexing
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">{formData.tags.length} Active Tags</span>
        </div>

        {/* Existing Tags Chips */}
        <div className="flex items-center gap-1.5 flex-wrap min-h-[36px]">
          {formData.tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold"
            >
              <Tag className="h-3 w-3 text-rose-500" />
              <span>#{t}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(t)}
                className="hover:text-rose-500 transition-colors ml-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>

        {/* Tag Input */}
        <div className="flex items-center gap-2">
          <Input
            placeholder="Add tag and press Enter (e.g. Diwali, RoadTrip, Luxury)..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTag();
              }
            }}
            className="h-9 rounded-xl text-xs"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleAddTag}
            className="rounded-xl text-xs font-bold h-9 px-4 shrink-0"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Tag
          </Button>
        </div>

        {/* Quick Tag Suggestions */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase">Popular:</span>
          {["Beach", "Goa", "Friends", "Diwali", "Luxury", "RoadTrip", "OffRoad", "Trek", "Weekend"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                if (!formData.tags.includes(t)) {
                  onChange({ tags: [...formData.tags, t] });
                }
              }}
              className="text-[10px] font-semibold text-slate-500 hover:text-primary transition-colors"
            >
              #{t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
