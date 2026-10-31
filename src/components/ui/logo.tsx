import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
  withGlow?: boolean;
}

/**
 * SplitLedger AI Official Logo
 * Bespoke geometric financial emblem combining:
 * 1. Dual balanced ledger wings (Personal & Shared balances)
 * 2. Precision diagonal split trajectory
 * 3. Central reconciliation core node (Instant Settlement)
 * 4. Micro-ledger precision ticks
 */
export function SplitLedgerLogo({
  size = 28,
  className,
  withGlow = false,
  ...props
}: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 select-none", withGlow && "filter drop-shadow-[0_2px_8px_rgba(99,102,241,0.4)]", className)}
      aria-label="SplitLedger AI Logo"
      {...props}
    >
      <defs>
        {/* Left Wing Gradient (Primary Indigo to Violet) */}
        <linearGradient id="sl_left_wing" x1="6" y1="8" x2="24" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4338CA" />
        </linearGradient>

        {/* Right Wing Gradient (Vibrant Cyan to Teal) */}
        <linearGradient id="sl_right_wing" x1="24" y1="8" x2="42" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0EA5E9" />
        </linearGradient>

        {/* Central Split Node Gradient (Emerald Reconciled Core) */}
        <linearGradient id="sl_node_grad" x1="20" y1="20" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>

        {/* Subtle Ambient Glow Fill */}
        <radialGradient id="sl_core_glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6366F1" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Ambient Depth Background Circle */}
      <circle cx="24" cy="24" r="22" fill="url(#sl_core_glow)" />

      {/* Left Ledger Wing (Personal Credit / Account Card) */}
      <path
        d="M8 12C8 9.79086 9.79086 8 12 8H21C22.1046 8 23 8.89543 23 10V33.5C23 34.6046 22.1046 35.5 21 35.5H12C9.79086 35.5 8 33.7091 8 31.5V12Z"
        fill="url(#sl_left_wing)"
      />
      {/* Left Wing Internal Ledger Lines */}
      <rect x="12" y="14" width="7" height="2" rx="1" fill="#FFFFFF" fillOpacity="0.9" />
      <rect x="12" y="19" width="5" height="1.5" rx="0.75" fill="#E0E7FF" fillOpacity="0.7" />
      <rect x="12" y="23.5" width="6" height="1.5" rx="0.75" fill="#C7D2FE" fillOpacity="0.6" />
      <rect x="12" y="29" width="7" height="2" rx="1" fill="#FFFFFF" fillOpacity="0.8" />

      {/* Right Ledger Wing (Shared Split / Counterparty Card) */}
      <path
        d="M25 12.5C25 11.3954 25.8954 10.5 27 10.5H36C38.2091 10.5 40 12.2909 40 14.5V36C40 38.2091 38.2091 40 36 40H27C25.8954 40 25 39.1046 25 38V12.5Z"
        fill="url(#sl_right_wing)"
      />
      {/* Right Wing Internal Ledger Lines */}
      <rect x="29" y="16.5" width="7" height="2" rx="1" fill="#FFFFFF" fillOpacity="0.9" />
      <rect x="29" y="21.5" width="5" height="1.5" rx="0.75" fill="#E0F2FE" fillOpacity="0.7" />
      <rect x="29" y="26" width="6" height="1.5" rx="0.75" fill="#BAE6FD" fillOpacity="0.6" />
      <rect x="29" y="32" width="7" height="2" rx="1" fill="#FFFFFF" fillOpacity="0.8" />

      {/* Precision Dynamic Split Rail (Inter-ledger balance channel) */}
      <path
        d="M20 7L28 41"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeOpacity="0.95"
      />

      {/* Central Intelligent Settlement Core (Reconciliation Orb) */}
      <circle cx="24" cy="24" r="5" fill="#FFFFFF" />
      <circle cx="24" cy="24" r="3.5" fill="url(#sl_node_grad)" />
      <circle cx="23" cy="23" r="1.2" fill="#FFFFFF" fillOpacity="0.85" />
    </svg>
  );
}

interface SplitLedgerBrandProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
  onClick?: () => void;
}

export function SplitLedgerBrand({
  size = "md",
  showText = true,
  className,
  onClick,
}: SplitLedgerBrandProps) {
  const iconSizes = {
    sm: 22,
    md: 26,
    lg: 32,
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base sm:text-lg",
    lg: "text-xl sm:text-2xl",
  };

  const pillPadding = {
    sm: "p-1 rounded-lg",
    md: "p-1.5 rounded-xl",
    lg: "p-2 rounded-2xl",
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 min-w-0 transition-all select-none group",
        onClick && "cursor-pointer",
        className
      )}
    >
      <div
        className={cn(
          "bg-gradient-to-br from-indigo-500/15 via-blue-500/10 to-teal-500/10 dark:from-indigo-950/60 dark:to-blue-950/60 border border-indigo-500/30 dark:border-indigo-500/40 shadow-xs flex items-center justify-center transition-all duration-200 group-hover:scale-105 group-hover:border-indigo-400 group-hover:shadow-md group-hover:shadow-indigo-500/20",
          pillPadding[size]
        )}
      >
        <SplitLedgerLogo size={iconSizes[size]} withGlow />
      </div>

      {showText && (
        <span
          className={cn(
            "font-extrabold tracking-tight truncate text-slate-900 dark:text-slate-100 flex items-center antialiased",
            textSizes[size]
          )}
        >
          <span>SplitLedger</span>
          <span className="text-primary text-[10px] sm:text-xs font-black px-1.5 py-0.5 rounded-md bg-primary/10 ml-1.5 border border-primary/20 shadow-2xs">
            AI
          </span>
        </span>
      )}
    </div>
  );
}
