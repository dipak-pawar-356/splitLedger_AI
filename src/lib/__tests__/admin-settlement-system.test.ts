import { describe, it, expect } from "vitest";
import { calculateOptimalSettlements } from "../settlements/calculator";
import {
  generateDebtorReminderEmail,
  generateCreditorUpdateEmail,
} from "../../actions/admin-settlements";

describe("Admin Settlement & Verification System", () => {
  it("excludes settled members when their net balance becomes 0", () => {
    // Member 1 paid 1000, share 500 => +500
    // Member 2 paid 0, share 500 => -500
    // Before offline settlement: Member 2 owes Member 1 ₹500
    const initialBalances = [
      { userId: 1, amount: 50000 },
      { userId: 2, amount: -50000 },
    ];
    const initialSuggestions = calculateOptimalSettlements(initialBalances);
    expect(initialSuggestions).toHaveLength(1);
    expect(initialSuggestions[0].fromUserId).toBe(2);
    expect(initialSuggestions[0].toUserId).toBe(1);
    expect(initialSuggestions[0].amount).toBe(50000);

    // Now Member 2 pays Member 1 ₹500 offline and Admin verifies it:
    // Net balances become 0 and 0
    const settledBalances = [
      { userId: 1, amount: 0 },
      { userId: 2, amount: 0 },
    ];
    const postSettlementSuggestions = calculateOptimalSettlements(settledBalances);
    expect(postSettlementSuggestions).toHaveLength(0);
  });

  it("handles partial offline settlement accurately in optimal transfer graph", () => {
    // Member 1 paid 3000, share 1000 => +2000
    // Member 2 paid 0, share 1000 => -1000
    // Member 3 paid 0, share 1000 => -1000
    // Member 2 pays ₹1000 offline to Member 1 (verified)
    // Member 2 net becomes 0, Member 1 net becomes +1000, Member 3 remains -1000
    const partialBalances = [
      { userId: 1, amount: 100000 }, // +1000
      { userId: 2, amount: 0 },      // settled
      { userId: 3, amount: -100000 },// -1000
    ];
    const suggestions = calculateOptimalSettlements(partialBalances);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].fromUserId).toBe(3);
    expect(suggestions[0].toUserId).toBe(1);
    expect(suggestions[0].amount).toBe(100000);
  });

  it("generates dynamic Debtor reminder email with accurate figures and deep links", async () => {
    const emailData = {
      recipientName: "Rahul Sharma",
      groupName: "Goa Vacation",
      totalGroupExpense: 15000,
      contribution: 2000,
      pendingPayment: 3000,
      owesToList: [
        { name: "Raj Pawar", amount: 2000 },
        { name: "Anita Roy", amount: 1000 },
      ],
      groupPublicId: "grp_goa_123",
      ownerName: "Raj Pawar",
      reminderCount: 2,
    };

    const result = await generateDebtorReminderEmail(emailData);

    expect(result.subject).toContain("Goa Vacation");
    expect(result.subject).toContain("Payment Pending");
    expect(result.html).toContain("Rahul Sharma");
    expect(result.html).toContain("15,000.00");
    expect(result.html).toContain("3,000.00");
    expect(result.html).toContain("Raj Pawar");
    expect(result.html).toContain("Anita Roy");
    expect(result.html).toContain("grp_goa_123");
    expect(result.html).toContain("#2");
  });

  it("generates dynamic Creditor update email with expected amounts and recipients", async () => {
    const emailData = {
      recipientName: "Raj Pawar",
      groupName: "Goa Vacation",
      totalGroupExpense: 15000,
      contribution: 8000,
      amountReceivable: 3000,
      receivesFromList: [
        { name: "Rahul Sharma", amount: 2000 },
        { name: "Suresh", amount: 1000 },
      ],
      groupPublicId: "grp_goa_123",
      supportEmail: "support@splitledger.ai",
    };

    const result = await generateCreditorUpdateEmail(emailData);

    expect(result.subject).toContain("Settlement Update");
    expect(result.subject).toContain("Receivable");
    expect(result.html).toContain("Raj Pawar");
    expect(result.html).toContain("3,000.00");
    expect(result.html).toContain("Rahul Sharma");
    expect(result.html).toContain("Suresh");
    expect(result.html).toContain("grp_goa_123");
  });
});
