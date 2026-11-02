import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { assertRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { maskErrorForClient } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    assertRateLimit(`plaid:exchange:${user.id}`, RATE_LIMITS.actions.write);

    const { publicToken } = await req.json();

    if (!publicToken || typeof publicToken !== "string") {
      return NextResponse.json({ error: "Public token is required" }, { status: 400 });
    }

    if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
      return NextResponse.json({ error: "Plaid integration not configured" }, { status: 501 });
    }

    const plaidResponse = await fetch("https://sandbox.plaid.com/item/public_token/exchange", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.PLAID_CLIENT_ID,
        secret: process.env.PLAID_SECRET,
        public_token: publicToken,
      }),
      signal: AbortSignal.timeout(5000),
    });

    const plaidData = await plaidResponse.json();

    if (!plaidResponse.ok) {
      console.error("Plaid exchange failed:", plaidData?.error_code, plaidData?.error_message);
      const isProd = process.env.NODE_ENV === "production";
      return NextResponse.json(
        { error: isProd ? "Failed to link bank account. Please verify your credentials or try again later." : (plaidData.error_message || "Plaid exchange failed") },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, itemId: plaidData.item_id });
  } catch (error) {
    console.error("Error exchanging Plaid token:", error);
    const masked = maskErrorForClient(error);
    return NextResponse.json(masked, { status: masked.statusCode || 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    assertRateLimit(`plaid:get:${user.id}`, RATE_LIMITS.api.default);

    return NextResponse.json({ accounts: [] });
  } catch (error) {
    console.error("Error fetching Plaid accounts:", error);
    const masked = maskErrorForClient(error);
    return NextResponse.json(masked, { status: masked.statusCode || 500 });
  }
}
