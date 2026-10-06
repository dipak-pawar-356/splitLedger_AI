/**
 * Enterprise Organizations, Multi-Tenant Workspaces & Corporate Ledger Types
 */

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  coverImage?: string;
  description?: string;
  industry?: string;
  companySize?: string;
  website?: string;
  gstNumber?: string;
  cinNumber?: string;
  panNumber?: string;
  country: string;
  state?: string;
  city?: string;
  timezone: string;
  baseCurrency: string; // Default: INR
  status: "active" | "suspended" | "archived";
  createdAt: string;
  updatedAt: string;
  ownerId: number;
}

export interface BusinessAccount {
  id: string;
  orgId: string;
  name: string;
  accountNumber: string;
  currency: string;
  balance: number; // in rupees
  budget: number; // in rupees
  expenseLimit: number; // in rupees
  linkedDepartmentIds: string[];
}

export interface Department {
  id: string;
  orgId: string;
  name: string;
  code: string;
  managerId?: number;
  managerName?: string;
  budget: number; // in rupees
  currency: string;
  employeeCount: number;
  teamCount: number;
  createdAt: string;
}

export interface Team {
  id: string;
  orgId: string;
  departmentId: string;
  name: string;
  leadId?: number;
  leadName?: string;
  budget: number; // in rupees
  currency: string;
  memberCount: number;
  workspaceType: "private" | "public" | "restricted";
}

export interface Project {
  id: string;
  orgId: string;
  departmentId?: string;
  name: string;
  code: string;
  clientName?: string;
  managerId?: number;
  budget: number; // in rupees
  spentAmount: number; // in rupees
  currency: string;
  status: "planning" | "active" | "on_hold" | "completed" | "archived";
  startDate?: string;
  endDate?: string;
}

export type EmploymentType = "full_time" | "part_time" | "contract" | "intern" | "consultant";
export type EmployeeStatus = "active" | "on_leave" | "terminated";

export interface Employee {
  id: string;
  orgId: string;
  userId?: number;
  employeeCode: string;
  name: string;
  email: string;
  phone?: string;
  designation: string;
  departmentId?: string;
  departmentName?: string;
  teamId?: string;
  teamName?: string;
  reportingManagerId?: string;
  employmentType: EmploymentType;
  status: EmployeeStatus;
  joiningDate: string;
}

export type ApprovalState =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "paid"
  | "cancelled";

export interface ApprovalTimelineEvent {
  id: string;
  state: ApprovalState;
  actorId: number | string;
  actorName: string;
  actorRole: string;
  comment?: string;
  timestamp: string;
}

export interface CorporateExpenseApproval {
  id: string;
  orgId: string;
  employeeId: string;
  employeeName: string;
  departmentId?: string;
  projectId?: string;
  title: string;
  description?: string;
  amount: number; // in rupees
  currency: string;
  state: ApprovalState;
  currentApproverRole: string;
  submittedAt: string;
  approvedAt?: string;
  paidAt?: string;
  receiptUrl?: string;
  timeline: ApprovalTimelineEvent[];
}

export interface OrganizationSummary {
  organization: Organization;
  businessAccounts: BusinessAccount[];
  departments: Department[];
  teams: Team[];
  projects: Project[];
  employees: Employee[];
  pendingApprovals: CorporateExpenseApproval[];
  totalAllocatedBudget: number;
  totalSpentBudget: number;
  currency: string;
}
