import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { headers, cookies } from "next/headers";
import { db, withDbRetry } from "@/lib/db";
import { users } from "@/lib/db/schema/schema";
import { eq } from "drizzle-orm";
import { AuthenticationError, DatabaseError } from "@/lib/errors";

const reactCache = typeof cache === "function" ? cache : ((fn: any) => fn);

const DEV_USER = {
  id: 1,
  publicId: "usr_dev_default",
  clerkUserId: "user_dev_default",
  email: "dipak@splitledger.ai",
  name: "Dipak Pawar",
  avatar: null,
  defaultCurrency: "INR",
  theme: "system",
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const USER_COLUMNS = {
  id: users.id,
  publicId: users.publicId,
  clerkUserId: users.clerkUserId,
  email: users.email,
  name: users.name,
  avatar: users.avatar,
  defaultCurrency: users.defaultCurrency,
  theme: users.theme,
  emailVerified: users.emailVerified,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

function isDevOrTest(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "test" ||
    Boolean(process.env.VITEST) ||
    !process.env.CLERK_SECRET_KEY
  );
}

export const getCurrentUser = reactCache(async () => {
  try {
    let userId: string | null = null;
    try {
      const reqHeaders = await headers();
      const forwardedUserId = reqHeaders.get("x-clerk-user-id");

      if (forwardedUserId) {
        userId = forwardedUserId;
      } else if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY) {
        const cookieStore = await cookies();
        const hasSession = cookieStore.has("__session") || cookieStore.has("__clerk_db_jwt");
        if (hasSession) {
          const authObj = await Promise.race([
            auth(),
            new Promise<null>((res) => setTimeout(() => res(null), 1000)),
          ]);
          userId = authObj?.userId || null;
        }
      }
    } catch (_) {
      userId = null;
    }

    if (!userId) {
      if (isDevOrTest()) return DEV_USER;
      return null;
    }

    return await withDbRetry(async () => {
      const [existingUser] = await db
        .select(USER_COLUMNS)
        .from(users)
        .where(eq(users.clerkUserId, userId))
        .limit(1);

      if (existingUser) return existingUser;

      // Auto-provision user record in database
      let clerkUser: any = null;
      try {
        clerkUser = await Promise.race([
          currentUser(),
          new Promise<null>((res) => setTimeout(() => res(null), 1000)),
        ]);
      } catch (_) {}

      const userEmail = clerkUser?.emailAddresses[0]?.emailAddress || `user-${userId}@example.com`;
      const userName = clerkUser 
        ? `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || clerkUser.username || "User"
        : "User";

      const [newUser] = await db
        .insert(users)
        .values({
          clerkUserId: userId,
          email: userEmail,
          name: userName,
          avatar: clerkUser?.imageUrl || null,
          defaultCurrency: "INR",
          theme: "system",
          emailVerified: clerkUser?.emailAddresses[0]?.verification?.status === "verified",
        })
        .returning();

      return newUser || DEV_USER;
    });
  } catch (error) {
    if (isDevOrTest()) return DEV_USER;
    return null;
  }
});

export const requireAuth = reactCache(async () => {
  const user = await getCurrentUser();
  if (!user) {
    if (isDevOrTest()) return DEV_USER;
    throw new AuthenticationError("User not authenticated");
  }
  return user;
});

export async function requireAdmin() {
  const user = await requireAuth();
  return user;
}
