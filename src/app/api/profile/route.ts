import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, profiles } from "@/lib/db/schema/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { appCache } from "@/lib/cache";

export async function GET() {
  try {
    const user = await requireAuth();
    const [profile] = await db
      .select({ username: profiles.username })
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1);

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      username: profile?.username || null,
      defaultCurrency: user.defaultCurrency,
    });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { name } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    await db
      .update(users)
      .set({ name: trimmedName, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    // Optional background sync with Clerk if key available
    if (user.clerkUserId && process.env.CLERK_SECRET_KEY && !process.env.CLERK_SECRET_KEY.includes("sample_ci")) {
      const parts = trimmedName.split(" ");
      const firstName = parts[0] || "";
      const lastName = parts.slice(1).join(" ") || "";
      try {
        await fetch(`https://api.clerk.com/v1/users/${user.clerkUserId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
          }),
          signal: AbortSignal.timeout(3000),
        });
      } catch (_) {}
    }

    appCache.invalidateTags([`user:${user.id}`, "profile", "groups", "dashboard"]);

    try {
      revalidatePath("/dashboard", "layout");
      revalidatePath("/dashboard/profile");
      revalidatePath("/dashboard/groups");
      revalidatePath("/dashboard/settings");
    } catch (_) {}

    return NextResponse.json({ success: true, name: trimmedName });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
