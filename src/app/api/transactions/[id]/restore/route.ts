import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { restoreTransaction } from "@/actions/transactions";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const result = await restoreTransaction(id);
    return NextResponse.json(result);
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to restore transaction" },
      { status }
    );
  }
}
