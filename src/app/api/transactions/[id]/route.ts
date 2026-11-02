import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getTransaction, updateTransaction, deleteTransaction } from "@/actions/transactions";
import { assertRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { maskErrorForClient } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    assertRateLimit(`api:tx:item:${user.id}`, RATE_LIMITS.api.default);

    const { id } = await params;
    const transaction = await getTransaction(id);
    return NextResponse.json({ success: true, data: transaction });
  } catch (error: any) {
    const masked = maskErrorForClient(error);
    return NextResponse.json(masked, { status: masked.statusCode || 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    assertRateLimit(`api:tx:patch:${user.id}`, RATE_LIMITS.transactions.update);

    const { id } = await params;
    const body = await req.json();
    const transaction = await updateTransaction(id, body);
    return NextResponse.json({ success: true, data: transaction });
  } catch (error: any) {
    const masked = maskErrorForClient(error);
    return NextResponse.json(masked, { status: masked.statusCode || 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    assertRateLimit(`api:tx:del:${user.id}`, RATE_LIMITS.actions.delete);

    const { id } = await params;
    let reason: string | undefined;
    try {
      const body = await req.json();
      reason = body.reason;
    } catch {
      // Body is optional on delete
    }

    const result = await deleteTransaction(id, reason);
    return NextResponse.json(result);
  } catch (error: any) {
    const masked = maskErrorForClient(error);
    return NextResponse.json(masked, { status: masked.statusCode || 500 });
  }
}
