import { describe, it, expect, beforeEach } from "vitest";
import {
  enqueueOfflineAction,
  processSyncQueue,
  resolveConflict,
  clearSyncQueue,
} from "@/lib/offline/sync-engine";
import {
  enqueueJob,
  processNextJob,
  getQueueStatus,
  clearEnterpriseQueue,
} from "@/lib/queue/enterprise-queue";
import {
  saveDraft,
  getDraft,
  clearDraft,
  clearAllDrafts,
} from "@/lib/offline/drafts";

describe("Offline Mode, Sync Engine, Priority Queue & Data Consistency (Part VI-E)", () => {
  describe("MODULE 1, 3 & 4: Offline Sync Engine & Idempotency", () => {
    beforeEach(() => {
      clearSyncQueue();
    });

    it("should enqueue offline action with unique idempotencyKey", () => {
      const item = enqueueOfflineAction("create_transaction", {
        title: "Flight to Goa",
        amount: 8500,
        currency: "INR",
      });

      expect(item.id).toMatch(/^sync_/);
      expect(item.idempotencyKey).toMatch(/^idem_create_transaction_/);
      expect(item.status).toBe("pending");
      expect(item.payload.amount).toBe(8500);
    });

    it("should process queue and prevent duplicate execution via idempotency check", async () => {
      enqueueOfflineAction("create_transaction", { title: "Dinner", amount: 1200 });

      const firstPass = await processSyncQueue();
      expect(firstPass.total).toBe(1);
      expect(firstPass.synced).toBe(1);

      // Re-running sync queue should find 0 pending
      const secondPass = await processSyncQueue();
      expect(secondPass.total).toBe(0);
      expect(secondPass.synced).toBe(0);
    });
  });

  describe("MODULE 5: 3-Way Conflict Resolution", () => {
    const clientData = { id: 101, title: "Team Lunch - Client Edited", amount: 4800, note: "Client Note" };
    const serverData = { id: 101, title: "Team Lunch - Server Version", amount: 4500, category: "Food" };

    it("should apply 'keep_mine' strategy favoring client edits", () => {
      const result = resolveConflict(clientData, serverData, "keep_mine");
      expect(result.strategyApplied).toBe("keep_mine");
      expect(result.resolvedData.title).toBe("Team Lunch - Client Edited");
      expect(result.resolvedData.amount).toBe(4800);
    });

    it("should apply 'keep_server' strategy favoring server state", () => {
      const result = resolveConflict(clientData, serverData, "keep_server");
      expect(result.strategyApplied).toBe("keep_server");
      expect(result.resolvedData.title).toBe("Team Lunch - Server Version");
      expect(result.resolvedData.amount).toBe(4500);
    });

    it("should apply 'auto_merge' strategy merging non-conflicting fields", () => {
      const result = resolveConflict(clientData, serverData, "auto_merge");
      expect(result.strategyApplied).toBe("auto_merge");
      expect(result.resolvedData.category).toBe("Food");
      expect(result.resolvedData.note).toBe("Client Note");
    });
  });

  describe("MODULE 6 & 7: Priority Background Job Queue & Dead-Letter Queue (DLQ)", () => {
    beforeEach(() => {
      clearEnterpriseQueue();
    });

    it("should execute high priority jobs before medium or low priority jobs", async () => {
      enqueueJob("report_generation", { reportId: "rep_01" }, "low");
      enqueueJob("settlement_recalculation", { settlementId: "stl_01" }, "high");
      enqueueJob("ai_analysis", { userId: 1 }, "medium");

      const firstJob = await processNextJob();
      expect(firstJob?.type).toBe("settlement_recalculation");
      expect(firstJob?.priority).toBe("high");
      expect(firstJob?.status).toBe("completed");

      const secondJob = await processNextJob();
      expect(secondJob?.type).toBe("ai_analysis");
      expect(secondJob?.priority).toBe("medium");
    });

    it("should move job to Dead Letter Queue (DLQ) after exceeding max retries", async () => {
      enqueueJob("receipt_ocr", { imageId: "img_corrupt" }, "high", 2);

      // Failing execution 1
      await processNextJob(async () => false);

      // Failing execution 2 (exceeds max retries = 2)
      const failedJob = await processNextJob(async () => false);

      expect(failedJob?.status).toBe("dead_letter");
      expect(failedJob?.retryCount).toBe(2);

      const status = getQueueStatus();
      expect(status.dlqCount).toBe(1);
    });
  });

  describe("MODULE 10: Offline Draft Auto-Save Engine", () => {
    beforeEach(() => {
      clearAllDrafts();
    });

    it("should save, retrieve, and clear uncommitted drafts", () => {
      const draftData = { title: "Draft Expense", amount: 3500, category: "Travel" };
      saveDraft("expense_form_draft", draftData);

      const retrieved = getDraft<{ title: string; amount: number; category: string }>("expense_form_draft");
      expect(retrieved?.data.title).toBe("Draft Expense");
      expect(retrieved?.data.amount).toBe(3500);

      clearDraft("expense_form_draft");
      expect(getDraft("expense_form_draft")).toBeNull();
    });
  });
});
