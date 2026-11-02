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
  const authObj = await auth();

  const isRealClerkConfig =
    Boolean(process.env.CLERK_SECRET_KEY) &&
    !process.env.CLERK_SECRET_KEY?.includes("sample_ci") &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.includes("ZXhhbXBsZQ");

  if (!isPublicRoute(request)) {
    if (isRealClerkConfig) {
      authObj.protect();
    } else if (process.env.NODE_ENV === "production") {
      const nativeToken = request.cookies.get("sl_access_token")?.value;
      if (!authObj?.userId && !nativeToken) {
        const signInUrl = new URL("/sign-in", request.url);
        signInUrl.searchParams.set("redirect_url", request.nextUrl.pathname);
        return NextResponse.redirect(signInUrl);
      }
    }
  }

  // Sanitize incoming headers to prevent client-side header spoofing
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-clerk-user-id");
  requestHeaders.delete("x-sl-access-token");

  // Only set authenticated userId from verified server-side authObj
  if (authObj?.userId) {
    requestHeaders.set("x-clerk-user-id", authObj.userId);
  }

  // Forward native SplitLedger access token ONLY from secure httpOnly cookie
  const nativeToken = request.cookies.get("sl_access_token")?.value;
  if (nativeToken) {
    requestHeaders.set("x-sl-access-token", nativeToken);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Inject production-grade security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("Cross-Origin-Embedder-Policy", "credentialless");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");

  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com https://*.clerk.accounts.dev https://clerk.splitledger.ai https://*.clerk.com",
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://img.clerk.com https://*.clerk.com https:",
    "font-src 'self' https://fonts.gstatic.com data:",
    "connect-src 'self' https://*.clerk.accounts.dev https://clerk.splitledger.ai https://*.clerk.com https://api.clerk.com https://*.neon.tech wss://*.neon.tech https://res.cloudinary.com",
    "frame-src 'self' https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
  response.headers.set("Content-Security-Policy", cspHeader);

  // Prevent caching of sensitive financial views and authenticated API payloads
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/api")) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  return response;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
