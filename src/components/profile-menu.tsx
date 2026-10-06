"use client";

import { useState } from "react";
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

export function ProfileMenu() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
      router.push("/sign-in");
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };

  const userName = user?.firstName || user?.username || "User";
  const userInitials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 px-2">
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-sm font-semibold text-primary">{userInitials}</span>
          </div>
          <span className="hidden md:inline text-sm font-medium">{userName}</span>
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-semibold">{userName}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{user?.emailAddresses?.[0]?.emailAddress}</p>
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
