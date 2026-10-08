"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Clock, 
  CheckCircle2, 
  LogIn, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles,
  ArrowLeft
} from "lucide-react";
import { submitGroupJoinRequestAction } from "@/actions/group-join-requests";
import { toast } from "sonner";

interface JoinGroupViewProps {
  tokenOrPublicId: string;
  initialData: {
    isAuthenticated: boolean;
    currentUser?: { id: number; name: string | null; email: string };
    group: {
      id: number;
      publicId: string;
      name: string;
      coverImage?: string | null;
      description?: string | null;
      currency?: string;
      type?: string | null;
      memberCount?: number;
      ownerName?: string;
    };
    isMember: boolean;
    membershipStatus?: string | null;
    pendingRequest: {
      id: number;
      publicId: string;
      status: string;
      createdAt: Date;
    } | null;
  };
}

export function JoinGroupView({ tokenOrPublicId, initialData }: JoinGroupViewProps) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  const isPending = Boolean(
    data.pendingRequest || 
    data.membershipStatus === "pending" || 
    data.membershipStatus === "PENDING_APPROVAL"
  );

  const handleRequestToJoin = async () => {
    setLoading(true);
    try {
      const res = await submitGroupJoinRequestAction(data.group.publicId);
      if (res.success && res.requestId) {
        toast.success("Join request submitted! Waiting for owner approval.");
        setData((prev) => ({
          ...prev,
          membershipStatus: "pending",
          pendingRequest: {
            id: res.requestId!,
            publicId: res.publicId || "",
            status: "pending",
            createdAt: new Date(),
          },
        }));
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit join request");
    } finally {
      setLoading(false);
    }
  };

  const returnUrl = `/join-group/${tokenOrPublicId}`;

  // REQUIREMENT 3: Pending Member Screen - Display ONLY Group Name, Logo, Status, Message, and Return button
  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <Card className="max-w-md w-full border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 rounded-3xl overflow-hidden text-center">
          {/* Subtle top hero */}
          <div className="h-28 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-6 flex flex-col items-center justify-center text-white relative">
            <div className="absolute -bottom-8">
              <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 p-1 shadow-lg border-2 border-amber-500/20 flex items-center justify-center overflow-hidden">
                {data.group.coverImage ? (
                  <Image
                    src={data.group.coverImage}
                    alt={data.group.name}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover rounded-xl"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <Users className="w-7 h-7" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <CardContent className="pt-12 pb-8 px-6 sm:px-8 space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                {data.group.name}
              </h1>
              <div>
                <Badge
                  variant="outline"
                  className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/80 font-bold px-3 py-1 text-xs gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5 animate-pulse text-amber-600 dark:text-amber-400" />
                  <span>Waiting for Owner Approval</span>
                </Badge>
              </div>
            </div>

            {/* Core Exact Message per Requirement 3 */}
            <div className="p-4 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl">
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                Your request has been sent successfully. You will gain access to this group&apos;s dashboard and financial data only after the Group Owner approves your request.
              </p>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Financial privacy active &bull; Access restricted until approval</span>
            </div>

            <div className="pt-2">
              <Link href="/dashboard" className="w-full block">
                <Button
                  variant="outline"
                  className="w-full rounded-xl h-11 font-bold text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 gap-2 border-slate-200 dark:border-slate-800"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Dashboard</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active Member: Quick Redirect Button
  if (data.isMember) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <Card className="max-w-md w-full rounded-3xl shadow-xl border-slate-200 dark:border-slate-800 bg-card p-6 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-black text-foreground">{data.group.name}</h1>
            <p className="text-xs text-muted-foreground">You are an active approved member of this group</p>
          </div>
          <Link href={`/dashboard/groups/${data.group.publicId}`} className="block">
            <Button className="w-full font-bold text-xs h-11 rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
              <span>Go to Group Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Initial Join Request Screen
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <Card className="max-w-md w-full rounded-3xl shadow-xl border-slate-200 dark:border-slate-800 bg-card overflow-hidden">
        {/* Banner with Group Name and Logo */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 pb-5 border-b border-border/40">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-sm shrink-0 overflow-hidden">
              {data.group.coverImage ? (
                <Image
                  src={data.group.coverImage}
                  alt={data.group.name}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <Users className="w-6 h-6" />
              )}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Group Invitation</span>
              <h1 className="text-xl font-extrabold text-foreground tracking-tight">
                {data.group.name}
              </h1>
            </div>
          </div>
        </div>

        <CardContent className="p-6 space-y-5">
          {!data.isAuthenticated ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold">Authentication Required</p>
                    <p className="text-muted-foreground leading-relaxed">
                      To protect member privacy, join requests must be submitted with your verified account.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Link href={`/sign-in?redirect_url=${encodeURIComponent(returnUrl)}`}>
                  <Button className="w-full font-bold text-xs h-11 rounded-xl gap-2 shadow-sm">
                    <LogIn className="w-4 h-4" />
                    <span>Sign In to Join Group</span>
                  </Button>
                </Link>
                <Link href={`/sign-up?redirect_url=${encodeURIComponent(returnUrl)}`}>
                  <Button variant="outline" className="w-full font-bold text-xs h-10 rounded-xl">
                    Create New Account
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 text-foreground">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold">Join {data.group.name}</p>
                    <p className="text-muted-foreground leading-relaxed">
                      Click below to submit your join request. You will be able to access the group dashboard and financial data once the Group Owner approves.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleRequestToJoin}
                disabled={loading}
                className="w-full font-bold text-xs h-11 rounded-xl gap-2 shadow-sm"
              >
                <span>{loading ? "Submitting..." : "Join Group"}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
