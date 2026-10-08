"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  History, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  UserCheck, 
  CalendarPlus 
} from "lucide-react";
import { activateMemberExpenseParticipationAction } from "@/actions/group-join-requests";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface InactiveMember {
  id: number;
  userId?: number | null;
  name: string;
  email?: string | null;
  role?: string;
}

interface ExpenseActivationPromptCardProps {
  groupId: number;
  inactiveMembers: InactiveMember[];
  isOwner: boolean;
}

export function ExpenseActivationPromptCard({
  groupId,
  inactiveMembers,
  isOwner,
}: ExpenseActivationPromptCardProps) {
  const router = useRouter();
  const [loadingMemberId, setLoadingMemberId] = useState<number | null>(null);
  const [activeDecision, setActiveDecision] = useState<"included" | "excluded" | null>(null);

  if (!isOwner || inactiveMembers.length === 0) {
    return null;
  }

  const handleActivate = async (memberUserId: number, decision: "included" | "excluded") => {
    try {
      setLoadingMemberId(memberUserId);
      setActiveDecision(decision);

      const res = await activateMemberExpenseParticipationAction({
        groupId,
        memberUserId,
        decision,
      });

      if (res.success) {
        toast.success(
          decision === "included"
            ? `Activated with historical expenses! Redistributed ${res.redistributedCount} group expenses.`
            : "Activated for new expenses only! Past expenses preserved."
        );
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to configure member expense participation");
    } finally {
      setLoadingMemberId(null);
      setActiveDecision(null);
    }
  };

  return (
    <Card className="border-indigo-200 dark:border-indigo-900 bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-blue-50/70 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-blue-950/40 shadow-md rounded-2xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-indigo-100 dark:border-indigo-900/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-sm">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Expense Activation Decision Required</span>
                <Badge variant="outline" className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 border-indigo-300">
                  {inactiveMembers.length} {inactiveMembers.length === 1 ? "Member" : "Members"}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                The following members are approved but Expense Inactive. As Group Owner, select their participation model to activate them.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {inactiveMembers.map((member) => {
          if (!member.userId) return null;
          const isProcessing = loadingMemberId === member.userId;

          return (
            <div
              key={member.id}
              className="p-4 bg-white dark:bg-slate-900/90 rounded-xl border border-indigo-100 dark:border-indigo-900/70 shadow-sm space-y-3.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {member.name}
                    </div>
                    {member.email && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {member.email}
                      </div>
                    )}
                  </div>
                </div>

                <Badge variant="outline" className="bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 w-fit text-xs">
                  Expense Inactive
                </Badge>
              </div>

              {/* Option A & Option B selection buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {/* Option A */}
                <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 flex flex-col justify-between space-y-3 hover:border-indigo-300 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-600 text-white">
                        Option A
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Include in Previous Expenses
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                      Redistribute historical group expenses to include {member.name}. Recalculates member shares, group balances, and updated settlements automatically.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
                    disabled={isProcessing}
                    onClick={() => handleActivate(member.userId!, "included")}
                  >
                    {isProcessing && activeDecision === "included" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <History className="w-3.5 h-3.5" />
                    )}
                    <span>Option A: Include & Recalculate</span>
                  </Button>
                </div>

                {/* Option B */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex flex-col justify-between space-y-3 hover:border-slate-300 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-600 text-white">
                        Option B
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Start From New Expenses Only
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                      Exclude {member.name} from all previous expenses (past share is ₹0). Existing balances and settlements are fully preserved. Member participates only going forward.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold gap-1.5"
                    disabled={isProcessing}
                    onClick={() => handleActivate(member.userId!, "excluded")}
                  >
                    {isProcessing && activeDecision === "excluded" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CalendarPlus className="w-3.5 h-3.5" />
                    )}
                    <span>Option B: Start from New Only</span>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
