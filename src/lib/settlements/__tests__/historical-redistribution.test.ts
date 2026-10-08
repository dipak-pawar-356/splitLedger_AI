import { describe, it, expect } from "vitest";

interface MemberFinancialState {
  id: string;
  name: string;
  grossExpensePaid: number; // in rupees
  grossShare: number; // in rupees
  completedSettlementPaid: number; // in rupees
  completedSettlementReceived: number; // in rupees
}

function calculateFinancialMetrics(member: MemberFinancialState) {
  const netBalance = member.grossExpensePaid - member.grossShare;
  const totalContribution = member.grossExpensePaid + member.completedSettlementPaid;
  
  // Effective outstanding balance taking into account completed settlements
  // Positive = still owed money (receivable), Negative = still owes money (payable)
  const effectiveOutstanding = (member.grossExpensePaid + member.completedSettlementPaid) - 
                               (member.grossShare + member.completedSettlementReceived);

  const outstandingPayable = effectiveOutstanding < 0 ? Math.abs(effectiveOutstanding) : 0;
  const outstandingReceivable = effectiveOutstanding > 0 ? effectiveOutstanding : 0;

  return {
    grossExpensePaid: member.grossExpensePaid,
    grossShare: member.grossShare,
    netBalance,
    totalContribution,
    completedSettlementPaid: member.completedSettlementPaid,
    completedSettlementReceived: member.completedSettlementReceived,
    outstandingPayable,
    outstandingReceivable,
    effectiveOutstanding,
  };
}

describe("Settlement Balance & Historical Redistribution Financial Engine", () => {
  describe("Scenario 1: Initial 3-member Group", () => {
    // Person 1 paid ₹1400, Person 2 paid ₹870, Person 3 paid ₹400
    // Total Group Expense = ₹2670
    // Equal Share = ₹890 per member
    const p1: MemberFinancialState = {
      id: "1",
      name: "Person 1",
      grossExpensePaid: 1400,
      grossShare: 890,
      completedSettlementPaid: 0,
      completedSettlementReceived: 0,
    };
    const p2: MemberFinancialState = {
      id: "2",
      name: "Person 2",
      grossExpensePaid: 870,
      grossShare: 890,
      completedSettlementPaid: 0,
      completedSettlementReceived: 0,
    };
    const p3: MemberFinancialState = {
      id: "3",
      name: "Person 3",
      grossExpensePaid: 400,
      grossShare: 890,
      completedSettlementPaid: 0,
      completedSettlementReceived: 0,
    };

    it("should calculate exact initial net balances and outstanding obligations", () => {
      const m1 = calculateFinancialMetrics(p1);
      const m2 = calculateFinancialMetrics(p2);
      const m3 = calculateFinancialMetrics(p3);

      expect(m1.netBalance).toBe(510);
      expect(m1.outstandingReceivable).toBe(510);
      expect(m1.outstandingPayable).toBe(0);

      expect(m2.netBalance).toBe(-20);
      expect(m2.outstandingPayable).toBe(20);
      expect(m2.outstandingReceivable).toBe(0);

      expect(m3.netBalance).toBe(-490);
      expect(m3.outstandingPayable).toBe(490);
      expect(m3.outstandingReceivable).toBe(0);

      // Total payable equals total receivable
      expect(m2.outstandingPayable + m3.outstandingPayable).toBe(m1.outstandingReceivable);
    });

    it("should correctly update balances after Person 2 pays ₹20 to Person 1", () => {
      // Person 2 pays ₹20 to Person 1
      p1.completedSettlementReceived = 20;
      p2.completedSettlementPaid = 20;

      const m1 = calculateFinancialMetrics(p1);
      const m2 = calculateFinancialMetrics(p2);
      const m3 = calculateFinancialMetrics(p3);

      // Person 1 dashboard
      expect(m1.grossExpensePaid).toBe(1400); // Unchanged!
      expect(m1.completedSettlementReceived).toBe(20);
      expect(m1.outstandingReceivable).toBe(490); // Only ₹490 from Person 3 remains pending!
      expect(m1.outstandingPayable).toBe(0);

      // Person 2 dashboard
      expect(m2.grossExpensePaid).toBe(870); // Unchanged!
      expect(m2.completedSettlementPaid).toBe(20);
      expect(m2.totalContribution).toBe(890); // 870 + 20
      expect(m2.outstandingPayable).toBe(0); // Fully settled, no pending payment!

      // Person 3 dashboard
      expect(m3.grossExpensePaid).toBe(400);
      expect(m3.outstandingPayable).toBe(490); // Remains ₹490 to Person 1
    });
  });

  describe("Scenario 2: Person 4 joins and is included in historical expenses", () => {
    // Total historical = 2670
    // Redistributed across 4 members: equal share = 2670 / 4 = 667.50
    // Person 2 has already paid ₹20 to Person 1
    const p1: MemberFinancialState = {
      id: "1",
      name: "Person 1",
      grossExpensePaid: 1400,
      grossShare: 667.5,
      completedSettlementPaid: 0,
      completedSettlementReceived: 20, // preserved
    };
    const p2: MemberFinancialState = {
      id: "2",
      name: "Person 2",
      grossExpensePaid: 870,
      grossShare: 667.5,
      completedSettlementPaid: 20, // preserved
      completedSettlementReceived: 0,
    };
    const p3: MemberFinancialState = {
      id: "3",
      name: "Person 3",
      grossExpensePaid: 400,
      grossShare: 667.5,
      completedSettlementPaid: 0,
      completedSettlementReceived: 0,
    };
    const p4: MemberFinancialState = {
      id: "4",
      name: "Person 4",
      grossExpensePaid: 0,
      grossShare: 667.5,
      completedSettlementPaid: 0,
      completedSettlementReceived: 0,
    };

    it("should redistribute historical expenses accurately preserving completed settlements", () => {
      const m1 = calculateFinancialMetrics(p1);
      const m2 = calculateFinancialMetrics(p2);
      const m3 = calculateFinancialMetrics(p3);
      const m4 = calculateFinancialMetrics(p4);

      // Person 1: paid 1400, share 667.50 -> net +732.50. Has received 20 -> outstanding receivable = 712.50
      expect(m1.grossExpensePaid).toBe(1400);
      expect(m1.netBalance).toBe(732.5);
      expect(m1.outstandingReceivable).toBe(712.5);

      // Person 2: paid 870, share 667.50 -> net +202.50. Has paid 20 -> outstanding receivable = 222.50
      expect(m2.grossExpensePaid).toBe(870);
      expect(m2.netBalance).toBe(202.5);
      expect(m2.totalContribution).toBe(890); // 870 + 20
      expect(m2.outstandingPayable).toBe(0); // Not asked to pay again!
      expect(m2.outstandingReceivable).toBe(222.5);

      // Person 3: paid 400, share 667.50 -> owes 267.50
      expect(m3.netBalance).toBe(-267.5);
      expect(m3.outstandingPayable).toBe(267.5);

      // Person 4: paid 0, share 667.50 -> owes 667.50
      expect(m4.netBalance).toBe(-667.5);
      expect(m4.outstandingPayable).toBe(667.5);

      // Total payable equals total receivable exactly
      const totalPayable = m3.outstandingPayable + m4.outstandingPayable; // 267.5 + 667.5 = 935
      const totalReceivable = m1.outstandingReceivable + m2.outstandingReceivable; // 712.5 + 222.5 = 935
      expect(totalPayable).toBe(totalReceivable);
    });
  });
});
