/**
 * Business Accounting, GST, Double-Entry & Financial Statement Types
 */

export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";

export interface BusinessProfile {
  id: string;
  userId: number;
  businessName: string;
  legalName: string;
  businessType: "Freelance" | "Startup" | "Pvt Ltd" | "LLP" | "Proprietorship" | "NGO" | "Enterprise";
  gstin?: string;
  pan?: string;
  tan?: string;
  financialYear: string; // e.g. "2026-2027"
  state: string;
  country: string;
  currency: string; // Default: INR
  isDefault: boolean;
  createdAt: string;
}

export interface Account {
  id: string;
  code: string; // e.g. "1000", "2000"
  name: string;
  type: AccountType;
  balance: number; // in rupees
  currency: string;
}

export interface JournalEntryLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number; // in rupees
  credit: number; // in rupees
}

export interface JournalEntry {
  id: string;
  businessId: string;
  date: string;
  description: string;
  reference: string;
  lines: JournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
  createdAt: string;
}

export interface GSTSummary {
  taxableSales: number; // in rupees
  cgstPayable: number;
  sgstPayable: number;
  igstPayable: number;
  totalOutputGst: number;
  itcAvailable: number; // Input Tax Credit from purchases
  netGstPayable: number; // Output GST - ITC
  currency: string;
}

export interface TrialBalanceItem {
  accountCode: string;
  accountName: string;
  type: AccountType;
  debit: number;
  credit: number;
}

export interface FinancialStatements {
  trialBalance: {
    items: TrialBalanceItem[];
    totalDebit: number;
    totalCredit: number;
    isBalanced: boolean;
  };
  profitAndLoss: {
    revenue: number;
    costOfSales: number;
    grossProfit: number;
    operatingExpenses: number;
    netProfit: number;
    currency: string;
  };
  balanceSheet: {
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    isBalanced: boolean;
    currency: string;
  };
}

export interface TaxInvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface TaxInvoice {
  id: string;
  businessId: string;
  invoiceNumber: string;
  customerName: string;
  customerGstin?: string;
  items: TaxInvoiceItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  currency: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  dueDate: string;
  createdAt: string;
}

export interface AccountingDashboardMetrics {
  business: BusinessProfile;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  gstPayable: number;
  itcAvailable: number;
  outstandingInvoicesCount: number;
  journalEntriesCount: number;
  financialStatements: FinancialStatements;
  gstSummary: GSTSummary;
  invoices: TaxInvoice[];
  accounts: Account[];
  journalEntries: JournalEntry[];
}
