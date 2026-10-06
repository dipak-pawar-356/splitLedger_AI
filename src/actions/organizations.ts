"use server";

import { requireAuth } from "@/lib/auth";
import { DatabaseError, AuthorizationError } from "@/lib/errors";
import {
  Organization,
  Department,
  Team,
  Project,
  Employee,
  CorporateExpenseApproval,
  BusinessAccount,
  OrganizationSummary,
} from "@/lib/types/enterprise";

// In-memory enterprise store to provide enterprise-grade tenant isolation and state management
const organizationsStore = new Map<string, Organization>();
const departmentsStore = new Map<string, Department[]>();
const teamsStore = new Map<string, Team[]>();
const projectsStore = new Map<string, Project[]>();
const employeesStore = new Map<string, Employee[]>();
const businessAccountsStore = new Map<string, BusinessAccount[]>();
const expenseApprovalsStore = new Map<string, CorporateExpenseApproval[]>();

// Initialize a demo enterprise organization for new corporate users
function ensureSeedOrganization(userId: number) {
  const defaultOrgId = `org_techcorp_${userId}`;
  if (!organizationsStore.has(defaultOrgId)) {
    const org: Organization = {
      id: defaultOrgId,
      name: "Acme Enterprises India Pvt Ltd",
      slug: "acme-enterprises",
      industry: "Information Technology",
      companySize: "50-200 Employees",
      gstNumber: "27AABCU9603R1ZM",
      panNumber: "AABCU9603R",
      country: "India",
      state: "Maharashtra",
      city: "Mumbai",
      timezone: "Asia/Kolkata",
      baseCurrency: "INR",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: userId,
    };
    organizationsStore.set(defaultOrgId, org);

    const depts: Department[] = [
      { id: `dept_eng_${userId}`, orgId: defaultOrgId, name: "Engineering & Technology", code: "ENG", budget: 1500000, currency: "INR", employeeCount: 14, teamCount: 3, createdAt: new Date().toISOString() },
      { id: `dept_mkt_${userId}`, orgId: defaultOrgId, name: "Marketing & Growth", code: "MKT", budget: 600000, currency: "INR", employeeCount: 6, teamCount: 2, createdAt: new Date().toISOString() },
      { id: `dept_fin_${userId}`, orgId: defaultOrgId, name: "Finance & Accounts", code: "FIN", budget: 400000, currency: "INR", employeeCount: 4, teamCount: 1, createdAt: new Date().toISOString() },
    ];
    departmentsStore.set(defaultOrgId, depts);

    const teams: Team[] = [
      { id: `team_be_${userId}`, orgId: defaultOrgId, departmentId: depts[0].id, name: "Backend Core", budget: 600000, currency: "INR", memberCount: 6, workspaceType: "private" },
      { id: `team_fe_${userId}`, orgId: defaultOrgId, departmentId: depts[0].id, name: "Frontend & Mobile", budget: 500000, currency: "INR", memberCount: 5, workspaceType: "public" },
    ];
    teamsStore.set(defaultOrgId, teams);

    const projects: Project[] = [
      { id: `proj_ai_${userId}`, orgId: defaultOrgId, departmentId: depts[0].id, name: "SplitLedger AI Core v2", code: "SLAI-2026", clientName: "Internal Product", budget: 800000, spentAmount: 345000, currency: "INR", status: "active" },
      { id: `proj_cloud_${userId}`, orgId: defaultOrgId, departmentId: depts[0].id, name: "Cloud Migration & DR", code: "MIG-99", clientName: "Enterprise Infra", budget: 450000, spentAmount: 180000, currency: "INR", status: "active" },
    ];
    projectsStore.set(defaultOrgId, projects);

    const employees: Employee[] = [
      { id: `emp_01_${userId}`, orgId: defaultOrgId, userId, employeeCode: "EMP-001", name: "Dipak Pawar", email: "dipak@acme.corp", designation: "Principal Architect", departmentId: depts[0].id, departmentName: "Engineering & Technology", teamId: teams[0].id, teamName: "Backend Core", employmentType: "full_time", status: "active", joiningDate: "2024-01-15" },
      { id: `emp_02_${userId}`, orgId: defaultOrgId, employeeCode: "EMP-002", name: "Aarav Sharma", email: "aarav@acme.corp", designation: "Senior Dev Lead", departmentId: depts[0].id, departmentName: "Engineering & Technology", teamId: teams[0].id, teamName: "Backend Core", employmentType: "full_time", status: "active", joiningDate: "2024-03-01" },
    ];
    employeesStore.set(defaultOrgId, employees);

    const accounts: BusinessAccount[] = [
      { id: `acc_main_${userId}`, orgId: defaultOrgId, name: "Primary Corporate Current Account", accountNumber: "987654321001", currency: "INR", balance: 4500000, budget: 3000000, expenseLimit: 500000, linkedDepartmentIds: [depts[0].id, depts[1].id] },
      { id: `acc_ops_${userId}`, orgId: defaultOrgId, name: "Operations & Cloud Subscriptions Account", accountNumber: "987654321002", currency: "INR", balance: 1200000, budget: 1000000, expenseLimit: 200000, linkedDepartmentIds: [depts[0].id] },
    ];
    businessAccountsStore.set(defaultOrgId, accounts);

    const approvals: CorporateExpenseApproval[] = [
      {
        id: `exp_app_01_${userId}`,
        orgId: defaultOrgId,
        employeeId: employees[0].id,
        employeeName: employees[0].name,
        departmentId: depts[0].id,
        projectId: projects[0].id,
        title: "AWS Cloud Infrastructure - August 2026",
        description: "Monthly serverless PostgreSQL & GPU compute hosting",
        amount: 48500,
        currency: "INR",
        state: "under_review",
        currentApproverRole: "Finance Head",
        submittedAt: new Date().toISOString(),
        timeline: [
          { id: "tl_1", state: "submitted", actorId: userId, actorName: "Dipak Pawar", actorRole: "Employee", timestamp: new Date().toISOString() },
          { id: "tl_2", state: "under_review", actorId: "fin_admin", actorName: "Finance Desk", actorRole: "Finance Head", comment: "Verified with AWS invoice", timestamp: new Date().toISOString() },
        ],
      },
    ];
    expenseApprovalsStore.set(defaultOrgId, approvals);
  }
}

/**
 * Get all organizations associated with current user
 */
export async function getUserOrganizations(): Promise<Organization[]> {
  const user = await requireAuth();
  ensureSeedOrganization(user.id);

  return Array.from(organizationsStore.values()).filter((org) => org.ownerId === user.id);
}

/**
 * Get full organization summary with departments, teams, projects, and approval queue
 */
export async function getOrganizationSummary(orgId: string): Promise<OrganizationSummary> {
  const user = await requireAuth();
  ensureSeedOrganization(user.id);

  const org = organizationsStore.get(orgId);
  if (!org || org.ownerId !== user.id) {
    // Tenant Isolation Check
    throw new AuthorizationError("Organization not found or access denied.");
  }

  const departments = departmentsStore.get(orgId) || [];
  const teams = teamsStore.get(orgId) || [];
  const projects = projectsStore.get(orgId) || [];
  const employees = employeesStore.get(orgId) || [];
  const businessAccounts = businessAccountsStore.get(orgId) || [];
  const pendingApprovals = expenseApprovalsStore.get(orgId) || [];

  const totalAllocatedBudget = departments.reduce((sum, d) => sum + d.budget, 0);
  const totalSpentBudget = projects.reduce((sum, p) => sum + p.spentAmount, 0);

  return {
    organization: org,
    businessAccounts,
    departments,
    teams,
    projects,
    employees,
    pendingApprovals,
    totalAllocatedBudget,
    totalSpentBudget,
    currency: org.baseCurrency || "INR",
  };
}

/**
 * Create a new enterprise organization
 */
export async function createOrganization(data: {
  name: string;
  industry?: string;
  companySize?: string;
  gstNumber?: string;
  panNumber?: string;
  country?: string;
  state?: string;
  city?: string;
  baseCurrency?: string;
}): Promise<Organization> {
  const user = await requireAuth();

  const id = `org_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const slug = data.name.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 50);

  const org: Organization = {
    id,
    name: data.name,
    slug,
    industry: data.industry || "General Business",
    companySize: data.companySize || "10-50 Employees",
    gstNumber: data.gstNumber,
    panNumber: data.panNumber,
    country: data.country || "India",
    state: data.state,
    city: data.city,
    timezone: "Asia/Kolkata",
    baseCurrency: data.baseCurrency || "INR",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ownerId: user.id,
  };

  organizationsStore.set(id, org);
  departmentsStore.set(id, []);
  teamsStore.set(id, []);
  projectsStore.set(id, []);
  employeesStore.set(id, []);
  businessAccountsStore.set(id, []);
  expenseApprovalsStore.set(id, []);

  return org;
}

/**
 * Submit corporate expense for approval review
 */
export async function submitCorporateExpense(
  orgId: string,
  data: {
    employeeId: string;
    employeeName: string;
    departmentId?: string;
    projectId?: string;
    title: string;
    description?: string;
    amount: number;
    receiptUrl?: string;
  }
): Promise<CorporateExpenseApproval> {
  const user = await requireAuth();
  const org = organizationsStore.get(orgId);
  if (!org || org.ownerId !== user.id) {
    throw new AuthorizationError("Access denied.");
  }

  const approvalId = `exp_app_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const approval: CorporateExpenseApproval = {
    id: approvalId,
    orgId,
    employeeId: data.employeeId,
    employeeName: data.employeeName,
    departmentId: data.departmentId,
    projectId: data.projectId,
    title: data.title,
    description: data.description,
    amount: data.amount,
    currency: org.baseCurrency || "INR",
    state: "submitted",
    currentApproverRole: "Department Manager",
    submittedAt: new Date().toISOString(),
    receiptUrl: data.receiptUrl,
    timeline: [
      {
        id: `tl_${Date.now()}`,
        state: "submitted",
        actorId: user.id,
        actorName: data.employeeName,
        actorRole: "Employee",
        timestamp: new Date().toISOString(),
      },
    ],
  };

  const list = expenseApprovalsStore.get(orgId) || [];
  list.unshift(approval);
  expenseApprovalsStore.set(orgId, list);

  return approval;
}

/**
 * Approve or Reject corporate expense claim
 */
export async function reviewCorporateExpense(
  orgId: string,
  approvalId: string,
  action: "approve" | "reject",
  comment?: string
): Promise<CorporateExpenseApproval> {
  const user = await requireAuth();
  const org = organizationsStore.get(orgId);
  if (!org || org.ownerId !== user.id) {
    throw new AuthorizationError("Access denied.");
  }

  const list = expenseApprovalsStore.get(orgId) || [];
  const approval = list.find((a) => a.id === approvalId);
  if (!approval) {
    throw new DatabaseError(`Approval request '${approvalId}' not found.`);
  }

  const newState = action === "approve" ? "approved" : "rejected";
  approval.state = newState;
  if (action === "approve") {
    approval.approvedAt = new Date().toISOString();
  }

  approval.timeline.push({
    id: `tl_${Date.now()}`,
    state: newState,
    actorId: user.id,
    actorName: "Organization Admin",
    actorRole: "Reviewer",
    comment: comment || (action === "approve" ? "Approved for reimbursement" : "Rejected"),
    timestamp: new Date().toISOString(),
  });

  return approval;
}
