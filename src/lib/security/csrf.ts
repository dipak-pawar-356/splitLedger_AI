/**
 * CSRF Protection
 * 
 * Utilities for generating and validating CSRF tokens
 */

import { cookies } from "next/headers";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Generate a random CSRF token
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Set CSRF token in cookie
 */
export async function setCSRFToken(): Promise<string> {
  const token = generateCSRFToken();
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });
  return token;
}

/**
 * Get CSRF token from cookie
 */
export async function getCSRFToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_COOKIE_NAME)?.value;
}

/**
 * Validate CSRF token from request
 */
export async function validateCSRFToken(token: string): Promise<boolean> {
  const cookieToken = await getCSRFToken();
  return cookieToken === token && cookieToken !== undefined;
}

/**
 * Get CSRF token for client-side use (non-httpOnly cookie)
 */
export async function getClientCSRFToken(): Promise<string> {
  const token = generateCSRFToken();
  const cookieStore = await cookies();
  cookieStore.set(`client_${CSRF_COOKIE_NAME}`, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });
  return token;
}

/**
 * Validate CSRF token from header
 */
export async function validateCSRFHeader(headers: Headers): Promise<boolean> {
  const token = headers.get(CSRF_HEADER_NAME);
  if (!token) return false;
  return validateCSRFToken(token);
}
