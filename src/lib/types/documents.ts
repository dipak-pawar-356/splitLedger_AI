/**
 * Financial Document Vault, OCR Verification & Invoice Management Types
 */

export type DocumentType =
  | "receipt"
  | "invoice"
  | "gst_bill"
  | "medical_bill"
  | "fuel_bill"
  | "travel_ticket"
  | "boarding_pass"
  | "hotel_bill"
  | "restaurant_bill"
  | "shopping_bill"
  | "warranty_card"
  | "salary_slip"
  | "bank_statement"
  | "payment_screenshot"
  | "upi_screenshot"
  | "cheque_image"
  | "loan_document"
  | "insurance_document"
  | "tax_document"
  | "custom";

export type DocumentModule =
  | "personal"
  | "group"
  | "organization"
  | "trip"
  | "loan"
  | "recurring"
  | "subscription"
  | "budget";

export type VerificationStatus = "pending" | "verified" | "rejected" | "duplicate";
export type InvoiceStatus = "draft" | "pending" | "paid" | "cancelled" | "overdue";

export interface DocumentVerification {
  id: string; // Random 16-char ID (vrf_...)
  documentId: string;
  status: VerificationStatus;
  verifiedBy: string;
  verifiedTime: string;
  reason?: string;
}

export interface VaultDocument {
  id: string; // Random 16-char ID (vlt_...)
  userId: number;
  module: DocumentModule;
  linkedRecordId?: string; // transactionId, groupId, tripId, loanId, etc.
  fileName: string;
  originalName: string;
  fileType: string; // pdf, png, jpg, webp, docx, xlsx
  fileSize: number; // in bytes
  uploadDate: string;
  uploadedBy: string;
  docType: DocumentType;
  folderName: string;
  checksum: string;
  status: VerificationStatus;
  merchantName?: string;
  invoiceNumber?: string;
  billDate?: string;
  amount?: number; // in rupees
  currency: string; // Default: INR
  gstNumber?: string;
  taxAmount?: number; // in rupees
  ocrConfidence?: number; // 0-100
  fileUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number; // in rupees
  taxRate: number; // percentage e.g. 18
  taxAmount: number; // in rupees
  total: number; // in rupees
}

export interface InvoiceRecord {
  id: string; // Random 16-char ID (ivc_...)
  userId: number;
  orgId?: string;
  groupId?: number;
  tripId?: string;
  invoiceNumber: string; // e.g. INV-2026-0041
  customerName: string;
  customerEmail?: string;
  customerGst?: string;
  issueDate: string;
  dueDate: string;
  currency: string; // Default: INR
  items: InvoiceItem[];
  subtotal: number; // in rupees
  totalTax: number; // in rupees
  discount: number; // in rupees
  grandTotal: number; // in rupees
  status: InvoiceStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentFolder {
  id: string; // Random 16-char ID (fld_...)
  name: string;
  module: DocumentModule;
  count: number;
}

export interface DocumentDashboardMetrics {
  totalDocumentsCount: number;
  verifiedDocumentsCount: number;
  pendingVerificationCount: number;
  totalInvoicesCount: number;
  unpaidInvoicesAmount: number; // in rupees
  currency: string;
  documents: VaultDocument[];
  invoices: InvoiceRecord[];
  folders: DocumentFolder[];
}
