import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getTransactionAuditLogs } from "@/actions/transactions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const auditLogs = await getTransactionAuditLogs(id);
    return NextResponse.json({ success: true, data: auditLogs });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch audit logs" },
      { status }
    );
  }
}
