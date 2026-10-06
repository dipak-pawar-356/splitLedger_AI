/**
 * Budget Planning, Savings Goals & Spending Control Types
 */

export type BudgetPeriod = "daily" | "weekly" | "monthly" | "yearly" | "custom";
export type BudgetStatus = "active" | "paused" | "completed" | "archived";
export type BudgetType = 
  | "personal"
  | "category"
  | "monthly"
  | "weekly"
  | "yearly"
  | "trip"
  | "group"
  | "organization"
  | "project"
  | "custom";
export type GoalPriority = "high" | "medium" | "low";

export interface BudgetRecord {
  id: string; // Random 16-char ID (bud_...)
  userId: number;
  groupId?: number;
  orgId?: string;
  linkedTripId?: string;
  linkedSavingsGoalId?: string;
  name: string;
  description?: string;
  category: string;
  budgetType: BudgetType;
  period: BudgetPeriod;
  allocatedAmount: number; // in rupees
  spentAmount: number; // in rupees
  remainingAmount: number; // in rupees
  percentageUsed: number; // e.g. 75%
  currency: string; // Default: INR
  status: BudgetStatus;
  priority?: GoalPriority;
  color?: string;
  tags?: string[];
  notes?: string;
  startDate: string;
  endDate?: string;
  alertThresholds: Array<{ percent: number; triggered: boolean }>;
  createdAt: string;
  updatedAt?: string;
}

export interface SavingsGoal {
  id: string; // Random 16-char ID (goal_...)
  userId: number;
  name: string;
  targetAmount: number; // in rupees
  currentSaved: number; // in rupees
  remainingAmount: number; // in rupees
  progressPercent: number; // 0 - 100
  targetDate: string;
  priority: GoalPriority;
  category: string;
  currency: string; // Default: INR
  status: "in_progress" | "achieved";
  notes?: string;
  createdAt: string;
}

export interface SpendingLimit {
  id: string; // Random 16-char ID (lim_...)
  userId: number;
  period: "daily" | "weekly" | "monthly" | "yearly";
  limitAmount: number; // in rupees
  currentSpend: number; // in rupees
  category?: string;
  tripId?: string;
  groupId?: number;
  orgId?: string;
  alertPercent?: number; // default 80
  isStrict: boolean;
  isExceeded: boolean;
}

export interface BudgetForecast {
  projectedMonthlySpend: number;
  exhaustionDate: string | null;
  remainingDailyBudget: number;
  averageDailyBurn: number;
  isOverBudgetRisk: boolean;
}

export interface BudgetAuditLog {
  id: string;
  budgetId: string;
  action: "created" | "updated" | "deleted" | "archived" | "restored" | "limit_changed" | "savings_transferred";
  userId: number;
  details: string;
  timestamp: string;
}

export interface BudgetDashboardMetrics {
  totalBudgetAllocated: number; // in rupees
  totalSpent: number; // in rupees
  totalRemaining: number; // in rupees
  overallUsagePercent: number;
  activeSavingsGoalsCount: number;
  totalSavedAcrossGoals: number;
  currency: string;
  budgets: BudgetRecord[];
  savingsGoals: SavingsGoal[];
  spendingLimits: SpendingLimit[];
  forecast?: BudgetForecast;
}
