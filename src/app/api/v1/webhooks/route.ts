import { NextRequest, NextResponse } from "next/server";
import { validateApiKeyAndScope, seedDeveloperApiKey } from "@/lib/api-gateway/api-keys";
import { registerWebhookSubscription, listWebhookSubscriptions } from "@/lib/webhooks/dispatcher";

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
  seedDeveloperApiKey();

  const token = getBearerToken(req);
  const auth = validateApiKeyAndScope(token, "webhooks:manage");

  if (!auth.isValid) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const subscriptions = listWebhookSubscriptions(auth.ownerId);
  return NextResponse.json({ data: subscriptions });
}

export async function POST(req: NextRequest) {
  seedDeveloperApiKey();

  const token = getBearerToken(req);
  const auth = validateApiKeyAndScope(token, "webhooks:manage");

  if (!auth.isValid) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (!body.url || !body.events || !Array.isArray(body.events)) {
      return NextResponse.json(
        { error: "Validation Error: 'url' (string) and 'events' (array) are required." },
        { status: 400 }
      );
    }

    const sub = registerWebhookSubscription(auth.ownerId || 1, body.url, body.events, body.secret);

    return NextResponse.json(
      {
        data: sub,
        message: "Webhook endpoint registered successfully. Save the signing secret securely.",
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Invalid payload." }, { status: 400 });
  }
}
