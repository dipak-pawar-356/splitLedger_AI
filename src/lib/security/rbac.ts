/**
 * Enterprise Role-Based Access Control (RBAC) & Group Permission Engine
 * 
 * Defines application roles, group-level collaborative roles, and granular action validators.
 */

// ==========================================
// APPLICATION-LEVEL ROLES & PERMISSIONS
// ==========================================
export type UserRole = "user" | "admin" | "superadmin";

export type Permission =
  | "contacts:read"
  | "contacts:write"
  | "contacts:delete"
  | "transactions:read"
  | "transactions:write"
  | "transactions:delete"
  | "groups:read"
  | "groups:write"
  | "groups:delete"
  | "settlements:read"
  | "settlements:write"
  | "settlements:delete"
  | "reports:read"
  | "reports:export"
  | "analytics:read"
  | "settings:read"
  | "settings:write"
  | "users:read"
  | "users:write"
  | "users:delete"
  | "admin:dashboard"
  | "admin:logs"
  | "admin:settings";

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  user: [
    "contacts:read",
    "contacts:write",
    "contacts:delete",
    "transactions:read",
    "transactions:write",
    "transactions:delete",
    "groups:read",
    "groups:write",
    "groups:delete",
    "settlements:read",
    "settlements:write",
    "settlements:delete",
    "reports:read",
    "reports:export",
    "analytics:read",
    "settings:read",
    "settings:write",
  ],
  admin: [
    "contacts:read",
    "contacts:write",
    "contacts:delete",
    "transactions:read",
    "transactions:write",
    "transactions:delete",
    "groups:read",
    "groups:write",
    "groups:delete",
    "settlements:read",
    "settlements:write",
    "settlements:delete",
    "reports:read",
    "reports:export",
    "analytics:read",
    "settings:read",
    "settings:write",
    "users:read",
    "users:write",
    "admin:dashboard",
    "admin:logs",
  ],
  superadmin: [
    "contacts:read",
    "contacts:write",
    "contacts:delete",
    "transactions:read",
    "transactions:write",
    "transactions:delete",
    "groups:read",
    "groups:write",
    "groups:delete",
    "settlements:read",
    "settlements:write",
    "settlements:delete",
    "reports:read",
    "reports:export",
    "analytics:read",
    "settings:read",
    "settings:write",
    "users:read",
    "users:write",
    "users:delete",
    "admin:dashboard",
    "admin:logs",
    "admin:settings",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

// ==========================================
// GROUP-LEVEL COLLABORATIVE ROLES & RBAC
// ==========================================
export type GroupRole = "owner" | "admin" | "member" | "viewer" | "guest";

export type GroupAction =
  | "group:delete"
  | "group:edit_settings"
  | "group:invite_members"
  | "group:remove_members"
  | "group:change_roles"
  | "expense:create"
  | "expense:edit"
  | "expense:delete"
  | "settlement:create"
  | "settlement:approve"
  | "reports:view"
  | "reports:export"
  | "analytics:view";

export const GROUP_ROLE_PERMISSIONS: Record<GroupRole, GroupAction[]> = {
  owner: [
    "group:delete",
    "group:edit_settings",
    "group:invite_members",
    "group:remove_members",
    "group:change_roles",
    "expense:create",
    "expense:edit",
    "expense:delete",
    "settlement:create",
    "settlement:approve",
    "reports:view",
    "reports:export",
    "analytics:view",
  ],
  admin: [
    "group:edit_settings",
    "group:invite_members",
    "group:remove_members",
    "group:change_roles",
    "expense:create",
    "expense:edit",
    "expense:delete",
    "settlement:create",
    "settlement:approve",
    "reports:view",
    "reports:export",
    "analytics:view",
  ],
  member: [
    "group:invite_members",
    "expense:create",
    "expense:edit",
    "expense:delete",
    "settlement:create",
    "settlement:approve",
    "reports:view",
    "reports:export",
    "analytics:view",
  ],
  viewer: [
    "reports:view",
    "reports:export",
    "analytics:view",
  ],
  guest: [
    "reports:view",
  ],
};

/**
 * Check if a group role has permission to execute a specific action
 */
export function canPerformGroupAction(role: GroupRole | string, action: GroupAction): boolean {
  const normalizedRole = (role || "member").toLowerCase() as GroupRole;
  return GROUP_ROLE_PERMISSIONS[normalizedRole]?.includes(action) || false;
}

export function hasGroupPermission(role: GroupRole | string, action: GroupAction): boolean {
  return canPerformGroupAction(role, action);
}

// ==========================================
// ENTERPRISE & ORGANIZATION RBAC
// ==========================================
export type EnterpriseRole = "owner" | "admin" | "manager" | "accountant" | "member" | "viewer" | "guest";
export type EnterprisePermission =
  | "org:expenses:create"
  | "org:expenses:edit"
  | "org:expenses:delete"
  | "org:expenses:approve"
  | "org:reports:view"
  | "org:reports:export"
  | "org:members:manage"
  | "org:payments:manage"
  | "org:settings:write";

export const ENTERPRISE_ROLE_PERMISSIONS: Record<EnterpriseRole, EnterprisePermission[]> = {
  owner: [
    "org:expenses:create",
    "org:expenses:edit",
    "org:expenses:delete",
    "org:expenses:approve",
    "org:reports:view",
    "org:reports:export",
    "org:members:manage",
    "org:payments:manage",
    "org:settings:write",
  ],
  admin: [
    "org:expenses:create",
    "org:expenses:edit",
    "org:expenses:delete",
    "org:expenses:approve",
    "org:reports:view",
    "org:reports:export",
    "org:members:manage",
    "org:payments:manage",
    "org:settings:write",
  ],
  manager: [
    "org:expenses:create",
    "org:expenses:edit",
    "org:expenses:approve",
    "org:reports:view",
    "org:reports:export",
    "org:payments:manage",
  ],
  accountant: [
    "org:expenses:create",
    "org:reports:view",
    "org:reports:export",
    "org:payments:manage",
  ],
  member: [
    "org:expenses:create",
    "org:reports:view",
  ],
  viewer: [
    "org:reports:view",
  ],
  guest: [
    "org:reports:view",
  ],
};

export function hasOrganizationPermission(
  role: EnterpriseRole | string,
  permission: EnterprisePermission
): boolean {
  const normalized = (role || "member").toLowerCase() as EnterpriseRole;
  return ENTERPRISE_ROLE_PERMISSIONS[normalized]?.includes(permission) || false;
}

// ==========================================
// DELEGATED GROUP ADMINISTRATIVE PERMISSIONS
// ==========================================
export type DelegatedGroupPermission =
  | "group:approve_members"      // Approve or reject join requests
  | "group:view_join_requests"   // View pending join requests
  | "group:view_transactions"    // View transaction history
  | "group:view_settlements"     // View settlement history
  | "group:view_payments"        // View payment history
  | "group:view_audit_logs"      // View audit logs
  | "group:view_activity"        // View member activity
  | "group:manage_invitations"   // Manage invitations
  | "group:manage_permissions";  // Manage member permissions

export interface DelegatedPermissionMeta {
  key: DelegatedGroupPermission;
  label: string;
  description: string;
  category: "membership" | "financials" | "audit" | "administration";
}

export const DELEGATED_PERMISSIONS_LIST: DelegatedPermissionMeta[] = [
  {
    key: "group:approve_members",
    label: "Approve / Reject Requests",
    description: "Authority to approve or reject pending member join requests",
    category: "membership",
  },
  {
    key: "group:view_join_requests",
    label: "View Join Requests",
    description: "Inspect pending member requests waiting for owner approval",
    category: "membership",
  },
  {
    key: "group:view_transactions",
    label: "View Transaction History",
    description: "Access full group transaction history, edit trails, and receipts",
    category: "financials",
  },
  {
    key: "group:view_settlements",
    label: "View Settlement History",
    description: "Inspect peer-to-peer settlement records and repayment suggestions",
    category: "financials",
  },
  {
    key: "group:view_payments",
    label: "View Payment History",
    description: "Access UPI transaction confirmations and payment history",
    category: "financials",
  },
  {
    key: "group:view_audit_logs",
    label: "View Audit Logs",
    description: "Inspect group security events, administrative updates, and activity logs",
    category: "audit",
  },
  {
    key: "group:view_activity",
    label: "View Member Activity",
    description: "Monitor member interactions and group activity timeline",
    category: "audit",
  },
  {
    key: "group:manage_invitations",
    label: "Manage Invitations",
    description: "Create, copy, and manage group invite links and QR codes",
    category: "administration",
  },
  {
    key: "group:manage_permissions",
    label: "Manage Member Permissions",
    description: "Configure delegated administrative permissions for fellow members",
    category: "administration",
  },
];

/**
 * Check if a user possesses a specific delegated group permission.
 * Group Owner always has 100% authority across all permissions.
 * Approved members must have active status and the specific permission enabled.
 */
export function hasDelegatedGroupPermission(
  groupOwnerId: number,
  userId: number,
  member: {
    membershipStatus?: string | null;
    delegatedPermissions?: Record<string, boolean> | null;
  } | null | undefined,
  permission: DelegatedGroupPermission
): boolean {
  // 1. Group Owner always possesses all permissions
  if (groupOwnerId === userId) {
    return true;
  }

  // 2. Member must exist and be in 'active' status
  if (!member || member.membershipStatus !== "active") {
    return false;
  }

  // 3. Check explicit delegated permission toggle
  return Boolean(member.delegatedPermissions?.[permission]);
}
