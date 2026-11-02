import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { restoreTransaction } from "@/actions/transactions";
import { assertRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { maskErrorForClient } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    assertRateLimit(`api:tx:restore:${user.id}`, RATE_LIMITS.actions.write);

    const { id } = await params;
    const result = await restoreTransaction(id);
    return NextResponse.json(result);
  } catch (error: any) {
    const masked = maskErrorForClient(error);
    return NextResponse.json(masked, { status: masked.statusCode || 500 });
  }
}
