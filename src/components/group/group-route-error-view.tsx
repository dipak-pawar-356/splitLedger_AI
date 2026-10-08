"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ShieldAlert, 
  HelpCircle, 
  Trash2, 
  ArrowLeft, 
  UserPlus, 
  CheckCircle2, 
  Loader2,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { submitGroupJoinRequestAction } from "@/actions/group-join-requests";

interface GroupRouteErrorViewProps {
  errorType: "not_found" | "deleted" | "access_denied";
  groupIdentifier?: string;
  groupName?: string;
  groupId?: number;
  groupPublicId?: string;
}

export function GroupRouteErrorView({
  errorType,
  groupIdentifier,
  groupName,
  groupId,
  groupPublicId,
}: GroupRouteErrorViewProps) {
  const router = useRouter();
  const [isSubmittingJoin, setIsSubmittingJoin] = useState(false);
  const [joinSubmitted, setJoinSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const targetIdentifier = groupPublicId || groupIdentifier;

  const handleRequestJoin = async () => {
    if (!targetIdentifier) return;
    setIsSubmittingJoin(true);
    setErrorMessage(null);

    try {
      const res = await submitGroupJoinRequestAction(targetIdentifier);
      if (res?.success) {
        setJoinSubmitted(true);
        // Refresh page to automatically transition to PendingGroupAccessView
        setTimeout(() => {
          router.refresh();
        }, 1200);
      } else {
        setErrorMessage("Failed to submit join request");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmittingJoin(false);
    }
  };

  if (errorType === "not_found") {
    return (
      <div className="flex items-center justify-center min-h-[70vh] p-4">
        <Card className="max-w-md w-full border-slate-200 dark:border-slate-800 shadow-xl text-center">
          <CardHeader className="space-y-3 pb-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <HelpCircle className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Group Not Found</CardTitle>
            <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
              We couldn&apos;t find any group matching{" "}
              <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                &quot;{groupIdentifier || "unknown"}&quot;
              </span>
              . The group link might be broken or the group never existed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="flex flex-col gap-2">
              <Button asChild className="w-full">
                <Link href="/dashboard/groups">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Return to My Groups
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (errorType === "deleted") {
    return (
      <div className="flex items-center justify-center min-h-[70vh] p-4">
        <Card className="max-w-md w-full border-slate-200 dark:border-slate-800 shadow-xl text-center">
          <CardHeader className="space-y-3 pb-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Trash2 className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Group Deleted</CardTitle>
            <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
              The group{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {groupName ? `"${groupName}"` : `(${groupIdentifier})`}
              </span>{" "}
              has been deleted or archived by its owner and is no longer accessible.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <Button asChild className="w-full">
              <Link href="/dashboard/groups">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to My Groups
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // access_denied
  return (
    <div className="flex items-center justify-center min-h-[70vh] p-4">
      <Card className="max-w-md w-full border-slate-200 dark:border-slate-800 shadow-xl text-center">
        <CardHeader className="space-y-3 pb-4">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Access Restricted</CardTitle>
          <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
            You are not currently a participating member of{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {groupName ? `"${groupName}"` : "this group"}
            </span>
            . Group expenses and balances require membership approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400 text-left">
              {errorMessage}
            </div>
          )}

          {joinSubmitted ? (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
              <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                Join Request Submitted!
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-500">
                Your request is now in PENDING status awaiting Group Owner approval.
              </p>
            </div>
          ) : groupId ? (
            <Button
              onClick={handleRequestJoin}
              disabled={isSubmittingJoin}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            >
              {isSubmittingJoin ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting Request...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Request to Join Group
                </>
              )}
            </Button>
          ) : null}

          <Button asChild variant="outline" className="w-full">
            <Link href="/dashboard/groups">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to My Groups
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
