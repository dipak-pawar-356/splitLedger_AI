"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { markSettlementAsPaid } from "@/actions/settlements";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface MarkPaidButtonProps {
  settlementId: number | string;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  children?: React.ReactNode;
}

export function MarkPaidButton({ 
  settlementId, 
  className = "text-xs font-semibold", 
  size = "sm",
  variant = "outline",
  children 
}: MarkPaidButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      await markSettlementAsPaid(settlementId);
      toast.success("Settlement marked as paid successfully!");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update settlement";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      size={size}
      variant={variant}
      className={className}
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          Updating...
        </>
      ) : children ? (
        children
      ) : (
        <>
          <CheckCircle className="h-3.5 w-3.5 mr-1 text-emerald-600" />
          Mark as Settled
        </>
      )}
    </Button>
  );
}
