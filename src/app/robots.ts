import { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/lib/seo/config";

/**
 * Enterprise Next.js Metadata Route for robots.txt
 * Permits search engines to crawl public marketing and policy pages,
 * while strictly barring access to authenticated financial user data,
 * private ledger dashboards, administration tools, and tokenized invitations.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/about",
          "/features",
          "/pricing",
          "/contact",
          "/privacy",
          "/terms",
          "/cookies",
          "/copyright",
        ],
        disallow: [
          "/dashboard/",
          "/dashboard/*",
          "/api/",
          "/api/*",
          "/admin/",
          "/admin/*",
          "/invite/",
          "/invite/*",
          "/pay/",
          "/pay/*",
          "/join-group/",
          "/join-group/*",
          "/migrate/",
          "/migrate/*",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: [
          "/",
          "/about",
          "/features",
          "/pricing",
          "/contact",
          "/privacy",
          "/terms",
          "/cookies",
          "/copyright",
        ],
        disallow: [
          "/dashboard/",
          "/api/",
          "/admin/",
          "/invite/",
          "/pay/",
          "/join-group/",
        ],
      },
      {
        userAgent: "Bingbot",
        allow: [
          "/",
          "/about",
          "/features",
          "/pricing",
          "/contact",
          "/privacy",
          "/terms",
          "/cookies",
          "/copyright",
        ],
        disallow: [
          "/dashboard/",
          "/api/",
          "/admin/",
          "/invite/",
          "/pay/",
          "/join-group/",
        ],
      },
    ],
    sitemap: `${SITE_CONFIG.url}/sitemap.xml`,
    host: SITE_CONFIG.url,
  };
}
