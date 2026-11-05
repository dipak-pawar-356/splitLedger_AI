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
import { ApplicantInspectionModal } from "./applicant-inspection-modal";
import { Maximize2 } from "lucide-react";

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
  const [inspectRequest, setInspectRequest] = useState<PendingJoinRequestItem | null>(null);
  
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

      if (res && res.success) {
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
      } else {
        toast.error((res as any)?.error || "Failed to approve join request");
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
      if (res && res.success) {
        toast.info("Join request rejected.");
        setRequests((prev) => prev.filter((r) => r.id !== req.id));
        router.refresh();
      } else {
        toast.error((res as any)?.error || "Failed to reject join request");
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
              className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-5 space-y-4 shadow-sm hover:shadow-2xl hover:border-amber-500/60 hover:-translate-y-1.5 hover:scale-[1.008] transition-all duration-300 relative group/applicant overflow-hidden"
            >
              <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-400 absolute top-0 left-0 opacity-0 group-hover/applicant:opacity-100 transition-opacity" />
              {/* User Profile, Name, Email, Join Date & Time, Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                <div 
                  onClick={() => setInspectRequest(req)}
                  className="flex items-center gap-3.5 cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary font-black text-base flex items-center justify-center shrink-0 border border-primary/20 shadow-xs group-hover/applicant:ring-2 group-hover/applicant:ring-amber-500/30 transition-all">
                    {(req.userName || req.userEmail).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-extrabold text-foreground text-sm group-hover/applicant:text-amber-500 transition-colors">
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
                      Requested on {formattedDate} at {formattedTime} • <span className="text-amber-500 font-medium">Click to inspect →</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setInspectRequest(req)}
                    className="h-9 w-9 p-0 text-slate-400 hover:text-amber-500 rounded-xl"
                    title="Inspect Applicant Profile"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>

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
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
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

      {/* Pop-up Applicant Inspection Modal */}
      <ApplicantInspectionModal
        isOpen={inspectRequest !== null}
        onClose={() => setInspectRequest(null)}
        request={inspectRequest}
        selectedDecision={inspectRequest ? decisions[inspectRequest.id] : undefined}
        onSelectDecision={(decision) => {
          if (inspectRequest) handleSelectDecision(inspectRequest.id, decision);
        }}
        onApprove={(req) => {
          handleApprove(req);
          setInspectRequest(null);
        }}
        onReject={(req) => {
          handleReject(req);
          setInspectRequest(null);
        }}
        isSubmitting={Boolean(inspectRequest && submittingId === inspectRequest.id)}
        isRejecting={Boolean(inspectRequest && rejectingId === inspectRequest.id)}
      />
    </Card>
  );
}
