"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import { 
  Bell, 
  Receipt, 
  CheckCircle2, 
  UserPlus, 
  Clock, 
  ShieldAlert, 
  Sparkles, 
  Layers, 
  Pin, 
  Archive, 
  Trash2, 
  ArrowRight, 
  MessageSquare,
  Target,
  FileText
} from "lucide-react";
import { NotificationItem, markAsRead, togglePinNotification, archiveNotification, deleteNotification } from "@/actions/notifications";
import { toast } from "sonner";
import Link from "next/link";

interface NotificationCardProps {
  notification: NotificationItem;
  onRefresh?: () => void;
}

export function NotificationCard({ notification, onRefresh }: NotificationCardProps) {
  const [isRead, setIsRead] = useState(notification.isRead);
  const [isPinned, setIsPinned] = useState(notification.isPinned);
  const [isArchived, setIsArchived] = useState(notification.isArchived);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "expense":
      case "transaction":
        return <Receipt className="h-4 w-4 text-primary" />;
      case "settlement":
      case "payment":
        return <CheckCircle2 className="h-4 w-4 text-teal-600" />;
      case "invitation":
      case "group":
        return <UserPlus className="h-4 w-4 text-blue-600" />;
      case "budget":
        return <Target className="h-4 w-4 text-amber-600" />;
      case "security":
        return <ShieldAlert className="h-4 w-4 text-rose-600" />;
      case "ai_insight":
        return <Sparkles className="h-4 w-4 text-purple-600" />;
      case "report":
        return <FileText className="h-4 w-4 text-indigo-600" />;
      case "comment":
      case "mention":
        return <MessageSquare className="h-4 w-4 text-indigo-500" />;
      default:
        return <Bell className="h-4 w-4 text-slate-500" />;
    }
  };

  const getPriorityBadge = (priority: NotificationItem["priority"]) => {
    switch (priority) {
      case "critical":
        return <Badge className="bg-rose-600 text-white text-[10px] py-0 px-1.5 font-bold">Critical</Badge>;
      case "high":
        return <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 text-[10px] py-0 px-1.5 font-bold">High</Badge>;
      case "medium":
        return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 text-[10px] py-0 px-1.5 font-semibold">Medium</Badge>;
      case "low":
        return <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal text-slate-500">Low</Badge>;
    }
  };

  const handleMarkRead = async () => {
    if (isRead) return;
    setIsRead(true);
    try {
      await markAsRead(notification.publicId || notification.id);
      if (onRefresh) onRefresh();
    } catch (e) {
      // rollback
      setIsRead(false);
    }
  };

  const handleTogglePin = async () => {
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    try {
      await togglePinNotification(notification.publicId || notification.id);
      toast.success(newPinned ? "Notification pinned" : "Notification unpinned");
      if (onRefresh) onRefresh();
    } catch (e) {
      setIsPinned(!newPinned);
    }
  };

  const handleArchive = async () => {
    const newArchived = !isArchived;
    setIsArchived(newArchived);
    try {
      await archiveNotification(notification.publicId || notification.id);
      toast.success(newArchived ? "Notification archived" : "Notification unarchived");
      if (onRefresh) onRefresh();
    } catch (e) {
      setIsArchived(!newArchived);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteNotification(notification.publicId || notification.id);
      toast.success("Notification deleted");
      if (onRefresh) onRefresh();
    } catch (e) {
      toast.error("Failed to delete notification");
    }
  };

  const meta = notification.metadata || {};

  return (
    <div
      onClick={handleMarkRead}
      className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer relative group ${
        !isRead
          ? "bg-primary/5 dark:bg-primary/10 border-primary/30 shadow-xs"
          : "bg-card border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
      }`}
    >
      <div className="flex items-start gap-3.5">
        {/* Unread Blue Indicator Dot (SECTION 6) */}
        {!isRead && (
          <div className="absolute top-4 left-2 w-2 h-2 rounded-full bg-primary ring-2 ring-primary/20" />
        )}

        {/* Sender Avatar or Category Icon */}
        <div className="relative shrink-0 mt-0.5">
          {meta.senderAvatar ? (
            <Avatar className="h-9 w-9 border shadow-xs">
              <AvatarImage src={meta.senderAvatar} />
              <AvatarFallback className="text-xs font-bold">
                {(meta.senderName || "U").charAt(0)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center">
              {getCategoryIcon(notification.category)}
            </div>
          )}
        </div>

        {/* Notification Main Info (SECTION 4) */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className={`text-xs tracking-tight ${!isRead ? "font-extrabold text-slate-900 dark:text-slate-100" : "font-bold text-slate-800 dark:text-slate-200"}`}>
                {notification.title}
              </h4>
              {getPriorityBadge(notification.priority)}
              {isPinned && (
                <Badge variant="secondary" className="text-[10px] py-0 px-1 font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40">
                  <Pin className="h-2.5 w-2.5 mr-0.5 inline" />
                  Pinned
                </Badge>
              )}
            </div>

            <span className="text-[10px] text-slate-400 font-medium shrink-0">
              {formatRelativeTime(notification.createdAt)}
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
            {notification.message}
          </p>

          {/* Metadata Chips: Group Name, Amount in INR (₹) */}
          <div className="flex items-center gap-2 pt-1 flex-wrap text-xs">
            {meta.amount && (
              <Badge variant="outline" className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-300 border-emerald-200">
                {formatCurrency(meta.amount, meta.currency || "INR")}
              </Badge>
            )}
            {meta.groupName && (
              <Badge variant="outline" className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                <Layers className="h-2.5 w-2.5 mr-1 inline text-primary" />
                {meta.groupName}
              </Badge>
            )}
            {meta.senderName && (
              <span className="text-[11px] text-slate-400">
                By <strong className="text-slate-700 dark:text-slate-300 font-semibold">{meta.senderName}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card Action Toolbar (SECTION 4 & 13) */}
      <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-xs">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`h-6 px-1.5 text-[11px] rounded-lg ${isPinned ? "text-amber-600 font-semibold" : "text-slate-400 hover:text-slate-700"}`}
            onClick={(e) => {
              e.stopPropagation();
              handleTogglePin();
            }}
          >
            <Pin className="h-3 w-3 mr-1" />
            {isPinned ? "Unpin" : "Pin"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[11px] rounded-lg text-slate-400 hover:text-slate-700"
            onClick={(e) => {
              e.stopPropagation();
              handleArchive();
            }}
          >
            <Archive className="h-3 w-3 mr-1" />
            {isArchived ? "Unarchive" : "Archive"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[11px] rounded-lg text-rose-400 hover:text-rose-600"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {/* Direct Action Link (SECTION 13) */}
        {meta.actionUrl && (
          <Link href={meta.actionUrl} onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[11px] font-semibold rounded-lg text-primary hover:bg-primary/10 border-primary/30 gap-1 px-2"
            >
              <span>{meta.actionLabel || "View Details"}</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
