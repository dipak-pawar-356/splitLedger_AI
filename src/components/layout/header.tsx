"use client";

import GlobalSearch from "@/components/global-search";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { ProfileMenu } from "@/components/profile-menu";
import Link from "next/link";
import { Sparkles, Menu } from "lucide-react";
import { useSidebar } from "@/components/layout/sidebar-context";

export function Header() {
  const { toggleMobileOpen } = useSidebar();

  return (
    <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between px-3 sm:px-4 md:px-6 sticky top-0 z-30">
      {/* Mobile Menu Trigger & Global Search */}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 max-w-md">
        <button
          type="button"
          onClick={toggleMobileOpen}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link href="/dashboard" className="lg:hidden flex items-center gap-1.5 shrink-0 mr-1">
          <div className="p-1 rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="font-bold text-xs tracking-tight text-slate-900 dark:text-slate-100">
            SplitLedger <span className="text-primary text-[9px] font-bold px-1 py-0.2 rounded bg-primary/10">AI</span>
          </span>
        </Link>

        <GlobalSearch />
      </div>

      {/* Shared Action Bar */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        <ThemeToggle />
        <NotificationBell />
        <ProfileMenu />
      </div>
    </header>
  );
}
