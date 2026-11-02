import { NextRequest, NextResponse } from "next/server";
import { validateApiKeyAndScope, seedDeveloperApiKey } from "@/lib/api-gateway/api-keys";
import { assertRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { maskErrorForClient } from "@/lib/errors";

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
    const auth = validateApiKeyAndScope(token, "settlements:read");

    if (!auth.isValid) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    assertRateLimit(`api_v1:${auth.ownerId}`, RATE_LIMITS.api.default);

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");

    // Sample simplified settlement plan
    const sampleSettlements = [
      { fromUserId: 2, fromUserName: "Aarav Sharma", toUserId: 1, toUserName: "Dipak Pawar", amount: 1500, currency: "INR" },
      { fromUserId: 3, fromUserName: "Priya Patel", toUserId: 1, toUserName: "Dipak Pawar", amount: 2200, currency: "INR" },
    ];

    return NextResponse.json({
      groupId: groupId ? parseInt(groupId, 10) : null,
      settlements: sampleSettlements,
      totalSettlementAmount: 3700,
      currency: "INR",
      algorithm: "Greedy Debt Simplification (O(N log N))",
    });
  } catch (error: any) {
    const masked = maskErrorForClient(error);
    return NextResponse.json(masked, { status: masked.statusCode || 500 });
  }
}
