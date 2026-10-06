"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link2, ExternalLink, Receipt, Users, Compass, PiggyBank, HandCoins, Wallet, X } from "lucide-react";
import { unlinkNoteFromEntity } from "@/actions/notes";
import Link from "next/link";
import { toast } from "sonner";

interface NoteLinkedEntitiesWidgetProps {
  linkedEntities: any[];
  onUnlink?: () => void;
}

export function NoteLinkedEntitiesWidget({ linkedEntities, onUnlink }: NoteLinkedEntitiesWidgetProps) {
  if (!linkedEntities || linkedEntities.length === 0) return null;

  const handleUnlink = async (linkPublicId: string) => {
    try {
      await unlinkNoteFromEntity(linkPublicId);
      toast.success("Unlinked financial entity!");
      onUnlink?.();
    } catch (err: any) {
      toast.error("Failed to unlink entity");
    }
  };

  const getIcon = (type: string) => {
    if (type === "transaction") return <Receipt className="h-3.5 w-3.5 text-emerald-500" />;
    if (type === "group") return <Users className="h-3.5 w-3.5 text-blue-500" />;
    if (type === "trip") return <Compass className="h-3.5 w-3.5 text-cyan-500" />;
    if (type === "budget") return <PiggyBank className="h-3.5 w-3.5 text-amber-500" />;
    if (type === "loan") return <HandCoins className="h-3.5 w-3.5 text-rose-500" />;
    return <Wallet className="h-3.5 w-3.5 text-purple-500" />;
  };

  const getHref = (link: any) => {
    const pub = link.entityPublicId || link.entityId;
    if (link.entityType === "transaction") return `/dashboard/transactions/${pub}`;
    if (link.entityType === "group") return `/dashboard/groups/${pub}`;
    if (link.entityType === "trip") return `/dashboard/trips`;
    if (link.entityType === "budget") return `/dashboard/budgets`;
    if (link.entityType === "loan") return `/dashboard/loans`;
    return `/dashboard/settlements`;
  };

  return (
    <Card className="rounded-2xl border shadow-sm p-4 space-y-3 bg-card">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
        <Link2 className="h-4 w-4 text-primary" />
        Linked Financial Entities ({linkedEntities.length})
      </h4>

      <div className="space-y-1.5">
        {linkedEntities.map((link) => (
          <div
            key={link.linkId || link.linkPublicId}
            className="flex items-center justify-between p-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              {getIcon(link.entityType)}
              <span className="capitalize font-semibold text-slate-800 dark:text-slate-200">
                {link.entityType}:
              </span>
              <span className="font-mono text-primary truncate">
                {link.entityPublicId || `#${link.entityId}`}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Link href={getHref(link)} target="_blank">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-500 hover:text-primary">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </Link>

              {link.linkPublicId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-slate-400 hover:text-rose-500"
                  onClick={() => handleUnlink(link.linkPublicId)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
