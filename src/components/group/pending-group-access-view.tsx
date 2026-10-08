import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, ArrowLeft, Users, ShieldCheck } from "lucide-react";

interface PendingGroupAccessViewProps {
  groupName: string;
  groupLogo?: string | null;
}

export function PendingGroupAccessView({
  groupName,
  groupLogo,
}: PendingGroupAccessViewProps) {
  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 rounded-3xl overflow-hidden text-center">
        {/* Subtle decorative top header */}
        <div className="h-28 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-6 flex flex-col items-center justify-center text-white relative">
          <div className="absolute -bottom-8">
            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 p-1 shadow-lg border-2 border-amber-500/20 flex items-center justify-center overflow-hidden">
              {groupLogo ? (
                <Image
                  src={groupLogo}
                  alt={groupName}
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
          {/* Group Name */}
          <div className="space-y-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              {groupName}
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

          {/* Privacy Note */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Financial privacy active &bull; Access restricted until approval</span>
          </div>

          {/* Navigation Action */}
          <div className="pt-2">
            <Link href="/dashboard/groups" className="w-full block">
              <Button
                variant="outline"
                className="w-full rounded-xl h-11 font-bold text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 gap-2 border-slate-200 dark:border-slate-800"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Groups Dashboard</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
