import { z } from "zod";

// Phone number validation regex (international format)
const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;

// Currency validation regex (3-letter ISO codes)
const currencyRegex = /^[A-Z]{3}$/;

// Contact validation schema
export const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().regex(phoneRegex, "Invalid phone number format").optional().or(z.literal("")),
  currency: z.string().regex(currencyRegex, "Invalid currency code (use 3-letter ISO code)").default("INR"),
  openingBalance: z.number().min(0, "Opening balance must be positive").default(0),
  notes: z.string().max(500, "Notes must be less than 500 characters").optional().or(z.literal("")),
});

export type ContactFormData = z.infer<typeof contactSchema>;

// Transaction validation schema
export const transactionSplitSchema = z.object({
  userId: z.number().optional(),
  contactId: z.number().optional(),
  splitMethod: z.enum(["equal", "exact", "percentage", "shares"]).default("equal"),
  amount: z.number().min(0, "Split amount must be 0 or greater"),
  percentage: z.number().min(0).max(100).optional(),
  shares: z.number().min(0).optional(),
  isExcluded: z.boolean().optional().default(false),
});

export const transactionSchema = z.object({
  title: z.string().max(150, "Title must be less than 150 characters").optional(),
  description: z.string().min(1, "Description is required").max(500, "Description must be less than 500 characters"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  currency: z.string().regex(currencyRegex, "Invalid currency code (use 3-letter ISO code)").default("INR"),
  type: z.enum(["paid", "received", "lent", "borrowed", "repaid", "adjustment"]),
  date: z.union([z.date(), z.string()]).optional(),
  contactId: z.number().optional().nullable(),
  categoryId: z.number().optional().nullable(),
  groupId: z.number().optional().nullable(),
  paidBy: z.number().optional().nullable(),
  paidByContact: z.number().optional().nullable(),
  splitMethod: z.enum(["equal", "exact", "percentage", "shares"]).optional(),
  paymentMethod: z.string().optional().or(z.literal("")),
  status: z.enum(["pending", "completed", "cancelled"]).default("completed"),
  receiptUrl: z.string().optional().or(z.literal("")),
  notes: z.string().max(1000, "Notes must be less than 1000 characters").optional().or(z.literal("")),
  tags: z.array(z.string()).optional(),
  location: z.string().max(200).optional().or(z.literal("")),
  reason: z.string().max(300, "Reason must be less than 300 characters").optional().or(z.literal("")),
  splits: z.array(transactionSplitSchema).optional(),
});

export type TransactionFormData = z.infer<typeof transactionSchema>;
export type TransactionSplitFormData = z.infer<typeof transactionSplitSchema>;

export const groupSchema = z.object({
  name: z.string().min(1, "Group name is required").max(100, "Group name must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional().or(z.literal("")),
  type: z.enum(["trip", "home", "friends", "family", "couples", "office", "event", "shared_bills", "custom"]).default("friends"),
  currency: z.string().regex(currencyRegex, "Invalid currency code (use 3-letter ISO code)").default("INR"),
  splitMethod: z.enum(["equal", "exact", "percentage", "shares"]).default("equal"),
  coverImage: z.string().url("Invalid URL format").optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export type GroupFormData = z.infer<typeof groupSchema>;

// Settlement validation schema
export const settlementSchema = z.object({
  fromUserId: z.number().optional(),
  fromContactId: z.number().optional(),
  toUserId: z.number().optional(),
  toContactId: z.number().optional(),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  currency: z.string().regex(currencyRegex, "Invalid currency code (use 3-letter ISO code)").default("INR"),
  groupId: z.number().optional(),
  paymentMethod: z.string().optional().or(z.literal("")),
  notes: z.string().max(500, "Notes must be less than 500 characters").optional().or(z.literal("")),
});

export type SettlementFormData = z.infer<typeof settlementSchema>;

// Category validation schema
export const categorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(50, "Category name must be less than 50 characters"),
  icon: z.string().optional().or(z.literal("")),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format").default("#6366f1"),
  isDefault: z.boolean().default(false),
});

export type CategoryFormData = z.infer<typeof categorySchema>;

// Profile validation schema
export const profileSchema = z.object({
  phone: z.string().regex(phoneRegex, "Invalid phone number format").optional().or(z.literal("")),
  timezone: z.string().default("UTC"),
  language: z.string().default("en"),
  notificationsEnabled: z.boolean().default(true),
  emailNotifications: z.boolean().default(true),
  whatsappNotifications: z.boolean().default(false),
  autoSettlement: z.boolean().default(false),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

// Invitation validation schema
export const invitationSchema = z.object({
  email: z.string().email("Invalid email address"),
  groupId: z.number().optional(),
  role: z.enum(["member", "admin", "viewer"]).default("member"),
  message: z.string().max(500, "Message must be less than 500 characters").optional().or(z.literal("")),
});

export type InvitationFormData = z.infer<typeof invitationSchema>;

// Reminder validation schema
export const reminderSchema = z.object({
  recipientType: z.enum(["contact", "group"]),
  recipientId: z.number(),
  method: z.enum(["whatsapp", "email", "copy"]),
  message: z.string().min(1, "Message is required").max(1000, "Message must be less than 1000 characters"),
  dueDate: z.string().optional(),
  amount: z.number().min(0, "Amount must be positive").optional(),
  currency: z.string().regex(currencyRegex, "Invalid currency code (use 3-letter ISO code)").default("INR"),
});

export type ReminderFormData = z.infer<typeof reminderSchema>;
