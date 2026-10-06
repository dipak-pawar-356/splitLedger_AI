/**
 * Enterprise Structured Logger with Execution Timing & Performance Tracking
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  userId?: number | string;
  requestId?: string;
  durationMs?: number;
  module?: string;
  action?: string;
  metadata?: Record<string, any>;
  error?: any;
}

class StructuredLogger {
  private isProd = process.env.NODE_ENV === "production";

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const logObj = {
      timestamp,
      level,
      message,
      ...(context?.module && { module: context.module }),
      ...(context?.action && { action: context.action }),
      ...(context?.durationMs !== undefined && { durationMs: context.durationMs }),
      ...(context?.userId && { userId: context.userId }),
      ...(context?.requestId && { requestId: context.requestId }),
      ...(context?.metadata && { metadata: context.metadata }),
      ...(context?.error && {
        error: context.error instanceof Error ? context.error.message : String(context.error),
      }),
    };

    return JSON.stringify(logObj);
  }

  debug(message: string, context?: LogContext): void {
    if (!this.isProd) {
      console.debug(this.formatMessage("debug", message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    console.info(this.formatMessage("info", message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage("warn", message, context));
  }

  error(message: string, context?: LogContext): void {
    console.error(this.formatMessage("error", message, context));
  }

  /**
   * Measure execution time of async operation and warn if slow (>300ms)
   */
  async withTiming<T>(
    actionName: string,
    fn: () => Promise<T>,
    context?: Omit<LogContext, "durationMs" | "action">
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const durationMs = Number((performance.now() - start).toFixed(2));

      if (durationMs > 300) {
        this.warn(`Slow action detected: ${actionName}`, {
          ...context,
          action: actionName,
          durationMs,
        });
      } else {
        this.debug(`Action completed: ${actionName}`, {
          ...context,
          action: actionName,
          durationMs,
        });
      }

      return result;
    } catch (err: any) {
      const durationMs = Number((performance.now() - start).toFixed(2));
      this.error(`Action failed: ${actionName}`, {
        ...context,
        action: actionName,
        durationMs,
        error: err,
      });
      throw err;
    }
  }
}

export const logger = new StructuredLogger();
