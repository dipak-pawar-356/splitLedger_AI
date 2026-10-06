/**
 * Enterprise Chained Automation Rules Engine
 * Evaluates event-driven rules: IF [Trigger + Condition] THEN [Action Chaining]
 */

export type AutomationTrigger =
  | "expense_created"
  | "budget_threshold"
  | "settlement_completed"
  | "monthly_report_ready";

export type AutomationAction =
  | "notify_admin"
  | "send_alert"
  | "email_finance"
  | "update_dashboard"
  | "sync_accounting";

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  condition: {
    field: "amount" | "budgetPercent" | "category";
    operator: "greater_than" | "equals" | "less_than";
    value: number | string;
  };
  actions: AutomationAction[];
}

export interface AutomationExecutionResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  executedActions: AutomationAction[];
  message: string;
  timestamp: string;
}

export const DEFAULT_AUTOMATION_RULES: AutomationRule[] = [
  {
    id: "rule_high_expense",
    name: "High Expense Alert (> ₹5000)",
    enabled: true,
    trigger: "expense_created",
    condition: { field: "amount", operator: "greater_than", value: 5000 },
    actions: ["notify_admin", "send_alert"],
  },
  {
    id: "rule_budget_critical",
    name: "Critical Budget Warning (>= 90%)",
    enabled: true,
    trigger: "budget_threshold",
    condition: { field: "budgetPercent", operator: "greater_than", value: 90 },
    actions: ["send_alert", "email_finance"],
  },
  {
    id: "rule_report_ready",
    name: "Monthly Report Finance Distribution",
    enabled: true,
    trigger: "monthly_report_ready",
    condition: { field: "category", operator: "equals", value: "all" },
    actions: ["email_finance", "update_dashboard"],
  },
];

/**
 * Evaluate event payload against configured automation rules
 */
export function evaluateAutomationRules(
  trigger: AutomationTrigger,
  data: { amount?: number; budgetPercent?: number; category?: string },
  customRules: AutomationRule[] = DEFAULT_AUTOMATION_RULES
): AutomationExecutionResult[] {
  const results: AutomationExecutionResult[] = [];

  const activeRules = customRules.filter((r) => r.enabled && r.trigger === trigger);

  for (const rule of activeRules) {
    let matched = false;

    if (rule.condition.field === "amount" && typeof data.amount === "number") {
      if (rule.condition.operator === "greater_than") {
        matched = data.amount > (rule.condition.value as number);
      } else if (rule.condition.operator === "less_than") {
        matched = data.amount < (rule.condition.value as number);
      }
    } else if (rule.condition.field === "budgetPercent" && typeof data.budgetPercent === "number") {
      if (rule.condition.operator === "greater_than") {
        matched = data.budgetPercent >= (rule.condition.value as number);
      }
    } else if (rule.condition.field === "category") {
      matched = rule.condition.value === "all" || rule.condition.value === data.category;
    }

    if (matched) {
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        matched: true,
        executedActions: rule.actions,
        message: `Triggered '${rule.name}': executing actions [${rule.actions.join(", ")}]`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return results;
}
