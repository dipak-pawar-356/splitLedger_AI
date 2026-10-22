"use client";

import { useState, useEffect } from "react";
import { User, Users, Settings, Activity, HelpCircle, LogOut, ChevronDown, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { serverLogout } from "@/actions/auth-session";

interface ProfileMenuProps {
  initialUser?: {
    name?: string | null;
    email?: string | null;
    avatar?: string | null;
  };
}

export function ProfileMenu({ initialUser }: ProfileMenuProps = {}) {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [dbName, setDbName] = useState<string | null>(initialUser?.name || null);
  const [dbEmail, setDbEmail] = useState<string | null>(initialUser?.email || null);
  const [dbAvatar, setDbAvatar] = useState<string | null>(initialUser?.avatar || null);

  useEffect(() => {
    if (initialUser?.name) {
      setDbName(initialUser.name);
    }
    if (initialUser?.email) {
      setDbEmail(initialUser.email);
    }
    if (initialUser?.avatar) {
      setDbAvatar(initialUser.avatar);
    }
  }, [initialUser?.name, initialUser?.email, initialUser?.avatar]);

  useEffect(() => {
    // 1. Fetch current profile from SplitLedger DB API
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          if (data?.name) setDbName(data.name);
          if (data?.email) setDbEmail(data.email);
          if (data?.avatar) setDbAvatar(data.avatar);
        }
      } catch (_) {}
    };

    fetchProfile();

    // 2. Global event listener for instant local sync whenever profile is updated
    const handleProfileUpdated = (event: any) => {
      if (event?.detail?.name) {
        setDbName(event.detail.name);
      } else {
        fetchProfile();
      }
    };

    window.addEventListener("profile_updated", handleProfileUpdated);
    window.addEventListener("user_updated", handleProfileUpdated);

    return () => {
      window.removeEventListener("profile_updated", handleProfileUpdated);
      window.removeEventListener("user_updated", handleProfileUpdated);
    };
  }, []);

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  const handleSignOut = async () => {
    try {
      // 1. Invalidate server-side session and purge cookies
      try {
        await serverLogout();
      } catch (_) {}

      // 2. Client Clerk sign out
      await signOut();
      toast.success("Signed out successfully");
      router.push("/sign-in");
    } catch (error) {
      toast.error("Failed to sign out");
      router.push("/sign-in");
    }
  };

  // Prioritize active SplitLedger database name -> Clerk full name -> Clerk first name -> fallback
  const userName = dbName || user?.fullName || user?.firstName || user?.username || "User";
  const userEmail = dbEmail || user?.emailAddresses?.[0]?.emailAddress || "";
  const userInitials = userName
    .trim()
    .split(/\s+/)
    .map((n: string) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 px-2">
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden border border-primary/20">
            {dbAvatar || user?.imageUrl ? (
              <img
                src={dbAvatar || user?.imageUrl}
                alt={userName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <span className="text-sm font-semibold text-primary">{userInitials}</span>
            )}
          </div>
          <span className="hidden md:inline text-sm font-medium">{userName}</span>
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-semibold truncate">{userName}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{userEmail}</p>
        </div>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => handleNavigation("/dashboard/profile")}>
          <User className="h-4 w-4 mr-2" />
          Profile Center
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleNavigation("/dashboard/account")}>
          <ShieldCheck className="h-4 w-4 mr-2" />
          Account Management
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => handleNavigation("/dashboard/groups")}>
          <Users className="h-4 w-4 mr-2" />
          My Groups
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => handleNavigation("/dashboard/settings")}>
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => handleNavigation("/dashboard/activity")}>
          <Activity className="h-4 w-4 mr-2" />
          Activity Timeline
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => handleNavigation("/help")}>
          <HelpCircle className="h-4 w-4 mr-2" />
          Help & Support
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
