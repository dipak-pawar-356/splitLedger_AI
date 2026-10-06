"use server";

import { requireAuth } from "@/lib/auth";
import {
  LoanRecord,
  EmiInstallment,
  LoanRepayment,
  LoanDashboardMetrics,
  LoanType,
  InterestType,
  LoanCategory,
  EmiCadence,
  UpiQrData,
  LoanAuditLog,
} from "@/lib/types/loans";
import { DatabaseError, ValidationError } from "@/lib/errors";
import { generatePublicId } from "@/lib/utils";

// In-memory loans store per user (Clean state)
const loansStore = new Map<string, LoanRecord[]>();
const auditLogsStore = new Map<string, LoanAuditLog[]>();

function ensureUserStores(userId: number) {
  const userKey = `user_${userId}`;
  if (!loansStore.has(userKey)) {
    loansStore.set(userKey, []);
  }
  if (!auditLogsStore.has(userKey)) {
    auditLogsStore.set(userKey, []);
  }
}

function logAudit(userId: number, loanId: string, action: LoanAuditLog["action"], details: string) {
  const userKey = `user_${userId}`;
  const logs = auditLogsStore.get(userKey) || [];
  logs.unshift({
    id: generatePublicId("aud"),
    loanId,
    action,
    userId,
    details,
    timestamp: new Date().toISOString(),
  });
  auditLogsStore.set(userKey, logs);
}

/**
 * Calculate Simple Interest
 * Formula: I = (P * R * T) / 100
 */
export async function calculateSimpleInterest(
  principal: number,
  rate: number,
  timeInYears: number
): Promise<number> {
  if (rate <= 0 || timeInYears <= 0) return 0;
  return Math.round(((principal * rate * timeInYears) / 100) * 100) / 100;
}

/**
 * Calculate Compound Interest
 * Formula: A = P * (1 + r / n)^(n * t) - P
 */
export async function calculateCompoundInterest(
  principal: number,
  rate: number,
  timeInYears: number,
  frequency: number = 12 // monthly compounding by default
): Promise<number> {
  if (rate <= 0 || timeInYears <= 0) return 0;
  const r = rate / 100;
  const amount = principal * Math.pow(1 + r / frequency, frequency * timeInYears);
  return Math.round((amount - principal) * 100) / 100;
}

/**
 * Generate EMI Installment Schedule
 */
export async function generateEmiSchedule(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  cadence: EmiCadence = "monthly",
  interestType: InterestType = "simple"
): Promise<{ emiAmount: number; totalInterest: number; installments: EmiInstallment[] }> {
  if (tenureMonths <= 0) {
    return { emiAmount: principal, totalInterest: 0, installments: [] };
  }

  const timeInYears = tenureMonths / 12;
  let totalInterest = 0;

  if (interestType === "simple") {
    totalInterest = await calculateSimpleInterest(principal, annualRate, timeInYears);
  } else if (interestType === "compound") {
    totalInterest = await calculateCompoundInterest(principal, annualRate, timeInYears);
  }

  const totalRepayable = principal + totalInterest;
  const numInstallments = cadence === "weekly" ? tenureMonths * 4 : cadence === "quarterly" ? Math.max(1, Math.round(tenureMonths / 3)) : tenureMonths;
  const emiAmount = Math.round((totalRepayable / numInstallments) * 100) / 100;

  const installments: EmiInstallment[] = [];
  let remaining = totalRepayable;
  const now = new Date();

  for (let i = 1; i <= numInstallments; i++) {
    const dueDate = new Date(now);
    if (cadence === "weekly") {
      dueDate.setDate(dueDate.getDate() + i * 7);
    } else if (cadence === "quarterly") {
      dueDate.setMonth(dueDate.getMonth() + i * 3);
    } else {
      dueDate.setMonth(dueDate.getMonth() + i);
    }

    const currentEmi = i === numInstallments ? remaining : emiAmount;
    const principalPortion = Math.round((principal / numInstallments) * 100) / 100;
    const interestPortion = Math.round((currentEmi - principalPortion) * 100) / 100;
    remaining = Math.max(0, Math.round((remaining - currentEmi) * 100) / 100);

    installments.push({
      installmentNumber: i,
      dueDate: dueDate.toISOString().split("T")[0],
      amount: currentEmi,
      principal: principalPortion,
      interest: Math.max(0, interestPortion),
      remainingBalance: remaining,
      status: "upcoming",
    });
  }

  return { emiAmount, totalInterest, installments };
}

/**
 * Generate Prefilled UPI QR Data for Repayment
 */
export async function generateLoanPaymentQrData(
  loanId: string,
  amount: number
): Promise<UpiQrData> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;
  const loans = loansStore.get(userKey) || [];
  const loan = loans.find((l) => l.id === loanId);

  const payeeUpiId = loan?.lenderUpiId || "payee@upi";
  const payeeName = loan?.lenderName || "Lender";
  const referenceId = `REP-${Date.now().toString(36).toUpperCase()}`;

  const encodedName = encodeURIComponent(payeeName);
  const upiUri = `upi://pay?pa=${payeeUpiId}&pn=${encodedName}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Repayment for ${loan?.title || "Loan"}`)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUri)}`;

  return {
    upiUri,
    qrUrl,
    payeeUpiId,
    payeeName,
    amount,
    referenceId,
  };
}

/**
 * Get Comprehensive Loan & Debt Dashboard Summary
 */
export async function getLoanDashboardSummary(): Promise<LoanDashboardMetrics> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;
  const loans = loansStore.get(userKey) || [];
  const activeLoans = loans.filter((l) => l.status !== "archived" && l.status !== "cancelled");

  const totalLent = activeLoans
    .filter((l) => l.loanType === "lent" && l.status !== "completed")
    .reduce((sum, l) => sum + l.outstandingBalance, 0);

  const totalBorrowed = activeLoans
    .filter((l) => l.loanType === "borrowed" && l.status !== "completed")
    .reduce((sum, l) => sum + l.outstandingBalance, 0);

  const netDebtPosition = totalLent - totalBorrowed;
  const activeLoansCount = activeLoans.filter((l) => l.status === "active" || l.status === "partially_paid").length;

  const upcomingEmiAmount = activeLoans
    .filter((l) => l.loanType === "borrowed" && l.status !== "completed")
    .reduce((sum, l) => sum + (l.emiAmount || 0), 0);

  const overdueLoansCount = activeLoans.filter((l) => {
    return l.status !== "completed" && new Date(l.dueDate) < new Date();
  }).length;

  return {
    totalLent,
    totalBorrowed,
    netDebtPosition,
    activeLoansCount,
    upcomingEmiAmount,
    overdueLoansCount,
    currency: "INR",
    loans,
  };
}

/**
 * Create a new Borrow or Lend Loan
 */
export async function createLoan(data: {
  title: string;
  description?: string;
  borrowerName: string;
  lenderName: string;
  borrowerUpiId?: string;
  lenderUpiId?: string;
  principalAmount: number;
  loanType: LoanType;
  category: LoanCategory;
  interestType: InterestType;
  interestRate?: number;
  tenureMonths?: number;
  emiCadence?: EmiCadence;
  startDate?: string;
  dueDate?: string;
  groupId?: number;
  orgId?: string;
  linkedTripId?: string;
  notes?: string;
}): Promise<LoanRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;

  if (data.principalAmount <= 0) {
    throw new ValidationError("Principal loan amount must be greater than ₹0.");
  }

  const tenure = data.tenureMonths || 6;
  const rate = data.interestRate || 0;
  const { emiAmount, totalInterest, installments } = await generateEmiSchedule(
    data.principalAmount,
    rate,
    tenure,
    data.emiCadence || "monthly",
    data.interestType || "none"
  );

  const totalRepayable = data.principalAmount + totalInterest;
  const loanId = generatePublicId("loan");

  const newLoan: LoanRecord = {
    id: loanId,
    userId: user.id,
    groupId: data.groupId,
    orgId: data.orgId,
    linkedTripId: data.linkedTripId,
    title: data.title,
    description: data.description || data.notes,
    borrowerName: data.borrowerName,
    borrowerUpiId: data.borrowerUpiId,
    lenderName: data.lenderName,
    lenderUpiId: data.lenderUpiId,
    principalAmount: data.principalAmount,
    outstandingBalance: totalRepayable,
    totalPaid: 0,
    totalInterestAccrued: totalInterest,
    currency: "INR",
    loanType: data.loanType,
    category: data.category,
    interestType: data.interestType,
    interestRate: rate,
    startDate: data.startDate || new Date().toISOString().split("T")[0],
    dueDate:
      data.dueDate ||
      new Date(Date.now() + tenure * 30 * 86400000).toISOString().split("T")[0],
    emiCadence: data.emiCadence || "monthly",
    emiAmount,
    status: "active",
    installments,
    repayments: [],
    notes: data.notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const loans = loansStore.get(userKey) || [];
  loans.push(newLoan);
  loansStore.set(userKey, loans);

  logAudit(user.id, loanId, "created", `Created ${data.loanType} loan '${data.title}' for ₹${data.principalAmount}`);

  return newLoan;
}

/**
 * Update an existing Loan
 */
export async function updateLoan(
  publicId: string,
  data: Partial<LoanRecord>
): Promise<LoanRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;
  const loans = loansStore.get(userKey) || [];
  const loan = loans.find((l) => l.id === publicId);

  if (!loan) {
    throw new DatabaseError("Loan record not found.");
  }

  if (data.title) loan.title = data.title;
  if (data.description !== undefined) loan.description = data.description;
  if (data.borrowerName) loan.borrowerName = data.borrowerName;
  if (data.lenderName) loan.lenderName = data.lenderName;
  if (data.borrowerUpiId !== undefined) loan.borrowerUpiId = data.borrowerUpiId;
  if (data.lenderUpiId !== undefined) loan.lenderUpiId = data.lenderUpiId;
  if (data.status) loan.status = data.status;

  loan.updatedAt = new Date().toISOString();
  logAudit(user.id, publicId, "updated", `Updated loan '${loan.title}' details`);

  return loan;
}

/**
 * Duplicate a Loan
 */
export async function duplicateLoan(publicId: string): Promise<LoanRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;
  const loans = loansStore.get(userKey) || [];
  const source = loans.find((l) => l.id === publicId);

  if (!source) throw new DatabaseError("Loan not found.");

  return await createLoan({
    title: `${source.title} (Copy)`,
    description: source.description,
    borrowerName: source.borrowerName,
    lenderName: source.lenderName,
    borrowerUpiId: source.borrowerUpiId,
    lenderUpiId: source.lenderUpiId,
    principalAmount: source.principalAmount,
    loanType: source.loanType,
    category: source.category,
    interestType: source.interestType,
    interestRate: source.interestRate,
    emiCadence: source.emiCadence,
    groupId: source.groupId,
    orgId: source.orgId,
    linkedTripId: source.linkedTripId,
  });
}

/**
 * Archive a Loan
 */
export async function archiveLoan(publicId: string): Promise<LoanRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;
  const loans = loansStore.get(userKey) || [];
  const loan = loans.find((l) => l.id === publicId);

  if (!loan) throw new DatabaseError("Loan not found.");

  loan.status = "archived";
  loan.updatedAt = new Date().toISOString();
  logAudit(user.id, publicId, "archived", `Archived loan '${loan.title}'`);
  return loan;
}

/**
 * Delete a Loan
 */
export async function deleteLoan(publicId: string): Promise<boolean> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;
  let loans = loansStore.get(userKey) || [];
  const existing = loans.find((l) => l.id === publicId);
  loans = loans.filter((l) => l.id !== publicId);
  loansStore.set(userKey, loans);

  if (existing) {
    logAudit(user.id, publicId, "deleted", `Deleted loan '${existing.title}'`);
  }
  return true;
}

/**
 * Record a loan repayment (Full or Partial)
 */
export async function recordLoanRepayment(
  loanId: string,
  data: {
    amount: number;
    paymentMethod: LoanRepayment["paymentMethod"];
    referenceNumber?: string;
    notes?: string;
  }
): Promise<LoanRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;
  const loans = loansStore.get(userKey) || [];
  const loan = loans.find((l) => l.id === loanId);

  if (!loan) {
    throw new DatabaseError("Loan record not found.");
  }

  if (data.amount <= 0) {
    throw new ValidationError("Repayment amount must be greater than ₹0.");
  }

  const repId = generatePublicId("rep");
  const repayment: LoanRepayment = {
    id: repId,
    loanId,
    amount: data.amount,
    date: new Date().toISOString().split("T")[0],
    paymentMethod: data.paymentMethod,
    referenceNumber: data.referenceNumber || `REF-${Date.now().toString(36).toUpperCase()}`,
    status: "completed",
    notes: data.notes,
    createdAt: new Date().toISOString(),
  };

  loan.repayments.push(repayment);
  loan.totalPaid += data.amount;
  loan.outstandingBalance = Math.max(0, loan.outstandingBalance - data.amount);

  // Update installments status
  let remainingPayment = data.amount;
  for (const inst of loan.installments) {
    if (inst.status === "upcoming" || inst.status === "late") {
      if (remainingPayment >= inst.amount) {
        inst.status = "paid";
        inst.paidDate = new Date().toISOString().split("T")[0];
        remainingPayment -= inst.amount;
      } else {
        break;
      }
    }
  }

  if (loan.outstandingBalance <= 0) {
    loan.status = "completed";
  } else {
    loan.status = "partially_paid";
  }

  loan.updatedAt = new Date().toISOString();
  logAudit(user.id, loanId, "repayment_recorded", `Recorded repayment of ₹${data.amount} via ${data.paymentMethod}`);

  return loan;
}

/**
 * Get Loan Audit Logs
 */
export async function getLoanAuditLogs(): Promise<LoanAuditLog[]> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;
  return auditLogsStore.get(userKey) || [];
}
