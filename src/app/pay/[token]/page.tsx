import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QrCode, CheckCircle2, ShieldCheck, ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface PageProps {
  params: Promise<{ token: string }>;
}

export const dynamic = "force-dynamic";

export default async function PublicPaymentPage({ params }: PageProps) {
  const { token } = await params;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden bg-card">
        <CardHeader className="text-center pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center mb-2">
            <QrCode className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold">SplitLedger UPI Settlement</CardTitle>
          <CardDescription className="text-xs">
            Direct peer-to-peer settlement via Indian UPI (INR ₹)
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-6 text-center">
          <div className="p-4 rounded-2xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/15 space-y-1">
            <p className="text-xs text-slate-500 font-medium">Settlement Amount</p>
            <p className="text-3xl font-black text-slate-900 dark:text-slate-100">
              {formatCurrency(450.0)}
            </p>
            <p className="text-[11px] text-slate-400 font-mono">Ref: {token}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-left space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Receiver</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">Rahul Sharma</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">UPI VPA</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">rahul@okhdfcbank</span>
            </div>
          </div>

          <Link href="/dashboard" className="block">
            <Button className="w-full rounded-2xl text-xs font-bold gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
