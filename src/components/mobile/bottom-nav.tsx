"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  Users, 
  Receipt, 
  Bot, 
  FileText, 
  Bell 
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/groups", label: "Groups", icon: Users },
  { href: "/dashboard/transactions", label: "Expenses", icon: Receipt },
  { href: "/dashboard/ai", label: "AI Intel", icon: Bot },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile Navigation Bar"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 px-2 py-1.5 shadow-lg safe-area-bottom"
    >
      <div className="flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all active:scale-95 ${
                isActive
                  ? "text-primary font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="mobileActiveTab"
                  className="absolute inset-0 bg-primary/10 dark:bg-primary/20 rounded-xl"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <Icon className={`h-5 w-5 relative z-10 transition-transform ${isActive ? "text-primary stroke-[2.5] scale-110" : "stroke-[1.75]"}`} />
              <span className="text-[10px] mt-0.5 tracking-tight relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
