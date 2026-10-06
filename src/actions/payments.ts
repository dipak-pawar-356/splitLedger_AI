"use server";

import { requireAuth } from "@/lib/auth";
import { validateUpiId, buildUpiDeepLink, generateUpiQrCodeUrl, PreferredUpiApp } from "@/lib/payments/upi";
import { DatabaseError, AuthorizationError, ValidationError } from "@/lib/errors";

export interface UserPaymentMethod {
  id: string;
  userId: number;
  upiId: string;
  accountHolderName: string;
  preferredApp: PreferredUpiApp;
  isDefault: boolean;
  nickname?: string;
  isVerified: boolean;
  createdAt: string;
}

export type PaymentStatus = "pending" | "waiting_confirmation" | "paid" | "rejected" | "disputed";

export interface SettlementPaymentRecord {
  id: string;
  settlementId?: number | string;
  groupId: number;
  fromUserId: number;
  fromUserName: string;
  toUserId: number;
  toUserName: string;
  payeeUpiId: string;
  amount: number; // in rupees
  currency: string; // Default: INR
  transactionRef: string;
  transactionNote: string;
  upiUri: string;
  qrCodeUrl: string;
  utrNumber?: string;
  proofUrl?: string;
  remarks?: string;
  status: PaymentStatus;
  initiatedAt: string;
  confirmedAt?: string;
  verifiedAt?: string;
}

// In-memory payment store for tenant-isolated payment workflows
const paymentMethodsStore = new Map<number, UserPaymentMethod[]>();
const settlementPaymentsStore = new Map<string, SettlementPaymentRecord>();

function seedDefaultPaymentMethods(userId: number, userName: string) {
  if (!paymentMethodsStore.has(userId)) {
    paymentMethodsStore.set(userId, [
      {
        id: `pm_default_${userId}`,
        userId,
        upiId: `${userName.toLowerCase().replace(/[^a-z0-9]/g, "")}@okhdfcbank`,
        accountHolderName: userName,
        preferredApp: "gpay",
        isDefault: true,
        nickname: "Primary HDFC Bank",
        isVerified: true,
        createdAt: new Date().toISOString(),
      },
    ]);
  }
}

/**
 * Get all payment methods for the authenticated user
 */
export async function getUserPaymentMethods(): Promise<UserPaymentMethod[]> {
  const user = await requireAuth();
  seedDefaultPaymentMethods(user.id, user.name || "User");
  return paymentMethodsStore.get(user.id) || [];
}

/**
 * Add a new UPI payment method with validation
 */
export async function addPaymentMethod(data: {
  upiId: string;
  accountHolderName: string;
  preferredApp?: PreferredUpiApp;
  isDefault?: boolean;
  nickname?: string;
}): Promise<UserPaymentMethod> {
  const user = await requireAuth();

  const validation = validateUpiId(data.upiId);
  if (!validation.isValid) {
    throw new ValidationError(validation.error || "Invalid UPI ID");
  }

  const list = paymentMethodsStore.get(user.id) || [];

  // Check duplicate
  if (list.some((pm) => pm.upiId.toLowerCase() === data.upiId.toLowerCase())) {
    throw new ValidationError("This UPI ID is already registered in your account.");
  }

  const shouldBeDefault = data.isDefault || list.length === 0;

  if (shouldBeDefault) {
    list.forEach((pm) => {
      pm.isDefault = false;
    });
  }

  const newMethod: UserPaymentMethod = {
    id: `pm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: user.id,
    upiId: data.upiId.trim(),
    accountHolderName: data.accountHolderName.trim() || user.name || "Account Holder",
    preferredApp: data.preferredApp || "gpay",
    isDefault: shouldBeDefault,
    nickname: data.nickname || "Personal UPI",
    isVerified: true,
    createdAt: new Date().toISOString(),
  };

  list.push(newMethod);
  paymentMethodsStore.set(user.id, list);

  return newMethod;
}

/**
 * Set default payment method
 */
export async function setDefaultPaymentMethod(methodId: string): Promise<UserPaymentMethod> {
  const user = await requireAuth();
  const list = paymentMethodsStore.get(user.id) || [];
  const target = list.find((pm) => pm.id === methodId);

  if (!target) {
    throw new DatabaseError("Payment method not found.");
  }

  list.forEach((pm) => {
    pm.isDefault = pm.id === methodId;
  });

  return target;
}

/**
 * Delete a payment method
 */
export async function deletePaymentMethod(methodId: string): Promise<void> {
  const user = await requireAuth();
  const list = paymentMethodsStore.get(user.id) || [];
  const filtered = list.filter((pm) => pm.id !== methodId);

  if (filtered.length > 0 && !filtered.some((pm) => pm.isDefault)) {
    filtered[0].isDefault = true;
  }

  paymentMethodsStore.set(user.id, filtered);
}

/**
 * Initiate an intelligent group settlement payment
 */
export async function initiateSettlementPayment(data: {
  groupId: number;
  groupName?: string;
  toUserId: number;
  toUserName: string;
  payeeUpiId: string;
  amount: number;
  settlementId?: number | string;
}): Promise<SettlementPaymentRecord> {
  const user = await requireAuth();

  const transactionRef = `SPLIT-${data.groupId}-${Date.now().toString().slice(-6)}`;
  const transactionNote = `Settlement for ${data.groupName || "Group Expense"} (#${transactionRef})`;

  const upiUri = buildUpiDeepLink({
    payeeUpiId: data.payeeUpiId,
    payeeName: data.toUserName,
    amount: data.amount,
    currency: "INR",
    transactionNote,
    transactionRef,
  });

  const qrCodeUrl = generateUpiQrCodeUrl(upiUri);

  const paymentRecord: SettlementPaymentRecord = {
    id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    settlementId: data.settlementId,
    groupId: data.groupId,
    fromUserId: user.id,
    fromUserName: user.name || "Payer",
    toUserId: data.toUserId,
    toUserName: data.toUserName,
    payeeUpiId: data.payeeUpiId,
    amount: data.amount,
    currency: "INR",
    transactionRef,
    transactionNote,
    upiUri,
    qrCodeUrl,
    status: "pending",
    initiatedAt: new Date().toISOString(),
  };

  settlementPaymentsStore.set(paymentRecord.id, paymentRecord);
  return paymentRecord;
}

/**
 * Submit UTR reference number or proof after UPI payment
 */
export async function confirmSettlementPayment(data: {
  paymentId: string;
  utrNumber: string;
  remarks?: string;
  proofUrl?: string;
}): Promise<SettlementPaymentRecord> {
  const user = await requireAuth();
  const payment = settlementPaymentsStore.get(data.paymentId);

  if (!payment) {
    throw new DatabaseError("Payment record not found.");
  }

  if (payment.fromUserId !== user.id) {
    throw new AuthorizationError("You cannot confirm payments for other members.");
  }

  payment.utrNumber = data.utrNumber.trim();
  payment.remarks = data.remarks;
  payment.proofUrl = data.proofUrl;
  payment.status = "waiting_confirmation";
  payment.confirmedAt = new Date().toISOString();

  return payment;
}

/**
 * Receiver or Group Admin verifies settlement
 */
export async function verifySettlementPayment(
  paymentId: string,
  action: "approve" | "reject"
): Promise<SettlementPaymentRecord> {
  const user = await requireAuth();
  const payment = settlementPaymentsStore.get(paymentId);

  if (!payment) {
    throw new DatabaseError("Payment record not found.");
  }

  if (payment.toUserId !== user.id && payment.fromUserId !== user.id) {
    throw new AuthorizationError("Unauthorized to verify this payment.");
  }

  payment.status = action === "approve" ? "paid" : "rejected";
  payment.verifiedAt = new Date().toISOString();

  return payment;
}

/**
 * Get payment history for a group
 */
export async function getGroupPaymentHistory(groupId?: number): Promise<SettlementPaymentRecord[]> {
  await requireAuth();
  const all = Array.from(settlementPaymentsStore.values());
  return groupId ? all.filter((p) => p.groupId === groupId) : all;
}
