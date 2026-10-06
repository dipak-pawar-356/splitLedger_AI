/**
 * SplitLedger AI Payment Gateway, Lifecycle & Reconciliation Types
 */

export type PaymentLifecycleState =
  | "created"
  | "pending"
  | "processing"
  | "paid"
  | "verification_pending"
  | "verified"
  | "completed"
  | "failed"
  | "cancelled"
  | "refunded"
  | "disputed"
  | "expired";

export type PaymentMethodType =
  | "upi"
  | "bank_transfer"
  | "cash"
  | "cheque"
  | "card"
  | "wallet"
  | "custom";

export interface PaymentRecord {
  id: string;
  settlementId?: number | string;
  groupId: number;
  groupName: string;
  fromUserId: number;
  fromUserName: string;
  toUserId: number;
  toUserName: string;
  payeeUpiId?: string;
  totalPayable: number; // in rupees
  paidAmount: number; // in rupees
  remainingAmount: number; // in rupees
  currency: string; // Default: INR
  method: PaymentMethodType;
  transactionRef: string;
  utrNumber?: string;
  receiptNumber?: string;
  state: PaymentLifecycleState;
  proofUrl?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string;
}

export interface PaymentRequestLink {
  token: string;
  paymentId: string;
  url: string;
  amount: number;
  currency: string;
  expiresAt: string;
  isSingleUse: boolean;
  isUsed: boolean;
}

export interface PaymentDispute {
  id: string;
  paymentId: string;
  raisedByUserId: number;
  reason: "wrong_amount" | "duplicate_payment" | "incorrect_receiver" | "fraud" | "not_reflected";
  evidence?: string;
  status: "open" | "investigating" | "resolved" | "dismissed";
  resolutionNote?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface PaymentReceipt {
  receiptNumber: string;
  paymentId: string;
  amount: number;
  currency: string;
  senderName: string;
  receiverName: string;
  method: PaymentMethodType;
  utrNumber?: string;
  date: string;
  groupName: string;
  status: PaymentLifecycleState;
  qrVerificationUrl: string;
}

export interface PaymentDashboardMetrics {
  totalPaid: number;
  totalReceived: number;
  pendingVerificationCount: number;
  disputeCount: number;
  successRatePercent: number;
  averageSettlementHours: number;
  currency: string;
  payments: PaymentRecord[];
  disputes: PaymentDispute[];
}
