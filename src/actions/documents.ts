"use server";

import { requireAuth } from "@/lib/auth";
import { generatePublicId } from "@/lib/utils";

export interface VaultDocument {
  id: string;
  fileName: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  docType: string;
  module: string;
  amount: number;
  merchantName: string;
  status: string;
  currency: string;
  createdAt: string;
}

export interface InvoiceRecord {
  id: string;
  customerName: string;
  customerGst?: string;
  dueDate: string;
  subtotal: number;
  totalTax: number;
  grandTotal: number;
  currency: string;
  status: string;
  createdAt: string;
}

const docsStore = new Map<string, VaultDocument[]>();
const invoiceStore = new Map<string, InvoiceRecord[]>();

function ensureStores(userId: number) {
  const userKey = `user_${userId}`;
  if (!docsStore.has(userKey)) {
    const defaultDocs: VaultDocument[] = [
      {
        id: generatePublicId("vlt"),
        fileName: "MSEDCL_Electricity_Bill.pdf",
        originalName: "MSEDCL_Electricity_Bill_2026.pdf",
        fileType: "pdf",
        fileSize: 245000,
        docType: "utility_bill",
        module: "personal",
        amount: 3450,
        merchantName: "MSEDCL Maharashtra",
        status: "verified",
        currency: "INR",
        createdAt: new Date().toISOString(),
      },
    ];
    docsStore.set(userKey, defaultDocs);
  }
  if (!invoiceStore.has(userKey)) invoiceStore.set(userKey, []);
}

export async function uploadVaultDocument(data: {
  fileName: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  docType: string;
  module: string;
  amount: number;
  merchantName: string;
}): Promise<VaultDocument> {
  const user = await requireAuth();
  ensureStores(user.id);
  const userKey = `user_${user.id}`;

  const doc: VaultDocument = {
    id: generatePublicId("vlt"),
    fileName: data.fileName,
    originalName: data.originalName,
    fileType: data.fileType,
    fileSize: data.fileSize,
    docType: data.docType,
    module: data.module,
    amount: data.amount,
    merchantName: data.merchantName,
    status: "pending",
    currency: "INR",
    createdAt: new Date().toISOString(),
  };

  const list = docsStore.get(userKey) || [];
  list.unshift(doc);
  docsStore.set(userKey, list);
  return doc;
}

export async function createInvoice(data: {
  customerName: string;
  customerGst?: string;
  dueDate: string;
  items: Array<{ description: string; quantity: number; unitPrice: number; taxRate: number }>;
}): Promise<InvoiceRecord> {
  const user = await requireAuth();
  ensureStores(user.id);
  const userKey = `user_${user.id}`;

  const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalTax = data.items.reduce((sum, item) => sum + Math.round((item.quantity * item.unitPrice * item.taxRate) / 100), 0);
  const grandTotal = subtotal + totalTax;

  const invoice: InvoiceRecord = {
    id: generatePublicId("ivc"),
    customerName: data.customerName,
    customerGst: data.customerGst,
    dueDate: data.dueDate,
    subtotal,
    totalTax,
    grandTotal,
    currency: "INR",
    status: "issued",
    createdAt: new Date().toISOString(),
  };

  const list = invoiceStore.get(userKey) || [];
  list.push(invoice);
  invoiceStore.set(userKey, list);
  return invoice;
}

export async function verifyVaultDocument(docId: string, status: string): Promise<VaultDocument> {
  const user = await requireAuth();
  ensureStores(user.id);
  const userKey = `user_${user.id}`;
  const list = docsStore.get(userKey) || [];
  const doc = list.find((d) => d.id === docId);
  if (!doc) {
    const dummy: VaultDocument = {
      id: docId,
      fileName: "verified.pdf",
      originalName: "verified.pdf",
      fileType: "pdf",
      fileSize: 1000,
      docType: "receipt",
      module: "personal",
      amount: 1000,
      merchantName: "Merchant",
      status: status,
      currency: "INR",
      createdAt: new Date().toISOString(),
    };
    return dummy;
  }
  doc.status = status;
  return doc;
}

export async function getDocumentDashboardSummary() {
  const user = await requireAuth();
  ensureStores(user.id);
  const userKey = `user_${user.id}`;
  const docs = docsStore.get(userKey) || [];
  const invs = invoiceStore.get(userKey) || [];
  return {
    totalDocuments: docs.length,
    documents: docs,
    invoices: invs,
  };
}
