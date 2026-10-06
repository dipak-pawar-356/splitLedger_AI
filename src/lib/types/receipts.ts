/**
 * AI Receipt Scanner, Structured OCR & Itemized Splitting Types
 */

export interface ReceiptLineItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number; // in rupees
  totalPrice: number; // in rupees
  assignedMemberIds: number[];
}

export interface TaxBreakdown {
  cgst: number; // in rupees
  sgst: number; // in rupees
  igst: number; // in rupees
  vat: number; // in rupees
  serviceCharge: number; // in rupees
  totalTax: number; // in rupees
}

export interface ReceiptValidationAudit {
  merchantValid: boolean;
  gstValid: boolean;
  dateValid: boolean;
  taxReconciled: boolean;
  isDuplicate: boolean;
  duplicateStatus: "Unique" | "Duplicate Found" | "Unable to Verify";
  suggestedCategory: string;
  suggestedPaymentMethod: string;
  validationScore: number; // 0 - 100
  warnings: string[];
}

export interface ParsedReceiptData {
  merchantName?: string;
  gstNumber?: string;
  invoiceNumber?: string;
  date?: string;
  time?: string;
  currency: string; // Default: INR
  items: ReceiptLineItem[];
  subtotal?: number;
  taxBreakdown: TaxBreakdown;
  grandTotal?: number;
  paymentMethod?: string;
  category?: string;
  confidenceScore: number; // 0 - 100
  receiptType: "Restaurant" | "Fuel" | "Medical" | "Travel" | "Utilities" | "Grocery" | "Office" | "General";
  imageHash?: string;
  isDuplicate?: boolean;
  duplicateStatus?: "Unique" | "Duplicate Found" | "Unable to Verify";
  validation?: ReceiptValidationAudit;
}

export interface ItemizedSplitAllocation {
  memberId: number;
  memberName: string;
  itemSubtotal: number; // in rupees
  taxShare: number; // proportional tax share in rupees
  totalPayable: number; // in rupees
  itemsList: string[];
}
