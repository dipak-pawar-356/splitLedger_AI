import { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/lib/seo/config";

/**
 * Enterprise Next.js Metadata Route for robots.txt
 * Permits standard search engines and modern AI crawlers to index
 * public marketing, features, pricing, and policy pages, while strictly
 * blocking access to authenticated financial user data, private ledger
 * dashboards, administration tools, and tokenized settlement paths.
 */
export default function robots(): MetadataRoute.Robots {
  const publicAllowedRoutes = [
    "/",
    "/about",
    "/features",
    "/pricing",
    "/contact",
    "/privacy",
    "/terms",
    "/cookies",
    "/copyright",
  ];

  const privateBlockedRoutes = [
    "/dashboard",
    "/dashboard/*",
    "/api",
    "/api/*",
    "/admin",
    "/admin/*",
    "/sign-in",
    "/sign-in/*",
    "/sign-up",
    "/sign-up/*",
    "/forgot-password",
    "/forgot-password/*",
    "/invite",
    "/invite/*",
    "/pay",
    "/pay/*",
    "/join-group",
    "/join-group/*",
    "/migrate",
    "/migrate/*",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: publicAllowedRoutes,
        disallow: privateBlockedRoutes,
      },
      {
        userAgent: "Googlebot",
        allow: publicAllowedRoutes,
        disallow: privateBlockedRoutes,
      },
      {
        userAgent: "Bingbot",
        allow: publicAllowedRoutes,
        disallow: privateBlockedRoutes,
      },
      {
        userAgent: "DuckDuckBot",
        allow: publicAllowedRoutes,
        disallow: privateBlockedRoutes,
      },
      {
        userAgent: "Applebot",
        allow: publicAllowedRoutes,
        disallow: privateBlockedRoutes,
      },
      {
        userAgent: "YandexBot",
        allow: publicAllowedRoutes,
        disallow: privateBlockedRoutes,
      },
      {
        userAgent: "GPTBot",
        allow: publicAllowedRoutes,
        disallow: privateBlockedRoutes,
      },
      {
        userAgent: "ChatGPT-User",
        allow: publicAllowedRoutes,
        disallow: privateBlockedRoutes,
      },
      {
        userAgent: "PerplexityBot",
        allow: publicAllowedRoutes,
        disallow: privateBlockedRoutes,
      },
      {
        userAgent: "ClaudeBot",
        allow: publicAllowedRoutes,
        disallow: privateBlockedRoutes,
      },
      {
        userAgent: "Google-Extended",
        allow: publicAllowedRoutes,
        disallow: privateBlockedRoutes,
      },
    ],
    sitemap: `${SITE_CONFIG.url}/sitemap.xml`,
    host: SITE_CONFIG.url,
  };
}
