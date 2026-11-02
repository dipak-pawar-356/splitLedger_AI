import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createTransaction, getTransactions } from "@/actions/transactions";
import { assertRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { maskErrorForClient } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    assertRateLimit(`api:tx:get:${user.id}`, RATE_LIMITS.api.default);

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId") ? Number(searchParams.get("groupId")) : undefined;
    const contactId = searchParams.get("contactId") ? Number(searchParams.get("contactId")) : undefined;
    const limit = searchParams.get("limit") ? Math.min(100, Math.max(1, Number(searchParams.get("limit")))) : 50;

    const data = await getTransactions({ groupId, contactId, limit });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    const masked = maskErrorForClient(error);
    return NextResponse.json(masked, { status: masked.statusCode || 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    assertRateLimit(`api:tx:post:${user.id}`, RATE_LIMITS.transactions.create);

    const body = await req.json();
    const transaction = await createTransaction(body);
    return NextResponse.json({ success: true, data: transaction }, { status: 201 });
  } catch (error: any) {
    const masked = maskErrorForClient(error);
    return NextResponse.json(masked, { status: masked.statusCode || 500 });
  }
}
