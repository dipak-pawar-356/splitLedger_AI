import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { exportReportData } from "@/actions/reports";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await requireAuth();

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
    console.error("Error exporting report data:", error);
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || "Failed to export data" }, { status });
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireAuth();

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
    console.error("Error in export GET handler:", error);
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || "Failed to export data" }, { status });
  }
}
