import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/forgot-password(.*)",
  "/verify(.*)",
  "/features",
  "/pricing",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/invite(.*)",
  "/join-group(.*)",
  "/pay(.*)",
  "/api/webhooks(.*)",
  "/api/health(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  // Allow internal Next.js Server Action forwarding without middleware re-interception
  if (request.headers.get("x-action-forwarded") === "1") {
    return;
  }

  const authObj = await auth();

  if (!isPublicRoute(request)) {
    authObj.protect();
  }

  const requestHeaders = new Headers(request.headers);
  if (authObj?.userId) {
    requestHeaders.set("x-clerk-user-id", authObj.userId);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
