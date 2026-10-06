import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { avatar } = body;

    if (!avatar) {
      return NextResponse.json(
        { error: "Avatar data is required" },
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
    return NextResponse.json(
      { error: "Failed to update avatar" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();

    await db
      .update(users)
      .set({ avatar: null, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    revalidatePath("/dashboard/profile");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Avatar removal error:", error);
    return NextResponse.json(
      { error: "Failed to remove avatar" },
      { status: 500 }
    );
  }
}
