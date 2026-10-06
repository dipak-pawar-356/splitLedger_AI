/**
 * Enterprise Priority Background Job Queue & Dead-Letter Queue (DLQ)
 */

export type JobPriority = "high" | "medium" | "low";
export type JobType =
  | "settlement_recalculation"
  | "ai_analysis"
  | "notification_delivery"
  | "receipt_ocr"
  | "report_generation"
  | "budget_update";

export interface BackgroundJob {
  id: string;
  type: JobType;
  priority: JobPriority;
  payload: any;
  status: "queued" | "running" | "completed" | "failed" | "dead_letter";
  retryCount: number;
  maxRetries: number;
  scheduledAt: string;
  completedAt?: string;
  error?: string;
}

const activeJobQueue: BackgroundJob[] = [];
const deadLetterQueue: BackgroundJob[] = [];

const PRIORITY_WEIGHTS: Record<JobPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Enqueue a new background job with priority
 */
export function enqueueJob(
  type: JobType,
  payload: any,
  priority: JobPriority = "medium",
  maxRetries: number = 3
): BackgroundJob {
  const job: BackgroundJob = {
    id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type,
    priority,
    payload,
    status: "queued",
    retryCount: 0,
    maxRetries,
    scheduledAt: new Date().toISOString(),
  };

  activeJobQueue.push(job);
  sortQueueByPriority();
  return job;
}

function sortQueueByPriority() {
  activeJobQueue.sort((a, b) => {
    const weightDiff = PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority];
    if (weightDiff !== 0) return weightDiff;
    return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
  });
}

/**
 * Process the next pending job from the priority queue
 */
export async function processNextJob(
  executor?: (job: BackgroundJob) => Promise<boolean>
): Promise<BackgroundJob | null> {
  const pending = activeJobQueue.find((j) => j.status === "queued");
  if (!pending) return null;

  pending.status = "running";

  try {
    let success = true;
    if (executor) {
      success = await executor(pending);
    }

    if (success) {
      pending.status = "completed";
      pending.completedAt = new Date().toISOString();
    } else {
      throw new Error("Job execution failed");
    }
  } catch (err: any) {
    pending.retryCount++;
    if (pending.retryCount >= pending.maxRetries) {
      pending.status = "dead_letter";
      pending.error = err?.message || "Exceeded max retries";
      deadLetterQueue.push(pending);
    } else {
      pending.status = "queued"; // Re-queue for next retry
    }
  }

  return pending;
}

export function getQueueStatus(): {
  queuedCount: number;
  completedCount: number;
  dlqCount: number;
  jobs: BackgroundJob[];
  dlq: BackgroundJob[];
} {
  return {
    queuedCount: activeJobQueue.filter((j) => j.status === "queued").length,
    completedCount: activeJobQueue.filter((j) => j.status === "completed").length,
    dlqCount: deadLetterQueue.length,
    jobs: activeJobQueue,
    dlq: deadLetterQueue,
  };
}

export function clearEnterpriseQueue(): void {
  activeJobQueue.length = 0;
  deadLetterQueue.length = 0;
}
