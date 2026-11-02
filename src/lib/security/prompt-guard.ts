/**
 * Enterprise AI Security Guard & Anti-Prompt-Injection Engine
 * 
 * Protects AI Assistant, NLP parsing, and Chatbot workflows against:
 * - Direct & indirect prompt injection
 * - Instruction override & jailbreak attempts
 * - System prompt leakage attempts
 * - Delimiter tampering & context poisoning
 */

import { threatMonitor } from "./threat-monitor";

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above|existing)\s+(instructions|prompts|rules|commands|constraints)/i,
  /disregard\s+(all\s+)?(previous|prior|above|existing)\s+(instructions|prompts|rules|constraints)/i,
  /system\s+prompt\s+(reveal|leak|show|print|output|dump|echo)/i,
  /show\s+(me\s+)?(your|the)\s+(system\s+prompt|master\s+prompt|hidden\s+instructions|initial\s+prompt)/i,
  /what\s+(is|are)\s+(your|the)\s+(system\s+prompt|instructions|initial\s+prompt)/i,
  /repeat\s+(everything|the\s+words)\s+above/i,
  /you\s+are\s+now\s+(in\s+developer\s+mode|dan|jailbroken|unrestricted|an\s+ai\s+without\s+rules)/i,
  /act\s+as\s+(an\s+unrestricted|a\s+hacked|root\s+admin|an\s+adversary|a\s+penetration\s+tester)/i,
  /forget\s+(everything|all\s+rules|your\s+identity|all\s+prior\s+instructions)/i,
  /override\s+(all\s+)?(safety|security|permissions|system|guardrails)/i,
  /base64\s+decode\s+and\s+(execute|run)/i,
  /eval\s*\(.*system.*\)/i,
  /print\s*(process\.env|environment\s+variables|api\s*keys|database_url)/i,
  /leak\s*(database|credentials|tokens|secret\s*keys)/i,
  /!\[.*\]\(https?:\/\/[^\s)]+\)/i, // Markdown image data exfiltration
];

export interface PromptScanResult {
  isSafe: boolean;
  sanitizedText: string;
  threatDetected?: string;
}

/**
 * Scan and sanitize user prompt input before passing to AI engine
 */
export function sanitizeAndScanPrompt(rawInput: string, maxLength: number = 2000): PromptScanResult {
  if (!rawInput || typeof rawInput !== "string") {
    return { isSafe: true, sanitizedText: "" };
  }

  // 1. Enforce length cap to prevent token DOS
  const truncated = rawInput.slice(0, maxLength);

  // 2. Normalize and strip invisible zero-width characters and control chars
  const normalized = truncated
    .replace(/[\u200B-\u200D\uFEFF\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim();

  // 3. Check for Prompt Injection / Instruction Override Attacks
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(normalized)) {
      threatMonitor.recordEvent({
        type: "ai_abuse",
        severity: "high",
        details: `Prompt injection attack blocked: ${pattern.toString().slice(0, 80)}`,
      });
      return {
        isSafe: false,
        sanitizedText: "I cannot process queries that attempt to override system security instructions.",
        threatDetected: `Prompt injection attack pattern detected: ${pattern.toString()}`,
      };
    }
  }

  // 4. Strip delimiter hijacking attempts (e.g., trying to close system instructions)
  const safeText = normalized
    .replace(/<\/?system>/gi, "")
    .replace(/<\/?instructions>/gi, "")
    .replace(/---BEGIN SYSTEM---/gi, "")
    .replace(/---END SYSTEM---/gi, "")
    .replace(/<\|im_start\|>/gi, "")
    .replace(/<\|im_end\|>/gi, "")
    .replace(/\[\/?INST\]/gi, "")
    .replace(/<<\/?SYS>>/gi, "");

  return {
    isSafe: true,
    sanitizedText: safeText,
  };
}

