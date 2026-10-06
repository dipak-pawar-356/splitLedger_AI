/**
 * Security Threat & Anomaly Monitor
 * Detects suspicious access patterns, rate limit violations, and privilege escalation attempts.
 */

export type ThreatSeverity = "low" | "medium" | "high" | "critical";

export interface SecurityEvent {
  id: string;
  type: "failed_login" | "rate_limit_exceeded" | "unauthorized_access" | "privilege_escalation" | "malicious_payload";
  severity: ThreatSeverity;
  userId?: number | string;
  ip?: string;
  details: string;
  timestamp: Date;
}

class SecurityThreatMonitor {
  private events: SecurityEvent[] = [];
  private maxHistory = 500;

  /**
   * Log security incident event
   */
  recordEvent(event: Omit<SecurityEvent, "id" | "timestamp">): SecurityEvent {
    const fullEvent: SecurityEvent = {
      ...event,
      id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date(),
    };

    this.events.push(fullEvent);
    if (this.events.length > this.maxHistory) {
      this.events.shift();
    }

    if (fullEvent.severity === "critical" || fullEvent.severity === "high") {
      console.warn(`[SECURITY ALERT] [${fullEvent.severity.toUpperCase()}] ${fullEvent.type}: ${fullEvent.details}`);
    }

    return fullEvent;
  }

  /**
   * Get recent security events filtered by severity or type
   */
  getRecentEvents(filter?: { severity?: ThreatSeverity; type?: string; limit?: number }): SecurityEvent[] {
    let result = [...this.events];

    if (filter?.severity) {
      result = result.filter((e) => e.severity === filter.severity);
    }

    if (filter?.type) {
      result = result.filter((e) => e.type === filter.type);
    }

    return result.slice(-(filter?.limit || 50)).reverse();
  }

  /**
   * Clear events buffer (for testing)
   */
  clear(): void {
    this.events = [];
  }
}

export const threatMonitor = new SecurityThreatMonitor();
