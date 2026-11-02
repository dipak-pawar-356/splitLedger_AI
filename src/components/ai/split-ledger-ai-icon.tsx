"use client";

import React from "react";

interface SplitLedgerAiIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
  variant?: "glyph" | "badge" | "outline";
}

/**
 * SplitLedger Financial Intelligence Glyph
 * 
 * An exclusive, custom-designed financial glyph for SplitLedger AI.
 * Represents:
 * - Structural Ledger Balance & Columns (Debit, Credit, Net Balance)
 * - Precision Analytical Nexus (Central Intelligence Diamond Node)
 * - Vault & Shield Contour of Financial Integrity
 * 
 * 100% original. Zero sparkles, stars, wands, swirls, or generic robot heads.
 */
export function SplitLedgerAiIcon({
  size = 20,
  className = "",
  variant = "glyph",
  ...props
}: SplitLedgerAiIconProps) {
  if (variant === "badge") {
    return (
      <div
        className={`relative inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-2 shadow-sm border border-indigo-500/20 text-indigo-400 ${className}`}
        style={{ width: typeof size === "number" ? size : undefined, height: typeof size === "number" ? size : undefined }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-full h-full text-indigo-300"
          {...props}
        >
          {/* Shield / Vault Ledger Contour */}
          <path d="M12 2.5L4.5 5.5v6.2c0 4.8 3.2 9.2 7.5 10.3 4.3-1.1 7.5-5.5 7.5-10.3V5.5L12 2.5z" />
          
          {/* Ledger Grid Balance Rows */}
          <path d="M8 8.5h8" strokeWidth="1.75" />
          <path d="M8 12.5h3.5" strokeWidth="1.75" />
          
          {/* Central Analytical Nexus Diamond */}
          <path
            d="M14.5 12.5l1.5-1.5 1.5 1.5-1.5 1.5-1.5-1.5z"
            fill="currentColor"
            fillOpacity="0.4"
          />
          
          {/* Base Ledger Settlement Line */}
          <path d="M8 16.5h5" strokeWidth="1.75" />
        </svg>
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
      </div>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
      {...props}
    >
      {/* Outer Hexagonal Financial Vault Contour */}
      <path d="M12 2.5L4.5 5.5v6.2c0 4.8 3.2 9.2 7.5 10.3 4.3-1.1 7.5-5.5 7.5-10.3V5.5L12 2.5z" />
      
      {/* Precision Ledger Entry Tracks */}
      <path d="M8 8.5h8" />
      <path d="M8 12.5h3.5" />
      
      {/* Diamond Intelligence Node (Audit / Allocation Anchor) */}
      <path
        d="M14.5 12.5l1.5-1.5 1.5 1.5-1.5 1.5-1.5-1.5z"
        fill="currentColor"
        fillOpacity="0.35"
      />
      
      {/* Settlement Row */}
      <path d="M8 16.5h5" />
    </svg>
  );
}

/**
 * SplitLedger Precision Financial Monogram (SL + Compass)
 * Alternate glyph for micro badges, buttons, and avatar headers
 */
export function SplitLedgerMonogramGlyph({
  size = 20,
  className = "",
  ...props
}: React.SVGProps<SVGSVGElement> & { size?: number | string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
      {...props}
    >
      {/* Ledger Column Book Spine */}
      <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
      {/* Vertical General Ledger Partition */}
      <line x1="8.5" y1="3.5" x2="8.5" y2="20.5" />
      {/* Intelligent Allocation Tracks */}
      <line x1="12" y1="8" x2="17" y2="8" />
      <line x1="12" y1="12" x2="15" y2="12" />
      {/* Central Analytical Diamond */}
      <circle cx="17" cy="12" r="1.25" fill="currentColor" />
      <line x1="12" y1="16" x2="17" y2="16" />
    </svg>
  );
}

