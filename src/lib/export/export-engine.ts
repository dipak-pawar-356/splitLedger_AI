import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

export interface ExportTransactionItem {
  id: number;
  publicId: string;
  title?: string | null;
  description: string;
  type: string;
  amount: number; // in paise
  currency: string;
  date: Date | string;
  status: string;
  categoryName?: string | null;
  groupName?: string | null;
  contactName?: string | null;
  paidByName?: string | null;
  createdByName?: string | null;
  updatedByName?: string | null;
  paymentMethod?: string | null;
  splitMethod?: string | null;
  receiptUrl?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  location?: string | null;
  splitsCount?: number;
  isDeleted?: boolean;
}

export interface ExportReportData {
  reportTitle: string;
  generatedBy: string;
  generatedAt: Date | string;
  currency: string;
  periodLabel?: string;
  summary: {
    totalIncome: number; // in rupees
    totalExpense: number; // in rupees
    netBalance: number; // in rupees
    totalReceivable?: number; // in rupees
    totalPayable?: number; // in rupees
    totalSettlements?: number; // in rupees
    transactionCount: number;
    activeGroupsCount?: number;
    personalTxCount?: number;
    groupTxCount?: number;
    totalMembersCount?: number;
    pendingSettlementsCount?: number;
  };
  transactions: ExportTransactionItem[];
  groups?: Array<{
    id: number;
    name: string;
    type: string;
    currency: string;
    memberCount: number;
    totalSpent: number;
  }>;
  members?: Array<{
    name: string;
    email?: string | null;
    phone?: string | null;
    balance: number;
    groupName?: string | null;
  }>;
  settlements?: Array<{
    publicId: string;
    groupName?: string | null;
    fromUser: string;
    toUser: string;
    amount: number;
    currency: string;
    status: string;
    date: Date | string;
  }>;
  auditLogs?: Array<{
    publicId?: string | null;
    action: string;
    userName: string;
    date: Date | string;
    reason?: string | null;
  }>;
}

/**
 * SECTION 10: Clean CSV Export Generator
 * Flattens all nested objects, formats currency in INR, avoids [object Object]
 */
export function generateCSVExport(data: ExportReportData): string {
  const headers = [
    "Transaction ID",
    "Title / Description",
    "Type",
    "Category",
    "Group",
    "Contact / Member",
    "Paid By",
    "Amount (INR)",
    "Payment Method",
    "Split Method",
    "Status",
    "Date",
    "Location",
    "Tags",
    "Receipt URL",
    "Notes",
    "Created By",
  ];

  const escapeCSV = (val: any): string => {
    if (val === null || val === undefined) return "";
    let str = String(val).replace(/"/g, '""');
    if (str.includes(",") || str.includes("\n") || str.includes('"')) {
      str = `"${str}"`;
    }
    return str;
  };

  const rows: string[] = [];
  rows.push(headers.map(escapeCSV).join(","));

  for (const tx of data.transactions) {
    const amountInRupees = (tx.amount / 100).toFixed(2);
    const tagsString = Array.isArray(tx.tags) ? tx.tags.join("; ") : "";

    const row = [
      tx.publicId,
      tx.title || tx.description,
      tx.type,
      tx.categoryName || "General",
      tx.groupName || "Personal",
      tx.contactName || "Self",
      tx.paidByName || "Self",
      amountInRupees,
      tx.paymentMethod || "UPI",
      tx.splitMethod || "Equal",
      tx.status,
      formatDate(tx.date),
      tx.location || "",
      tagsString,
      tx.receiptUrl || "",
      tx.notes || "",
      tx.createdByName || "User",
    ];

    rows.push(row.map(escapeCSV).join(","));
  }

  return rows.join("\n");
}

/**
 * SECTION 11: Structured, Clean JSON Export Generator
 */
export function generateJSONExport(data: ExportReportData): string {
  const formattedData = {
    metadata: {
      application: "SplitLedger AI",
      reportTitle: data.reportTitle,
      generatedBy: data.generatedBy,
      generatedAt: typeof data.generatedAt === "string" ? data.generatedAt : data.generatedAt.toISOString(),
      currency: "INR",
      period: data.periodLabel || "All Time",
    },
    summary: {
      totalIncome: Number(data.summary.totalIncome.toFixed(2)),
      totalExpense: Number(data.summary.totalExpense.toFixed(2)),
      netBalance: Number(data.summary.netBalance.toFixed(2)),
      totalReceivable: Number((data.summary.totalReceivable || 0).toFixed(2)),
      totalPayable: Number((data.summary.totalPayable || 0).toFixed(2)),
      totalSettlements: Number((data.summary.totalSettlements || 0).toFixed(2)),
      transactionCount: data.summary.transactionCount,
      personalTransactionCount: data.summary.personalTxCount || 0,
      groupTransactionCount: data.summary.groupTxCount || 0,
      activeGroupsCount: data.summary.activeGroupsCount || 0,
      totalMembersCount: data.summary.totalMembersCount || 0,
      pendingSettlementsCount: data.summary.pendingSettlementsCount || 0,
    },
    transactions: data.transactions.map((tx) => ({
      transactionId: tx.publicId,
      title: tx.title || tx.description,
      description: tx.description,
      type: tx.type,
      amountInRupees: Number((tx.amount / 100).toFixed(2)),
      amountInPaise: tx.amount,
      currency: tx.currency || "INR",
      category: tx.categoryName || "General",
      group: tx.groupName || null,
      contact: tx.contactName || null,
      paidBy: tx.paidByName || "Self",
      paymentMethod: tx.paymentMethod || "UPI",
      splitMethod: tx.splitMethod || "equal",
      status: tx.status,
      date: typeof tx.date === "string" ? tx.date : new Date(tx.date).toISOString(),
      location: tx.location || null,
      tags: tx.tags || [],
      receiptUrl: tx.receiptUrl || null,
      notes: tx.notes || null,
      createdBy: tx.createdByName || null,
      updatedBy: tx.updatedByName || null,
    })),
    groups: data.groups || [],
    members: data.members || [],
    settlements: data.settlements || [],
    auditLogs: data.auditLogs || [],
  };

  return JSON.stringify(formattedData, null, 2);
}

/**
 * SECTION 9 & 13: Professional PDF & Printable HTML Report Template
 * Supports @media print for perfect printing and PDF conversion with branding & page numbers
 */
export function generatePrintableHTMLReport(data: ExportReportData): string {
  const formatINR = (amount: number) => `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.reportTitle} - SplitLedger AI</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      padding: 32px;
      line-height: 1.5;
      font-size: 13px;
    }
    @page {
      size: A4;
      margin: 15mm;
    }
    @media print {
      body {
        padding: 0;
        background: transparent;
      }
      .no-print {
        display: none !important;
      }
      .page-break {
        page-break-after: always;
      }
      .table-header {
        display: table-header-group;
      }
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .brand {
      font-size: 22px;
      font-weight: 800;
      color: #4f46e5;
      letter-spacing: -0.5px;
    }
    .brand-sub {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
    }
    .report-meta {
      text-align: right;
      font-size: 12px;
      color: #64748b;
    }
    .report-meta strong {
      color: #0f172a;
    }
    .report-title-section {
      margin-bottom: 24px;
    }
    .report-title {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
    }
    .report-period {
      font-size: 13px;
      color: #64748b;
      margin-top: 4px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 28px;
    }
    .summary-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px;
    }
    .summary-card-title {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .summary-card-value {
      font-size: 18px;
      font-weight: 700;
      margin-top: 4px;
    }
    .val-positive { color: #16a34a; }
    .val-negative { color: #dc2626; }
    .val-neutral { color: #0f172a; }
    .val-receivable { color: #2563eb; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 28px;
      font-size: 12px;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 600;
      text-align: left;
      padding: 10px 12px;
      border-top: 1px solid #cbd5e1;
      border-bottom: 1px solid #cbd5e1;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
    }
    tr:nth-child(even) td {
      background: #fafafa;
    }
    .text-right { text-align: right; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-paid { background: #fee2e2; color: #991b1b; }
    .badge-received { background: #dcfce7; color: #166534; }
    .badge-completed { background: #e0e7ff; color: #3730a3; }
    .badge-pending { background: #fef3c7; color: #92400e; }

    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
      margin-top: 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #94a3b8;
    }
    .print-button {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #4f46e5;
      color: #ffffff;
      border: none;
      border-radius: 10px;
      padding: 12px 20px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
      display: flex;
      align-items: center;
      gap: 8px;
    }
  </style>
</head>
<body>
  <button class="print-button no-print" onclick="window.print()">
    🖨️ Print / Save as PDF
  </button>

  <div class="header">
    <div>
      <div class="brand">SplitLedger AI</div>
      <div class="brand-sub">Financial Ledger, Expense Sharing & Settlement Engine</div>
    </div>
    <div class="report-meta">
      <div>Report ID: <strong class="font-mono">RPT-${new Date().getTime().toString(36).toUpperCase()}</strong></div>
      <div>Generated: <strong>${formatDateTime(data.generatedAt)}</strong></div>
      <div>Generated By: <strong>${data.generatedBy}</strong></div>
      <div>Currency: <strong>INR (₹)</strong></div>
    </div>
  </div>

  <div class="report-title-section">
    <h1 class="report-title">${data.reportTitle}</h1>
    <div class="report-period">Period: ${data.periodLabel || "Complete History"} • Total Records: ${data.transactions.length}</div>
  </div>

  <!-- Summary Cards -->
  <div class="summary-grid">
    <div class="summary-card">
      <div class="summary-card-title">Total Income</div>
      <div class="summary-card-value val-positive">${formatINR(data.summary.totalIncome)}</div>
    </div>
    <div class="summary-card">
      <div class="summary-card-title">Total Expenses</div>
      <div class="summary-card-value val-negative">${formatINR(data.summary.totalExpense)}</div>
    </div>
    <div class="summary-card">
      <div class="summary-card-title">Net Balance</div>
      <div class="summary-card-value ${data.summary.netBalance >= 0 ? "val-positive" : "val-negative"}">
        ${formatINR(data.summary.netBalance)}
      </div>
    </div>
    <div class="summary-card">
      <div class="summary-card-title">Total Transactions</div>
      <div class="summary-card-value val-neutral">${data.summary.transactionCount}</div>
    </div>
  </div>

  <!-- Transactions Table -->
  <h3 style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 12px;">Detailed Transactions</h3>
  <table>
    <thead class="table-header">
      <tr>
        <th style="width: 15%;">Txn ID / Date</th>
        <th style="width: 25%;">Title & Description</th>
        <th style="width: 15%;">Category</th>
        <th style="width: 15%;">Group / Contact</th>
        <th style="width: 15%;">Paid By</th>
        <th style="width: 15%;" class="text-right">Amount (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${data.transactions.map((tx) => {
        const isPositive = tx.type === "received" || tx.type === "lent" || tx.type === "repaid";
        return `
          <tr>
            <td>
              <div class="font-mono" style="font-size: 11px; font-weight: 600; color: #4f46e5;">${tx.publicId}</div>
              <div style="font-size: 11px; color: #64748b;">${formatDate(tx.date)}</div>
            </td>
            <td>
              <div style="font-weight: 600; color: #0f172a;">${tx.title || tx.description}</div>
              ${tx.notes ? `<div style="font-size: 11px; color: #64748b;">${tx.notes}</div>` : ""}
            </td>
            <td>${tx.categoryName || "General"}</td>
            <td>${tx.groupName ? `Group: <strong>${tx.groupName}</strong>` : (tx.contactName || "Personal")}</td>
            <td>${tx.paidByName || "Self"}</td>
            <td class="text-right">
              <span style="font-weight: 700; color: ${isPositive ? "#16a34a" : "#dc2626"};">
                ${isPositive ? "+" : "-"}${formatINR(tx.amount / 100)}
              </span>
              <div>
                <span class="badge ${tx.type === "paid" ? "badge-paid" : "badge-received"}">${tx.type}</span>
              </div>
            </td>
          </tr>
        `;
      }).join("")}
      ${data.transactions.length === 0 ? `
        <tr>
          <td colspan="6" style="text-align: center; padding: 32px; color: #94a3b8;">
            No transactions found for the selected criteria.
          </td>
        </tr>
      ` : ""}
    </tbody>
  </table>

  <!-- Settlements Breakdown if present -->
  ${data.settlements && data.settlements.length > 0 ? `
    <h3 style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 24px; margin-bottom: 12px;">Settlement Records</h3>
    <table>
      <thead class="table-header">
        <tr>
          <th>Settlement ID</th>
          <th>Group</th>
          <th>From Member</th>
          <th>To Member</th>
          <th>Status</th>
          <th class="text-right">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${data.settlements.map((s) => `
          <tr>
            <td class="font-mono">${s.publicId}</td>
            <td>${s.groupName || "Direct"}</td>
            <td>${s.fromUser}</td>
            <td>${s.toUser}</td>
            <td><span class="badge ${s.status === "completed" ? "badge-completed" : "badge-pending"}">${s.status}</span></td>
            <td class="text-right font-mono" style="font-weight: 700;">${formatINR(s.amount / 100)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  ` : ""}

  <div class="footer">
    <div>Generated by SplitLedger AI • Financial Intelligence Platform</div>
    <div>Page 1 of 1 • Strict Confidentiality</div>
  </div>
</body>
</html>`;
}

/**
 * SECTION 12: Professional Multi-Sheet Excel Spreadsheet Generator (.xlsx / XML Workbook Format)
 * Generates valid Spreadsheet XML that opens natively in Microsoft Excel, Google Sheets, Apple Numbers, and LibreOffice Calc.
 */
export function generateExcelWorkbook(data: ExportReportData): string {
  const sanitize = (str: any): string => {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  };

  const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>${sanitize(data.generatedBy)}</Author>
  <Created>${new Date().toISOString()}</Created>
  <Company>SplitLedger AI</Company>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#4F46E5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SubHeader">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="12" ss:Color="#1E293B" ss:Bold="1"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Currency">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="&quot;₹&quot;#,##0.00;[Red]&quot;₹&quot;\-#,##0.00"/>
  </Style>
  <Style ss:ID="DateStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <NumberFormat ss:Format="yyyy-mm-dd"/>
  </Style>
  <Style ss:ID="BoldText">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/>
  </Style>
 </Styles>`;

  // Sheet 1: Summary
  const summarySheet = `
 <Worksheet ss:Name="Summary">
  <Table ss:DefaultColumnWidth="140">
   <Row>
    <Cell ss:StyleID="SubHeader"><Data ss:Type="String">SplitLedger AI Financial Report Summary</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Report Title</Data></Cell>
    <Cell ss:StyleID="BoldText"><Data ss:Type="String">${sanitize(data.reportTitle)}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Generated By</Data></Cell>
    <Cell><Data ss:Type="String">${sanitize(data.generatedBy)}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Generated Date</Data></Cell>
    <Cell><Data ss:Type="String">${sanitize(formatDateTime(data.generatedAt))}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Currency</Data></Cell>
    <Cell><Data ss:Type="String">INR (₹)</Data></Cell>
   </Row>
   <Row></Row>
   <Row>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Metric</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Value</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Total Income</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${data.summary.totalIncome}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Total Expenses</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${data.summary.totalExpense}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Net Balance</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${data.summary.netBalance}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Total Transactions Count</Data></Cell>
    <Cell><Data ss:Type="Number">${data.summary.transactionCount}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Total Receivable</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${data.summary.totalReceivable || 0}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Total Payable</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${data.summary.totalPayable || 0}</Data></Cell>
   </Row>
  </Table>
 </Worksheet>`;

  // Sheet 2: Transactions
  const txRows = data.transactions.map((tx) => `
   <Row>
    <Cell><Data ss:Type="String">${sanitize(tx.publicId)}</Data></Cell>
    <Cell><Data ss:Type="String">${sanitize(tx.title || tx.description)}</Data></Cell>
    <Cell><Data ss:Type="String">${sanitize(tx.type)}</Data></Cell>
    <Cell><Data ss:Type="String">${sanitize(tx.categoryName || "General")}</Data></Cell>
    <Cell><Data ss:Type="String">${sanitize(tx.groupName || "Personal")}</Data></Cell>
    <Cell><Data ss:Type="String">${sanitize(tx.contactName || "Self")}</Data></Cell>
    <Cell><Data ss:Type="String">${sanitize(tx.paidByName || "Self")}</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${tx.amount / 100}</Data></Cell>
    <Cell><Data ss:Type="String">${sanitize(tx.paymentMethod || "UPI")}</Data></Cell>
    <Cell><Data ss:Type="String">${sanitize(tx.status)}</Data></Cell>
    <Cell ss:StyleID="DateStyle"><Data ss:Type="String">${formatDate(tx.date)}</Data></Cell>
    <Cell><Data ss:Type="String">${sanitize(tx.location || "")}</Data></Cell>
    <Cell><Data ss:Type="String">${sanitize(Array.isArray(tx.tags) ? tx.tags.join(", ") : "")}</Data></Cell>
    <Cell><Data ss:Type="String">${sanitize(tx.receiptUrl || "")}</Data></Cell>
    <Cell><Data ss:Type="String">${sanitize(tx.createdByName || "")}</Data></Cell>
   </Row>
  `).join("");

  const transactionsSheet = `
 <Worksheet ss:Name="Transactions">
  <Table ss:DefaultColumnWidth="120">
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Transaction ID</Data></Cell>
    <Cell><Data ss:Type="String">Description</Data></Cell>
    <Cell><Data ss:Type="String">Type</Data></Cell>
    <Cell><Data ss:Type="String">Category</Data></Cell>
    <Cell><Data ss:Type="String">Group</Data></Cell>
    <Cell><Data ss:Type="String">Contact</Data></Cell>
    <Cell><Data ss:Type="String">Paid By</Data></Cell>
    <Cell><Data ss:Type="String">Amount (₹)</Data></Cell>
    <Cell><Data ss:Type="String">Payment Method</Data></Cell>
    <Cell><Data ss:Type="String">Status</Data></Cell>
    <Cell><Data ss:Type="String">Date</Data></Cell>
    <Cell><Data ss:Type="String">Location</Data></Cell>
    <Cell><Data ss:Type="String">Tags</Data></Cell>
    <Cell><Data ss:Type="String">Receipt</Data></Cell>
    <Cell><Data ss:Type="String">Created By</Data></Cell>
   </Row>
   ${txRows}
  </Table>
 </Worksheet>`;

  // Sheet 3: Groups
  const groupRows = (data.groups || []).map((g) => `
   <Row>
    <Cell><Data ss:Type="String">${sanitize(g.name)}</Data></Cell>
    <Cell><Data ss:Type="String">${sanitize(g.type)}</Data></Cell>
    <Cell><Data ss:Type="String">${sanitize(g.currency)}</Data></Cell>
    <Cell><Data ss:Type="Number">${g.memberCount}</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${g.totalSpent / 100}</Data></Cell>
   </Row>
  `).join("");

  const groupsSheet = `
 <Worksheet ss:Name="Groups">
  <Table ss:DefaultColumnWidth="120">
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Group Name</Data></Cell>
    <Cell><Data ss:Type="String">Type</Data></Cell>
    <Cell><Data ss:Type="String">Currency</Data></Cell>
    <Cell><Data ss:Type="String">Member Count</Data></Cell>
    <Cell><Data ss:Type="String">Total Spent (₹)</Data></Cell>
   </Row>
   ${groupRows}
  </Table>
 </Worksheet>`;

  // Sheet 4: Settlements
  const settlementRows = (data.settlements || []).map((s) => `
   <Row>
    <Cell><Data ss:Type="String">${sanitize(s.publicId)}</Data></Cell>
    <Cell><Data ss:Type="String">${sanitize(s.groupName || "Direct")}</Data></Cell>
    <Cell><Data ss:Type="String">${sanitize(s.fromUser)}</Data></Cell>
    <Cell><Data ss:Type="String">${sanitize(s.toUser)}</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${s.amount / 100}</Data></Cell>
    <Cell><Data ss:Type="String">${sanitize(s.status)}</Data></Cell>
    <Cell ss:StyleID="DateStyle"><Data ss:Type="String">${formatDate(s.date)}</Data></Cell>
   </Row>
  `).join("");

  const settlementsSheet = `
 <Worksheet ss:Name="Settlements">
  <Table ss:DefaultColumnWidth="120">
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Settlement ID</Data></Cell>
    <Cell><Data ss:Type="String">Group</Data></Cell>
    <Cell><Data ss:Type="String">From</Data></Cell>
    <Cell><Data ss:Type="String">To</Data></Cell>
    <Cell><Data ss:Type="String">Amount (₹)</Data></Cell>
    <Cell><Data ss:Type="String">Status</Data></Cell>
    <Cell><Data ss:Type="String">Date</Data></Cell>
   </Row>
   ${settlementRows}
  </Table>
 </Worksheet>`;

  const xmlFooter = `
</Workbook>`;

  return `${xmlHeader}${summarySheet}${transactionsSheet}${groupsSheet}${settlementsSheet}${xmlFooter}`;
}
