import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await requireAuth();

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const format = formData.get("format") as string;

  if (!file || !format) {
    return NextResponse.json({ error: "File and format are required" }, { status: 400 });
  }

  try {
    const text = await file.text();
    let data: any;

    switch (format) {
      case "json":
        data = JSON.parse(text);
        break;
      case "csv":
        data = parseCSV(text);
        break;
      default:
        return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }

    // Import data into database
    // if (data.contacts) {
    //   await db.insert(contacts).values(data.contacts.map((c: any) => ({ ...c, userId: user.id })));
    // }
    // if (data.transactions) {
    //   await db.insert(transactions).values(data.transactions.map((t: any) => ({ ...t, userId: user.id })));
    // }
    // if (data.groups) {
    //   await db.insert(groups).values(data.groups.map((g: any) => ({ ...g, userId: user.id })));
    // }

    return NextResponse.json({ success: true, imported: Object.keys(data) });
  } catch (error) {
    console.error("Error importing data:", error);
    return NextResponse.json({ error: "Failed to import data" }, { status: 500 });
  }
}

function parseCSV(text: string): any {
  // Simple CSV parsing - in production, use a proper CSV library
  const lines = text.split("\n");
  const headers = lines[0].split(",");
  const data: any = { transactions: [] };

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header.trim()] = values[index]?.trim();
    });
    data.transactions.push(obj);
  }

  return data;
}
