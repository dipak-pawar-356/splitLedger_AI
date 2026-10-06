"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

interface DashboardHeaderProps {
  user: {
    name: string;
    avatar?: string | null;
    profileCompletion: number;
  };
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const [greeting, setGreeting] = useState("Welcome back");
  const [currentDateStr, setCurrentDateStr] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    const dateOptions: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    setCurrentDateStr(new Date().toLocaleDateString("en-IN", dateOptions));
  }, []);

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
      {/* User Info with Avatar, Greeting, Verification & Date */}
      <div className="flex items-center gap-3.5 min-w-0">
        <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border-2 border-primary/20 shadow-sm shrink-0">
          <AvatarImage src={user.avatar || undefined} alt={user.name} />
          <AvatarFallback className="text-base font-bold bg-primary text-white">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 truncate">
              {greeting}, <span className="text-primary">{user.name}</span>
            </h1>
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold gap-1 px-2 py-0.5 shrink-0">
              <CheckCircle2 className="h-3 w-3" />
              Verified
            </Badge>
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>{currentDateStr || "Today"}</span>
          </p>
        </div>
      </div>

      {/* Profile Completion Indicator Pill */}
      <Link
        href="/dashboard/profile"
        className="self-start sm:self-center shrink-0 p-2.5 sm:px-4 sm:py-2.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 hover:border-primary/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-3 group shadow-xs"
      >
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3 text-[11px]">
            <span className="font-semibold text-slate-600 dark:text-slate-300">Profile Completion</span>
            <span className="font-black text-primary">{user.profileCompletion}%</span>
          </div>
          <div className="w-28 sm:w-32 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
              style={{ width: `${user.profileCompletion}%` }}
            />
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </Link>
    </div>
  );
}
