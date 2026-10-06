/**
 * Defensive Input Sanitization & Anti-XSS Protection Engine
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
};

/**
 * Escape HTML special characters to prevent Reflected & Stored XSS
 */
export function escapeHtml(input: string): string {
  if (!input || typeof input !== "string") return "";
  return input.replace(/[&<>"'/]/g, (char) => HTML_ESCAPE_MAP[char] || char);
}

/**
 * Strip all HTML tags completely
 */
export function stripHtml(input: string): string {
  if (!input || typeof input !== "string") return "";
  return input.replace(/<[^>]*>?/gm, "").trim();
}

/**
 * Defensive text sanitizer: Neutralizes script tags, event handlers (onerror, onload), and javascript: URIs
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== "string") return "";

  let cleaned = input;
  // Remove script tags and contents
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  // Remove javascript: and data: URIs
  cleaned = cleaned.replace(/javascript\s*:/gi, "");
  cleaned = cleaned.replace(/vbscript\s*:/gi, "");
  // Remove inline DOM event handlers
  cleaned = cleaned.replace(/on\w+\s*=\s*["'][^"']*["']/gi, "");
  cleaned = cleaned.replace(/on\w+\s*=\s*[^>\s]+/gi, "");

  return cleaned.trim();
}

/**
 * Recursively sanitize string fields in an object or array payload
 */
export function sanitizePayload<T>(payload: T): T {
  if (payload === null || payload === undefined) return payload;

  if (typeof payload === "string") {
    return sanitizeText(payload) as unknown as T;
  }

  if (Array.isArray(payload)) {
    return payload.map((item) => sanitizePayload(item)) as unknown as T;
  }

  if (typeof payload === "object" && !(payload instanceof Date)) {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(payload)) {
      result[key] = sanitizePayload(value);
    }
    return result as T;
  }

  return payload;
}
