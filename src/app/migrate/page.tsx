import { runDatabaseMigration } from "@/actions/migrate";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, CheckCircle, XCircle, Loader2 } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function MigratePage() {
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
            <Button
              onClick={() => window.location.reload()}
              className="w-full mt-4"
            >
              Retry Migration
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
