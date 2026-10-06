"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

interface AnimatedCounterProps {
  value: number | string;
  prefix?: string;
  suffix?: string;
  duration?: number; // duration in seconds
  className?: string;
}

export function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  duration = 0.8,
  className = "",
}: AnimatedCounterProps) {
  const shouldReduceMotion = useReducedMotion();

  // Robust detection of sign, currency prefix, and numeric magnitude
  let isNegative = false;
  let isExplicitPositive = false;
  let numericTarget = 0;
  let detectedPrefix = prefix;
  let detectedSuffix = suffix;
  let hasDecimals = false;

  const rawStr = String(value).trim();
  if (rawStr.startsWith("-")) {
    isNegative = true;
  } else if (rawStr.startsWith("+")) {
    isExplicitPositive = true;
  }

  if (typeof value === "number") {
    numericTarget = Math.abs(value);
    hasDecimals = !Number.isInteger(value);
  } else {
    // Check decimals
    hasDecimals = rawStr.includes(".");

    // Extract currency symbol if present
    const currencyMatch = rawStr.match(/([₹$€£¥A-Za-z]+)/);
    if (currencyMatch && !prefix) {
      detectedPrefix = currencyMatch[1];
    }

    // Extract clean digits and decimal
    const cleanNumStr = rawStr.replace(/[^0-9.]/g, "");
    numericTarget = Math.abs(parseFloat(cleanNumStr) || 0);
  }

  const [displayValue, setDisplayValue] = useState<number>(0);
  const startTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    let animationFrameId: number;
    const startValue = 0;
    const endValue = numericTarget;
    const durationMs = (duration || 0.7) * 1000;

    const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

    const step = (timestamp: number) => {
      if (!startTimestampRef.current) startTimestampRef.current = timestamp;
      const progress = Math.min((timestamp - startTimestampRef.current) / durationMs, 1);
      const easedProgress = easeOutCubic(progress);

      const current = startValue + (endValue - startValue) * easedProgress;
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(endValue);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
      startTimestampRef.current = null;
    };
  }, [numericTarget, duration]);

  const formattedValue = hasDecimals
    ? displayValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Math.round(displayValue).toLocaleString();

  const signStr = isNegative ? "-" : isExplicitPositive ? "+" : "";

  return (
    <span className={`tabular-nums transition-colors ${className}`}>
      {signStr}
      {detectedPrefix}
      {formattedValue}
      {detectedSuffix}
    </span>
  );
}
