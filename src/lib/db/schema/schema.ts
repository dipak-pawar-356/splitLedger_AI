import { pgTable, serial, text, timestamp, boolean, integer, bigint, pgEnum, jsonb, index, unique, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const transactionTypeEnum = pgEnum("transaction_type", ["paid", "received", "lent", "borrowed", "repaid", "adjustment"]);
export const splitMethodEnum = pgEnum("split_method", ["equal", "exact", "percentage", "shares"]);
export const groupTypeEnum = pgEnum("group_type", ["trip", "friends", "family", "couples", "office", "event", "shared_bills"]);
export const notificationTypeEnum = pgEnum("notification_type", ["expense", "settlement", "reminder", "invitation", "comment"]);
export const notificationStatusEnum = pgEnum("notification_status", ["pending", "sent", "delivered", "failed"]);
export const auditActionEnum = pgEnum("audit_action", ["create", "update", "delete", "settle", "invite", "comment", "ai_suggestion"]);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").unique(),
  clerkUserId: text("clerk_user_id").unique().notNull(),
  email: text("email").notNull(),
  name: text("name"),
  avatar: text("avatar"),
  defaultCurrency: text("default_currency").default("INR").notNull(),
  theme: text("theme").default("system"),
  emailVerified: boolean("email_verified").default(false),
  upiId: text("upi_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  clerkIdx: index("clerk_user_idx").on(table.clerkUserId),
  emailIdx: index("email_idx").on(table.email),
  publicIdIdx: index("user_public_id_idx").on(table.publicId),
  upiIdIdx: index("user_upi_id_idx").on(table.upiId),
}));

// Profiles table (extended user settings & account management)
export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  username: text("username"),
  bio: text("bio"),
  occupation: text("occupation"),
  company: text("company"),
  gender: text("gender"),
  dateOfBirth: timestamp("date_of_birth"),
  country: text("country").default("India"),
  state: text("state"),
  city: text("city"),
  pinCode: text("pin_code"),
  phone: text("phone"),
  upiId: text("upi_id"),
  secondaryEmail: text("secondary_email"),
  secondaryPhone: text("secondary_phone"),
  whatsappNumber: text("whatsapp_number"),
  emergencyContact: text("emergency_contact"),
  mobileVerified: boolean("mobile_verified").default(false),
  accountStatus: text("account_status").default("active").notNull(), // active, suspended, locked, deactivated
  twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
  recoveryEmail: text("recovery_email"),
  recoveryPhone: text("recovery_phone"),
  recoveryCodes: jsonb("recovery_codes"),
  privacySettings: jsonb("privacy_settings"), // { showEmail, showPhone, showBio, showActivity, showGroups, showFinancials }
  activeSessions: jsonb("active_sessions"), // array of session objects
  trustedDevices: jsonb("trusted_devices"), // array of trusted device objects
  loginHistory: jsonb("login_history"), // array of login history objects
  timezone: text("timezone").default("UTC"),
  language: text("language").default("en"),
  notificationsEnabled: boolean("notifications_enabled").default(true),
  emailNotifications: boolean("email_notifications").default(true),
  whatsappNotifications: boolean("whatsapp_notifications").default(false),
  expenseNotifications: boolean("expense_notifications").default(true),
  settlementNotifications: boolean("settlement_notifications").default(true),
  groupNotifications: boolean("group_notifications").default(true),
  invitationNotifications: boolean("invitation_notifications").default(true),
  budgetNotifications: boolean("budget_notifications").default(true),
  reminderNotifications: boolean("reminder_notifications").default(true),
  soundEnabled: boolean("sound_enabled").default(true),
  desktopNotifications: boolean("desktop_notifications").default(false),
  autoSettlement: boolean("auto_settlement").default(false),
  preferences: jsonb("preferences"), // Unified structured user preferences
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Contacts table
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").unique().notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  phone: text("phone"),
  email: text("email"),
  openingBalance: bigint("opening_balance", { mode: "number" }).default(0).notNull(),
  currency: text("currency").default("INR").notNull(),
  notes: text("notes"),
  notificationPreference: text("notification_preference").default("email"),
  isArchived: boolean("is_archived").default(false),
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  deletedBy: integer("deleted_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("contact_user_idx").on(table.userId),
  publicIdIdx: index("contact_public_id_idx").on(table.publicId),
  deletedIdx: index("contact_deleted_idx").on(table.isDeleted),
  userDeletedIdx: index("contact_user_deleted_idx").on(table.userId, table.isDeleted),
}));

// Groups table
export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").unique().notNull(),
  legacyPublicId: text("legacy_public_id"),
  name: text("name").notNull(),
  description: text("description"),
  coverImage: text("cover_image"),
  type: groupTypeEnum("type").default("friends").notNull(),
  currency: text("currency").default("INR").notNull(),
  splitMethod: splitMethodEnum("split_method").default("equal").notNull(),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "cascade" }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  deletedBy: integer("deleted_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  createdByIdx: index("group_created_by_idx").on(table.createdBy),
  publicIdIdx: index("group_public_id_idx").on(table.publicId),
  deletedIdx: index("group_deleted_idx").on(table.isDeleted),
  // Composite indexes for common query patterns
  createdByDeletedIdx: index("group_created_by_deleted_idx").on(table.createdBy, table.isDeleted),
}));

// Group members table
export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => groups.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  contactId: integer("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isGuest: boolean("is_guest").default(false).notNull(),
  nickname: text("nickname"),
  membershipStatus: text("membership_status").default("active").notNull(), // 'pending', 'expense_inactive', 'active'
  historicalInclusionDecision: text("historical_inclusion_decision"), // 'included', 'excluded'
  activatedAt: timestamp("activated_at"),
  delegatedPermissions: jsonb("delegated_permissions").$type<Record<string, boolean>>().default({}),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  invitationId: integer("invitation_id").references(() => invitations.id),
}, (table) => ({
  groupIdx: index("group_member_group_idx").on(table.groupId),
  userIdx: index("group_member_user_idx").on(table.userId),
  contactIdx: index("group_member_contact_idx").on(table.contactId),
  statusIdx: index("group_member_status_idx").on(table.membershipStatus),
  uniqueMember: unique("unique_group_member").on(table.groupId, table.userId, table.contactId),
}));

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  icon: text("icon"),
  color: text("color").default("#6366f1"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("category_user_idx").on(table.userId),
}));

// Transactions table (immutable ledger)
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").unique().notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  contactId: integer("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
  groupId: integer("group_id").references(() => groups.id, { onDelete: "set null" }),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  type: transactionTypeEnum("type").notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  currency: text("currency").default("INR").notNull(),
  title: text("title"),
  description: text("description").notNull(),
  paymentMethod: text("payment_method"),
  date: timestamp("date").defaultNow().notNull(),
  status: text("status").default("pending").notNull(),
  notes: text("notes"),
  receiptUrl: text("receipt_url"),
  reminderDate: timestamp("reminder_date"),
  isRecurring: boolean("is_recurring").default(false),
  recurringPattern: text("recurring_pattern"),
  tags: jsonb("tags"),
  location: text("location"),
  isPersonal: boolean("is_personal").default(true).notNull(),
  // Expense ownership tracking
  createdBy: integer("created_by").references(() => users.id, { onDelete: "cascade" }).notNull(),
  updatedBy: integer("updated_by").references(() => users.id, { onDelete: "set null" }),
  paidBy: integer("paid_by").references(() => users.id, { onDelete: "set null" }),
  paidByContact: integer("paid_by_contact").references(() => contacts.id, { onDelete: "set null" }),
  // Version tracking
  version: integer("version").default(1).notNull(),
  participationVersion: integer("participation_version").default(1).notNull(),
  redistributionVersion: integer("redistribution_version").default(1).notNull(),
  parentTransactionId: integer("parent_transaction_id").references((): any => transactions, { onDelete: "set null" }),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  deletedAt: timestamp("deleted_at"),
  deletedBy: integer("deleted_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("transaction_user_idx").on(table.userId),
  contactIdx: index("transaction_contact_idx").on(table.contactId),
  groupIdx: index("transaction_group_idx").on(table.groupId),
  dateIdx: index("transaction_date_idx").on(table.date),
  createdByIdx: index("transaction_created_by_idx").on(table.createdBy),
  updatedByIdx: index("transaction_updated_by_idx").on(table.updatedBy),
  parentIdx: index("transaction_parent_idx").on(table.parentTransactionId),
  publicIdIdx: index("transaction_public_id_idx").on(table.publicId),
  deletedIdx: index("transaction_deleted_idx").on(table.isDeleted),
  // Composite indexes for common query patterns
  userDeletedDateIdx: index("transaction_user_deleted_date_idx").on(table.userId, table.isDeleted, table.date),
  groupDeletedIdx: index("transaction_group_deleted_idx").on(table.groupId, table.isDeleted),
}));

// Expense splits table
export const expenseSplits = pgTable("expense_splits", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").references(() => transactions.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  contactId: integer("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
  splitMethod: splitMethodEnum("split_method").notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  percentage: integer("percentage"),
  shares: integer("shares"),
  isExcluded: boolean("is_excluded").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  transactionIdx: index("expense_split_transaction_idx").on(table.transactionId),
  userIdx: index("expense_split_user_idx").on(table.userId),
  contactIdx: index("expense_split_contact_idx").on(table.contactId),
}));

// Settlements table
export const settlements = pgTable("settlements", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").unique().notNull(),
  groupId: integer("group_id").references(() => groups.id, { onDelete: "cascade" }),
  fromUserId: integer("from_user_id").references(() => users.id, { onDelete: "cascade" }),
  fromContactId: integer("from_contact_id").references(() => contacts.id, { onDelete: "cascade" }),
  toUserId: integer("to_user_id").references(() => users.id, { onDelete: "cascade" }),
  toContactId: integer("to_contact_id").references(() => contacts.id, { onDelete: "cascade" }),
  amount: bigint("amount", { mode: "number" }).notNull(),
  currency: text("currency").default("INR").notNull(),
  status: text("status").default("pending").notNull(),
  paymentMethod: text("payment_method"),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  deletedBy: integer("deleted_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  groupIdx: index("settlement_group_idx").on(table.groupId),
  fromUserIdx: index("settlement_from_user_idx").on(table.fromUserId),
  toUserIdx: index("settlement_to_user_idx").on(table.toUserId),
  publicIdIdx: index("settlement_public_id_idx").on(table.publicId),
  deletedIdx: index("settlement_deleted_idx").on(table.isDeleted),
  // Composite indexes for common query patterns
  groupStatusIdx: index("settlement_group_status_idx").on(table.groupId, table.status),
  fromUserStatusIdx: index("settlement_from_user_status_idx").on(table.fromUserId, table.status),
  toUserStatusIdx: index("settlement_to_user_status_idx").on(table.toUserId, table.status),
}));

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").unique(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: text("type").default("transaction").notNull(),
  category: text("category").default("transaction").notNull(), // group, expense, settlement, invitation, reminder, budget, security, system, report, ai_insight
  title: text("title").notNull(),
  message: text("message").notNull(),
  priority: text("priority").default("medium").notNull(), // critical, high, medium, low
  status: text("status").default("unread").notNull(), // unread, read, archived
  groupId: integer("group_id").references(() => groups.id, { onDelete: "set null" }),
  transactionId: integer("transaction_id").references(() => transactions.id, { onDelete: "set null" }),
  senderId: integer("sender_id").references(() => users.id, { onDelete: "set null" }),
  metadata: jsonb("metadata"),
  isRead: boolean("is_read").default(false).notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  readAt: timestamp("read_at"),
  sentAt: timestamp("sent_at"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("notification_user_idx").on(table.userId),
  publicIdIdx: index("notification_public_id_idx").on(table.publicId),
  statusIdx: index("notification_status_idx").on(table.status),
  userReadIdx: index("notification_user_read_idx").on(table.userId, table.isRead),
  userDeletedIdx: index("notification_user_deleted_idx").on(table.userId, table.isDeleted),
  priorityIdx: index("notification_priority_idx").on(table.priority),
}));

// Comments table
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  transactionId: integer("transaction_id").references(() => transactions.id, { onDelete: "cascade" }),
  settlementId: integer("settlement_id").references(() => settlements.id, { onDelete: "cascade" }),
  groupId: integer("group_id").references(() => groups.id, { onDelete: "cascade" }),
  parentId: integer("parent_id"),
  content: text("content").notNull(),
  mentions: text("mentions"),
  attachments: jsonb("attachments"),
  reactions: jsonb("reactions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("comment_user_idx").on(table.userId),
  transactionIdx: index("comment_transaction_idx").on(table.transactionId),
  settlementIdx: index("comment_settlement_idx").on(table.settlementId),
  groupIdx: index("comment_group_idx").on(table.groupId),
  parentIdx: index("comment_parent_idx").on(table.parentId),
}));

// Receipts table
export const receipts = pgTable("receipts", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").references(() => transactions.id, { onDelete: "cascade" }).notNull(),
  url: text("url").notNull(),
  originalFileName: text("original_file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  merchant: text("merchant"),
  extractedDate: timestamp("extracted_date"),
  extractedAmount: bigint("extracted_amount", { mode: "number" }),
  extractedGst: bigint("extracted_gst", { mode: "number" }),
  confidenceScore: integer("confidence_score"),
  ocrData: jsonb("ocr_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  transactionIdx: index("receipt_transaction_idx").on(table.transactionId),
}));

// Transaction Versions table (immutable version history & change snapshots)
export const transactionVersions = pgTable("transaction_versions", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").unique().notNull(),
  transactionId: integer("transaction_id").references(() => transactions.id, { onDelete: "cascade" }).notNull(),
  versionNumber: integer("version_number").notNull(),
  editedBy: integer("edited_by").references(() => users.id, { onDelete: "set null" }).notNull(),
  reason: text("reason"),
  changes: jsonb("changes").notNull(), // { [field]: { old: any, new: any } }
  snapshot: jsonb("snapshot").notNull(), // Full JSON snapshot of transaction and splits
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  txIdx: index("tx_version_tx_idx").on(table.transactionId),
  txVersionIdx: index("tx_version_tx_ver_idx").on(table.transactionId, table.versionNumber),
  publicIdIdx: index("tx_version_public_id_idx").on(table.publicId),
  createdByIdx: index("tx_version_edited_by_idx").on(table.editedBy),
  createdAtIdx: index("tx_version_created_idx").on(table.createdAt),
}));

// Member Participation Timeline table (immutable timeline of member participation decisions)
export const memberParticipationTimeline = pgTable("member_participation_timeline", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").unique().notNull(),
  groupId: integer("group_id").references(() => groups.id, { onDelete: "cascade" }).notNull(),
  groupMemberId: integer("group_member_id").references(() => groupMembers.id, { onDelete: "set null" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  contactId: integer("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
  participationMode: text("participation_mode").notNull(), // 'included' | 'excluded'
  effectiveFrom: timestamp("effective_from").defaultNow().notNull(),
  effectiveUntil: timestamp("effective_until"), // null = currently active
  approvedBy: integer("approved_by").references(() => users.id, { onDelete: "set null" }),
  reason: text("reason").notNull(), // 'initial_approval', 'mode_change', 'member_removal', 'group_creation'
  redistributionVersion: integer("redistribution_version").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  groupIdx: index("mpt_group_idx").on(table.groupId),
  userIdx: index("mpt_user_idx").on(table.userId),
  effectiveIdx: index("mpt_effective_idx").on(table.groupId, table.effectiveFrom, table.effectiveUntil),
  publicIdIdx: index("mpt_public_id_idx").on(table.publicId),
}));

// Group Settlement Versions table (immutable versioned recalculation snapshots)
export const groupSettlementVersions = pgTable("group_settlement_versions", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").unique().notNull(),
  groupId: integer("group_id").references(() => groups.id, { onDelete: "cascade" }).notNull(),
  versionNumber: integer("version_number").notNull(),
  triggerOperation: text("trigger_operation").notNull(), // 'approve_member_included', 'approve_member_excluded', 'remove_member', 'mode_change', 'add_expense', 'edit_expense', 'delete_expense', 'recalculate'
  initiatedBy: integer("initiated_by").references(() => users.id, { onDelete: "set null" }),
  participationTimelineVersion: integer("participation_timeline_version").default(1).notNull(),
  status: text("status").default("active").notNull(), // 'active', 'superseded'
  totalExpensesPaise: bigint("total_expenses_paise", { mode: "number" }).default(0).notNull(),
  totalSharesPaise: bigint("total_shares_paise", { mode: "number" }).default(0).notNull(),
  totalPayablePaise: bigint("total_payable_paise", { mode: "number" }).default(0).notNull(),
  totalReceivablePaise: bigint("total_receivable_paise", { mode: "number" }).default(0).notNull(),
  snapshot: jsonb("snapshot").notNull(), // Full JSON snapshot of participation timeline, balances, and generated settlements
  integrityVerified: boolean("integrity_verified").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  groupIdx: index("gsv_group_idx").on(table.groupId),
  versionIdx: index("gsv_version_idx").on(table.groupId, table.versionNumber),
  statusIdx: index("gsv_status_idx").on(table.groupId, table.status),
  publicIdIdx: index("gsv_public_id_idx").on(table.publicId),
}));

// Expense Participation History table (permanent timeline participant history per expense)
export const expenseParticipationHistory = pgTable("expense_participation_history", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").references(() => transactions.id, { onDelete: "cascade" }).notNull(),
  groupId: integer("group_id").references(() => groups.id, { onDelete: "cascade" }).notNull(),
  version: integer("version").notNull(),
  participantUserIds: jsonb("participant_user_ids").$type<number[]>().notNull(),
  participantContactIds: jsonb("participant_contact_ids").$type<number[]>().default([]).notNull(),
  splitMethod: text("split_method").default("equal").notNull(),
  reason: text("reason").notNull(), // 'initial_creation', 'member_included', 'member_removed', 'expense_edited'
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  txIdx: index("eph_tx_idx").on(table.transactionId),
  groupIdx: index("eph_group_idx").on(table.groupId),
}));

// Audit logs table
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").unique(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  entityPublicId: text("entity_public_id"),
  changes: jsonb("changes"),
  beforeData: jsonb("before_data"),
  afterData: jsonb("after_data"),
  reason: text("reason"),
  status: text("status").default("success").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  browser: text("browser"),
  device: text("device"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  publicIdIdx: index("audit_public_id_idx").on(table.publicId),
  userIdx: index("audit_user_idx").on(table.userId),
  entityIdx: index("audit_entity_idx").on(table.entityType, table.entityId),
  entityPublicIdx: index("audit_entity_public_idx").on(table.entityType, table.entityPublicId),
  actionIdx: index("audit_action_idx").on(table.action),
  createdAtIdx: index("audit_created_idx").on(table.createdAt),
}));

// AI analysis table
export const aiAnalysis = pgTable("ai_analysis", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").references(() => transactions.id, { onDelete: "cascade" }),
  receiptId: integer("receipt_id").references(() => receipts.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  analysisType: text("analysis_type").notNull(),
  suggestions: jsonb("suggestions"),
  confidenceScore: integer("confidence_score"),
  isApplied: boolean("is_applied").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  transactionIdx: index("ai_analysis_transaction_idx").on(table.transactionId),
  receiptIdx: index("ai_analysis_receipt_idx").on(table.receiptId),
  userIdx: index("ai_analysis_user_idx").on(table.userId),
}));

// Invitations table
export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").unique().notNull(),
  groupId: integer("group_id").references(() => groups.id, { onDelete: "cascade" }).notNull(),
  invitedBy: integer("invited_by").references(() => users.id, { onDelete: "cascade" }).notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  name: text("name"),
  token: text("token").unique().notNull(),
  legacyToken: text("legacy_token"),
  status: text("status").default("pending").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  rejectedAt: timestamp("rejected_at"),
  cancelledAt: timestamp("cancelled_at"),
  cancelledBy: integer("cancelled_by").references(() => users.id, { onDelete: "set null" }),
  guestContactId: integer("guest_contact_id").references(() => contacts.id, { onDelete: "set null" }),
  mergedUserId: integer("merged_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  groupIdx: index("invitation_group_idx").on(table.groupId),
  publicIdIdx: index("invitation_public_id_idx").on(table.publicId),
  tokenIdx: index("invitation_token_idx").on(table.token),
  emailIdx: index("invitation_email_idx").on(table.email),
  statusIdx: index("invitation_status_idx").on(table.status),
}));

// Group Join Requests table for QR-based requests requiring owner approval
export const groupJoinRequests = pgTable("group_join_requests", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").unique().notNull(),
  groupId: integer("group_id").references(() => groups.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  status: text("status").default("pending").notNull(), // 'pending', 'approved', 'rejected'
  includeInHistoricalExpenses: boolean("include_in_historical_expenses").default(false),
  approvedBy: integer("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  groupIdx: index("join_request_group_idx").on(table.groupId),
  userIdx: index("join_request_user_idx").on(table.userId),
  statusIdx: index("join_request_status_idx").on(table.status),
  publicIdIdx: index("join_request_public_id_idx").on(table.publicId),
}));

// Reminders table
export const reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").unique(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  groupId: integer("group_id").references(() => groups.id, { onDelete: "cascade" }),
  transactionId: integer("transaction_id").references(() => transactions.id, { onDelete: "set null" }),
  contactId: integer("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  title: text("title"),
  recipientType: text("recipient_type").notNull(),
  recipientId: integer("recipient_id").notNull(),
  recipientName: text("recipient_name"),
  recipientPhone: text("recipient_phone"),
  recipientEmail: text("recipient_email"),
  method: text("method").default("whatsapp").notNull(),
  message: text("message").notNull(),
  dueDate: timestamp("due_date"),
  reminderDate: timestamp("reminder_date"),
  amount: bigint("amount", { mode: "number" }),
  currency: text("currency").default("INR").notNull(),
  priority: text("priority").default("medium").notNull(),
  repeatType: text("repeat_type").default("once").notNull(),
  repeatInterval: integer("repeat_interval").default(1),
  repeatEnd: timestamp("repeat_end"),
  notificationType: text("notification_type").default("whatsapp").notNull(),
  status: text("status").default("pending").notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
  isPinned: boolean("is_pinned").default(false).notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  deletedAt: timestamp("deleted_at"),
  deletedBy: integer("deleted_by"),
  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("reminder_user_idx").on(table.userId),
  groupIdx: index("reminder_group_idx").on(table.groupId),
  recipientIdx: index("reminder_recipient_idx").on(table.recipientId),
  statusIdx: index("reminder_status_idx").on(table.status),
  delIdx: index("reminder_del_idx").on(table.isDeleted),
  priorityIdx: index("reminder_priority_idx").on(table.priority),
}));

// Contact Requests table
export const contactRequests = pgTable("contact_requests", {
  id: serial("id").primaryKey(),
  ticketNumber: text("ticket_number").unique().notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject").notNull(),
  category: text("category").notNull(),
  priority: text("priority").default("Medium").notNull(),
  message: text("message").notNull(),
  attachmentUrl: text("attachment_url"),
  status: text("status").default("open").notNull(),
  assignedTo: integer("assigned_to").references(() => users.id),
  adminReply: text("admin_reply"),
  repliedAt: timestamp("replied_at"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  ticketIdx: index("contact_req_ticket_idx").on(table.ticketNumber),
  emailIdx: index("contact_req_email_idx").on(table.email),
  statusIdx: index("contact_req_status_idx").on(table.status),
}));

// Saved reports table
export const savedReports = pgTable("saved_reports", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").unique().notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  reportType: text("report_type").notNull(),
  filters: jsonb("filters").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("saved_report_user_idx").on(table.userId),
  publicIdIdx: index("saved_report_public_id_idx").on(table.publicId),
}));

// Scheduled reports table
export const scheduledReports = pgTable("scheduled_reports", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").unique().notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  savedReportId: integer("saved_report_id").references(() => savedReports.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  frequency: text("frequency").default("monthly").notNull(), // daily, weekly, monthly
  recipientEmail: text("recipient_email").notNull(),
  format: text("format").default("pdf").notNull(), // pdf, csv, excel, json
  isActive: boolean("is_active").default(true).notNull(),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("scheduled_report_user_idx").on(table.userId),
  publicIdIdx: index("scheduled_report_public_id_idx").on(table.publicId),
  activeIdx: index("scheduled_report_active_idx").on(table.isActive),
}));

// Budgets table
export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").unique().notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  groupId: integer("group_id").references(() => groups.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  amount: bigint("amount", { mode: "number" }).notNull(), // in paise
  currency: text("currency").default("INR").notNull(),
  period: text("period").default("monthly").notNull(), // monthly, weekly, yearly, one_time
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  alertThreshold: integer("alert_threshold").default(80).notNull(), // percentage (50, 75, 80, 90, 100)
  status: text("status").default("active").notNull(), // active, completed, exceeded, paused
  notes: text("notes"),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("budget_user_idx").on(table.userId),
  publicIdIdx: index("budget_public_id_idx").on(table.publicId),
  categoryIdx: index("budget_category_idx").on(table.categoryId),
  groupIdx: index("budget_group_idx").on(table.groupId),
  userDeletedIdx: index("budget_user_deleted_idx").on(table.userId, table.isDeleted),
}));

// Note categories table
export const noteCategories = pgTable("note_categories", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").unique().notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").default("#6366f1").notNull(),
  icon: text("icon").default("Folder").notNull(),
  description: text("description"),
  isDefault: boolean("is_default").default(false).notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("note_cat_user_idx").on(table.userId),
  publicIdIdx: index("note_cat_public_id_idx").on(table.publicId),
}));

// Notes table
export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").unique().notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  categoryId: integer("category_id").references(() => noteCategories.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  content: text("content").default("").notNull(),
  plainText: text("plain_text").default("").notNull(),
  richTextJson: jsonb("rich_text_json"),
  isDraft: boolean("is_draft").default(false).notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  isFavorite: boolean("is_favorite").default(false).notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  deletedAt: timestamp("deleted_at"),
  deletedBy: integer("deleted_by").references(() => users.id, { onDelete: "set null" }),
  deleteReason: text("delete_reason"),
  restoredAt: timestamp("restored_at"),
  color: text("color").default("default").notNull(),
  tags: jsonb("tags").default([]).notNull(),
  version: integer("version").default(1).notNull(),
  wordCount: integer("word_count").default(0).notNull(),
  characterCount: integer("character_count").default(0).notNull(),
  readingTime: integer("reading_time").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("note_user_idx").on(table.userId),
  publicIdIdx: index("note_public_id_idx").on(table.publicId),
  categoryIdx: index("note_category_idx").on(table.categoryId),
  userDeletedIdx: index("note_user_deleted_idx").on(table.userId, table.isDeleted),
  userDraftIdx: index("note_user_draft_idx").on(table.userId, table.isDraft),
  userPinnedIdx: index("note_user_pinned_idx").on(table.userId, table.isPinned),
  userFavoriteIdx: index("note_user_favorite_idx").on(table.userId, table.isFavorite),
  userArchivedIdx: index("note_user_archived_idx").on(table.userId, table.isArchived),
  createdDateIdx: index("note_created_at_idx").on(table.createdAt),
}));

// Note versions table
export const noteVersions = pgTable("note_versions", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").unique().notNull(),
  noteId: integer("note_id").references(() => notes.id, { onDelete: "cascade" }).notNull(),
  versionNumber: integer("version_number").notNull(),
  editedBy: integer("edited_by").references(() => users.id, { onDelete: "set null" }).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  summary: text("summary"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  noteIdx: index("note_ver_note_idx").on(table.noteId),
  noteVerIdx: index("note_ver_note_ver_idx").on(table.noteId, table.versionNumber),
  publicIdIdx: index("note_ver_public_id_idx").on(table.publicId),
  createdAtIdx: index("note_ver_created_idx").on(table.createdAt),
}));

// Note links table (many-to-many financial links)
export const noteLinks = pgTable("note_links", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").unique().notNull(),
  noteId: integer("note_id").references(() => notes.id, { onDelete: "cascade" }).notNull(),
  entityType: text("entity_type").notNull(), // transaction, group, trip, budget, loan, settlement
  entityId: integer("entity_id").notNull(),
  entityPublicId: text("entity_public_id"),
  snapshot: jsonb("snapshot"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  noteIdx: index("note_link_note_idx").on(table.noteId),
  entityIdx: index("note_link_entity_idx").on(table.entityType, table.entityId),
  publicIdIdx: index("note_link_public_id_idx").on(table.publicId),
}));

// Note checklists / tasks table
export const noteChecklists = pgTable("note_checklists", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").unique().notNull(),
  noteId: integer("note_id").references(() => notes.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("pending").notNull(), // pending, completed, overdue, upcoming
  progress: integer("progress").default(0).notNull(), // 0, 25, 50, 75, 100
  taskNotes: text("task_notes"),
  subtasks: jsonb("subtasks").default([]).notNull(),
  assignedTo: integer("assigned_to").references(() => users.id, { onDelete: "set null" }),
  reminderDate: timestamp("reminder_date"),
  isCompleted: boolean("is_completed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
  completedBy: integer("completed_by").references(() => users.id, { onDelete: "set null" }),
  priority: text("priority").default("medium").notNull(), // low, medium, high, urgent
  dueDate: timestamp("due_date"),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  noteIdx: index("note_chk_note_idx").on(table.noteId),
  publicIdIdx: index("note_chk_public_id_idx").on(table.publicId),
  statusIdx: index("note_chk_status_idx").on(table.status),
}));

// Note reminders table
export const noteReminders = pgTable("note_reminders", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").unique().notNull(),
  noteId: integer("note_id").references(() => notes.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  reminderDate: timestamp("reminder_date").notNull(),
  repeat: text("repeat").default("none").notNull(),
  priority: text("priority").default("medium").notNull(),
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  noteIdx: index("note_rem_note_idx").on(table.noteId),
  userIdx: index("note_rem_user_idx").on(table.userId),
  publicIdIdx: index("note_rem_public_id_idx").on(table.publicId),
}));

// Note attachments table
export const noteAttachments = pgTable("note_attachments", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").unique().notNull(),
  noteId: integer("note_id").references(() => notes.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  url: text("url").notNull(),
  isVoiceNote: boolean("is_voice_note").default(false).notNull(),
  durationSeconds: integer("duration_seconds"),
  waveform: jsonb("waveform"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  noteIdx: index("note_att_note_idx").on(table.noteId),
  publicIdIdx: index("note_att_public_id_idx").on(table.publicId),
}));

// Note shares table
export const noteShares = pgTable("note_shares", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").unique().notNull(),
  noteId: integer("note_id").references(() => notes.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  sharedWithUserId: integer("shared_with_user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  permission: text("permission").default("view").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  noteIdx: index("note_shr_note_idx").on(table.noteId),
  userShrIdx: index("note_shr_user_idx").on(table.sharedWithUserId),
  publicIdIdx: index("note_shr_public_id_idx").on(table.publicId),
}));

// Note comments table
export const noteComments = pgTable("note_comments", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").unique().notNull(),
  noteId: integer("note_id").references(() => notes.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  content: text("content").notNull(),
  parentId: integer("parent_id"),
  isPinned: boolean("is_pinned").default(false).notNull(),
  isResolved: boolean("is_resolved").default(false).notNull(),
  reactions: jsonb("reactions").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  noteIdx: index("note_cmt_note_idx").on(table.noteId),
  publicIdIdx: index("note_cmt_public_id_idx").on(table.publicId),
}));

// Note activity logs table (immutable audit stream)
export const noteActivityLogs = pgTable("note_activity_logs", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").unique().notNull(),
  noteId: integer("note_id").references(() => notes.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  action: text("action").notNull(),
  details: text("details"),
  changes: jsonb("changes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  noteIdx: index("note_log_note_idx").on(table.noteId),
  userIdx: index("note_log_user_idx").on(table.userId),
  publicIdIdx: index("note_log_public_id_idx").on(table.publicId),
}));

// Daily financial journals table (reflection, mood, financial summary)
export const dailyJournals = pgTable("daily_journals", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").unique().notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  mood: text("mood"), // happy, productive, calm, neutral, stressed
  summary: text("summary"),
  dailyGoal: text("daily_goal"),
  dailyAchievement: text("daily_achievement"),
  financialReflection: text("financial_reflection"),
  manualNotes: text("manual_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userDateIdx: uniqueIndex("daily_journal_user_date_idx").on(table.userId, table.date),
  userIdx: index("daily_journal_user_idx").on(table.userId),
  dateIdx: index("daily_journal_date_idx").on(table.date),
  publicIdIdx: index("daily_journal_public_id_idx").on(table.publicId),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  profile: many(profiles),
  contacts: many(contacts),
  groups: many(groups),
  transactions: many(transactions),
  transactionVersions: many(transactionVersions),
  notifications: many(notifications),
  comments: many(comments),
  auditLogs: many(auditLogs),
  aiAnalysis: many(aiAnalysis),
  groupMembers: many(groupMembers),
  settlementsFrom: many(settlements),
  settlementsTo: many(settlements),
  invitations: many(invitations),
  reminders: many(reminders),
  savedReports: many(savedReports),
  scheduledReports: many(scheduledReports),
  budgets: many(budgets),
  verifiedSettlements: many(settlementVerifications),
  approvedSettlements: many(settlementHistory),
  adminActions: many(adminActions),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  user: one(users, {
    fields: [contacts.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
  groupMembers: many(groupMembers),
  expenseSplits: many(expenseSplits),
  settlementsFrom: many(settlements),
  settlementsTo: many(settlements),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [groups.createdBy],
    references: [users.id],
  }),
  members: many(groupMembers),
  transactions: many(transactions),
  settlements: many(settlements),
  invitations: many(invitations),
  comments: many(comments),
  settlementVerifications: many(settlementVerifications),
  settlementHistory: many(settlementHistory),
  settlementReminderSettings: many(settlementReminderSettings),
  settlementEmailLogs: many(settlementEmailLogs),
  adminActions: many(adminActions),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id],
  }),
  contact: one(contacts, {
    fields: [groupMembers.contactId],
    references: [contacts.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  contact: one(contacts, {
    fields: [transactions.contactId],
    references: [contacts.id],
  }),
  group: one(groups, {
    fields: [transactions.groupId],
    references: [groups.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  creator: one(users, {
    fields: [transactions.createdBy],
    references: [users.id],
  }),
  updater: one(users, {
    fields: [transactions.updatedBy],
    references: [users.id],
  }),
  splits: many(expenseSplits),
  versions: many(transactionVersions),
  comments: many(comments),
  receipts: many(receipts),
  aiAnalysis: many(aiAnalysis),
}));

export const transactionVersionsRelations = relations(transactionVersions, ({ one }) => ({
  transaction: one(transactions, {
    fields: [transactionVersions.transactionId],
    references: [transactions.id],
  }),
  editor: one(users, {
    fields: [transactionVersions.editedBy],
    references: [users.id],
  }),
}));

export const expenseSplitsRelations = relations(expenseSplits, ({ one }) => ({
  transaction: one(transactions, {
    fields: [expenseSplits.transactionId],
    references: [transactions.id],
  }),
  user: one(users, {
    fields: [expenseSplits.userId],
    references: [users.id],
  }),
  contact: one(contacts, {
    fields: [expenseSplits.contactId],
    references: [contacts.id],
  }),
}));

export const settlementsRelations = relations(settlements, ({ one, many }) => ({
  group: one(groups, {
    fields: [settlements.groupId],
    references: [groups.id],
  }),
  fromUser: one(users, {
    fields: [settlements.fromUserId],
    references: [users.id],
  }),
  fromContact: one(contacts, {
    fields: [settlements.fromContactId],
    references: [contacts.id],
  }),
  toUser: one(users, {
    fields: [settlements.toUserId],
    references: [users.id],
  }),
  toContact: one(contacts, {
    fields: [settlements.toContactId],
    references: [contacts.id],
  }),
  comments: many(comments),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  transaction: one(transactions, {
    fields: [comments.transactionId],
    references: [transactions.id],
  }),
  settlement: one(settlements, {
    fields: [comments.settlementId],
    references: [settlements.id],
  }),
  group: one(groups, {
    fields: [comments.groupId],
    references: [groups.id],
  }),
}));

export const receiptsRelations = relations(receipts, ({ one, many }) => ({
  transaction: one(transactions, {
    fields: [receipts.transactionId],
    references: [transactions.id],
  }),
  aiAnalysis: many(aiAnalysis),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const aiAnalysisRelations = relations(aiAnalysis, ({ one }) => ({
  transaction: one(transactions, {
    fields: [aiAnalysis.transactionId],
    references: [transactions.id],
  }),
  receipt: one(receipts, {
    fields: [aiAnalysis.receiptId],
    references: [receipts.id],
  }),
  user: one(users, {
    fields: [aiAnalysis.userId],
    references: [users.id],
  }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  group: one(groups, {
    fields: [invitations.groupId],
    references: [groups.id],
  }),
  invitedBy: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
}));

export const remindersRelations = relations(reminders, ({ one }) => ({
  user: one(users, {
    fields: [reminders.userId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [reminders.groupId],
    references: [groups.id],
  }),
  transaction: one(transactions, {
    fields: [reminders.transactionId],
    references: [transactions.id],
  }),
  contact: one(contacts, {
    fields: [reminders.contactId],
    references: [contacts.id],
  }),
}));

export const contactRequestsRelations = relations(contactRequests, ({ one }) => ({
  assignedUser: one(users, {
    fields: [contactRequests.assignedTo],
    references: [users.id],
  }),
}));

export const savedReportsRelations = relations(savedReports, ({ one, many }) => ({
  user: one(users, {
    fields: [savedReports.userId],
    references: [users.id],
  }),
  scheduledReports: many(scheduledReports),
}));

export const scheduledReportsRelations = relations(scheduledReports, ({ one }) => ({
  user: one(users, {
    fields: [scheduledReports.userId],
    references: [users.id],
  }),
  savedReport: one(savedReports, {
    fields: [scheduledReports.savedReportId],
    references: [savedReports.id],
  }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  user: one(users, {
    fields: [budgets.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [budgets.categoryId],
    references: [categories.id],
  }),
  group: one(groups, {
    fields: [budgets.groupId],
    references: [groups.id],
  }),
}));

export const noteCategoriesRelations = relations(noteCategories, ({ one, many }) => ({
  user: one(users, {
    fields: [noteCategories.userId],
    references: [users.id],
  }),
  notes: many(notes),
}));

export const notesRelations = relations(notes, ({ one, many }) => ({
  user: one(users, {
    fields: [notes.userId],
    references: [users.id],
  }),
  category: one(noteCategories, {
    fields: [notes.categoryId],
    references: [noteCategories.id],
  }),
  versions: many(noteVersions),
}));

export const noteVersionsRelations = relations(noteVersions, ({ one }) => ({
  note: one(notes, {
    fields: [noteVersions.noteId],
    references: [notes.id],
  }),
  editor: one(users, {
    fields: [noteVersions.editedBy],
    references: [users.id],
  }),
}));

export const noteLinksRelations = relations(noteLinks, ({ one }) => ({
  note: one(notes, {
    fields: [noteLinks.noteId],
    references: [notes.id],
  }),
}));

export const noteChecklistsRelations = relations(noteChecklists, ({ one }) => ({
  note: one(notes, {
    fields: [noteChecklists.noteId],
    references: [notes.id],
  }),
}));

export const noteRemindersRelations = relations(noteReminders, ({ one }) => ({
  note: one(notes, {
    fields: [noteReminders.noteId],
    references: [notes.id],
  }),
  user: one(users, {
    fields: [noteReminders.userId],
    references: [users.id],
  }),
}));

export const noteAttachmentsRelations = relations(noteAttachments, ({ one }) => ({
  note: one(notes, {
    fields: [noteAttachments.noteId],
    references: [notes.id],
  }),
  user: one(users, {
    fields: [noteAttachments.userId],
    references: [users.id],
  }),
}));

export const noteSharesRelations = relations(noteShares, ({ one }) => ({
  note: one(notes, {
    fields: [noteShares.noteId],
    references: [notes.id],
  }),
  user: one(users, {
    fields: [noteShares.userId],
    references: [users.id],
  }),
  sharedWith: one(users, {
    fields: [noteShares.sharedWithUserId],
    references: [users.id],
  }),
}));

export const noteCommentsRelations = relations(noteComments, ({ one }) => ({
  note: one(notes, {
    fields: [noteComments.noteId],
    references: [notes.id],
  }),
  user: one(users, {
    fields: [noteComments.userId],
    references: [users.id],
  }),
}));

export const noteActivityLogsRelations = relations(noteActivityLogs, ({ one }) => ({
  note: one(notes, {
    fields: [noteActivityLogs.noteId],
    references: [notes.id],
  }),
  user: one(users, {
    fields: [noteActivityLogs.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;
export type GroupMember = typeof groupMembers.$inferSelect;
export type NewGroupMember = typeof groupMembers.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type TransactionVersion = typeof transactionVersions.$inferSelect;
export type NewTransactionVersion = typeof transactionVersions.$inferInsert;
export type ExpenseSplit = typeof expenseSplits.$inferSelect;
export type NewExpenseSplit = typeof expenseSplits.$inferInsert;
export type Settlement = typeof settlements.$inferSelect;
export type NewSettlement = typeof settlements.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type Receipt = typeof receipts.$inferSelect;
export type NewReceipt = typeof receipts.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type SavedReport = typeof savedReports.$inferSelect;
export type NewSavedReport = typeof savedReports.$inferInsert;
export type ScheduledReport = typeof scheduledReports.$inferSelect;
export type NewScheduledReport = typeof scheduledReports.$inferInsert;
export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
export type NoteCategory = typeof noteCategories.$inferSelect;
export type NewNoteCategory = typeof noteCategories.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type NoteVersion = typeof noteVersions.$inferSelect;
export type NewNoteVersion = typeof noteVersions.$inferInsert;
export type NoteLink = typeof noteLinks.$inferSelect;
export type NewNoteLink = typeof noteLinks.$inferInsert;
export type NoteChecklist = typeof noteChecklists.$inferSelect;
export type NewNoteChecklist = typeof noteChecklists.$inferInsert;
export type NoteReminder = typeof noteReminders.$inferSelect;
export type NewNoteReminder = typeof noteReminders.$inferInsert;
export type NoteAttachment = typeof noteAttachments.$inferSelect;
export type NewNoteAttachment = typeof noteAttachments.$inferInsert;
export type NoteShare = typeof noteShares.$inferSelect;
export type NewNoteShare = typeof noteShares.$inferInsert;
export type NoteComment = typeof noteComments.$inferSelect;
export type NewNoteComment = typeof noteComments.$inferInsert;
export type NoteActivityLog = typeof noteActivityLogs.$inferSelect;
export type NewNoteActivityLog = typeof noteActivityLogs.$inferInsert;
export type DailyJournal = typeof dailyJournals.$inferSelect;
export type NewDailyJournal = typeof dailyJournals.$inferInsert;

export const dailyJournalsRelations = relations(dailyJournals, ({ one }) => ({
  user: one(users, {
    fields: [dailyJournals.userId],
    references: [users.id],
  }),
}));

// Settlement Verifications table (Admin/Owner offline settlement approvals)
export const settlementVerifications = pgTable("settlement_verifications", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").unique().notNull(),
  settlementId: integer("settlement_id").references(() => settlements.id, { onDelete: "cascade" }),
  groupId: integer("group_id").references(() => groups.id, { onDelete: "cascade" }).notNull(),
  senderUserId: integer("sender_user_id").references(() => users.id, { onDelete: "cascade" }),
  senderContactId: integer("sender_contact_id").references(() => contacts.id, { onDelete: "cascade" }),
  receiverUserId: integer("receiver_user_id").references(() => users.id, { onDelete: "cascade" }),
  receiverContactId: integer("receiver_contact_id").references(() => contacts.id, { onDelete: "cascade" }),
  amount: bigint("amount", { mode: "number" }).notNull(), // in paise
  currency: text("currency").default("INR").notNull(),
  paymentDate: timestamp("payment_date").defaultNow().notNull(),
  paymentMethod: text("payment_method").notNull(), // UPI, Cash, Bank Transfer, PhonePe, Google Pay, Cheque, Other
  transactionReference: text("transaction_reference"),
  reason: text("reason").notNull(),
  notes: text("notes"),
  verifiedBy: integer("verified_by").references(() => users.id, { onDelete: "set null" }).notNull(),
  verifiedByName: text("verified_by_name").notNull(),
  verifiedAt: timestamp("verified_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  publicIdIdx: index("settlement_verif_public_id_idx").on(table.publicId),
  groupIdx: index("settlement_verif_group_idx").on(table.groupId),
  settlementIdx: index("settlement_verif_settlement_idx").on(table.settlementId),
  senderUserIdx: index("settlement_verif_sender_user_idx").on(table.senderUserId),
  receiverUserIdx: index("settlement_verif_receiver_user_idx").on(table.receiverUserId),
  verifiedByIdx: index("settlement_verif_verified_by_idx").on(table.verifiedBy),
  createdAtIdx: index("settlement_verif_created_idx").on(table.createdAt),
}));

// Settlement History table (Searchable & exportable balance transitions ledger)
export const settlementHistory = pgTable("settlement_history", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").unique().notNull(),
  settlementId: integer("settlement_id").references(() => settlements.id, { onDelete: "cascade" }),
  verificationId: integer("verification_id").references(() => settlementVerifications.id, { onDelete: "set null" }),
  groupId: integer("group_id").references(() => groups.id, { onDelete: "cascade" }).notNull(),
  fromUserId: integer("from_user_id").references(() => users.id, { onDelete: "cascade" }),
  fromContactId: integer("from_contact_id").references(() => contacts.id, { onDelete: "cascade" }),
  fromName: text("from_name").notNull(),
  toUserId: integer("to_user_id").references(() => users.id, { onDelete: "cascade" }),
  toContactId: integer("to_contact_id").references(() => contacts.id, { onDelete: "cascade" }),
  toName: text("to_name").notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(), // in paise
  currency: text("currency").default("INR").notNull(),
  paymentMethod: text("payment_method").notNull(),
  transactionReference: text("transaction_reference"),
  reason: text("reason").notNull(),
  notes: text("notes"),
  approvedBy: integer("approved_by").references(() => users.id, { onDelete: "set null" }).notNull(),
  approvedByName: text("approved_by_name").notNull(),
  approvedDate: timestamp("approved_date").defaultNow().notNull(),
  previousBalance: bigint("previous_balance", { mode: "number" }).default(0).notNull(), // in paise
  newBalance: bigint("new_balance", { mode: "number" }).default(0).notNull(), // in paise
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  publicIdIdx: index("settlement_hist_public_id_idx").on(table.publicId),
  groupIdx: index("settlement_hist_group_idx").on(table.groupId),
  settlementIdx: index("settlement_hist_settlement_idx").on(table.settlementId),
  approvedByIdx: index("settlement_hist_approved_by_idx").on(table.approvedBy),
  createdAtIdx: index("settlement_hist_created_idx").on(table.createdAt),
}));

// Settlement Reminder Settings table (Automatic reminder schedules)
export const settlementReminderSettings = pgTable("settlement_reminder_settings", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").unique().notNull(),
  groupId: integer("group_id").references(() => groups.id, { onDelete: "cascade" }).notNull().unique(),
  isEnabled: boolean("is_enabled").default(false).notNull(),
  frequency: text("frequency").default("daily").notNull(), // daily, every_2_days, every_3_days, weekly, custom
  customIntervalDays: integer("custom_interval_days").default(1),
  reminderTime: text("reminder_time").default("09:00").notNull(),
  timezone: text("timezone").default("Asia/Kolkata").notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  maxReminderCount: integer("max_reminder_count").default(5).notNull(),
  isPaused: boolean("is_paused").default(false).notNull(),
  lastRunAt: timestamp("last_run_at"),
  nextScheduledAt: timestamp("next_scheduled_at"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }).notNull(),
  updatedBy: integer("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  publicIdIdx: index("settlement_remind_set_public_id_idx").on(table.publicId),
  groupIdx: index("settlement_remind_set_group_idx").on(table.groupId),
}));

// Settlement Email Logs table (Delivery status, reminder counts, failure reasons)
export const settlementEmailLogs = pgTable("settlement_email_logs", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").unique().notNull(),
  groupId: integer("group_id").references(() => groups.id, { onDelete: "cascade" }).notNull(),
  recipientUserId: integer("recipient_user_id").references(() => users.id, { onDelete: "cascade" }),
  recipientContactId: integer("recipient_contact_id").references(() => contacts.id, { onDelete: "cascade" }),
  recipientName: text("recipient_name").notNull(),
  recipientEmail: text("recipient_email").notNull(),
  recipientType: text("recipient_type").notNull(), // debtor, creditor
  subject: text("subject").notNull(),
  amountDue: bigint("amount_due", { mode: "number" }).notNull(), // in paise
  currency: text("currency").default("INR").notNull(),
  reminderCount: integer("reminder_count").default(1).notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  status: text("status").default("delivered").notNull(), // delivered, opened, failed
  failureReason: text("failure_reason"),
  nextScheduledAt: timestamp("next_scheduled_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  publicIdIdx: index("settlement_email_log_public_id_idx").on(table.publicId),
  groupIdx: index("settlement_email_log_group_idx").on(table.groupId),
  recipientEmailIdx: index("settlement_email_log_email_idx").on(table.recipientEmail),
  statusIdx: index("settlement_email_log_status_idx").on(table.status),
  sentAtIdx: index("settlement_email_log_sent_idx").on(table.sentAt),
}));

// Admin Actions table (Dedicated administrative audit stream)
export const adminActions = pgTable("admin_actions", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").unique().notNull(),
  groupId: integer("group_id").references(() => groups.id, { onDelete: "cascade" }).notNull(),
  adminId: integer("admin_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  adminName: text("admin_name").notNull(),
  actionType: text("action_type").notNull(), // settlement_approved, reminder_settings_updated, reminder_triggered_manually, reminder_paused, reminder_resumed, member_role_changed
  targetEntity: text("target_entity").notNull(), // settlement, reminder_settings, member
  targetEntityId: integer("target_entity_id"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  publicIdIdx: index("admin_action_public_id_idx").on(table.publicId),
  groupIdx: index("admin_action_group_idx").on(table.groupId),
  adminIdIdx: index("admin_action_admin_idx").on(table.adminId),
  actionTypeIdx: index("admin_action_type_idx").on(table.actionType),
  createdAtIdx: index("admin_action_created_idx").on(table.createdAt),
}));

// Relations for new tables
export const settlementVerificationsRelations = relations(settlementVerifications, ({ one }) => ({
  group: one(groups, {
    fields: [settlementVerifications.groupId],
    references: [groups.id],
  }),
  settlement: one(settlements, {
    fields: [settlementVerifications.settlementId],
    references: [settlements.id],
  }),
  senderUser: one(users, {
    fields: [settlementVerifications.senderUserId],
    references: [users.id],
  }),
  senderContact: one(contacts, {
    fields: [settlementVerifications.senderContactId],
    references: [contacts.id],
  }),
  receiverUser: one(users, {
    fields: [settlementVerifications.receiverUserId],
    references: [users.id],
  }),
  receiverContact: one(contacts, {
    fields: [settlementVerifications.receiverContactId],
    references: [contacts.id],
  }),
  verifier: one(users, {
    fields: [settlementVerifications.verifiedBy],
    references: [users.id],
  }),
}));

export const settlementHistoryRelations = relations(settlementHistory, ({ one }) => ({
  group: one(groups, {
    fields: [settlementHistory.groupId],
    references: [groups.id],
  }),
  settlement: one(settlements, {
    fields: [settlementHistory.settlementId],
    references: [settlements.id],
  }),
  verification: one(settlementVerifications, {
    fields: [settlementHistory.verificationId],
    references: [settlementVerifications.id],
  }),
  approver: one(users, {
    fields: [settlementHistory.approvedBy],
    references: [users.id],
  }),
}));

export const settlementReminderSettingsRelations = relations(settlementReminderSettings, ({ one }) => ({
  group: one(groups, {
    fields: [settlementReminderSettings.groupId],
    references: [groups.id],
  }),
  creator: one(users, {
    fields: [settlementReminderSettings.createdBy],
    references: [users.id],
  }),
}));

export const settlementEmailLogsRelations = relations(settlementEmailLogs, ({ one }) => ({
  group: one(groups, {
    fields: [settlementEmailLogs.groupId],
    references: [groups.id],
  }),
  recipientUser: one(users, {
    fields: [settlementEmailLogs.recipientUserId],
    references: [users.id],
  }),
  recipientContact: one(contacts, {
    fields: [settlementEmailLogs.recipientContactId],
    references: [contacts.id],
  }),
}));

export const adminActionsRelations = relations(adminActions, ({ one }) => ({
  group: one(groups, {
    fields: [adminActions.groupId],
    references: [groups.id],
  }),
  admin: one(users, {
    fields: [adminActions.adminId],
    references: [users.id],
  }),
}));

export type SettlementVerification = typeof settlementVerifications.$inferSelect;
export type NewSettlementVerification = typeof settlementVerifications.$inferInsert;
export type SettlementHistoryItem = typeof settlementHistory.$inferSelect;
export type NewSettlementHistoryItem = typeof settlementHistory.$inferInsert;
export type SettlementReminderSetting = typeof settlementReminderSettings.$inferSelect;
export type NewSettlementReminderSetting = typeof settlementReminderSettings.$inferInsert;
export type SettlementEmailLog = typeof settlementEmailLogs.$inferSelect;
export type NewSettlementEmailLog = typeof settlementEmailLogs.$inferInsert;
export type AdminAction = typeof adminActions.$inferSelect;
export type NewAdminAction = typeof adminActions.$inferInsert;

export const groupJoinRequestsRelations = relations(groupJoinRequests, ({ one }) => ({
  group: one(groups, {
    fields: [groupJoinRequests.groupId],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [groupJoinRequests.userId],
    references: [users.id],
  }),
  approvedByUser: one(users, {
    fields: [groupJoinRequests.approvedBy],
    references: [users.id],
  }),
}));

export type GroupJoinRequest = typeof groupJoinRequests.$inferSelect;
export type NewGroupJoinRequest = typeof groupJoinRequests.$inferInsert;

export const memberParticipationTimelineRelations = relations(memberParticipationTimeline, ({ one }) => ({
  group: one(groups, {
    fields: [memberParticipationTimeline.groupId],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [memberParticipationTimeline.userId],
    references: [users.id],
  }),
  contact: one(contacts, {
    fields: [memberParticipationTimeline.contactId],
    references: [contacts.id],
  }),
  approvedByUser: one(users, {
    fields: [memberParticipationTimeline.approvedBy],
    references: [users.id],
  }),
}));

export const groupSettlementVersionsRelations = relations(groupSettlementVersions, ({ one }) => ({
  group: one(groups, {
    fields: [groupSettlementVersions.groupId],
    references: [groups.id],
  }),
  initiatedByUser: one(users, {
    fields: [groupSettlementVersions.initiatedBy],
    references: [users.id],
  }),
}));

export const expenseParticipationHistoryRelations = relations(expenseParticipationHistory, ({ one }) => ({
  transaction: one(transactions, {
    fields: [expenseParticipationHistory.transactionId],
    references: [transactions.id],
  }),
  group: one(groups, {
    fields: [expenseParticipationHistory.groupId],
    references: [groups.id],
  }),
}));

export type MemberParticipationTimeline = typeof memberParticipationTimeline.$inferSelect;
export type NewMemberParticipationTimeline = typeof memberParticipationTimeline.$inferInsert;

export type GroupSettlementVersion = typeof groupSettlementVersions.$inferSelect;
export type NewGroupSettlementVersion = typeof groupSettlementVersions.$inferInsert;

export type ExpenseParticipationHistory = typeof expenseParticipationHistory.$inferSelect;
export type NewExpenseParticipationHistory = typeof expenseParticipationHistory.$inferInsert;


