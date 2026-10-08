import { cache } from "react";
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
  upiId: "dipak@okhdfcbank",
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
  upiId: users.upiId,
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

function extractUserIdFromClerkJwt(token: string | undefined | null): string | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const json = Buffer.from(parts[1], "base64url").toString("utf-8");
    const payload = JSON.parse(json);
    if (payload && typeof payload.sub === "string" && payload.sub.length > 0) {
      if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) {
        return null;
      }
      return payload.sub;
    }
  } catch (_) {
    return null;
  }
  return null;
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
        const sessionToken = cookieStore.get("__session")?.value;
        const dbJwtToken = cookieStore.get("__clerk_db_jwt")?.value;

        userId = extractUserIdFromClerkJwt(sessionToken) || extractUserIdFromClerkJwt(dbJwtToken);
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

      // Auto-provision user record in database without Clerk sync headers crash
      let clerkUser: any = null;
      if (process.env.CLERK_SECRET_KEY && !process.env.CLERK_SECRET_KEY.includes("sample_ci")) {
        try {
          const resp = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
            headers: {
              Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
            },
            signal: AbortSignal.timeout(3000),
          });
          if (resp.ok) {
            clerkUser = await resp.json();
          }
        } catch (_) {}
      }

      const emailObj = clerkUser?.email_addresses?.[0];
      const userEmail = emailObj?.email_address || clerkUser?.emailAddresses?.[0]?.emailAddress || `user-${userId}@example.com`;
      const userName = clerkUser 
        ? `${clerkUser.first_name || clerkUser.firstName || ''} ${clerkUser.last_name || clerkUser.lastName || ''}`.trim() || clerkUser.username || "User"
        : "User";

      const [newUser] = await db
        .insert(users)
        .values({
          clerkUserId: userId,
          email: userEmail,
          name: userName,
          avatar: clerkUser?.image_url || clerkUser?.imageUrl || null,
          defaultCurrency: "INR",
          theme: "system",
          emailVerified: emailObj?.verification?.status === "verified",
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
