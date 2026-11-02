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
    const auth = validateApiKeyAndScope(token, "groups:read");

    if (!auth.isValid) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    assertRateLimit(`api_v1:${auth.ownerId}`, RATE_LIMITS.api.default);

    const sampleGroups = [
      { id: 1, name: "Goa Vacation Trip", currency: "INR", memberCount: 6, totalExpenses: 48500 },
      { id: 2, name: "Apartment Flatmates", currency: "INR", memberCount: 3, totalExpenses: 92000 },
    ];

    return NextResponse.json({ data: sampleGroups, currency: "INR" });
  } catch (error: any) {
    const masked = maskErrorForClient(error);
    return NextResponse.json(masked, { status: masked.statusCode || 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    seedDeveloperApiKey();

    const token = getBearerToken(req);
    const auth = validateApiKeyAndScope(token, "groups:write");

    if (!auth.isValid) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    assertRateLimit(`api_v1:${auth.ownerId}`, RATE_LIMITS.actions.write);

    const body = await req.json();
    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json({ error: "Validation Error: 'name' is required." }, { status: 400 });
    }

    const cleanName = sanitizeText(body.name).trim().slice(0, 100);

    const createdGroup = {
      id: Math.floor(Math.random() * 9000) + 1000,
      name: cleanName,
      currency: body.currency || "INR",
      memberCount: 1,
      createdAt: new Date().toISOString(),
    };

    await dispatchWebhookEvent("group.created", createdGroup, auth.ownerId);

    return NextResponse.json({ data: createdGroup, message: "Group created successfully." }, { status: 201 });
  } catch (err: any) {
    const masked = maskErrorForClient(err);
    return NextResponse.json(masked, { status: masked.statusCode || 500 });
  }
}
