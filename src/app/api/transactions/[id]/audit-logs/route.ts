import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getTransactionAuditLogs } from "@/actions/transactions";
import { assertRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { maskErrorForClient } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    assertRateLimit(`api:tx:audit:${user.id}`, RATE_LIMITS.api.default);

    const { id } = await params;
    const auditLogs = await getTransactionAuditLogs(id);
    return NextResponse.json({ success: true, data: auditLogs });
  } catch (error: any) {
    const masked = maskErrorForClient(error);
    return NextResponse.json(masked, { status: masked.statusCode || 500 });
  }
}
