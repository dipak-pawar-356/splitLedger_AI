/**
 * Enterprise DevOps & Environment Configuration Validator
 */

export interface EnvValidationResult {
  isValid: boolean;
  environment: string;
  missingVariables: string[];
  warnings: string[];
  diagnostics: Record<string, "configured" | "missing" | "invalid">;
}

const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
];

const OPTIONAL_RECOMMENDED_VARS = [
  "NEXT_PUBLIC_APP_URL",
  "RESEND_API_KEY",
  "UPSTASH_REDIS_REST_URL",
];

/**
 * Validate runtime environment variables for production deployment safety
 */
export function validateEnvironment(): EnvValidationResult {
  const missingVariables: string[] = [];
  const warnings: string[] = [];
  const diagnostics: Record<string, "configured" | "missing" | "invalid"> = {};

  for (const varName of REQUIRED_ENV_VARS) {
    const val = process.env[varName];
    if (!val) {
      missingVariables.push(varName);
      diagnostics[varName] = "missing";
    } else if (varName === "DATABASE_URL" && !val.startsWith("postgres://") && !val.startsWith("postgresql://")) {
      diagnostics[varName] = "invalid";
      warnings.push(`DATABASE_URL does not use standard postgres:// scheme.`);
    } else {
      diagnostics[varName] = "configured";
    }
  }

  for (const varName of OPTIONAL_RECOMMENDED_VARS) {
    const val = process.env[varName];
    if (!val) {
      warnings.push(`Recommended optional variable '${varName}' is not set.`);
      diagnostics[varName] = "missing";
    } else {
      diagnostics[varName] = "configured";
    }
  }

  return {
    isValid: missingVariables.length === 0,
    environment: process.env.NODE_ENV || "development",
    missingVariables,
    warnings,
    diagnostics,
  };
}
