/**
 * Secure File Upload Guard & MIME Type Verification Engine
 */
import crypto from "crypto";

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
] as const;

export const ALLOWED_UPLOAD_FOLDERS = [
  "receipts",
  "avatars",
  "notes",
  "documents",
] as const;

export const BLOCKED_EXTENSIONS = [
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".php",
  ".js",
  ".ts",
  ".vbs",
  ".dll",
  ".scr",
  ".jar",
  ".msi",
  ".ps1",
  ".com",
  ".pif",
  ".htm",
  ".html",
  ".xhtml",
];

export interface FileValidationOptions {
  maxSizeBytes?: number; // Default: 10 MB (10 * 1024 * 1024)
  allowedMimeTypes?: readonly string[];
}

export interface ValidationResult {
  isValid: boolean;
  sanitizedFilename: string;
  error?: string;
}

/**
 * Validate and sanitize upload folder destination against whitelist
 */
export function validateUploadFolder(folder?: string | null): string {
  if (!folder) return "receipts";
  const clean = folder.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (ALLOWED_UPLOAD_FOLDERS.includes(clean as any)) {
    return clean;
  }
  return "receipts";
}

/**
 * Sanitize filename to prevent directory traversal and null byte injections
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return "unnamed_file";

  // Remove null bytes and path traversal sequences
  let clean = filename
    .replace(/\0/g, "")
    .replace(/\.\./g, "")
    .replace(/[/\\]/g, "")
    .trim();

  // Strip non-alphanumeric except dots, dashes, underscores
  clean = clean.replace(/[^a-zA-Z0-9._-]/g, "_");

  // Avoid starting with a dot
  if (clean.startsWith(".")) {
    clean = "_" + clean.slice(1);
  }

  return clean.slice(0, 100);
}

/**
 * Generate randomized collision-resistant unique filename
 */
export function generateSecureUploadFilename(originalName: string): string {
  const sanitized = sanitizeFilename(originalName);
  const dotIndex = sanitized.lastIndexOf(".");
  const ext = dotIndex !== -1 ? sanitized.slice(dotIndex).toLowerCase() : "";
  const randomSuffix = crypto.randomBytes(12).toString("hex");
  return `${Date.now()}_${randomSuffix}${ext}`;
}

/**
 * Inspect buffer magic bytes to prevent MIME-type spoofing
 */
export function validateBufferMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (!buffer || buffer.length < 4) return false;

  // JPEG: FF D8 FF
  if (mimeType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  // PNG: 89 50 4E 47 (0x89 'P' 'N' 'G')
  if (mimeType === "image/png") {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }

  // PDF: %PDF (25 50 44 46)
  if (mimeType === "application/pdf") {
    return (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    );
  }

  // WebP: 'RIFF' .... 'WEBP'
  if (mimeType === "image/webp") {
    if (buffer.length < 12) return false;
    const isRiff =
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46;
    const isWebp =
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50;
    return isRiff && isWebp;
  }

  // SVG: Inspect text content for XML/SVG declaration and absence of scripts
  if (mimeType === "image/svg+xml") {
    return validateSvgSafety(buffer);
  }

  return true;
}

/**
 * Sanitize and verify SVG safety against Stored XSS
 */
export function validateSvgSafety(buffer: Buffer): boolean {
  const content = buffer.toString("utf8").toLowerCase();
  
  // Must look like an SVG / XML
  if (!content.includes("<svg") && !content.includes("<?xml")) {
    return false;
  }

  // Block scripts, active event handlers, external objects, javascript: URIs
  const dangerousPatterns = [
    /<script\b/i,
    /javascript\s*:/i,
    /vbscript\s*:/i,
    /data\s*:\s*text\/html/i,
    /<foreignobject\b/i,
    /<object\b/i,
    /<embed\b/i,
    /<applet\b/i,
    /on\w+\s*=/i, // onload=, onerror=, etc.
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(content)) {
      return false;
    }
  }

  return true;
}

/**
 * Validate an uploaded file for security compliance
 */
export function validateUpload(
  file: { name: string; size: number; type: string },
  options: FileValidationOptions = {}
): ValidationResult {
  const maxSizeBytes = options.maxSizeBytes || 10 * 1024 * 1024; // 10MB
  const allowedMimes = options.allowedMimeTypes || ALLOWED_MIME_TYPES;

  const sanitized = sanitizeFilename(file.name);
  const lowerName = sanitized.toLowerCase();

  // 1. Check for blocked extensions
  for (const ext of BLOCKED_EXTENSIONS) {
    if (lowerName.endsWith(ext)) {
      return {
        isValid: false,
        sanitizedFilename: sanitized,
        error: `Executable file extension '${ext}' is blocked for security.`,
      };
    }
  }

  // 2. Check MIME Type
  if (!allowedMimes.includes(file.type as any)) {
    return {
      isValid: false,
      sanitizedFilename: sanitized,
      error: `Unsupported MIME type: '${file.type}'. Allowed: ${allowedMimes.join(", ")}`,
    };
  }

  // 3. Check File Size
  if (file.size > maxSizeBytes) {
    const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      sanitizedFilename: sanitized,
      error: `File size exceeds the maximum limit of ${maxMb}MB.`,
    };
  }

  return {
    isValid: true,
    sanitizedFilename: sanitized,
  };
}
