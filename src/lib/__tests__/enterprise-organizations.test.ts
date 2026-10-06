import { describe, it, expect, vi } from "vitest";
import {
  createOrganization,
  submitCorporateExpense,
  reviewCorporateExpense,
  getOrganizationSummary,
} from "@/actions/organizations";

// Mock requireAuth to return user with ID 1
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    id: 1,
    clerkUserId: "user_test_org_owner",
    email: "admin@enterprise.corp",
    name: "Enterprise Admin",
    defaultCurrency: "INR",
  }),
}));

describe("Enterprise Organizations, Workspaces & Corporate Ledger (Part V-D)", () => {
  describe("SECTION 2: Organization Creation & Metadata", () => {
    it("should create enterprise organization with GST, PAN and base currency INR", async () => {
      const org = await createOrganization({
        name: "Bharat Fintech Solutions Pvt Ltd",
        industry: "Financial Services",
        companySize: "100-500 Employees",
        gstNumber: "27AABCU9603R1ZM",
        panNumber: "AABCU9603R",
        country: "India",
        state: "Maharashtra",
        city: "Pune",
        baseCurrency: "INR",
      });

      expect(org.id).toMatch(/^org_/);
      expect(org.name).toBe("Bharat Fintech Solutions Pvt Ltd");
      expect(org.slug).toBe("bharat-fintech-solutions-pvt-ltd");
      expect(org.baseCurrency).toBe("INR");
      expect(org.status).toBe("active");
    });
  });

  describe("SECTION 4 & 5: Department & Team Hierarchy", () => {
    it("should retrieve organization summary with departments and projects", async () => {
      const summary = await getOrganizationSummary("org_techcorp_1");

      expect(summary.organization.name).toBe("Acme Enterprises India Pvt Ltd");
      expect(summary.departments.length).toBeGreaterThan(0);
      expect(summary.projects.length).toBeGreaterThan(0);
      expect(summary.totalAllocatedBudget).toBeGreaterThan(0);
      expect(summary.currency).toBe("INR");
    });
  });

  describe("SECTION 8: Corporate Expense Approval Workflow", () => {
    it("should submit corporate expense claim and transition through approval states", async () => {
      const claim = await submitCorporateExpense("org_techcorp_1", {
        employeeId: "emp_01_1",
        employeeName: "Dipak Pawar",
        title: "Client Dinner - Taj Mumbai",
        description: "Enterprise Q3 roadmap discussion with client",
        amount: 14250,
      });

      expect(claim.id).toMatch(/^exp_app_/);
      expect(claim.state).toBe("submitted");
      expect(claim.amount).toBe(14250);
      expect(claim.currency).toBe("INR");

      // Review and approve
      const approved = await reviewCorporateExpense(
        "org_techcorp_1",
        claim.id,
        "approve",
        "Approved by Finance Head"
      );

      expect(approved.state).toBe("approved");
      expect(approved.approvedAt).toBeDefined();
      expect(approved.timeline.length).toBeGreaterThan(1);
    });

    it("should reject invalid expense claims with auditing reason", async () => {
      const claim = await submitCorporateExpense("org_techcorp_1", {
        employeeId: "emp_01_1",
        employeeName: "Dipak Pawar",
        title: "Personal Gadgets Purchase",
        amount: 85000,
      });

      const rejected = await reviewCorporateExpense(
        "org_techcorp_1",
        claim.id,
        "reject",
        "Personal expenses are non-reimbursable under corporate policy."
      );

      expect(rejected.state).toBe("rejected");
      expect(rejected.timeline.some((t) => t.comment?.includes("non-reimbursable"))).toBe(true);
    });
  });

  describe("SECTION 1: Multi-Tenant Isolation", () => {
    it("should enforce tenant boundaries and reject unauthorized access", async () => {
      await expect(getOrganizationSummary("org_unauthorized_999")).rejects.toThrow(
        "Organization not found or access denied."
      );
    });
  });
});
