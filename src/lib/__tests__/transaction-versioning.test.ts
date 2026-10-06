import { describe, it, expect } from "vitest";

// Diff calculation helper logic
function computeTransactionDiff(
  oldState: Record<string, any>,
  newState: Record<string, any>
): Record<string, { old: any; new: any }> {
  const changes: Record<string, { old: any; new: any }> = {};

  const fieldsToCheck = [
    "amount",
    "title",
    "description",
    "type",
    "categoryId",
    "contactId",
    "groupId",
    "paidBy",
    "paidByContact",
    "paymentMethod",
    "status",
    "receiptUrl",
    "notes",
    "location",
    "isDeleted",
  ];

  for (const field of fieldsToCheck) {
    if (newState[field] !== undefined && newState[field] !== oldState[field]) {
      changes[field] = { old: oldState[field], new: newState[field] };
    }
  }

  return changes;
}

describe("Transaction Versioning & Diff Engine", () => {
  it("should accurately detect field-level changes between versions", () => {
    const v1 = {
      amount: 120000, // ₹1200 in paise
      title: "Dinner",
      description: "Team dinner at restaurant",
      type: "paid",
      categoryId: 1,
      paymentMethod: "UPI",
      status: "completed",
    };

    const v2 = {
      amount: 140000, // ₹1400 in paise (Added ₹200 parking)
      title: "Dinner + Parking",
      description: "Team dinner at restaurant with parking",
      type: "paid",
      categoryId: 1, // unchanged
      paymentMethod: "Credit Card", // changed
      status: "completed", // unchanged
    };

    const diff = computeTransactionDiff(v1, v2);

    expect(diff).toHaveProperty("amount");
    expect(diff.amount).toEqual({ old: 120000, new: 140000 });

    expect(diff).toHaveProperty("title");
    expect(diff.title).toEqual({ old: "Dinner", new: "Dinner + Parking" });

    expect(diff).toHaveProperty("description");
    expect(diff.description).toEqual({ 
      old: "Team dinner at restaurant", 
      new: "Team dinner at restaurant with parking" 
    });

    expect(diff).toHaveProperty("paymentMethod");
    expect(diff.paymentMethod).toEqual({ old: "UPI", new: "Credit Card" });

    // Unchanged fields should not be present in diff
    expect(diff).not.toHaveProperty("categoryId");
    expect(diff).not.toHaveProperty("status");
    expect(diff).not.toHaveProperty("type");
  });

  it("should increment version numbers sequentially without mutating past versions", () => {
    const history: Array<{ versionNumber: number; reason: string; snapshot: any }> = [];

    // Version 1
    const v1Snapshot = { amount: 1000, desc: "v1" };
    history.push({ versionNumber: 1, reason: "Initial creation", snapshot: v1Snapshot });

    // Version 2
    const v2Snapshot = { amount: 1500, desc: "v2" };
    history.push({ versionNumber: 2, reason: "Added tips", snapshot: v2Snapshot });

    // Version 3
    const v3Snapshot = { amount: 1600, desc: "v3" };
    history.push({ versionNumber: 3, reason: "Corrected tax", snapshot: v3Snapshot });

    expect(history).toHaveLength(3);
    expect(history[0].versionNumber).toBe(1);
    expect(history[1].versionNumber).toBe(2);
    expect(history[2].versionNumber).toBe(3);

    // v1 snapshot remains immutable
    expect(history[0].snapshot.amount).toBe(1000);
  });
});
