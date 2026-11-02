import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { exportReportData } from "@/actions/reports";
import { assertRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { maskErrorForClient } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    assertRateLimit(`export:${user.id}`, RATE_LIMITS.exports.reports);

    const body = await req.json();
    const { format = "csv", filters = {} } = body;

    if (!["csv", "json", "pdf", "excel"].includes(format)) {
      return NextResponse.json({ error: "Invalid format. Supported: csv, json, pdf, excel" }, { status: 400 });
    }

    const exportResult = await exportReportData(format as any, filters);

    return new NextResponse(exportResult.content, {
      status: 200,
      headers: {
        "Content-Type": exportResult.mimeType,
        "Content-Disposition": `attachment; filename="${exportResult.filename}"`,
      },
    });
  } catch (error: any) {
    const masked = maskErrorForClient(error);
    return NextResponse.json(
      { error: masked.error, correlationId: masked.correlationId },
      { status: masked.statusCode || 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    assertRateLimit(`export:${user.id}`, RATE_LIMITS.exports.reports);

    const url = new URL(req.url);
    const format = (url.searchParams.get("format") || "csv") as any;
    const reportType = (url.searchParams.get("reportType") || "overview") as any;
    const period = (url.searchParams.get("period") || "all") as any;
    const groupId = url.searchParams.get("groupId") ? Number(url.searchParams.get("groupId")) : undefined;
    const categoryId = url.searchParams.get("categoryId") ? Number(url.searchParams.get("categoryId")) : undefined;

    if (!["csv", "json", "pdf", "excel"].includes(format)) {
      return NextResponse.json({ error: "Invalid format. Supported: csv, json, pdf, excel" }, { status: 400 });
    }

    const exportResult = await exportReportData(format, {
      reportType,
      period,
      groupId,
      categoryId,
    });

    return new NextResponse(exportResult.content, {
      status: 200,
      headers: {
        "Content-Type": exportResult.mimeType,
        "Content-Disposition": `attachment; filename="${exportResult.filename}"`,
      },
    });
  } catch (error: any) {
    const masked = maskErrorForClient(error);
    return NextResponse.json(
      { error: masked.error, correlationId: masked.correlationId },
      { status: masked.statusCode || 500 }
    );
  }
}
