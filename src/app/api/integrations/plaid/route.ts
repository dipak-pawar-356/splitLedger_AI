import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await requireAuth();

  const { publicToken } = await req.json();

  if (!publicToken) {
    return NextResponse.json({ error: "Public token is required" }, { status: 400 });
  }

  try {
    // Exchange public token for access token using Plaid API
    // In production, you would use the Plaid Node SDK
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
    });

    const plaidData = await plaidResponse.json();

    if (!plaidResponse.ok) {
      return NextResponse.json({ error: plaidData.error_message }, { status: 400 });
    }

    // Store the access token in your database
    // await db.insert(plaidAccounts).values({
    //   userId: user.id,
    //   accessToken: plaidData.access_token,
    //   itemId: plaidData.item_id,
    // });

    return NextResponse.json({ success: true, itemId: plaidData.item_id });
  } catch (error) {
    console.error("Error exchanging Plaid token:", error);
    return NextResponse.json({ error: "Failed to exchange token" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const user = await requireAuth();

  try {
    // Fetch user's linked Plaid accounts from database
    // const accounts = await db.select().from(plaidAccounts).where(eq(plaidAccounts.userId, user.id));
    
    return NextResponse.json({ accounts: [] });
  } catch (error) {
    console.error("Error fetching Plaid accounts:", error);
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
  }
}
