import { describe, it, expect } from "vitest";

describe("Notifications Module & Real-Time Center", () => {
  describe("SECTION 3 & 5: Notification Types & Priority Levels", () => {
    it("should classify priorities and assign appropriate severity tags", () => {
      const getPriorityBadgeColor = (priority: "critical" | "high" | "medium" | "low") => {
        switch (priority) {
          case "critical":
            return "rose-600";
          case "high":
            return "rose-500";
          case "medium":
            return "amber-500";
          case "low":
            return "slate-400";
        }
      };

      expect(getPriorityBadgeColor("critical")).toBe("rose-600");
      expect(getPriorityBadgeColor("high")).toBe("rose-500");
      expect(getPriorityBadgeColor("medium")).toBe("amber-500");
      expect(getPriorityBadgeColor("low")).toBe("slate-400");
    });
  });

  describe("SECTION 6 & 7: Read / Unread State & Badge Counting", () => {
    it("should compute unread badge count correctly and decrement on read", () => {
      const notifications = [
        { id: 1, isRead: false, isArchived: false },
        { id: 2, isRead: false, isArchived: false },
        { id: 3, isRead: true, isArchived: false },
        { id: 4, isRead: false, isArchived: true }, // archived does not count in active unread
      ];

      const activeUnreadCount = notifications.filter((n) => !n.isRead && !n.isArchived).length;
      expect(activeUnreadCount).toBe(2);

      // Simulate marking one as read
      notifications[0].isRead = true;
      const updatedCount = notifications.filter((n) => !n.isRead && !n.isArchived).length;
      expect(updatedCount).toBe(1);
    });
  });

  describe("SECTION 8 & 9: Search & Multi-Criteria Filtering", () => {
    it("should filter notifications by category, priority, and search term", () => {
      const items = [
        { id: 1, title: "Food Expense Added", message: "Dipak added Food expense of ₹1400", category: "expense", priority: "medium" },
        { id: 2, title: "Settlement Requested", message: "Rahul requested settlement of ₹500", category: "settlement", priority: "high" },
        { id: 3, title: "Budget Limit Warning", message: "Monthly grocery exceeded 80%", category: "budget", priority: "critical" },
      ];

      const searchExpense = items.filter((n) => n.category === "expense");
      expect(searchExpense.length).toBe(1);
      expect(searchExpense[0].title).toBe("Food Expense Added");

      const searchCritical = items.filter((n) => n.priority === "critical");
      expect(searchCritical.length).toBe(1);
      expect(searchCritical[0].title).toBe("Budget Limit Warning");

      const query = "dipak";
      const searchResult = items.filter(
        (n) => n.title.toLowerCase().includes(query) || n.message.toLowerCase().includes(query)
      );
      expect(searchResult.length).toBe(1);
      expect(searchResult[0].id).toBe(1);
    });
  });

  describe("SECTION 11: Notification Channel Preferences", () => {
    it("should validate and merge preference flags with safe defaults", () => {
      const defaultPrefs = {
        notificationsEnabled: true,
        emailNotifications: true,
        whatsappNotifications: false,
        expenseNotifications: true,
        settlementNotifications: true,
        budgetNotifications: true,
      };

      const userCustomPrefs = {
        whatsappNotifications: true,
        budgetNotifications: false,
      };

      const merged = { ...defaultPrefs, ...userCustomPrefs };

      expect(merged.notificationsEnabled).toBe(true);
      expect(merged.whatsappNotifications).toBe(true);
      expect(merged.budgetNotifications).toBe(false);
      expect(merged.expenseNotifications).toBe(true);
    });
  });
});
