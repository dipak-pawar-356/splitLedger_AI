"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Users,
  Merge,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Mail,
  Phone,
  Building2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import {
  getDuplicateContactsAction,
  bulkUpdateContactsAction,
} from "@/actions/contact-import";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface DuplicateManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DuplicateManagerDialog({
  open,
  onOpenChange,
  onSuccess,
}: DuplicateManagerDialogProps) {
  const router = useRouter();
  const [clusters, setClusters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mergingClusterIndex, setMergingClusterIndex] = useState<number | null>(null);

  const fetchDuplicates = async () => {
    setIsLoading(true);
    try {
      const data = await getDuplicateContactsAction();
      setClusters(data);
    } catch (err) {
      console.error("Duplicate detection error:", err);
      toast.error("Failed to detect duplicate contacts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchDuplicates();
    }
  }, [open]);

  const handleMergeCluster = async (cluster: any, index: number, masterId: number) => {
    setMergingClusterIndex(index);
    try {
      const allIds = cluster.contacts.map((c: any) => c.id);
      await bulkUpdateContactsAction(allIds, {
        type: "merge",
        masterId,
      });

      toast.success("Contacts successfully merged into master record!");
      await fetchDuplicates();
      onSuccess?.();
      router.refresh();
    } catch (err) {
      console.error("Merge error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to merge contacts");
    } finally {
      setMergingClusterIndex(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[88vh] overflow-y-auto rounded-3xl p-6 sm:p-7 bg-card border border-slate-200/80 dark:border-slate-800 shadow-2xl">
        <DialogHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Duplicate Contact Manager
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Detect, inspect, and merge duplicate contacts while keeping all transaction ledgers intact
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs font-semibold">Scanning contacts for duplicates...</p>
            </div>
          ) : clusters.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h4 className="font-bold text-base text-slate-900 dark:text-slate-100">
                No Duplicate Contacts Found!
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Your contact list is clean. All emails, mobile numbers, and names are unique.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
                <span className="font-bold uppercase tracking-wider text-[11px] text-amber-600 dark:text-amber-400">
                  {clusters.length} Duplicate Cluster{clusters.length > 1 ? "s" : ""} Found
                </span>
                <span>Select which contact to keep as the primary record</span>
              </div>

              {clusters.map((cluster, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-bold px-2 py-0.5 border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30">
                        Match by {cluster.reason.toUpperCase()}: {cluster.matchValue}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        ({cluster.contacts.length} entries)
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {cluster.contacts.map((contact: any) => (
                      <div
                        key={contact.id}
                        className="p-3 rounded-xl bg-card border border-slate-200/80 dark:border-slate-800 space-y-2 flex flex-col justify-between"
                      >
                        <div>
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                            {contact.name}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {contact.publicId}
                          </span>

                          <div className="text-[11px] text-slate-500 space-y-0.5 mt-1.5">
                            {contact.email && (
                              <div className="flex items-center gap-1.5 truncate">
                                <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                                <span className="truncate">{contact.email}</span>
                              </div>
                            )}
                            {contact.phone && (
                              <div className="flex items-center gap-1.5">
                                <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                                <span>{contact.phone}</span>
                              </div>
                            )}
                            {contact.company && (
                              <div className="flex items-center gap-1.5 truncate">
                                <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                                <span className="truncate">{contact.company}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={mergingClusterIndex === idx}
                          onClick={() => handleMergeCluster(cluster, idx, contact.id)}
                          className="w-full mt-2 rounded-xl text-xs h-7 font-bold gap-1 hover:border-emerald-500/50 hover:text-emerald-600"
                        >
                          {mergingClusterIndex === idx ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Merge className="h-3 w-3" />
                          )}
                          <span>Keep as Master & Merge</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
