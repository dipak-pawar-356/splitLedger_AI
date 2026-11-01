import { describe, it, expect } from "vitest";
import { parseConversationalMessage, detectTransactionTrigger } from "@/lib/ai/nlp-transaction-parser";

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

  it("accurately detects multiple independent expenses: '20 rs for water bottle and 50 rs for travel by bus'", () => {
    const res = parseConversationalMessage("20 rs for water bottle and 50 rs for travel by bus", mockContext);
    expect(res.hasTransactions).toBe(true);
    expect(res.transactions).toHaveLength(2);

    // Transaction 1: Water bottle
    const tx1 = res.transactions[0];
    expect(tx1.amount).toBe(20);
    expect(tx1.type).toBe("paid");
    expect(tx1.categoryName).toBe("Food & Dining"); // from mockContext
    expect(tx1.description).toBe("Purchased Water Bottle");
    expect(tx1.status).toBe("draft");

    // Transaction 2: Travel by bus
    const tx2 = res.transactions[1];
    expect(tx2.amount).toBe(50);
    expect(tx2.type).toBe("paid");
    expect(tx2.categoryName).toBe("Travel & Commute"); // from mockContext
    expect(tx2.description).toBe("Bus Travel Fare");
    expect(tx2.status).toBe("draft");
  });

  it("handles typos, attached currency suffix, and multiple connectors: '20rs for watter bottle and 50rs for travel by bus'", () => {
    const res = parseConversationalMessage("20rs for watter bottle and 50rs for travel by bus", mockContext);
    expect(res.hasTransactions).toBe(true);
    expect(res.transactions).toHaveLength(2);
    expect(res.transactions[0].amount).toBe(20);
    expect(res.transactions[0].description).toBe("Purchased Water Bottle");
    expect(res.transactions[1].amount).toBe(50);
    expect(res.transactions[1].description).toBe("Bus Travel Fare");
  });

  it("handles complex multi-expense sentences: 'Coffee 40 + Parking 30 + Uber 180'", () => {
    const res = parseConversationalMessage("Coffee 40 + Parking 30 + Uber 180", mockContext);
    expect(res.hasTransactions).toBe(true);
    expect(res.transactions).toHaveLength(3);
    expect(res.transactions[0].amount).toBe(40);
    expect(res.transactions[1].amount).toBe(30);
    expect(res.transactions[2].amount).toBe(180);
  });

  it("does not split single purchases with multiple items: 'Bought chips and biscuits for 100'", () => {
    const res = parseConversationalMessage("Bought chips and biscuits for 100", mockContext);
    expect(res.hasTransactions).toBe(true);
    expect(res.transactions).toHaveLength(1);
    expect(res.transactions[0].amount).toBe(100);
  });

  it("handles the exact user prompt: 'I make expances below details so create transition Chips - 20 Petrol - 500 Flipkart Order - 300'", () => {
    const res = parseConversationalMessage(
      "I make expances below details so create transition Chips - 20 Petrol - 500 Flipkart Order - 300",
      mockContext
    );
    expect(res.hasTransactions).toBe(true);
    expect(res.transactions).toHaveLength(3);
    expect(res.transactions[0].amount).toBe(20);
    expect(res.transactions[0].title).toBe("Chips");
    expect(res.transactions[0].type).toBe("paid");

    expect(res.transactions[1].amount).toBe(500);
    expect(res.transactions[1].title).toBe("Petrol");
    expect(res.transactions[1].type).toBe("paid");

    expect(res.transactions[2].amount).toBe(300);
    expect(res.transactions[2].title).toBe("Flipkart Order");
    expect(res.transactions[2].type).toBe("paid");
  });

  it("handles income & receivable correctly", () => {
    const res = parseConversationalMessage("Salary 25000\nReceived from Kunal 1500", mockContext);
    expect(res.hasTransactions).toBe(true);
    expect(res.transactions).toHaveLength(2);
    expect(res.transactions[0].amount).toBe(25000);
    expect(res.transactions[0].type).toBe("received");
    expect(res.transactions[1].amount).toBe(1500);
    expect(res.transactions[1].type).toBe("received");
  });

  it("handles payable & receivable natural phrasing", () => {
    const payable = parseConversationalMessage("Need to pay Rahul 400", mockContext);
    expect(payable.hasTransactions).toBe(true);
    expect(payable.transactions[0].amount).toBe(400);
    expect(payable.transactions[0].type).toBe("borrowed"); // Payable

    const receivable = parseConversationalMessage("Need to take 500 from Kartik", mockContext);
    expect(receivable.hasTransactions).toBe(true);
    expect(receivable.transactions[0].amount).toBe(500);
    expect(receivable.transactions[0].type).toBe("lent"); // Receivable
  });

  it("handles mixed 4-transaction input: Petrol 500, Salary 25000, Need to pay Rahul 400, Need to receive Kunal 800", () => {
    const input = "Petrol 500\nSalary 25000\nNeed to pay Rahul 400\nNeed to receive Kunal 800";
    const res = parseConversationalMessage(input, mockContext);
    expect(res.hasTransactions).toBe(true);
    expect(res.transactions).toHaveLength(4);

    // 1. Petrol 500 (Expense)
    expect(res.transactions[0].amount).toBe(500);
    expect(res.transactions[0].type).toBe("paid");
    expect(res.transactions[0].title).toBe("Petrol");

    // 2. Salary 25000 (Income)
    expect(res.transactions[1].amount).toBe(25000);
    expect(res.transactions[1].type).toBe("received");
    expect(res.transactions[1].title).toContain("Salary");

    // 3. Need to pay Rahul 400 (Payable -> borrowed)
    expect(res.transactions[2].amount).toBe(400);
    expect(res.transactions[2].type).toBe("borrowed");

    // 4. Need to receive Kunal 800 (Receivable -> lent)
    expect(res.transactions[3].amount).toBe(800);
    expect(res.transactions[3].type).toBe("lent");
  });

  it("handles bare number clarification: '500'", () => {
    const res = parseConversationalMessage("500", mockContext);
    expect(res.hasTransactions).toBe(false);
    expect(res.isIncomplete).toBe(true);
    expect(res.clarificationMessage).toContain("₹500");
  });

  it("handles generic intent clarification: 'Created transaction'", () => {
    const res = parseConversationalMessage("Created transaction", mockContext);
    expect(res.hasTransactions).toBe(false);
    expect(res.isIncomplete).toBe(true);
    expect(res.clarificationMessage).toContain("Examples");
  });

  describe("STRICT OPERATING MODES: Financial Assistant Mode vs Transaction Creation Mode", () => {
    it("Mode 1 (Financial Assistant): Financial queries must NEVER trigger transaction drafts", () => {
      const mode1Queries = [
        "How much did I spend this month?",
        "What is my health score?",
        "Who owes me money?",
        "Explain my dashboard.",
        "Why is my savings negative?",
        "Show my reports.",
        "How much petrol did I spend?",
        "What are my pending settlements?",
      ];

      for (const q of mode1Queries) {
        const trigger = detectTransactionTrigger(q);
        expect(trigger.isTriggered).toBe(false);

        const res = parseConversationalMessage(q, mockContext, { requireExplicitTrigger: true });
        expect(res.hasTransactions).toBe(false);
        expect(res.transactions).toHaveLength(0);
      }
    });

    it("Mode 2 (Transaction Creation): Triggered only when message starts with 'create transaction(s)'", () => {
      // 1. Single expense
      const single = parseConversationalMessage("create transaction\nPetrol 500", mockContext, { requireExplicitTrigger: true });
      expect(single.hasTransactions).toBe(true);
      expect(single.transactions).toHaveLength(1);
      expect(single.transactions[0].amount).toBe(500);
      expect(single.transactions[0].title).toBe("Petrol");
      expect(single.transactions[0].type).toBe("paid");

      // 2. 3 draft cards
      const three = parseConversationalMessage("create transactions\nTea 20\nBus 50\nRecharge 399", mockContext, { requireExplicitTrigger: true });
      expect(three.hasTransactions).toBe(true);
      expect(three.transactions).toHaveLength(3);
      expect(three.transactions[0].amount).toBe(20);
      expect(three.transactions[1].amount).toBe(50);
      expect(three.transactions[2].amount).toBe(399);

      // 3. 2 income cards
      const income = parseConversationalMessage("create transactions\nSalary 25000\nReceived From Kunal 1500", mockContext, { requireExplicitTrigger: true });
      expect(income.hasTransactions).toBe(true);
      expect(income.transactions).toHaveLength(2);
      expect(income.transactions[0].type).toBe("received");
      expect(income.transactions[1].type).toBe("received");

      // 4. 1 payable and 1 receivable
      const debts = parseConversationalMessage("create transactions\nNeed to pay Rahul 500\nNeed to collect from Kartik 1000", mockContext, { requireExplicitTrigger: true });
      expect(debts.hasTransactions).toBe(true);
      expect(debts.transactions).toHaveLength(2);
      expect(debts.transactions[0].type).toBe("borrowed"); // Payable
      expect(debts.transactions[1].type).toBe("lent");     // Receivable

      // 5. Mixed 4 distinct cards
      const mixed = parseConversationalMessage(
        "create transactions\nPetrol 500\nSalary 25000\nNeed to pay Rahul 500\nNeed to receive Kunal 800",
        mockContext,
        { requireExplicitTrigger: true }
      );
      expect(mixed.hasTransactions).toBe(true);
      expect(mixed.transactions).toHaveLength(4);
      expect(mixed.transactions[0].type).toBe("paid");      // Expense
      expect(mixed.transactions[1].type).toBe("received");  // Income
      expect(mixed.transactions[2].type).toBe("borrowed");  // Payable
      expect(mixed.transactions[3].type).toBe("lent");      // Receivable

      // 6. Inline multi-transaction sentence: 'I make expances below details so create transition Chips - 20 Petrol - 500 Flipkart Order - 300'
      const inlineMultiple = parseConversationalMessage(
        "I make expances below details so create transition Chips - 20 Petrol - 500 Flipkart Order - 300",
        mockContext,
        { requireExplicitTrigger: true }
      );
      expect(inlineMultiple.hasTransactions).toBe(true);
      expect(inlineMultiple.transactions).toHaveLength(3);
      expect(inlineMultiple.transactions[0].amount).toBe(20);
      expect(inlineMultiple.transactions[0].title).toBe("Chips");
      expect(inlineMultiple.transactions[1].amount).toBe(500);
      expect(inlineMultiple.transactions[1].title).toBe("Petrol");
      expect(inlineMultiple.transactions[2].amount).toBe(300);
      expect(inlineMultiple.transactions[2].title).toBe("Flipkart Order");

      // 7. Bare amount clarification
      const bare = parseConversationalMessage("create transaction\n500", mockContext, { requireExplicitTrigger: true });
      expect(bare.hasTransactions).toBe(false);
      expect(bare.isIncomplete).toBe(true);
      expect(bare.clarificationMessage).toBe("I detected ₹500 but couldn't identify what this transaction was for.");

      // 8. Never merge independent transactions: 'create transactions\nChips 20\nPetrol 500\nFlipkart 300'
      const separateItems = parseConversationalMessage(
        "create transactions\nChips 20\nPetrol 500\nFlipkart 300",
        mockContext,
        { requireExplicitTrigger: true }
      );
      expect(separateItems.hasTransactions).toBe(true);
      expect(separateItems.transactions).toHaveLength(3);
      expect(separateItems.transactions[0].amount).toBe(20);
      expect(separateItems.transactions[0].title).toBe("Chips");
      expect(separateItems.transactions[1].amount).toBe(500);
      expect(separateItems.transactions[1].title).toBe("Petrol");
      expect(separateItems.transactions[2].amount).toBe(300);
      expect(separateItems.transactions[2].title).toContain("Flipkart");

      // 9. Amount-first independent transactions: 'create transactions\n20 water bottle\n50 bus travel\n100 tea'
      const amountFirst = parseConversationalMessage(
        "create transactions\n20 water bottle\n50 bus travel\n100 tea",
        mockContext,
        { requireExplicitTrigger: true }
      );
      expect(amountFirst.hasTransactions).toBe(true);
      expect(amountFirst.transactions).toHaveLength(3);
      expect(amountFirst.transactions[0].amount).toBe(20);
      expect(amountFirst.transactions[0].title).toBe("Water bottle");
      expect(amountFirst.transactions[1].amount).toBe(50);
      expect(amountFirst.transactions[1].title).toBe("Bus Travel Fare");
      expect(amountFirst.transactions[2].amount).toBe(100);
      expect(amountFirst.transactions[2].title).toBe("Tea");

      // 10. Multi-type separate cards: 2 Income + 2 Expense
      const incomeExpense = parseConversationalMessage(
        "create transactions\nSalary 25000\nReceived from Kunal 1500\nPetrol 500\nRecharge 399",
        mockContext,
        { requireExplicitTrigger: true }
      );
      expect(incomeExpense.hasTransactions).toBe(true);
      expect(incomeExpense.transactions).toHaveLength(4);
      expect(incomeExpense.transactions[0].type).toBe("received"); // Income
      expect(incomeExpense.transactions[1].type).toBe("received"); // Income
      expect(incomeExpense.transactions[2].type).toBe("paid");     // Expense
      expect(incomeExpense.transactions[3].type).toBe("paid");     // Expense

      // 11. Receivables: "Rahul owes me 500", "Need to take 500 from Rahul"
      const owesMe = parseConversationalMessage("create transaction\nRahul owes me 500", mockContext, { requireExplicitTrigger: true });
      expect(owesMe.hasTransactions).toBe(true);
      expect(owesMe.transactions).toHaveLength(1);
      expect(owesMe.transactions[0].type).toBe("lent"); // Receivable
      expect(owesMe.transactions[0].amount).toBe(500);
      expect(owesMe.transactions[0].contactName).toContain("Rahul");

      // 12. Payables: "Need to pay electricity bill 1200", "Need to pay EMI 15000", "Need to pay rent 20000"
      const payBill = parseConversationalMessage("create transaction\nNeed to pay electricity bill 1200", mockContext, { requireExplicitTrigger: true });
      expect(payBill.hasTransactions).toBe(true);
      expect(payBill.transactions).toHaveLength(1);
      expect(payBill.transactions[0].type).toBe("borrowed"); // Payable
      expect(payBill.transactions[0].amount).toBe(1200);

      const payEmi = parseConversationalMessage("create transaction\nNeed to pay EMI 15000", mockContext, { requireExplicitTrigger: true });
      expect(payEmi.hasTransactions).toBe(true);
      expect(payEmi.transactions).toHaveLength(1);
      expect(payEmi.transactions[0].type).toBe("borrowed"); // Payable
      expect(payEmi.transactions[0].amount).toBe(15000);
    });
  });
});

