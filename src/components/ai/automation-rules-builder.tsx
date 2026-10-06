"use client";

import { useState, useEffect } from "react";
import {
  AutomationRule,
  AutomationTrigger,
  AutomationAction,
  DEFAULT_AUTOMATION_RULES,
} from "@/lib/ai/automation-engine";
import {
  getAutomationRules,
  saveAutomationRule,
  toggleAutomationRule,
  deleteAutomationRule,
  getAutomationLogs,
  AutomationLogItem,
} from "@/actions/automation-rules";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Zap,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  History,
  ShieldCheck,
  AlertCircle,
  Copy,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

export function AutomationRulesBuilder() {
  const [rules, setRules] = useState<AutomationRule[]>(DEFAULT_AUTOMATION_RULES);
  const [logs, setLogs] = useState<AutomationLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"rules" | "logs">("rules");

  // Form State
  const [formName, setFormName] = useState("");
  const [formTrigger, setFormTrigger] = useState<AutomationTrigger>("expense_created");
  const [formField, setFormField] = useState<"amount" | "budgetPercent" | "category">("amount");
  const [formOperator, setFormOperator] = useState<"greater_than" | "equals" | "less_than">("greater_than");
  const [formValue, setFormValue] = useState<string>("5000");
  const [formActions, setFormActions] = useState<AutomationAction[]>(["send_alert"]);

  // Fetch live rules & logs
  useEffect(() => {
    async function loadData() {
      try {
        const [fetchedRules, fetchedLogs] = await Promise.all([
          getAutomationRules(),
          getAutomationLogs(),
        ]);
        setRules(fetchedRules);
        setLogs(fetchedLogs);
      } catch {
        // fallback
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleToggle = async (ruleId: string, currentEnabled: boolean) => {
    const nextEnabled = !currentEnabled;
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: nextEnabled } : r))
    );
    try {
      await toggleAutomationRule(ruleId, nextEnabled);
      toast.success(nextEnabled ? "Rule activated" : "Rule paused");
    } catch {
      toast.error("Failed to update rule status");
    }
  };

  const handleDelete = async (ruleId: string) => {
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
    try {
      await deleteAutomationRule(ruleId);
      toast.success("Rule deleted");
    } catch {
      toast.error("Failed to delete rule");
    }
  };

  const handleDuplicate = async (rule: AutomationRule) => {
    const duplicate: AutomationRule = {
      ...rule,
      id: `rule_${Date.now()}`,
      name: `${rule.name} (Copy)`,
    };
    try {
      const res = await saveAutomationRule(duplicate);
      if (res.success) {
        setRules(res.rules);
        toast.success("Rule duplicated");
      }
    } catch {
      toast.error("Failed to duplicate rule");
    }
  };

  const handleActionToggle = (action: AutomationAction) => {
    setFormActions((prev) =>
      prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action]
    );
  };

  const handleSaveNewRule = async () => {
    if (!formName.trim()) {
      toast.error("Please provide a rule name");
      return;
    }
    if (formActions.length === 0) {
      toast.error("Please select at least one action");
      return;
    }

    const newRule: AutomationRule = {
      id: `rule_${Date.now()}`,
      name: formName.trim(),
      enabled: true,
      trigger: formTrigger,
      condition: {
        field: formField,
        operator: formOperator,
        value: formField === "category" ? formValue : parseFloat(formValue) || 0,
      },
      actions: formActions,
    };

    try {
      const res = await saveAutomationRule(newRule);
      if (res.success) {
        setRules(res.rules);
        setIsDialogOpen(false);
        setFormName("");
        setFormValue("5000");
        toast.success(`Rule "${newRule.name}" created and active!`);
      }
    } catch {
      toast.error("Failed to save new rule");
    }
  };

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card overflow-hidden">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Zap className="h-5 w-5 text-amber-500" />
              <span>Chained Financial Automation Rules Engine</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Event-driven automation rules: IF [Trigger + Condition] THEN [Action Chaining] across your ledger
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Tab switch */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab("rules")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "rules"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Rules ({rules.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("logs")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "logs"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Logs ({logs.length})
              </button>
            </div>

            <Button
              size="sm"
              onClick={() => setIsDialogOpen(true)}
              className="rounded-xl text-xs font-bold gap-1.5 bg-primary h-8"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Rule</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {activeTab === "rules" ? (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {rule.name}
                    </span>
                    <Badge
                      variant={rule.enabled ? "default" : "secondary"}
                      className={`text-[10px] font-bold ${
                        rule.enabled
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                      }`}
                    >
                      {rule.enabled ? "ACTIVE" : "PAUSED"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {rule.trigger.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>

                  <p className="text-slate-600 dark:text-slate-400 font-mono text-[11px] bg-background/60 px-2.5 py-1 rounded-lg border inline-block">
                    IF [{rule.trigger}] & {rule.condition.field}{" "}
                    {rule.condition.operator === "greater_than"
                      ? ">"
                      : rule.condition.operator === "less_than"
                      ? "<"
                      : "="}{" "}
                    {rule.condition.value} → THEN [{rule.actions.join(" + ")}]
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-xs h-8 px-3"
                    onClick={() => handleToggle(rule.id, rule.enabled)}
                  >
                    {rule.enabled ? "Pause" : "Enable"}
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-xl h-8 w-8 text-slate-400 hover:text-slate-700"
                    onClick={() => handleDuplicate(rule)}
                    title="Duplicate"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-xl h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                    onClick={() => handleDelete(rule.id)}
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {logs.length > 0 ? (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-background flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="font-bold text-slate-900 dark:text-slate-100">{log.ruleName}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {log.trigger}
                      </Badge>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px]">{log.message}</p>
                    <div className="flex items-center gap-1 pt-1">
                      {log.actions.map((act, i) => (
                        <span key={i} className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-mono">
                          {act}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No automation events recorded yet.
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Create Rule Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span>Create Chained Automation Rule</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Define the event trigger, condition thresholds, and resulting automated actions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            {/* Rule Name */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Rule Name</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Alert when Dining Expense > ₹3,000"
                className="rounded-xl text-xs h-10"
              />
            </div>

            {/* Trigger Dropdown */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Event Trigger</label>
              <select
                value={formTrigger}
                onChange={(e) => setFormTrigger(e.target.value as AutomationTrigger)}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs font-semibold focus:outline-none"
              >
                <option value="expense_created">Expense Created</option>
                <option value="budget_threshold">Budget Threshold Reached</option>
                <option value="settlement_completed">Settlement Completed</option>
                <option value="monthly_report_ready">Monthly Report Ready</option>
              </select>
            </div>

            {/* Condition: Field, Operator, Value */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Condition</label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={formField}
                  onChange={(e) => setFormField(e.target.value as any)}
                  className="h-10 px-2 rounded-xl border border-input bg-background text-xs font-semibold focus:outline-none"
                >
                  <option value="amount">Amount (₹)</option>
                  <option value="budgetPercent">Budget (%)</option>
                  <option value="category">Category</option>
                </select>

                <select
                  value={formOperator}
                  onChange={(e) => setFormOperator(e.target.value as any)}
                  className="h-10 px-2 rounded-xl border border-input bg-background text-xs font-semibold focus:outline-none"
                >
                  <option value="greater_than">Greater than (&gt;)</option>
                  <option value="equals">Equals (=)</option>
                  <option value="less_than">Less than (&lt;)</option>
                </select>

                <Input
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  placeholder="5000"
                  className="rounded-xl text-xs h-10"
                />
              </div>
            </div>

            {/* Action Chaining */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Action Chaining (Select all that apply)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "notify_admin", label: "Notify Administrator" },
                  { key: "send_alert", label: "Dispatch Push Alert" },
                  { key: "email_finance", label: "Email Finance Summary" },
                  { key: "update_dashboard", label: "Sync Dashboard Tiles" },
                  { key: "sync_accounting", label: "Export to Accounting" },
                ].map((act) => (
                  <button
                    key={act.key}
                    type="button"
                    onClick={() => handleActionToggle(act.key as AutomationAction)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                      formActions.includes(act.key as AutomationAction)
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-background border-slate-200 dark:border-slate-800 text-slate-600"
                    }`}
                  >
                    {act.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="rounded-xl text-xs font-bold bg-primary text-primary-foreground"
              onClick={handleSaveNewRule}
            >
              Save & Activate Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
