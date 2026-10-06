/**
 * Secure File Upload Guard & MIME Type Verification Engine
 */

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
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
  if (!allowedMimes.includes(file.type)) {
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
