/**
 * Borrow/Lend, Loans, EMI, Installments & Debt Management Types
 */

export type LoanType = "borrowed" | "lent";
export type InterestType = "none" | "simple" | "compound";
export type LoanStatus = "pending" | "active" | "partially_paid" | "completed" | "cancelled" | "written_off" | "archived";
export type LoanCategory = 
  | "personal" 
  | "friend_family" 
  | "group" 
  | "salary_advance" 
  | "business" 
  | "emergency"
  | "trip_advance"
  | "vendor_credit"
  | "employee_advance"
  | "organization";
export type EmiCadence = "weekly" | "monthly" | "quarterly";

export interface EmiInstallment {
  installmentNumber: number;
  dueDate: string;
  amount: number; // in rupees
  principal: number; // in rupees
  interest: number; // in rupees
  remainingBalance: number; // in rupees
  status: "upcoming" | "paid" | "late" | "missed";
  paidDate?: string;
}

export interface LoanRepayment {
  id: string; // Random 16-char ID (rep_...)
  loanId: string;
  amount: number; // in rupees
  date: string;
  paymentMethod: "UPI" | "Bank Transfer" | "Cash" | "Card" | "Wallet" | "Other";
  referenceNumber?: string;
  status: "completed" | "pending" | "refunded";
  notes?: string;
  receiptUrl?: string;
  createdAt: string;
}

export interface LoanRecord {
  id: string; // Random 16-char ID (loan_...)
  userId: number;
  groupId?: number;
  orgId?: string;
  linkedTripId?: string;
  title: string;
  description?: string;
  borrowerName: string;
  borrowerId?: number;
  lenderName: string;
  lenderId?: number;
  borrowerUpiId?: string;
  lenderUpiId?: string;
  principalAmount: number; // in rupees
  outstandingBalance: number; // in rupees
  totalPaid: number; // in rupees
  totalInterestAccrued: number; // in rupees
  currency: string; // Default: INR
  loanType: LoanType;
  category: LoanCategory;
  interestType: InterestType;
  interestRate: number; // e.g. 10 for 10% per annum
  startDate: string;
  dueDate: string;
  emiCadence?: EmiCadence;
  emiAmount?: number;
  status: LoanStatus;
  installments: EmiInstallment[];
  repayments: LoanRepayment[];
  notes?: string;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UpiQrData {
  upiUri: string;
  qrUrl: string;
  payeeUpiId: string;
  payeeName: string;
  amount: number;
  referenceId: string;
}

export interface LoanAuditLog {
  id: string;
  loanId: string;
  action: "created" | "updated" | "repayment_recorded" | "closed" | "archived" | "restored" | "deleted";
  userId: number;
  details: string;
  timestamp: string;
}

export interface LoanDashboardMetrics {
  totalLent: number; // in rupees (Receivable)
  totalBorrowed: number; // in rupees (Payable)
  netDebtPosition: number; // totalLent - totalBorrowed
  activeLoansCount: number;
  upcomingEmiAmount: number;
  overdueLoansCount: number;
  currency: string;
  loans: LoanRecord[];
}
