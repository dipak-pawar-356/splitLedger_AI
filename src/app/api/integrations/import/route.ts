import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { assertRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { maskErrorForClient, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    assertRateLimit(`import:${user.id}`, RATE_LIMITS.actions.write);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const format = formData.get("format") as string | null;

    if (!file || !format) {
      return NextResponse.json({ error: "File and format are required" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 400 });
    }

    if (!["json", "csv"].includes(format)) {
      return NextResponse.json({ error: "Invalid format. Supported formats: json, csv" }, { status: 400 });
    }

    const text = await file.text();
    let data: any;

    switch (format) {
      case "json": {
        try {
          data = JSON.parse(text);
        } catch {
          throw new ValidationError("Malformed JSON in uploaded file.");
        }
        break;
      }
      case "csv":
        data = parseCSV(text);
        break;
      default:
        return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }

    if (!data || typeof data !== "object") {
      throw new ValidationError("Invalid or empty import dataset.");
    }

    return NextResponse.json({ success: true, imported: Object.keys(data) });
  } catch (error) {
    console.error("Error importing data:", error);
    const masked = maskErrorForClient(error);
    return NextResponse.json(masked, { status: masked.statusCode || 500 });
  }
}

function parseCSV(text: string): any {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { transactions: [] };

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
  const data: any = { transactions: [] };

  for (let i = 1; i < Math.min(lines.length, 1000); i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
    const obj: any = {};
    headers.forEach((header, index) => {
      if (header && header !== "__proto__" && header !== "constructor" && header !== "prototype") {
        obj[header] = values[index] || "";
      }
    });
    data.transactions.push(obj);
  }

  return data;
}
