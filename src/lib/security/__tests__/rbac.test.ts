import { describe, it, expect } from "vitest";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissions,
} from "../rbac";

describe("RBAC", () => {
  describe("hasPermission", () => {
    it("should return true for superadmin with any permission", () => {
      const result = hasPermission("superadmin", "users:delete");
      expect(result).toBe(true);
    });

    it("should return true for user with correct permission", () => {
      const result = hasPermission("user", "transactions:write");
      expect(result).toBe(true);
    });

    it("should return false for user without permission", () => {
      const result = hasPermission("user", "users:delete");
      expect(result).toBe(false);
    });

    it("should return false for admin without superadmin permission", () => {
      const result = hasPermission("admin", "users:delete");
      expect(result).toBe(false);
    });
  });

  describe("hasAnyPermission", () => {
    it("should return true if user has at least one permission", () => {
      const result = hasAnyPermission("user", ["transactions:write", "users:delete"]);
      expect(result).toBe(true);
    });

    it("should return false if user has none of the permissions", () => {
      const result = hasAnyPermission("user", ["users:delete", "admin:settings"]);
      expect(result).toBe(false);
    });
  });

  describe("hasAllPermissions", () => {
    it("should return true if user has all permissions", () => {
      const result = hasAllPermissions("superadmin", ["transactions:write", "users:delete"]);
      expect(result).toBe(true);
    });

    it("should return false if user is missing any permission", () => {
      const result = hasAllPermissions("user", ["transactions:write", "users:delete"]);
      expect(result).toBe(false);
    });
  });

  describe("getRolePermissions", () => {
    it("should return all permissions for superadmin", () => {
      const permissions = getRolePermissions("superadmin");
      expect(permissions.length).toBeGreaterThan(0);
      expect(permissions).toContain("users:delete");
    });

    it("should return limited permissions for user", () => {
      const permissions = getRolePermissions("user");
      expect(permissions.length).toBeGreaterThan(0);
      expect(permissions).not.toContain("users:delete");
    });
  });
});
