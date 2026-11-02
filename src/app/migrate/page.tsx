import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo/config";
import { runDatabaseMigration } from "@/actions/migrate";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Shield } from "lucide-react";
import { requireAdmin } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = createPageMetadata({
  title: "Database Migration Console | SplitLedger AI",
  description:
    "System administrator database schema migration and synchronization console.",
  path: "/migrate",
  noIndex: true,
});

export default async function MigratePage() {
  try {
    await requireAdmin();
  } catch {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="p-8 text-center">
              <Shield className="h-10 w-10 text-red-500 mx-auto mb-3" />
              <h2 className="text-lg font-bold">Access Denied</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Database migration tools are restricted to system administrators.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const result = await runDatabaseMigration();

  if (result.success) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Migration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
              <p className="text-red-800 dark:text-red-200 font-medium">✗ Migration Failed</p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">{result.error || "Unknown error"}</p>
            </div>
            <Button asChild className="w-full mt-4">
              <a href="/migrate">Retry Migration</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
