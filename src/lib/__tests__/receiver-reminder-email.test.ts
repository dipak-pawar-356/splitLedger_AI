import { describe, it, expect } from "vitest";
import {
  getRichReceiverReminderHtml,
  getReceiverPlainTextMessage,
  getReceiverWhatsAppMessage,
  getReceiverSmsMessage,
  getReceiverInAppNotification,
  getReceiverPushNotification,
  RECEIVER_REMINDER_SUBJECT_OPTIONS,
  type RichReceiverReminderParams,
} from "@/lib/notifications";

describe("Receiver Reminder Email & Multi-Channel Experience (SplitLedger AI)", () => {
  const sampleReceiverParams: RichReceiverReminderParams = {
    receiverName: "Dipak Pawar",
    groupName: "Summer Trip Group",
    amountPaid: 8000,
    ownShare: 4666.68,
    extraPaid: 3333.32,
    pendingAmount: 4666.64,
    currency: "INR",
    appUrl: "https://split-ledger-ai.vercel.app/dashboard/groups/grp_summer_2026",
    groupLink: "https://split-ledger-ai.vercel.app/dashboard/groups/grp_summer_2026",
    settlementLink: "https://split-ledger-ai.vercel.app/dashboard/groups/grp_summer_2026/settlements",
    dashboardLink: "https://split-ledger-ai.vercel.app/dashboard",
    payers: [
      {
        name: "Kunal Patil",
        amount: 3333.32,
        status: "Pending",
        paymentMethod: "QR / Manual",
      },
      {
        name: "Raj Pawar",
        amount: 1333.32,
        status: "Pending",
        paymentMethod: "QR / Manual",
      },
    ],
  };

  describe("1. Professional Green Header & Subject Line", () => {
    it("should render the professional green header and subject options", () => {
      const { html, subject } = getRichReceiverReminderHtml(sampleReceiverParams);

      expect(subject).toContain("Summer Trip Group");
      expect(subject).toContain("Settlement awaiting payment");
      expect(html).toContain("Settlement Awaiting Payment");
      expect(html).toContain("Summer Trip Group");
      // Header gradient
      expect(html).toContain("background: linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)");

      // Deliverability-tested subject lines without raw currency symbols
      const subjects = RECEIVER_REMINDER_SUBJECT_OPTIONS.map((fn) => fn("Goa Trip", "Kunal"));
      subjects.forEach((subj) => {
        expect(subj).not.toContain("₹");
        expect(subj).not.toContain("$");
        expect(subj.toLowerCase()).not.toContain("overdue");
        expect(subj.toLowerCase()).not.toContain("debt");
      });
    });
  });

  describe("2. Polite Introduction & Financial Clarification", () => {
    it("should explain that the receiver paid more than their share and needs reimbursement", () => {
      const { html } = getRichReceiverReminderHtml(sampleReceiverParams);

      expect(html).toContain("Hi <strong>Dipak Pawar</strong>,");
      expect(html).toContain("Thank you for contributing toward your group&rsquo;s expenses.");
      expect(html).toContain("you paid more than your own share to cover expenses on behalf of other group members.");
      expect(html).toContain("The following members still need to reimburse you.");
    });
  });

  describe("3. Your Contribution Summary Card", () => {
    it("should display total contribution, own share, extra paid, and reimbursement status", () => {
      const { html } = getRichReceiverReminderHtml(sampleReceiverParams);

      expect(html).toContain("Your Contribution Summary");
      expect(html).toContain("Your Total Contribution");
      expect(html).toContain("₹8,000.00");
      expect(html).toContain("Your Own Expense Share");
      expect(html).toContain("₹4,666.68");
      expect(html).toContain("Amount You Paid Extra");
      expect(html).toContain("+₹3,333.32");
      expect(html).toContain("Waiting for reimbursement");
    });
  });

  describe("4. New Green Status Card", () => {
    it("should render outstanding settlement total, waiting from list, and status badge", () => {
      const { html } = getRichReceiverReminderHtml(sampleReceiverParams);

      expect(html).toContain("Outstanding Settlement");
      expect(html).toContain("₹4,666.64");
      expect(html).toContain("Waiting From");
      expect(html).toContain("&bull; Kunal Patil");
      expect(html).toContain("₹3,333.32");
      expect(html).toContain("&bull; Raj Pawar");
      expect(html).toContain("₹1,333.32");
      expect(html).toContain("Waiting for Member Payments");
    });
  });

  describe("5. 'Who Needs To Pay You' Itemized Table", () => {
    it("should render a table with member name, outstanding amount, pending status, and payment method", () => {
      const { html } = getRichReceiverReminderHtml(sampleReceiverParams);

      expect(html).toContain("Who Needs To Pay You");
      expect(html).toContain("Member Name");
      expect(html).toContain("Outstanding Amount");
      expect(html).toContain("Payment Method");

      // Rows
      expect(html).toContain("Kunal Patil");
      expect(html).toContain("QR / Manual");
      expect(html).toContain("Raj Pawar");

      // Total row
      expect(html).toContain("Total Pending To Receive");
      expect(html).toContain("₹4,666.64");
    });
  });

  describe("6. Important Settlement Information & Request Message", () => {
    it("should guide payment methods and outside-app completion instructions", () => {
      const { html } = getRichReceiverReminderHtml(sampleReceiverParams);

      expect(html).toContain("Important Settlement Information");
      expect(html).toContain("The above members are requested to complete their pending settlement at the earliest.");
      expect(html).toContain("Once payment is completed using SplitLedger AI QR Code or Manual Settlement, your group balance will automatically update.");
      expect(html).toContain("If payment is completed outside SplitLedger AI, kindly request the payer(s) to mark the settlement as completed so your ledger remains accurate.");

      // Request Message
      expect(html).toContain("You may politely remind the members listed above to complete their pending payment.");
      expect(html).toContain("This helps keep everyone&rsquo;s balances accurate and ensures the group&rsquo;s financial records remain synchronized.");
    });
  });

  describe("7. Primary & Secondary Action Buttons", () => {
    it("should provide direct navigation to settlement details, group, and dashboard", () => {
      const { html } = getRichReceiverReminderHtml(sampleReceiverParams);

      expect(html).toContain("View Settlement Details");
      expect(html).toContain(sampleReceiverParams.settlementLink);
      expect(html).toContain("View Group");
      expect(html).toContain(sampleReceiverParams.groupLink);
      expect(html).toContain("Open Dashboard");
      expect(html).toContain(sampleReceiverParams.dashboardLink);
    });
  });

  describe("8. 'What Happens After Payment' Educational Card", () => {
    it("should inform the receiver about zero balance and card status transition", () => {
      const { html } = getRichReceiverReminderHtml(sampleReceiverParams);

      expect(html).toContain("What Happens After Payment?");
      expect(html).toContain("Once every pending member completes their settlement:");
      expect(html).toContain("Your outstanding receivable will automatically become <strong>₹0.00</strong>.");
      expect(html).toContain("Waiting for Payment");
      expect(html).toContain("Settlement Completed");
      expect(html).toContain("Your group balances will automatically recalculate.");
    });
  });

  describe("9. Verified Enterprise Footer", () => {
    it("should display non-threatening, audit-verified footer with preferences link", () => {
      const { html } = getRichReceiverReminderHtml(sampleReceiverParams);

      expect(html).toContain("Generated automatically by SplitLedger AI");
      expect(html).toContain("Calculated using verified ledger records.");
      expect(html).toContain("This reminder is based on the latest settlement calculations.");
      expect(html).toContain("Notification Preferences");
      // Free of debt collection / threatening words
      expect(html.toLowerCase()).not.toContain("debt collection");
      expect(html.toLowerCase()).not.toContain("overdue notice");
      expect(html.toLowerCase()).not.toContain("legal action");
    });
  });

  describe("10. Multi-Channel Synchronization (Plain Text, WhatsApp, SMS, In-App, Push)", () => {
    it("should format consistent plain text message with ASCII tables and all sections", () => {
      const plainText = getReceiverPlainTextMessage(sampleReceiverParams);

      expect(plainText).toContain("Hi Dipak Pawar,");
      expect(plainText).toContain("YOUR CONTRIBUTION SUMMARY");
      expect(plainText).toContain("Your Total Contribution: ₹8,000.00");
      expect(plainText).toContain("Amount You Paid Extra:   +₹3,333.32");
      expect(plainText).toContain("OUTSTANDING SETTLEMENT");
      expect(plainText).toContain("WHO NEEDS TO PAY YOU");
      expect(plainText).toContain("Kunal Patil");
      expect(plainText).toContain("Raj Pawar");
      expect(plainText).toContain("Total Pending To Receive: ₹4,666.64");
      expect(plainText).toContain("WHAT HAPPENS AFTER PAYMENT?");
      expect(plainText).toContain("Settlement Completed");
    });

    it("should format rich WhatsApp message with bolding and instructions", () => {
      const waMsg = getReceiverWhatsAppMessage(sampleReceiverParams);

      expect(waMsg).toContain("*SPLITLEDGER AI — SETTLEMENT AWAITING PAYMENT*");
      expect(waMsg).toContain("Hi *Dipak Pawar*");
      expect(waMsg).toContain("*YOUR CONTRIBUTION SUMMARY:*");
      expect(waMsg).toContain("*+₹3,333.32*");
      expect(waMsg).toContain("*WHO NEEDS TO PAY YOU:*");
      expect(waMsg).toContain("*Kunal Patil:* *₹3,333.32*");
      expect(waMsg).toContain("*Raj Pawar:* *₹1,333.32*");
      expect(waMsg).toContain("*Total Pending To Receive:* *₹4,666.64*");
      expect(waMsg).toContain("Settlement Completed");
    });

    it("should produce clean SMS, in-app and push notifications", () => {
      const sms = getReceiverSmsMessage(sampleReceiverParams);
      expect(sms).toContain("Dipak Pawar");
      expect(sms).toContain("₹8,000.00");
      expect(sms).toContain("₹4,666.64");

      const inApp = getReceiverInAppNotification(sampleReceiverParams);
      expect(inApp.title).toContain("₹4,666.64");
      expect(inApp.message).toContain("Summer Trip Group");

      const push = getReceiverPushNotification(sampleReceiverParams);
      expect(push.title).toContain("₹4,666.64");
      expect(push.body).toContain("Summer Trip Group");
    });
  });

  describe("11. Backward Compatibility & Single Payer Fallback", () => {
    it("should seamlessly handle single payer fallback without payers array", () => {
      const singlePayerParams: RichReceiverReminderParams = {
        receiverName: "Dipak Pawar",
        payerName: "Kunal Patil",
        groupName: "Weekend Dinner",
        amountPaid: 5000,
        ownShare: 2500,
        extraPaid: 2500,
        pendingAmount: 2500,
      };

      const { html, text } = getRichReceiverReminderHtml(singlePayerParams);

      expect(html).toContain("Dipak Pawar");
      expect(html).toContain("Kunal Patil");
      expect(html).toContain("₹2,500.00");
      expect(html).toContain("QR / Manual");
      expect(html).toContain("Waiting for Member Payments");
      expect(text).toContain("Kunal Patil");
      expect(text).toContain("₹2,500.00");
    });
  });

  describe("12. Creditor Extra-Paid Multi-Debtor Copy Format (Exact User Scenario)", () => {
    it("should include all persons who owe money, their individual amounts, and the exact total pending", () => {
      const summerTripCopyParams: RichReceiverReminderParams = {
        receiverName: "Dipak Pawar",
        groupName: "Summer Trip",
        amountPaid: 8000.0,
        ownShare: 6333.34,
        extraPaid: 1666.66,
        pendingAmount: 1666.66,
        currency: "INR",
        subject: "[SplitLedger] Summer Trip: Settlement awaiting payment from members (Your Copy)",
        payers: [
          {
            name: "Kunal Patil",
            amount: 1333.32,
            status: "Pending",
            paymentMethod: "QR / Manual",
          },
          {
            name: "Raj Pawar",
            amount: 333.34,
            status: "Pending",
            paymentMethod: "QR / Manual",
          },
        ],
      };

      const { html, text, subject } = getRichReceiverReminderHtml(summerTripCopyParams);

      // Subject line
      expect(subject).toBe("[SplitLedger] Summer Trip: Settlement awaiting payment from members (Your Copy)");

      // Receiver greeting
      expect(html).toContain("Hi <strong>Dipak Pawar</strong>,");

      // Contribution summary
      expect(html).toContain("₹8,000.00");
      expect(html).toContain("₹6,333.34");
      expect(html).toContain("+₹1,666.66");

      // Both debtors and their individual amounts present
      expect(html).toContain("Kunal Patil");
      expect(html).toContain("₹1,333.32");
      expect(html).toContain("Raj Pawar");
      expect(html).toContain("₹333.34");

      // Overall total pending amount
      expect(html).toContain("₹1,666.66");
      expect(html).toContain("Total Pending To Receive");

      // Plain text consistency
      expect(text).toContain("Dipak Pawar");
      expect(text).toContain("Kunal Patil");
      expect(text).toContain("₹1,333.32");
      expect(text).toContain("Raj Pawar");
      expect(text).toContain("₹333.34");
      expect(text).toContain("Total Pending To Receive: ₹1,666.66");
      expect(text).toContain("Amount You Paid Extra:   +₹1,666.66");
    });
  });
});
