import { NextRequest, NextResponse } from "next/server";
import { validateApiKeyAndScope, seedDeveloperApiKey } from "@/lib/api-gateway/api-keys";
import { dispatchWebhookEvent } from "@/lib/webhooks/dispatcher";

export const dynamic = "force-dynamic";

function getBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization") || req.headers.get("x-api-key");
  if (!authHeader) return null;
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  return authHeader.trim();
}

export async function GET(req: NextRequest) {
  // Ensure dev key seeded if none exists
  seedDeveloperApiKey();

  const token = getBearerToken(req);
  const auth = validateApiKeyAndScope(token, "transactions:read");

  if (!auth.isValid) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  // Return standardized JSON API response
  const sampleTransactions = [
    {
      id: 101,
      title: "Team Lunch at Taj",
      description: "Q3 milestone lunch",
      amount: 4500,
      currency: "INR",
      type: "paid",
      date: new Date().toISOString(),
      groupId: 1,
    },
    {
      id: 102,
      title: "AWS GPU Compute Server",
      description: "AI inference node",
      amount: 12800,
      currency: "INR",
      type: "paid",
      date: new Date().toISOString(),
      groupId: null,
    },
  ];

  return NextResponse.json({
    data: sampleTransactions,
    pagination: {
      page,
      limit,
      total: sampleTransactions.length,
      totalPages: 1,
    },
    currency: "INR",
  });
}

export async function POST(req: NextRequest) {
  seedDeveloperApiKey();

  const token = getBearerToken(req);
  const auth = validateApiKeyAndScope(token, "transactions:write");

  if (!auth.isValid) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (!body.title || !body.amount) {
      return NextResponse.json(
        { error: "Validation Error: 'title' and 'amount' are required fields." },
        { status: 400 }
      );
    }

    const createdTx = {
      id: Math.floor(Math.random() * 90000) + 10000,
      title: body.title,
      description: body.description || "",
      amount: Number(body.amount),
      currency: body.currency || "INR",
      type: body.type || "paid",
      date: body.date || new Date().toISOString(),
      groupId: body.groupId || null,
      createdAt: new Date().toISOString(),
    };

    // Dispatch Webhook Event
    await dispatchWebhookEvent("transaction.created", createdTx, auth.ownerId);

    return NextResponse.json({ data: createdTx, message: "Transaction created successfully." }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Invalid JSON payload." }, { status: 400 });
  }
}
