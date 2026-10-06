"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Receipt,
  Wallet,
  Settings,
  Sparkles,
  BarChart3,
  Bell,
  X,
  PiggyBank,
  HandCoins,
  Compass,
  StickyNote,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useSidebar } from "@/components/layout/sidebar-context";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Contacts", href: "/dashboard/contacts", icon: Users },
  { name: "Transactions", href: "/dashboard/transactions", icon: Receipt },
  { name: "Groups", href: "/dashboard/groups", icon: Users },
  { name: "Trips & Events", href: "/dashboard/trips", icon: Compass },
  { name: "Budgets", href: "/dashboard/budgets", icon: PiggyBank },
  { name: "Loans & Debt", href: "/dashboard/loans", icon: HandCoins },
  { name: "Settlements", href: "/dashboard/settlements", icon: Wallet },
  { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
  { name: "Notes & Journal", href: "/dashboard/notes", icon: StickyNote },
  { name: "AI Assistant", href: "/dashboard/ai", icon: Sparkles },
  { name: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { name: "Profile", href: "/dashboard/profile", icon: Users },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggleCollapsed, isMobileOpen, closeMobile } = useSidebar();

  return (
    <>
      {/* Overlay Backdrop for Mobile & Tablet */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity duration-300"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 ease-in-out",
          // Desktop collapsed vs expanded widths
          isCollapsed ? "lg:w-20" : "lg:w-64",
          // Mobile & Tablet off-canvas slide-over
          isMobileOpen
            ? "translate-x-0 w-72 shadow-2xl"
            : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header Branding & Collapse Control */}
        <div
          className={cn(
            "p-4 border-b border-slate-200 dark:border-slate-800 flex items-center h-16 shrink-0 transition-all",
            isCollapsed ? "lg:justify-center lg:px-2" : "justify-between"
          )}
        >
          <Link
            href="/dashboard"
            onClick={closeMobile}
            className={cn(
              "flex items-center gap-2.5 min-w-0 transition-opacity",
              isCollapsed && "lg:justify-center"
            )}
            title="SplitLedger AI"
          >
            <div className="p-1.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <span className="text-lg font-bold tracking-tight truncate text-slate-900 dark:text-slate-100">
                SplitLedger <span className="text-primary text-xs font-semibold px-1.5 py-0.5 rounded-md bg-primary/10 ml-0.5">AI</span>
              </span>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            type="button"
            onClick={toggleCollapsed}
            className={cn(
              "hidden lg:flex items-center justify-center p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
              isCollapsed && "mt-2"
            )}
            title={isCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>

          {/* Mobile & Tablet Close Button */}
          <button
            type="button"
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            onClick={closeMobile}
            aria-label="Close navigation drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-none">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={closeMobile}
                title={isCollapsed ? item.name : undefined}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors group relative",
                  isCollapsed ? "lg:justify-center lg:px-2" : "",
                  isActive
                    ? "text-white font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeSidebarPill"
                    className="absolute inset-0 bg-primary rounded-xl shadow-xs"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <item.icon className={cn("h-4.5 w-4.5 shrink-0 relative z-10 transition-transform duration-200 group-hover:scale-110", isActive && "text-white")} />
                
                {/* Text Label */}
                {(!isCollapsed || isMobileOpen) && (
                  <span className="truncate text-xs tracking-tight relative z-10">{item.name}</span>
                )}

                {/* Desktop Collapsed Tooltip on Hover */}
                {isCollapsed && !isMobileOpen && (
                  <div className="hidden lg:group-hover:flex absolute left-full ml-2 px-2.5 py-1 bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold rounded-lg whitespace-nowrap shadow-lg z-50 pointer-events-none items-center">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer with Collapse Toggle on Desktop */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 hidden lg:block">
          <button
            type="button"
            onClick={toggleCollapsed}
            className={cn(
              "w-full flex items-center gap-2 p-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all",
              isCollapsed && "justify-center px-0"
            )}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                <span>Collapse Sidebar</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
