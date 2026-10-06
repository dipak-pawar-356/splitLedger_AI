import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  iconColor?: string;
  customIcon?: ReactNode;
  description?: ReactNode;
  className?: string;
  valueClassName?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatCard({
  title,
  value,
  icon: Icon,
  iconColor = "text-slate-600 dark:text-slate-400",
  customIcon,
  description,
  className = "",
  valueClassName = "",
  trend,
}: StatCardProps) {
  return (
    <Card className={`card-lift group cursor-pointer border border-slate-200/80 dark:border-slate-800 ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
          {title}
        </CardTitle>
        {customIcon ? (
          customIcon
        ) : Icon ? (
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 ${valueClassName}`}>
          <AnimatedCounter value={value} />
        </div>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {description}
          </p>
        )}
        {trend && (
          <div className="flex items-center gap-1.5 mt-2">
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md transition-all ${
                trend.isPositive
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 shadow-xs"
                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40 shadow-xs"
              }`}
            >
              {trend.isPositive ? (
                <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <TrendingDown className="h-3 w-3 text-rose-600 dark:text-rose-400" />
              )}
              {trend.isPositive ? "+" : "-"}
              {Math.abs(trend.value)}%
            </span>
            <span className="text-[10px] text-slate-400">from last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
