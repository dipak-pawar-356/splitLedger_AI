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
