import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assertRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { maskErrorForClient } from "@/lib/errors";

function isValidAvatar(url: string): boolean {
  if (typeof url !== "string" || url.length > 2048) return false;
  const lower = url.trim().toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("vbscript:") || lower.includes("<")) return false;
  return lower.startsWith("https://") || lower.startsWith("/uploads/") || lower.startsWith("data:image/");
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    assertRateLimit(`avatar:${user.id}`, RATE_LIMITS.uploads.avatars);

    const body = await request.json();
    const { avatar } = body;

    if (!avatar || !isValidAvatar(avatar)) {
      return NextResponse.json(
        { error: "Valid avatar URL or image data is required (HTTPS, /uploads/, or data:image/)" },
        { status: 400 }
      );
    }

    await db
      .update(users)
      .set({ avatar, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    revalidatePath("/dashboard/profile");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Avatar update error:", error);
    const masked = maskErrorForClient(error);
    return NextResponse.json(masked, { status: masked.statusCode || 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    assertRateLimit(`avatar_del:${user.id}`, RATE_LIMITS.actions.delete);

    await db
      .update(users)
      .set({ avatar: null, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    revalidatePath("/dashboard/profile");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Avatar removal error:", error);
    const masked = maskErrorForClient(error);
    return NextResponse.json(masked, { status: masked.statusCode || 500 });
  }
}
