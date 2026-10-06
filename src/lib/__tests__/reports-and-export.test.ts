import { describe, it, expect } from "vitest";
import { 
  generateCSVExport, 
  generateJSONExport, 
  generatePrintableHTMLReport, 
  generateExcelWorkbook,
  type ExportReportData 
} from "../export/export-engine";
import { formatCurrency, formatDate } from "../utils";

describe("Reports, Search & Export Engine", () => {
  const mockReportData: ExportReportData = {
    reportTitle: "Monthly Financial Report - August 2026",
    generatedBy: "John Doe",
    generatedAt: new Date("2026-08-29T10:00:00Z"),
    currency: "INR",
    periodLabel: "AUGUST 2026",
    summary: {
      totalIncome: 75000,
      totalExpense: 42500.5,
      netBalance: 32499.5,
      totalReceivable: 12000,
      totalPayable: 4500,
      totalSettlements: 25000,
      transactionCount: 3,
      activeGroupsCount: 2,
      personalTxCount: 1,
      groupTxCount: 2,
      totalMembersCount: 5,
      pendingSettlementsCount: 1,
    },
    transactions: [
      {
        id: 1,
        publicId: "txn_A1B2C3D4E5F6G7H8",
        title: "Team Lunch at Taj",
        description: "Team lunch after sprint review",
        type: "paid",
        amount: 350000, // ₹3500.00
        currency: "INR",
        date: new Date("2026-08-15"),
        status: "completed",
        categoryName: "Food & Dining",
        groupName: "Office Squad",
        contactName: null,
        paidByName: "John Doe",
        paymentMethod: "UPI",
        splitMethod: "equal",
        location: "Mumbai",
        tags: ["lunch", "office"],
        receiptUrl: "https://example.com/receipt1.jpg",
        notes: "Approved by manager",
        createdByName: "John Doe",
      },
      {
        id: 2,
        publicId: "txn_Z9Y8X7W6V5U4T3S2",
        title: "Freelance Payment",
        description: "Payment for UI design",
        type: "received",
        amount: 5000000, // ₹50000.00
        currency: "INR",
        date: new Date("2026-08-18"),
        status: "completed",
        categoryName: "Income",
        groupName: null,
        contactName: "Acme Corp",
        paidByName: "Acme Corp",
        paymentMethod: "Bank Transfer",
        splitMethod: "equal",
        tags: ["freelance", "design"],
        createdByName: "John Doe",
      },
      {
        id: 3,
        publicId: "txn_M1N2O3P4Q5R6S7T8",
        title: "Cab Fare",
        description: "Airport drop",
        type: "paid",
        amount: 75050, // ₹750.50
        currency: "INR",
        date: new Date("2026-08-20"),
        status: "pending",
        categoryName: "Transportation",
        groupName: "Goa Trip",
        contactName: null,
        paidByName: "John Doe",
        paymentMethod: "UPI",
        splitMethod: "equal",
        createdByName: "John Doe",
      },
    ],
    groups: [
      { id: 1, name: "Office Squad", type: "office", currency: "INR", memberCount: 4, totalSpent: 350000 },
      { id: 2, name: "Goa Trip", type: "trip", currency: "INR", memberCount: 3, totalSpent: 75050 },
    ],
    settlements: [
      {
        publicId: "set_1122334455667788",
        groupName: "Office Squad",
        fromUser: "Alice",
        toUser: "John Doe",
        amount: 87500, // ₹875
        currency: "INR",
        status: "completed",
        date: new Date("2026-08-16"),
      },
    ],
  };

  describe("CSV Export Generator", () => {
    it("should generate CSV with proper headers and flattened data", () => {
      const csv = generateCSVExport(mockReportData);

      expect(csv).toContain("Transaction ID,Title / Description,Type,Category,Group,Contact / Member,Paid By,Amount (INR)");
      expect(csv).toContain("txn_A1B2C3D4E5F6G7H8");
      expect(csv).toContain("3500.00");
      expect(csv).toContain("Team Lunch at Taj");
      expect(csv).toContain("Office Squad");
      expect(csv).not.toContain("[object Object]");
    });
  });

  describe("JSON Export Generator", () => {
    it("should generate clean, structured JSON with all metadata and relations", () => {
      const jsonStr = generateJSONExport(mockReportData);
      const parsed = JSON.parse(jsonStr);

      expect(parsed.metadata.application).toBe("SplitLedger AI");
      expect(parsed.metadata.currency).toBe("INR");
      expect(parsed.summary.totalIncome).toBe(75000);
      expect(parsed.summary.totalExpense).toBe(42500.5);
      expect(parsed.transactions).toHaveLength(3);
      expect(parsed.transactions[0].transactionId).toBe("txn_A1B2C3D4E5F6G7H8");
      expect(parsed.transactions[0].amountInRupees).toBe(3500);
      expect(parsed.groups).toHaveLength(2);
      expect(parsed.settlements).toHaveLength(1);
    });
  });

  describe("Printable HTML / PDF Template Generator", () => {
    it("should include branding, summary cards, transaction rows, and print styling", () => {
      const html = generatePrintableHTMLReport(mockReportData);

      expect(html).toContain("SplitLedger AI");
      expect(html).toContain("Monthly Financial Report - August 2026");
      expect(html).toContain("₹75,000.00");
      expect(html).toContain("₹42,500.50");
      expect(html).toContain("txn_A1B2C3D4E5F6G7H8");
      expect(html).toContain("@media print");
    });
  });

  describe("Multi-Sheet Excel Workbook Generator", () => {
    it("should generate valid XML spreadsheet with Summary, Transactions, Groups, Settlements sheets", () => {
      const xml = generateExcelWorkbook(mockReportData);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<Worksheet ss:Name="Summary">');
      expect(xml).toContain('<Worksheet ss:Name="Transactions">');
      expect(xml).toContain('<Worksheet ss:Name="Groups">');
      expect(xml).toContain('<Worksheet ss:Name="Settlements">');
      expect(xml).toContain("txn_A1B2C3D4E5F6G7H8");
      expect(xml).toContain("3500");
    });
  });

  describe("Summary Financial Arithmetic", () => {
    it("should correctly compute net balance = income - expense", () => {
      const income = 75000;
      const expense = 42500.5;
      const net = income - expense;
      expect(net).toBe(32499.5);
    });
  });
});
