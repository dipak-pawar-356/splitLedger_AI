"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate } from "@/lib/utils";
import {
  UserPlus,
  Mail,
  Smartphone,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  Info,
} from "lucide-react";
import { type PendingJoinRequestItem } from "./pending-join-requests-card";

interface ApplicantInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: PendingJoinRequestItem | null;
  selectedDecision: "included" | "excluded" | undefined;
  onSelectDecision: (decision: "included" | "excluded") => void;
  onApprove: (req: PendingJoinRequestItem) => void;
  onReject: (req: PendingJoinRequestItem) => void;
  isSubmitting: boolean;
  isRejecting: boolean;
}

export function ApplicantInspectionModal({
  isOpen,
  onClose,
  request,
  selectedDecision,
  onSelectDecision,
  onApprove,
  onReject,
  isSubmitting,
  isRejecting,
}: ApplicantInspectionModalProps) {
  if (!request) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[540px] max-h-[92vh] overflow-y-auto p-0 rounded-3xl border-2 border-amber-500/70 ring-1 ring-amber-500/40 shadow-[0_0_40px_rgba(245,158,11,0.25)] bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-2xl text-slate-100">
        {/* Animated Top Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-400 animate-pulse" />

        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <UserPlus className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-white">
                  Member Join Request Audit
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 mt-0.5">
                  Requested on {formatDate(request.createdAt)}
                </DialogDescription>
              </div>
            </div>

            <Badge variant="outline" className="text-xs py-1 px-2.5 font-bold rounded-xl bg-amber-500/10 text-amber-400 border-amber-500/30">
              Pending Approval
            </Badge>
          </div>
        </div>

        {/* Applicant Profile Card */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <Avatar className="h-12 w-12 border-2 border-amber-500/40 ring-2 ring-amber-500/10 shrink-0">
                <AvatarFallback className="text-sm font-bold bg-slate-800 text-amber-400">
                  {(request.userName || request.userEmail || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h4 className="text-base font-bold text-white truncate">
                  {request.userName || "New Member"}
                </h4>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5 truncate">
                  <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                  <span className="truncate">{request.userEmail}</span>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">UPI Identity</span>
              {request.userUpiId ? (
                <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono mt-0.5">
                  {request.userUpiId}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700 mt-0.5">
                  Not Provided
                </Badge>
              )}
            </div>
          </div>

          {/* Participation Decision Selection */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Select Expense Split Policy (Mandatory)
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Option 1: Included */}
              <div
                onClick={() => onSelectDecision("included")}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedDecision === "included"
                    ? "bg-amber-500/10 border-amber-500/70 ring-1 ring-amber-500/40 text-white"
                    : "bg-slate-800/40 border-slate-700/60 hover:border-slate-600 text-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-bold flex items-center gap-1.5">
                      <span>Include in previous group expenses</span>
                      {selectedDecision === "included" && (
                        <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                      )}
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      All previous group expenses will be recalculated to include this member. Outstanding debt and settlement matrices will adjust automatically.
                    </p>
                  </div>
                </div>
              </div>

              {/* Option 2: Excluded */}
              <div
                onClick={() => onSelectDecision("excluded")}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedDecision === "excluded"
                    ? "bg-amber-500/10 border-amber-500/70 ring-1 ring-amber-500/40 text-white"
                    : "bg-slate-800/40 border-slate-700/60 hover:border-slate-600 text-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-bold flex items-center gap-1.5">
                      <span>Participate from new expenses only</span>
                      {selectedDecision === "excluded" && (
                        <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                      )}
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Previous expenses remain locked with existing members. This applicant will only share expenses created from this moment forward.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-5 pt-3 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isRejecting}
            onClick={() => onReject(request)}
            className="rounded-xl text-xs gap-1.5 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/50"
          >
            {isRejecting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <XCircle className="h-3.5 w-3.5" />
            )}
            <span>Reject Request</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="rounded-xl text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </Button>

            <Button
              size="sm"
              disabled={isSubmitting || !selectedDecision}
              onClick={() => onApprove(request)}
              className="rounded-xl text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Approving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Approve & Grant Access</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

