/**
 * Enterprise Background Job Queue Engine
 * Handles asynchronous background processing for exports, notifications, and ledger recalculations.
 */

export type JobType =
  | "export_pdf"
  | "export_csv"
  | "export_json"
  | "send_email"
  | "send_whatsapp"
  | "recalculate_settlements"
  | "process_notification_batch";

export type JobStatus = "queued" | "running" | "completed" | "failed" | "retried";

export interface QueueJob<T = any> {
  id: string;
  type: JobType;
  payload: T;
  status: JobStatus;
  priority: "low" | "medium" | "high";
  attempts: number;
  maxRetries: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: any;
}

export type JobHandler = (job: QueueJob) => Promise<any>;

class BackgroundJobQueue {
  private jobs: Map<string, QueueJob> = new Map();
  private handlers: Map<JobType, JobHandler> = new Map();
  private isProcessing = false;

  constructor() {
    this.registerDefaultHandlers();
  }

  private registerDefaultHandlers() {
    // Default mock handlers for asynchronous execution
    this.registerHandler("export_pdf", async (job) => ({ success: true, fileUrl: "/exports/report.pdf" }));
    this.registerHandler("export_csv", async (job) => ({ success: true, fileUrl: "/exports/report.csv" }));
    this.registerHandler("export_json", async (job) => ({ success: true, fileUrl: "/exports/report.json" }));
    this.registerHandler("send_email", async (job) => ({ success: true, messageId: `msg_${Date.now()}` }));
    this.registerHandler("send_whatsapp", async (job) => ({ success: true, status: "sent" }));
    this.registerHandler("recalculate_settlements", async (job) => ({ success: true, recalculated: true }));
    this.registerHandler("process_notification_batch", async (job) => ({ success: true, processedCount: 10 }));
  }

  registerHandler(type: JobType, handler: JobHandler): void {
    this.handlers.set(type, handler);
  }

  enqueue<T = any>(
    type: JobType,
    payload: T,
    options?: { priority?: "low" | "medium" | "high"; maxRetries?: number }
  ): QueueJob<T> {
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const job: QueueJob<T> = {
      id,
      type,
      payload,
      status: "queued",
      priority: options?.priority || "medium",
      attempts: 0,
      maxRetries: options?.maxRetries ?? 3,
      createdAt: new Date(),
    };

    this.jobs.set(id, job);
    return job;
  }

  async processNextJob(): Promise<QueueJob | null> {
    const queuedJob = Array.from(this.jobs.values()).find((j) => j.status === "queued" || j.status === "retried");
    if (!queuedJob) return null;

    queuedJob.status = "running";
    queuedJob.attempts++;
    queuedJob.startedAt = new Date();

    const handler = this.handlers.get(queuedJob.type);
    if (!handler) {
      queuedJob.status = "failed";
      queuedJob.error = `No registered handler for job type '${queuedJob.type}'`;
      return queuedJob;
    }

    try {
      const result = await handler(queuedJob);
      queuedJob.status = "completed";
      queuedJob.result = result;
      queuedJob.completedAt = new Date();
    } catch (err: any) {
      if (queuedJob.attempts < queuedJob.maxRetries) {
        queuedJob.status = "retried";
      } else {
        queuedJob.status = "failed";
      }
      queuedJob.error = err?.message || String(err);
    }

    return queuedJob;
  }

  async processAll(): Promise<number> {
    let processed = 0;
    while (true) {
      const job = await this.processNextJob();
      if (!job) break;
      processed++;
    }
    return processed;
  }

  getJob(id: string): QueueJob | undefined {
    return this.jobs.get(id);
  }

  getStats() {
    const jobs = Array.from(this.jobs.values());
    return {
      total: jobs.length,
      queued: jobs.filter((j) => j.status === "queued").length,
      running: jobs.filter((j) => j.status === "running").length,
      completed: jobs.filter((j) => j.status === "completed").length,
      failed: jobs.filter((j) => j.status === "failed").length,
      retried: jobs.filter((j) => j.status === "retried").length,
    };
  }

  clear(): void {
    this.jobs.clear();
  }
}

export const jobQueue = new BackgroundJobQueue();
