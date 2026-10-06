"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import { getUnreadCount } from "@/actions/notifications";
import { NotificationCenterDrawer } from "@/components/notifications/notification-center-drawer";

interface NotificationBadgeBellProps {
  initialCount?: number;
}

export function NotificationBadgeBell({ initialCount = 0 }: NotificationBadgeBellProps) {
  const [unreadCount, setUnreadCount] = useState(initialCount);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    loadCount();
    // Periodic refresh every 30 seconds for background sync
    const interval = setInterval(loadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadCount = async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (e) {
      // silent
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative h-9 w-9 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        onClick={() => setIsDrawerOpen(true)}
        aria-label="Open notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-extrabold flex items-center justify-center rounded-full border-2 border-background animate-in zoom-in-50"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </Button>

      <NotificationCenterDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onUnreadCountChange={setUnreadCount}
      />
    </>
  );
}
