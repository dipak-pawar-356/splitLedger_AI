/**
 * Enterprise SSRF (Server-Side Request Forgery) Protection Guard
 * 
 * Validates external URLs against RFC 1918 private subnets, localhost, link-local,
 * AWS/GCP cloud metadata IP (169.254.169.254), and non-HTTP protocols.
 */

import { URL } from "url";
import { threatMonitor } from "./threat-monitor";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
  "169.254.169.254", // Cloud metadata service
  "metadata.google.internal",
  "instance-data",
]);

/**
 * Checks if an IP or hostname belongs to private / internal network ranges
 */
export function isPrivateOrInternalHost(hostname: string): boolean {
  const lower = hostname.toLowerCase().trim();

  if (BLOCKED_HOSTS.has(lower)) {
    return true;
  }

  // IPv4 Private Subnets
  // 10.0.0.0/8
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(lower)) return true;
  // 172.16.0.0/12 (172.16 - 172.31)
  const match172 = lower.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (match172) {
    const octet = parseInt(match172[1], 10);
    if (octet >= 16 && octet <= 31) return true;
  }
  // 192.168.0.0/16
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(lower)) return true;
  // 127.0.0.0/8
  if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(lower)) return true;
  // 169.254.0.0/16 (Link Local & AWS/Azure/GCP metadata)
  if (/^169\.254\.\d{1,3}\.\d{1,3}$/.test(lower)) return true;
  // 0.0.0.0/8
  if (/^0\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(lower)) return true;

  // Local / internal domain suffixes
  if (
    lower.endsWith(".local") ||
    lower.endsWith(".internal") ||
    lower.endsWith(".localhost") ||
    lower.endsWith(".corp") ||
    lower.endsWith(".home")
  ) {
    return true;
  }

  return false;
}

/**
 * Validates if an outbound URL is safe to fetch
 */
export function validateOutboundUrl(
  inputUrl: string,
  options: { requireHttps?: boolean } = {}
): { isValid: boolean; error?: string; parsedUrl?: URL } {
  if (!inputUrl || typeof inputUrl !== "string") {
    return { isValid: false, error: "URL is required and must be a string." };
  }

  let parsed: URL;
  try {
    parsed = new URL(inputUrl);
  } catch {
    return { isValid: false, error: "Malformed URL format." };
  }

  // Protocol check
  const isHttps = parsed.protocol === "https:";
  const isHttp = parsed.protocol === "http:";

  if (options.requireHttps && !isHttps) {
    return { isValid: false, error: "Only HTTPS URLs are allowed in production." };
  }

  if (!isHttps && !isHttp) {
    return { isValid: false, error: `Disallowed protocol: '${parsed.protocol}'. Only HTTP(S) permitted.` };
  }

  // SSRF Host check
  if (isPrivateOrInternalHost(parsed.hostname)) {
    threatMonitor.recordEvent({
      type: "ssrf_attempt",
      severity: "high",
      details: `SSRF connection attempt to restricted target blocked: ${parsed.hostname}`,
    });
    return {
      isValid: false,
      error: `Destination '${parsed.hostname}' is a reserved, local, or private address. Outbound requests are blocked.`,
    };
  }

  return { isValid: true, parsedUrl: parsed };
}

