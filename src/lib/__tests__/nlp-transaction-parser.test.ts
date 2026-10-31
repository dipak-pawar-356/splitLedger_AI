import { describe, it, expect } from "vitest";
import { parseConversationalMessage } from "@/lib/ai/nlp-transaction-parser";

describe("NLP Conversational Transaction Parser", () => {
  const mockContext = {
    contacts: [
      { id: 1, name: "Rahul Patil", phone: "9876543210" },
      { id: 2, name: "Amit Kumar", phone: "9123456780" },
      { id: 3, name: "Priya Sharma" },
    ],
    categories: [
      { id: 10, name: "Food & Dining" },
      { id: 11, name: "Travel & Commute" },
      { id: 12, name: "Bills & Utilities" },
      { id: 13, name: "Entertainment" },
      { id: 14, name: "Groceries & Supplies" },
      { id: 15, name: "Shopping" },
    ],
    groups: [
      { id: 100, name: "Goa Trip" },
      { id: 101, name: "Summer Trip" },
    ],
  };

  it("detects basic single expense correctly: 'I bought chips for ₹20.'", () => {
    const res = parseConversationalMessage("I bought chips for ₹20.", mockContext);
    expect(res.hasTransactions).toBe(true);
    expect(res.transactions).toHaveLength(1);
    const tx = res.transactions[0];
    expect(tx.amount).toBe(20);
    expect(tx.type).toBe("paid");
    expect(tx.title).toContain("Chips");
    expect(tx.categoryName).toBe("Food & Dining");
  });

  it("detects paid for tea: 'Paid ₹120 for tea.'", () => {
    const res = parseConversationalMessage("Paid ₹120 for tea.", mockContext);
    expect(res.hasTransactions).toBe(true);
    expect(res.transactions).toHaveLength(1);
    const tx = res.transactions[0];
    expect(tx.amount).toBe(120);
    expect(tx.type).toBe("paid");
    expect(tx.title).toContain("Tea");
    expect(tx.categoryName).toBe("Food & Dining");
  });

  it("detects fuel expense: 'Spent ₹500 on petrol.'", () => {
    const res = parseConversationalMessage("Spent ₹500 on petrol.", mockContext);
    expect(res.hasTransactions).toBe(true);
    expect(res.transactions).toHaveLength(1);
    const tx = res.transactions[0];
    expect(tx.amount).toBe(500);
    expect(tx.categoryName).toBe("Travel & Commute");
  });

  it("detects peer lending: 'I gave Rahul ₹800.'", () => {
    const res = parseConversationalMessage("I gave Rahul ₹800.", mockContext);
    expect(res.hasTransactions).toBe(true);
    expect(res.transactions).toHaveLength(1);
    const tx = res.transactions[0];
    expect(tx.amount).toBe(800);
    expect(tx.type).toBe("lent");
    expect(tx.contactId).toBe(1);
    expect(tx.contactName).toBe("Rahul Patil");
  });

  it("detects peer receiving / income: 'Received ₹1500 from Amit.'", () => {
    const res = parseConversationalMessage("Received ₹1500 from Amit.", mockContext);
    expect(res.hasTransactions).toBe(true);
    expect(res.transactions).toHaveLength(1);
    const tx = res.transactions[0];
    expect(tx.amount).toBe(1500);
    expect(tx.type).toBe("received");
    expect(tx.contactId).toBe(2);
    expect(tx.contactName).toBe("Amit Kumar");
  });

  it("detects utilities bill: 'Paid electricity bill ₹2500.'", () => {
    const res = parseConversationalMessage("Paid electricity bill ₹2500.", mockContext);
    expect(res.hasTransactions).toBe(true);
    expect(res.transactions).toHaveLength(1);
    const tx = res.transactions[0];
    expect(tx.amount).toBe(2500);
    expect(tx.categoryName).toBe("Bills & Utilities");
  });

  it("detects entertainment expense: 'Movie tickets ₹600.'", () => {
    const res = parseConversationalMessage("Movie tickets ₹600.", mockContext);
    expect(res.hasTransactions).toBe(true);
    expect(res.transactions).toHaveLength(1);
    const tx = res.transactions[0];
    expect(tx.amount).toBe(600);
    expect(tx.categoryName).toBe("Entertainment");
  });

  it("detects multi-line bulk expenses: 'Tea ₹20\\nPetrol ₹600\\nLunch ₹250'", () => {
    const res = parseConversationalMessage("Tea ₹20\nPetrol ₹600\nLunch ₹250", mockContext);
    expect(res.hasTransactions).toBe(true);
    expect(res.transactions).toHaveLength(3);
    expect(res.transactions[0].amount).toBe(20);
    expect(res.transactions[1].amount).toBe(600);
    expect(res.transactions[2].amount).toBe(250);
  });

  it("detects words as numbers: 'I spent fifty rupees on coffee.'", () => {
    const res = parseConversationalMessage("I spent fifty rupees on coffee.", mockContext);
    expect(res.hasTransactions).toBe(true);
    expect(res.transactions).toHaveLength(1);
    expect(res.transactions[0].amount).toBe(50);
    expect(res.transactions[0].categoryName).toBe("Food & Dining");
  });

  it("detects group association when group name is mentioned", () => {
    const res = parseConversationalMessage("Paid ₹3500 for hotel in Summer Trip", mockContext);
    expect(res.hasTransactions).toBe(true);
    expect(res.transactions).toHaveLength(1);
    expect(res.transactions[0].amount).toBe(3500);
    expect(res.transactions[0].groupId).toBe(101);
    expect(res.transactions[0].groupName).toBe("Summer Trip");
  });

  it("prompts clarification when transaction intent is found but amount is missing", () => {
    const res = parseConversationalMessage("Spent on petrol", mockContext);
    expect(res.hasTransactions).toBe(false);
    expect(res.isIncomplete).toBe(true);
    expect(res.clarificationMessage).toBeDefined();
  });

  it("detects multiple transactions in a single natural sentence separated by 'and'", () => {
    const res = parseConversationalMessage("Tea ₹20 and Petrol ₹600", mockContext);
    expect(res.hasTransactions).toBe(true);
    expect(res.transactions).toHaveLength(2);
    expect(res.transactions[0].amount).toBe(20);
    expect(res.transactions[1].amount).toBe(600);
  });

  it("generates rich, human-readable notes with context and category", () => {
    const res = parseConversationalMessage("Paid ₹450 for Water bottle", mockContext);
    expect(res.hasTransactions).toBe(true);
    expect(res.transactions[0].notes).toBeDefined();
    expect(res.transactions[0].notes).toContain("Water bottle");
    expect(res.transactions[0].notes).toContain("SplitLedger");
  });
});

