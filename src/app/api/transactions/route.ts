import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { requireAuth } from "@/lib/auth";
import { createTransaction, getTransactions } from "@/actions/transactions";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId") ? Number(searchParams.get("groupId")) : undefined;
    const contactId = searchParams.get("contactId") ? Number(searchParams.get("contactId")) : undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;

    const data = await getTransactions({ groupId, contactId, limit });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch transactions" },
      { status }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const transaction = await createTransaction(body);
    return NextResponse.json({ success: true, data: transaction }, { status: 201 });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create transaction" },
      { status }
    );
  }
}
