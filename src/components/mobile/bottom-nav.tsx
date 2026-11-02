"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  Users, 
  ReceiptIndianRupee, 
  Bot, 
  FileText, 
  Bell 
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/groups", label: "Groups", icon: Users },
  { href: "/dashboard/transactions", label: "Expenses", icon: ReceiptIndianRupee },
  { href: "/dashboard/ai", label: "AI Intel", icon: Bot },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile Navigation Bar"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 px-1.5 py-1 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.3)] safe-area-bottom select-none"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={`relative flex flex-col items-center justify-center min-h-[44px] py-1 px-2.5 rounded-xl transition-all duration-150 active:scale-90 ${
                isActive
                  ? "text-primary font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="mobileActiveTab"
                  className="absolute inset-0 bg-primary/10 dark:bg-primary/20 rounded-xl"
                  transition={{ type: "spring", stiffness: 450, damping: 30 }}
                />
              )}
              <Icon className={`h-5 w-5 relative z-10 transition-transform ${isActive ? "text-primary stroke-[2.5] scale-110" : "stroke-[1.75]"}`} />
              <span className="text-[10px] mt-0.5 tracking-tight font-medium relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
