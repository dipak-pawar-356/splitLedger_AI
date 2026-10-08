"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  UserPlus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Sparkles, 
  AlertCircle,
  Loader2,
  ShieldCheck,
  Check
} from "lucide-react";
import { approveJoinRequestAction, rejectJoinRequestAction } from "@/actions/group-join-requests";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export interface PendingJoinRequestItem {
  id: number;
  publicId: string;
  userId: number;
  status: string;
  createdAt: Date;
  userName: string | null;
  userEmail: string;
  userUpiId: string | null;
}

interface PendingJoinRequestsCardProps {
  groupId: number;
  groupPublicId: string;
  isOwner: boolean;
  canApprove?: boolean;
  initialRequests: PendingJoinRequestItem[];
  inTab?: boolean;
}

export function PendingJoinRequestsCard({
  groupId,
  groupPublicId,
  isOwner,
  canApprove = false,
  initialRequests,
  inTab = false,
}: PendingJoinRequestsCardProps) {
  const router = useRouter();
  const [requests, setRequests] = useState<PendingJoinRequestItem[]>(initialRequests);
  
  // Track selected decision per request ID: "included" | "excluded" | null
  const [decisions, setDecisions] = useState<Record<number, "included" | "excluded">>({});
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<number, string>>({});

  const hasApprovalAuthority = isOwner || canApprove;

  if (!hasApprovalAuthority) {
    return null;
  }

  if (requests.length === 0) {
    if (!inTab) return null;
    return (
      <Card className="rounded-3xl border-slate-200 dark:border-slate-800 bg-card p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">No Pending Join Requests</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          All member join requests for this group have been reviewed and approved. New requests will appear here.
        </p>
      </Card>
    );
  }

  const handleSelectDecision = (requestId: number, decision: "included" | "excluded") => {
    setDecisions((prev) => ({ ...prev, [requestId]: decision }));
    setValidationErrors((prev) => {
      const next = { ...prev };
      delete next[requestId];
      return next;
    });
  };

  const handleApprove = async (req: PendingJoinRequestItem) => {
    const decision = decisions[req.id];

    // REQUIREMENT 6 & 7: Mandatory participation decision validation
    if (!decision) {
      const errorMsg = "Please choose how this member should participate in group expenses before approving.";
      setValidationErrors((prev) => ({ ...prev, [req.id]: errorMsg }));
      toast.error(errorMsg);
      return;
    }

    setSubmittingId(req.id);
    try {
      const res = await approveJoinRequestAction({
        requestId: req.id,
        participationDecision: decision,
      });

      if (res.success) {
        if (decision === "included") {
          toast.success(
            `Approved ${req.userName || req.userEmail}. Member included in previous expenses; shares and settlements recalculated.`
          );
        } else {
          toast.success(
            `Approved ${req.userName || req.userEmail}. Member will participate from new expenses only.`
          );
        }

        setRequests((prev) => prev.filter((r) => r.id !== req.id));
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve join request");
    } finally {
      setSubmittingId(null);
    }
  };

  const handleReject = async (req: PendingJoinRequestItem) => {
    if (!confirm(`Are you sure you want to reject the join request from ${req.userName || req.userEmail}?`)) {
      return;
    }

    setRejectingId(req.id);
    try {
      const res = await rejectJoinRequestAction({ requestId: req.id });
      if (res.success) {
        toast.info("Join request rejected.");
        setRequests((prev) => prev.filter((r) => r.id !== req.id));
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to reject join request");
    } finally {
      setRejectingId(null);
    }
  };

  return (
    <Card className="rounded-3xl border-amber-500/30 bg-gradient-to-b from-amber-500/5 via-background to-background dark:from-amber-950/20 dark:via-background dark:to-background overflow-hidden shadow-md mb-6">
      <CardHeader className="p-5 sm:p-6 pb-4 border-b border-amber-500/15">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
                <span>Member Approval Center</span>
                <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] px-2 py-0.5 rounded-full">
                  {requests.length} Pending
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Pending members have zero access to group financials. Choose expense participation to approve access.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 space-y-5">
        {requests.map((req) => {
          const selectedDecision = decisions[req.id];
          const isSubmitting = submittingId === req.id;
          const isRejecting = rejectingId === req.id;
          const errorMessage = validationErrors[req.id];

          const formattedDate = new Date(req.createdAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
          const formattedTime = new Date(req.createdAt).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div
              key={req.id}
              className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm transition-all"
            >
              {/* REQUIREMENT 5: User Profile, Name, Email, Join Date & Time, Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary font-black text-base flex items-center justify-center shrink-0 border border-primary/20 shadow-xs">
                    {(req.userName || req.userEmail).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-extrabold text-foreground text-sm">
                        {req.userName || "New Member"}
                      </h4>
                      <Badge
                        variant="outline"
                        className="bg-amber-100/80 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 text-[10px] font-bold gap-1"
                      >
                        <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                        <span>Waiting for Owner Approval</span>
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {req.userEmail}
                    </p>
                    <p className="text-[11px] text-muted-foreground/75 mt-0.5">
                      Requested on {formattedDate} at {formattedTime}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(req)}
                    disabled={isSubmitting || isRejecting}
                    className="h-9 px-3.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl border-rose-200 dark:border-rose-900/40"
                  >
                    {isRejecting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                    )}
                    <span>Reject</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => handleApprove(req)}
                    disabled={isSubmitting || isRejecting}
                    className={`h-9 px-4 text-xs font-bold rounded-xl gap-1.5 transition-all shadow-sm ${
                      selectedDecision
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Approve Member</span>
                  </Button>
                </div>
              </div>

              {/* REQUIREMENT 6 & 7: Mandatory Participation Decision (Option A vs Option B) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Expense Participation (Mandatory Selection)</span>
                  </span>
                  {!selectedDecision && (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                      Selection required to approve
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* OPTION A: Include in Previous Expenses */}
                  <div
                    onClick={() => handleSelectDecision(req.id, "included")}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                      selectedDecision === "included"
                        ? "bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-500 ring-2 ring-indigo-500/20"
                        : "border-border/70 hover:border-slate-300 dark:hover:border-slate-700 bg-background/50"
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`decision-${req.id}`}
                            checked={selectedDecision === "included"}
                            onChange={() => handleSelectDecision(req.id, "included")}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-extrabold text-xs text-foreground">
                            Include in Previous Expenses
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 font-bold"
                        >
                          Recalculate
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed pl-5">
                        Member participates in historical expenses. Past expenses are redistributed equally, recalculating shares, balances, settlements, and QR codes.
                      </p>
                    </div>
                  </div>

                  {/* OPTION B: Start from New Expenses Only */}
                  <div
                    onClick={() => handleSelectDecision(req.id, "excluded")}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                      selectedDecision === "excluded"
                        ? "bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-500 ring-2 ring-emerald-500/20"
                        : "border-border/70 hover:border-slate-300 dark:hover:border-slate-700 bg-background/50"
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`decision-${req.id}`}
                            checked={selectedDecision === "excluded"}
                            onChange={() => handleSelectDecision(req.id, "excluded")}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="font-extrabold text-xs text-foreground">
                            Start from New Expenses Only
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 font-bold"
                        >
                          Preserve Past
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed pl-5">
                        Member owes ₹0 for past expenses. Previous calculations and balances are preserved. Member will participate only starting from new expenses.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Validation message if owner attempted to click approve without selection */}
                {errorMessage && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
