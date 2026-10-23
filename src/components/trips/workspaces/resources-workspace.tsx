"use client";

import { useState } from "react";
import { TripLogisticsHub } from "@/lib/types/trips";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Luggage,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Check,
  Search,
  Filter,
  ShieldAlert,
  HeartPulse,
  Flame,
  Droplets,
  Layers,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export interface ResourceInventoryItem {
  id: string;
  itemName: string;
  category: string;
  quantity: number;
  isPacked: boolean;
  assignedTo: string;
}

interface ResourcesWorkspaceProps {
  hub: TripLogisticsHub;
  tripName?: string;
  onUpdateHub?: (hub: TripLogisticsHub) => void;
}

export function ResourcesWorkspace({ hub, tripName, onUpdateHub }: ResourcesWorkspaceProps) {
  const [items, setItems] = useState<ResourceInventoryItem[]>(
    hub.packing?.inventory?.map((i) => ({
      id: i.id,
      itemName: i.item,
      category: i.category,
      quantity: i.quantity,
      isPacked: i.packed,
      assignedTo: i.owner,
    })) || [
      { id: "inv_1", itemName: "High-Altitude Medical Trauma Kit", category: "Medical", quantity: 2, isPacked: true, assignedTo: "Dr. Ananya" },
      { id: "inv_2", itemName: "Satellite GPS Communicator & SOS Beacon", category: "Electronics", quantity: 1, isPacked: true, assignedTo: "Vikram Lead" },
      { id: "inv_3", itemName: "Thermal Base Layers & Waterproof Gore-Tex", category: "Clothing", quantity: 6, isPacked: false, assignedTo: "All Members" },
      { id: "inv_4", itemName: "Multi-Fuel Camping Stove & Cookware", category: "Campsite", quantity: 2, isPacked: true, assignedTo: "Rohan Camp" },
      { id: "inv_5", itemName: "Water Purification Tablets & Filter Pump", category: "Survival", quantity: 4, isPacked: true, assignedTo: "Sneha Ops" },
      { id: "inv_6", itemName: "Heavy Duty Tow Straps & Vehicle Winch Kit", category: "Transit", quantity: 1, isPacked: false, assignedTo: "Driver Convoy" },
    ]
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Gear");

  const categories = ["all", "Medical", "Electronics", "Clothing", "Campsite", "Survival", "Transit"];

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.assignedTo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === "all" || item.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCat;
  });

  const packedCount = items.filter((i) => i.isPacked).length;
  const progressPct = items.length > 0 ? Math.round((packedCount / items.length) * 100) : 0;

  const handleTogglePacked = (id: string) => {
    const updated = items.map((i) => (i.id === id ? { ...i, isPacked: !i.isPacked } : i));
    setItems(updated);
    toast.success("Packing inventory status updated.");
  };

  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    const newItem: ResourceInventoryItem = {
      id: `inv_${Date.now()}`,
      itemName: newItemName.trim(),
      category: newItemCategory,
      quantity: 1,
      isPacked: false,
      assignedTo: "Unassigned",
    };
    setItems([...items, newItem]);
    setNewItemName("");
    toast.success(`Added "${newItem.itemName}" to resource ledger.`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-3xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
            <Luggage className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Gear, Inventory & Resources Command
              </h2>
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 font-bold text-[10px] uppercase">
                {items.length} Tracked Items
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Mission-critical gear checklists, medical trauma supplies, campsite apparatus and convoy recovery tools
            </p>
          </div>
        </div>

        <div className="w-full sm:w-56 space-y-1.5 self-end sm:self-center">
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-slate-500">Readiness Score</span>
            <span className="text-emerald-600 font-mono">{progressPct}% Packed</span>
          </div>
          <Progress value={progressPct} className="h-2 rounded-full" />
          <span className="text-[10px] text-slate-400 block text-right">
            {packedCount} of {items.length} units confirmed
          </span>
        </div>
      </div>

      {/* Quick Add Form Bar */}
      <div className="p-4 rounded-2xl bg-card border border-slate-200/80 dark:border-slate-800/90 flex flex-col sm:flex-row items-center gap-3">
        <Input
          placeholder="Quick add item (e.g. VHF Radio / Carabiners)..."
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          className="h-10 text-xs rounded-xl"
        />
        <select
          value={newItemCategory}
          onChange={(e) => setNewItemCategory(e.target.value)}
          className="h-10 rounded-xl px-3 text-xs border border-slate-200/80 dark:border-slate-800 bg-background shrink-0"
        >
          {categories.filter((c) => c !== "all").map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          onClick={handleAddItem}
          className="rounded-xl text-xs font-bold h-10 px-4 shrink-0 bg-primary text-primary-foreground"
        >
          <Plus className="h-4 w-4 mr-1" /> Add Item
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Inventory Items List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            onClick={() => handleTogglePacked(item.id)}
            className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 flex items-center justify-between text-xs group ${
              item.isPacked
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-200 shadow-xs hover:border-emerald-500 hover:shadow-md hover:-translate-y-1"
                : "bg-card border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/60 hover:shadow-lg hover:-translate-y-1"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`h-5 w-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                  item.isPacked
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "border-slate-300 dark:border-slate-700 group-hover:border-emerald-500"
                }`}
              >
                {item.isPacked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
              </div>
              <div className="min-w-0">
                <p className={`font-bold truncate ${item.isPacked ? "text-emerald-700 dark:text-emerald-300" : "text-slate-900 dark:text-slate-100 group-hover:text-emerald-600"}`}>
                  {item.itemName}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                  <Badge variant="outline" className="text-[9px] py-0">
                    {item.category}
                  </Badge>
                  <span>Qty: {item.quantity}</span>
                  <span>•</span>
                  <span>Assigned: {item.assignedTo}</span>
                </div>
              </div>
            </div>

            <Badge
              className={`text-[9px] uppercase font-bold py-0.5 shrink-0 ${
                item.isPacked
                  ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500"
              }`}
            >
              {item.isPacked ? "Packed" : "Pending"}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
