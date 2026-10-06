import { NextResponse } from "next/server";
import { checkSystemHealth } from "@/lib/monitoring/health";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const health = await checkSystemHealth();
    const statusCode = health.status === "critical" ? 503 : 200;

    return NextResponse.json(health, {
      status: statusCode,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "critical",
        timestamp: new Date().toISOString(),
        error: error?.message || "Health check execution failed",
      },
      {
        status: 503,
      }
    );
  }
}
