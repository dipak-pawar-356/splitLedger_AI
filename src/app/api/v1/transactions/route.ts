import { NextRequest, NextResponse } from "next/server";
import { validateApiKeyAndScope, seedDeveloperApiKey } from "@/lib/api-gateway/api-keys";
import { dispatchWebhookEvent } from "@/lib/webhooks/dispatcher";
import { assertRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { maskErrorForClient } from "@/lib/errors";
import { sanitizeText } from "@/lib/security/sanitize";

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
  try {
    seedDeveloperApiKey();

    const token = getBearerToken(req);
    const auth = validateApiKeyAndScope(token, "transactions:read");

    if (!auth.isValid) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    assertRateLimit(`api_v1:${auth.ownerId}`, RATE_LIMITS.api.default);

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

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
  } catch (error: any) {
    const masked = maskErrorForClient(error);
    return NextResponse.json(masked, { status: masked.statusCode || 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    seedDeveloperApiKey();

    const token = getBearerToken(req);
    const auth = validateApiKeyAndScope(token, "transactions:write");

    if (!auth.isValid) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    assertRateLimit(`api_v1:${auth.ownerId}`, RATE_LIMITS.transactions.create);

    const body = await req.json();
    if (!body.title || !body.amount) {
      return NextResponse.json(
        { error: "Validation Error: 'title' and 'amount' are required fields." },
        { status: 400 }
      );
    }

    const cleanTitle = sanitizeText(String(body.title)).trim().slice(0, 150);
    const cleanDescription = body.description ? sanitizeText(String(body.description)).trim().slice(0, 500) : "";

    const createdTx = {
      id: Math.floor(Math.random() * 90000) + 10000,
      title: cleanTitle,
      description: cleanDescription,
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
    const masked = maskErrorForClient(err);
    return NextResponse.json(masked, { status: masked.statusCode || 500 });
  }
}
