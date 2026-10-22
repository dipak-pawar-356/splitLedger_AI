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
  "/cookies",
  "/copyright",
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

  const isRealClerkConfig = 
    Boolean(process.env.CLERK_SECRET_KEY) && 
    !process.env.CLERK_SECRET_KEY?.includes("sample_ci") &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.includes("ZXhhbXBsZQ");

  if (!isPublicRoute(request) && isRealClerkConfig) {
    authObj.protect();
  }

  const requestHeaders = new Headers(request.headers);
  if (authObj?.userId) {
    requestHeaders.set("x-clerk-user-id", authObj.userId);
  }

  // Forward native SplitLedger access token if present
  const nativeToken = request.cookies.get("sl_access_token")?.value;
  if (nativeToken) {
    requestHeaders.set("x-sl-access-token", nativeToken);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Inject security headers on responses
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");

  return response;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
