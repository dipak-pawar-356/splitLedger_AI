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
  userEmail?: string | null;
  selectedGroup?: string | null;
  reportId?: string;
  version?: string;
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
    completedSettlementsCount?: number;
    savingsRate?: number;
    averageDailySpend?: number;
    averageWeeklySpend?: number;
    averageMonthlySpend?: number;
    openingBalance?: number;
    closingBalance?: number;
  };
  transactions: ExportTransactionItem[];
  groups?: Array<{
    id: number;
    name: string;
    type: string;
    currency: string;
    memberCount: number;
    totalSpent: number;
    settlementsCompleted?: number;
    outstandingBalance?: number;
    mostActiveMember?: string;
    highestContributor?: string;
    completionRate?: number;
  }>;
  members?: Array<{
    name: string;
    email?: string | null;
    phone?: string | null;
    paid?: number;
    owes?: number;
    receivable?: number;
    netPosition?: number;
    balance?: number;
    status?: string;
    groupName?: string | null;
    participationPercent?: number;
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
  financialHealthScore?: number;
  healthGrade?: string;
  healthDetails?: any;
  monthlyTrend?: Array<{
    month: string;
    expense: number;
    income: number;
    net: number;
    runningBalance: number;
    savingsRate: number;
  }>;
  kpiCards?: Record<string, any>;
  categoryBreakdown?: Array<{
    name: string;
    amount: number;
    percentage: number;
    count?: number;
    growthPercent?: number;
  }>;
  paymentMethods?: Array<{
    name: string;
    amount: number;
    percentage: number;
    count: number;
  }>;
  weekendVsWeekday?: {
    weekendAmount: number;
    weekdayAmount: number;
    weekendCount: number;
    weekdayCount: number;
    weekendPercentage: number;
    weekdayPercentage: number;
    avgWeekendDaily: number;
    avgWeekdayDaily: number;
  };
  dailyDistribution?: Array<{
    day: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  transactionMetrics?: {
    averageTransaction: number;
    medianTransaction: number;
    highestExpense: {
      amount: number;
      title: string;
      date: string;
      category?: string;
    };
    lowestExpense: {
      amount: number;
      title: string;
      date: string;
      category?: string;
    };
    expenseFrequencyPerDay: number;
    totalExpenseCount: number;
  };
  settlementAnalytics?: {
    pendingAmount: number;
    completedAmount: number;
    pendingCount: number;
    completedCount: number;
    settlementSuccessRate: number;
    avgSettlementSpeedDays: number;
    upiSettlementShare: number;
    debtOptimizationSavings?: {
      directTransfersCount: number;
      optimizedTransfersCount: number;
      transfersSaved: number;
      moneyVolumeOptimized: number;
      estimatedTimeSavedHours: number;
    };
  };
  top10Expenses?: Array<{
    rank: number;
    publicId: string;
    title: string;
    category: string;
    group: string;
    amount: number;
    date: string;
    paidBy?: string;
  }>;
  aiInsights?: Array<{
    id?: string;
    title: string;
    description: string;
    impact?: string;
    metric?: string;
    type?: string;
  }>;
  recommendations?: Array<{
    title: string;
    action: string;
    potentialSavings?: number;
    urgency?: string;
  }>;
  auditInfo?: any;
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

function formatINR(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `₹${safe.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatShortINR(val: number): string {
  const safe = Math.abs(val);
  const sign = val < 0 ? "-" : "";
  if (safe >= 10000000) return `${sign}₹${(safe / 10000000).toFixed(1)}Cr`;
  if (safe >= 100000) return `${sign}₹${(safe / 100000).toFixed(1)}L`;
  if (safe >= 1000) return `${sign}₹${(safe / 1000).toFixed(1)}k`;
  return `${sign}₹${safe.toFixed(0)}`;
}

function escapeXML(str: any): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ============================================================================
// PURE VECTOR SVG CHART GENERATORS (CLEAN, MINIMAL & PRINT READY)
// ============================================================================

/**
 * 1. Monthly Spending & Inflows (Vector Line/Area Chart)
 */
function generateMonthlyTrendSVG(
  trend: Array<{ month: string; expense: number; income: number }>
): string {
  const data = trend && trend.length > 0 ? trend : [{ month: "Current", expense: 0, income: 0 }];
  const width = 720;
  const height = 200;
  const padLeft = 60;
  const padRight = 20;
  const padTop = 25;
  const padBottom = 35;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.income, d.expense)),
    1000
  );
  const niceMax = Math.ceil(maxVal / 1000) * 1000 || 5000;

  const getX = (i: number) => {
    if (data.length <= 1) return padLeft + chartW / 2;
    return padLeft + (i / (data.length - 1)) * chartW;
  };
  const getY = (val: number) => padTop + chartH - (Math.max(0, val) / niceMax) * chartH;

  // Grid lines
  let gridLines = "";
  for (let s = 0; s <= 4; s++) {
    const yVal = (niceMax / 4) * s;
    const yPos = getY(yVal);
    gridLines += `
      <line x1="${padLeft}" y1="${yPos.toFixed(1)}" x2="${padLeft + chartW}" y2="${yPos.toFixed(1)}" stroke="#f1f5f9" stroke-width="1" />
      <text x="${padLeft - 8}" y="${(yPos + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#94a3b8" font-family="ui-monospace, monospace">${formatShortINR(yVal)}</text>
    `;
  }

  let incLine = "";
  let expLine = "";
  let incDots = "";
  let expDots = "";
  let xLabels = "";

  data.forEach((d, i) => {
    const x = getX(i);
    const yInc = getY(d.income);
    const yExp = getY(d.expense);

    if (i === 0) {
      incLine += `M ${x.toFixed(1)} ${yInc.toFixed(1)}`;
      expLine += `M ${x.toFixed(1)} ${yExp.toFixed(1)}`;
    } else {
      incLine += ` L ${x.toFixed(1)} ${yInc.toFixed(1)}`;
      expLine += ` L ${x.toFixed(1)} ${yExp.toFixed(1)}`;
    }

    incDots += `<circle cx="${x.toFixed(1)}" cy="${yInc.toFixed(1)}" r="3" fill="#ffffff" stroke="#10b981" stroke-width="2" />`;
    expDots += `<circle cx="${x.toFixed(1)}" cy="${yExp.toFixed(1)}" r="3" fill="#ffffff" stroke="#4f46e5" stroke-width="2" />`;
    xLabels += `<text x="${x.toFixed(1)}" y="${(padTop + chartH + 16).toFixed(1)}" text-anchor="middle" font-size="9" fill="#64748b" font-weight="500">${escapeXML(d.month)}</text>`;
  });

  return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" xmlns="http://www.w3.org/2000/svg" style="font-family: inherit;">
      <!-- Legend -->
      <g transform="translate(${width - 200}, 10)">
        <circle cx="5" cy="5" r="4" fill="#10b981" />
        <text x="14" y="8" font-size="9" fill="#475569" font-weight="500">Income</text>
        <circle cx="85" cy="5" r="4" fill="#4f46e5" />
        <text x="94" y="8" font-size="9" fill="#475569" font-weight="500">Expenses</text>
      </g>
      ${gridLines}
      <path d="${incLine}" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="${expLine}" fill="none" stroke="#4f46e5" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
      ${incDots}
      ${expDots}
      ${xLabels}
    </svg>
  `;
}

/**
 * 2. Category Distribution Donut Chart
 */
function generateCategoryDonutSVG(
  categories: Array<{ name: string; amount: number; percentage: number }>,
  total: number
): string {
  const width = 320;
  const height = 190;
  const cx = 95;
  const cy = 95;
  const R = 68;
  const r = 42;

  const colors = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#94a3b8"];

  if (!categories || categories.length === 0 || total <= 0) {
    return `
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${cx}" cy="${cy}" r="${(R + r) / 2}" fill="none" stroke="#f1f5f9" stroke-width="${R - r}" />
        <text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="10" fill="#94a3b8">No Data Available</text>
      </svg>
    `;
  }

  let paths = "";
  let legendItems = "";
  let accumulatedAngle = 0;

  const topCats = categories.slice(0, 5);
  const sumPercent = topCats.reduce((s, c) => s + (c.percentage || 0), 0) || 100;

  topCats.forEach((cat, idx) => {
    const fraction = (cat.percentage || 0) / sumPercent;
    const sliceAngle = fraction * 2 * Math.PI;
    const startAngle = accumulatedAngle - Math.PI / 2;
    const endAngle = startAngle + sliceAngle;
    accumulatedAngle += sliceAngle;

    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy + R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(endAngle);
    const y2 = cy + R * Math.sin(endAngle);
    const x3 = cx + r * Math.cos(endAngle);
    const y3 = cy + r * Math.sin(endAngle);
    const x4 = cx + r * Math.cos(startAngle);
    const y4 = cy + r * Math.sin(startAngle);

    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    const color = colors[idx % colors.length];

    if (fraction > 0.005) {
      paths += `
        <path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${R} ${R} 0 ${largeArc} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L ${x3.toFixed(1)} ${y3.toFixed(1)} A ${r} ${r} 0 ${largeArc} 0 ${x4.toFixed(1)} ${y4.toFixed(1)} Z" fill="${color}" stroke="#ffffff" stroke-width="1.5" />
      `;
    }

    const legY = 25 + idx * 26;
    legendItems += `
      <g transform="translate(185, ${legY})">
        <circle cx="4" cy="5" r="4" fill="${color}" />
        <text x="14" y="8" font-size="9.5" font-weight="600" fill="#1e293b">${escapeXML(cat.name.slice(0, 14))}</text>
        <text x="14" y="19" font-size="8.5" fill="#64748b" font-family="ui-monospace, monospace">${cat.percentage}% (₹${Math.round(cat.amount).toLocaleString("en-IN")})</text>
      </g>
    `;
  });

  return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" xmlns="http://www.w3.org/2000/svg" style="font-family: inherit;">
      ${paths}
      <text x="${cx}" y="${cy - 3}" text-anchor="middle" font-size="8.5" fill="#64748b" font-weight="600">TOTAL</text>
      <text x="${cx}" y="${cy + 11}" text-anchor="middle" font-size="10.5" fill="#0f172a" font-weight="700" font-family="ui-monospace, monospace">${formatShortINR(total)}</text>
      ${legendItems}
    </svg>
  `;
}

/**
 * 3. Cumulative Running Balance Curve
 */
function generateRunningBalanceSVG(
  trend: Array<{ month: string; runningBalance: number }>
): string {
  const data = trend && trend.length > 0 ? trend : [{ month: "Current", runningBalance: 0 }];
  const width = 720;
  const height = 150;
  const padLeft = 60;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const vals = data.map((d) => d.runningBalance);
  let minVal = Math.min(...vals, 0);
  let maxVal = Math.max(...vals, 1000);
  if (minVal === maxVal) {
    minVal -= 500;
    maxVal += 500;
  }
  const range = maxVal - minVal || 1;

  const getX = (i: number) => {
    if (data.length <= 1) return padLeft + chartW / 2;
    return padLeft + (i / (data.length - 1)) * chartW;
  };
  const getY = (val: number) => padTop + chartH - ((val - minVal) / range) * chartH;
  const zeroY = getY(0);

  let pathLine = "";
  let dots = "";
  let xLabels = "";

  data.forEach((d, i) => {
    const x = getX(i);
    const y = getY(d.runningBalance);
    if (i === 0) {
      pathLine += `M ${x.toFixed(1)} ${y.toFixed(1)}`;
    } else {
      pathLine += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="#ffffff" stroke="#2563eb" stroke-width="2" />`;
    xLabels += `<text x="${x.toFixed(1)}" y="${(padTop + chartH + 15).toFixed(1)}" text-anchor="middle" font-size="9" fill="#64748b">${escapeXML(d.month)}</text>`;
  });

  return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" xmlns="http://www.w3.org/2000/svg" style="font-family: inherit;">
      <line x1="${padLeft}" y1="${zeroY.toFixed(1)}" x2="${padLeft + chartW}" y2="${zeroY.toFixed(1)}" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="3,3" />
      <text x="${padLeft - 6}" y="${(zeroY + 3).toFixed(1)}" text-anchor="end" font-size="8.5" fill="#94a3b8">₹0</text>
      <path d="${pathLine}" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      ${dots}
      ${xLabels}
    </svg>
  `;
}

/**
 * 4. Payment Methods Distribution Bar
 */
function generatePaymentRailsSVG(
  methods: Array<{ name: string; amount: number; percentage: number }>
): string {
  const width = 720;
  const height = 65;
  const colors = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#64748b"];

  const items = methods && methods.length > 0 ? methods : [{ name: "UPI", amount: 0, percentage: 100 }];
  const total = items.reduce((s, m) => s + (m.amount || 0), 0) || 1;

  let currentX = 0;
  let barSegments = "";
  let legend = "";

  items.slice(0, 5).forEach((m, idx) => {
    const fraction = (m.amount || 0) / total;
    const segW = fraction * 720;
    const color = colors[idx % colors.length];

    if (segW > 0) {
      barSegments += `<rect x="${currentX.toFixed(1)}" y="8" width="${segW.toFixed(1)}" height="12" fill="${color}" />`;
      currentX += segW;
    }

    const legX = 10 + idx * 135;
    legend += `
      <g transform="translate(${legX}, 34)">
        <circle cx="4" cy="5" r="4" fill="${color}" />
        <text x="12" y="8" font-size="9" font-weight="600" fill="#1e293b">${escapeXML(m.name)}</text>
        <text x="12" y="19" font-size="8.5" fill="#64748b" font-family="ui-monospace, monospace">${m.percentage}% (₹${Math.round(m.amount).toLocaleString("en-IN")})</text>
      </g>
    `;
  });

  return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" xmlns="http://www.w3.org/2000/svg" style="font-family: inherit;">
      <clipPath id="railClip">
        <rect x="0" y="8" width="720" height="12" rx="6" />
      </clipPath>
      <g clip-path="url(#railClip)">
        ${barSegments}
      </g>
      ${legend}
    </svg>
  `;
}

// ============================================================================
// CLEAN CSV EXPORT GENERATOR
// ============================================================================

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

// ============================================================================
// STRUCTURED JSON EXPORT GENERATOR
// ============================================================================

export function generateJSONExport(data: ExportReportData): string {
  const formattedData = {
    metadata: {
      application: "SplitLedger AI",
      reportTitle: data.reportTitle,
      reportId: data.reportId || `RPT-${new Date().getTime().toString(36).toUpperCase()}`,
      generatedBy: data.generatedBy,
      userEmail: data.userEmail || null,
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
      activeGroupsCount: data.summary.activeGroupsCount || 0,
      totalMembersCount: data.summary.totalMembersCount || 0,
      pendingSettlementsCount: data.summary.pendingSettlementsCount || 0,
    },
    monthlyTrend: data.monthlyTrend || [],
    categoryBreakdown: data.categoryBreakdown || [],
    paymentMethods: data.paymentMethods || [],
    aiInsights: data.aiInsights || [],
    transactions: data.transactions.map((tx) => ({
      transactionId: tx.publicId,
      title: tx.title || tx.description,
      description: tx.description,
      type: tx.type,
      amountInRupees: Number((tx.amount / 100).toFixed(2)),
      currency: tx.currency || "INR",
      category: tx.categoryName || "General",
      group: tx.groupName || null,
      paidBy: tx.paidByName || "Self",
      paymentMethod: tx.paymentMethod || "UPI",
      status: tx.status,
      date: typeof tx.date === "string" ? tx.date : new Date(tx.date).toISOString(),
    })),
    groups: data.groups || [],
    members: data.members || [],
    settlements: data.settlements || [],
  };

  return JSON.stringify(formattedData, null, 2);
}

// ============================================================================
// CLEAN, BEAUTIFUL, PRODUCT-DRIVEN PRINTABLE HTML REPORT (8 PAGES)
// ============================================================================

export function generatePrintableHTMLReport(data: ExportReportData): string {
  const hasTransactions = data.transactions && data.transactions.length > 0;
  const totalIncome = data.summary.totalIncome || 0;
  const totalExpense = data.summary.totalExpense || 0;
  const netBalance = data.summary.netBalance || 0;
  const totalReceivable = data.summary.totalReceivable || 0;
  const totalPayable = data.summary.totalPayable || 0;
  const transactionCount = data.summary.transactionCount || 0;
  const groupsCount = data.summary.activeGroupsCount || (data.groups ? data.groups.length : 0);
  const membersCount = data.summary.totalMembersCount || (data.members ? data.members.length : 0);

  const pendingSettlementCount = data.settlementAnalytics?.pendingCount || data.summary.pendingSettlementsCount || 0;
  const pendingSettlementAmount = data.settlementAnalytics?.pendingAmount || 0;
  const completedSettlementCount = data.settlementAnalytics?.completedCount || 0;
  const completedSettlementAmount = data.settlementAnalytics?.completedAmount || data.summary.totalSettlements || 0;

  const topCategory = data.categoryBreakdown?.[0]?.name || "None";
  const largestExpenseItem = data.transactionMetrics?.highestExpense || {
    title: data.transactions[0]?.title || data.transactions[0]?.description || "None",
    amount: data.transactions[0] ? data.transactions[0].amount / 100 : 0,
  };

  const periodLabel = data.periodLabel || "All Time";
  const userName = data.generatedBy || "User";
  const userEmail = data.userEmail || "user@splitledger.app";
  const reportDate = formatDate(data.generatedAt);

  // Pure SVG Charts
  const monthlySVG = generateMonthlyTrendSVG(data.monthlyTrend || []);
  const donutSVG = generateCategoryDonutSVG(data.categoryBreakdown || [], totalExpense);
  const runningBalanceSVG = generateRunningBalanceSVG(data.monthlyTrend || []);
  const paymentRailsSVG = generatePaymentRailsSVG(data.paymentMethods || []);

  // Top 10 Expenses
  const top10 = (data.top10Expenses && data.top10Expenses.length > 0)
    ? data.top10Expenses
    : [...data.transactions]
        .filter((tx) => tx.type === "paid")
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10)
        .map((tx, idx) => ({
          rank: idx + 1,
          publicId: tx.publicId,
          title: tx.title || tx.description,
          category: tx.categoryName || "General",
          group: tx.groupName || "Personal",
          amount: tx.amount / 100,
          date: formatDate(tx.date),
          paidBy: tx.paidByName || "Self",
        }));

  // Clean real insights (only if at least 3 transactions exist)
  const hasEnoughForAI = data.transactions && data.transactions.length >= 3;
  const cleanInsights: string[] = [];

  if (hasEnoughForAI) {
    if (data.categoryBreakdown && data.categoryBreakdown.length > 0) {
      const top = data.categoryBreakdown[0];
      cleanInsights.push(`You spend ${top.percentage}% of your budget on ${top.name} (₹${Math.round(top.amount).toLocaleString("en-IN")}).`);
    }
    if (data.weekendVsWeekday && data.weekendVsWeekday.weekendAmount > 0) {
      cleanInsights.push(`Weekend spending accounts for ${data.weekendVsWeekday.weekendPercentage}% of your total outflows (₹${Math.round(data.weekendVsWeekday.weekendAmount).toLocaleString("en-IN")}).`);
    }
    if (largestExpenseItem.amount > 0) {
      cleanInsights.push(`Your single largest expense was ₹${Math.round(largestExpenseItem.amount).toLocaleString("en-IN")} on '${largestExpenseItem.title}'.`);
    }
    if (data.settlementAnalytics?.debtOptimizationSavings && data.settlementAnalytics.debtOptimizationSavings.transfersSaved > 0) {
      cleanInsights.push(`Smart Debt Minimization eliminated ${data.settlementAnalytics.debtOptimizationSavings.transfersSaved} redundant transfers across your groups.`);
    }
    if (data.paymentMethods && data.paymentMethods.length > 0) {
      const pref = data.paymentMethods[0];
      cleanInsights.push(`${pref.name} is your most used payment rail (${pref.percentage}% of all transactions).`);
    }
    if (completedSettlementCount > 0) {
      cleanInsights.push(`You completed ${completedSettlementCount} settlements totaling ₹${Math.round(completedSettlementAmount).toLocaleString("en-IN")}.`);
    }
    if (netBalance !== 0) {
      cleanInsights.push(`Your net cash balance for this period is ${netBalance >= 0 ? '+' : '-'}₹${Math.round(Math.abs(netBalance)).toLocaleString("en-IN")}.`);
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeXML(data.reportTitle)} — SplitLedger AI</title>
  <style>
    /* ==========================================================================
       CLEAN, MODERN FINTECH SAAS REPORT STYLING
       ========================================================================== */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      background: #f8fafc;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    @page {
      size: A4 portrait;
      margin: 14mm 14mm 14mm 14mm;
    }

    @media screen {
      .document-wrapper {
        max-width: 820px;
        margin: 28px auto 80px auto;
        background: #ffffff;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
        border-radius: 8px;
        overflow: hidden;
      }
      .page-sheet {
        padding: 40px 44px;
        background: #ffffff;
        min-height: 1040px;
        position: relative;
      }
      .page-sheet + .page-sheet {
        border-top: 1px dashed #e2e8f0;
      }
    }

    @media print {
      html, body {
        background: #ffffff;
        color: #0f172a;
      }
      .document-wrapper {
        max-width: 100% !important;
        margin: 0 !important;
        box-shadow: none !important;
        border-radius: 0 !important;
      }
      .page-sheet {
        padding: 0 !important;
        min-height: auto !important;
      }
      .no-print {
        display: none !important;
      }
      .page-break {
        page-break-after: always !important;
        break-after: page !important;
      }
      .avoid-break {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .table-header {
        display: table-header-group !important;
      }
      tr {
        page-break-inside: avoid !important;
      }
    }

    /* Screen Action Bar */
    .screen-toolbar {
      position: sticky;
      top: 0;
      z-index: 9999;
      background: #ffffff;
      color: #0f172a;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }
    .toolbar-title {
      font-weight: 700;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn {
      background: #4f46e5;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      padding: 7px 14px;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-outline {
      background: #ffffff;
      color: #334155;
      border: 1px solid #cbd5e1;
    }
    .btn-outline:hover {
      background: #f8fafc;
    }

    /* Running Header & Footer */
    .running-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 8px;
      margin-bottom: 24px;
      font-size: 9px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .running-footer {
      border-top: 1px solid #f1f5f9;
      padding-top: 12px;
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9px;
      color: #94a3b8;
    }

    /* Page Heading */
    .page-title {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.3px;
      margin-bottom: 4px;
    }
    .page-subtitle {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 24px;
    }

    /* KPI Cards Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }
    .kpi-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 16px;
    }
    .kpi-label {
      font-size: 10px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .kpi-value {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 4px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .kpi-sub {
      font-size: 9.5px;
      color: #64748b;
      margin-top: 2px;
    }

    /* Tables */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
      margin-top: 8px;
    }
    table.data-table th {
      background: #f8fafc;
      color: #475569;
      font-weight: 700;
      text-align: left;
      padding: 9px 12px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    table.data-table td {
      padding: 9px 12px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    table.data-table tr:hover td {
      background: #fafafa;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .val-positive { color: #10b981; }
    .val-negative { color: #e11d48; }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 8.5px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-settled { background: #dcfce7; color: #15803d; }
    .badge-pending { background: #fef3c7; color: #b45309; }

    /* Chart Containers */
    .chart-container {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 18px;
    }
    .chart-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .chart-heading {
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    /* Empty Card */
    .empty-card {
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      padding: 32px;
      text-align: center;
      color: #94a3b8;
      font-size: 11px;
    }
  </style>
</head>
<body>

  <!-- Screen Toolbar (Only visible on web screen, hidden when printing or exporting to PDF) -->
  <div class="screen-toolbar no-print">
    <div class="toolbar-title">
      <div style="background: #4f46e5; color: #fff; width: 22px; height: 22px; border-radius: 5px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px;">S</div>
      <span>SplitLedger AI • Financial Summary Report</span>
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
      <button class="btn btn-outline" onclick="exportDataBlob('excel')">📥 Excel</button>
      <button class="btn btn-outline" onclick="exportDataBlob('csv')">📥 CSV</button>
      <button class="btn btn-outline" onclick="window.close()">✕ Close</button>
    </div>
  </div>

  <div class="document-wrapper">

    <!-- =======================================================================
         PAGE 1: PROFESSIONAL COVER
         ======================================================================= -->
    <div class="page-sheet avoid-break">
      <div style="display: flex; flex-direction: column; justify-content: space-between; min-height: 960px; padding: 48px 32px;">
        
        <!-- Header Brand -->
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 42px; height: 42px; background: #4f46e5; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 900; font-size: 20px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);">
            S
          </div>
          <div>
            <div style="font-size: 20px; font-weight: 900; letter-spacing: -0.5px; color: #0f172a;">SplitLedger AI</div>
            <div style="font-size: 10.5px; color: #64748b; font-weight: 500;">Shared Expense Management & Smart Settlements</div>
          </div>
        </div>

        <!-- Center Title & Modern Cover Accent -->
        <div style="margin: 60px 0;">
          <div style="font-size: 12px; font-weight: 700; color: #4f46e5; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
            Personal & Shared Finance
          </div>
          <h1 style="font-size: 34px; font-weight: 900; line-height: 1.15; color: #0f172a; letter-spacing: -0.8px;">
            Financial Summary Report
          </h1>
          <div style="font-size: 14px; color: #475569; margin-top: 8px;">
            ${escapeXML(data.reportTitle)}
          </div>

          <!-- Minimal Decorative Vector Accent -->
          <div style="margin-top: 36px; padding: 20px 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase;">Reporting Window</div>
              <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px;">${escapeXML(periodLabel)}</div>
            </div>
            <div>
              <div style="font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase;">Total Transactions</div>
              <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px;">${transactionCount} entries</div>
            </div>
            <div>
              <div style="font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase;">Functional Currency</div>
              <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px;">INR (₹)</div>
            </div>
          </div>
        </div>

        <!-- Metadata Grid -->
        <div style="border-top: 1px solid #e2e8f0; padding-top: 28px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
          <div>
            <div style="font-size: 9.5px; font-weight: 600; color: #64748b; text-transform: uppercase;">Prepared For</div>
            <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px;">${escapeXML(userName)}</div>
            <div style="font-size: 10.5px; color: #64748b;">${escapeXML(userEmail)}</div>
          </div>
          <div>
            <div style="font-size: 9.5px; font-weight: 600; color: #64748b; text-transform: uppercase;">Generated On</div>
            <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px;">${reportDate}</div>
            <div style="font-size: 10.5px; color: #64748b;">SplitLedger AI Core Engine</div>
          </div>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8;">
          <div>SplitLedger AI • Financial Summary Report</div>
          <div>Page 1 of 8</div>
        </div>

      </div>
    </div>

    <div class="page-break"></div>

    <!-- =======================================================================
         PAGE 2: EXECUTIVE SUMMARY (12 KPI CARDS)
         ======================================================================= -->
    <div class="page-sheet avoid-break">
      <div class="running-header">
        <span>SplitLedger AI • Financial Summary Report</span>
        <span>Executive Summary</span>
      </div>

      <h2 class="page-title">Executive Summary</h2>
      <p class="page-subtitle">Key performance indicators and overall balance across all your activities</p>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Total Expenses</div>
          <div class="kpi-value val-negative">${formatINR(totalExpense)}</div>
          <div class="kpi-sub">Total money spent</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Income</div>
          <div class="kpi-value val-positive">${formatINR(totalIncome)}</div>
          <div class="kpi-sub">Total incoming receipts</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Net Balance</div>
          <div class="kpi-value ${netBalance >= 0 ? "val-positive" : "val-negative"}">
            ${netBalance >= 0 ? "+" : ""}${formatINR(netBalance)}
          </div>
          <div class="kpi-sub">Net surplus / deficit</div>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-card-label" style="font-size: 10px; font-weight: 600; color: #b45309; text-transform: uppercase;">Money Owed</div>
          <div class="kpi-value" style="color: #b45309;">${formatINR(totalPayable)}</div>
          <div class="kpi-sub">Your share to pay back</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card-label" style="font-size: 10px; font-weight: 600; color: #2563eb; text-transform: uppercase;">Money Receivable</div>
          <div class="kpi-value" style="color: #2563eb;">${formatINR(totalReceivable)}</div>
          <div class="kpi-sub">Others owe you</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Transactions</div>
          <div class="kpi-value">${transactionCount}</div>
          <div class="kpi-sub">Total logged entries</div>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Groups</div>
          <div class="kpi-value">${groupsCount}</div>
          <div class="kpi-sub">Active expense groups</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Members</div>
          <div class="kpi-value">${membersCount}</div>
          <div class="kpi-sub">Collaborative friends</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Top Category</div>
          <div class="kpi-value" style="font-size: 15px;">${escapeXML(topCategory)}</div>
          <div class="kpi-sub">Highest spending category</div>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Largest Expense</div>
          <div class="kpi-value" style="font-size: 15px;">${largestExpenseItem.amount > 0 ? formatINR(largestExpenseItem.amount) : "₹0.00"}</div>
          <div class="kpi-sub">${escapeXML(largestExpenseItem.title.slice(0, 22))}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Pending Settlements</div>
          <div class="kpi-value" style="color: #b45309;">${formatINR(pendingSettlementAmount)}</div>
          <div class="kpi-sub">${pendingSettlementCount} settlements pending</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Completed Settlements</div>
          <div class="kpi-value val-positive">${formatINR(completedSettlementAmount)}</div>
          <div class="kpi-sub">${completedSettlementCount} settlements cleared</div>
        </div>
      </div>

      <div class="running-footer">
        <div>Generated by SplitLedger AI • Financial Summary Report</div>
        <div>Page 2 of 8</div>
      </div>
    </div>

    <div class="page-break"></div>

    <!-- =======================================================================
         PAGE 3: EXPENSE ANALYTICS
         ======================================================================= -->
    <div class="page-sheet avoid-break">
      <div class="running-header">
        <span>SplitLedger AI • Financial Summary Report</span>
        <span>Expense Analytics</span>
      </div>

      <h2 class="page-title">Expense Analytics</h2>
      <p class="page-subtitle">Monthly trajectory, category breakdown, and cumulative net cash flow</p>

      <!-- Monthly Income vs Expense Chart -->
      <div class="chart-container">
        <div class="chart-header-row">
          <div class="chart-heading">Income vs Expense (Monthly)</div>
        </div>
        ${monthlySVG}
      </div>

      <!-- Category Donut & Top Categories Table -->
      <div style="display: grid; grid-template-columns: 46% 54%; gap: 14px; margin-bottom: 18px;">
        <div class="chart-container" style="margin-bottom: 0;">
          <div class="chart-header-row">
            <div class="chart-heading">Category Breakdown</div>
          </div>
          ${donutSVG}
        </div>
        <div class="chart-container" style="margin-bottom: 0;">
          <div class="chart-header-row">
            <div class="chart-heading">Top Categories</div>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th class="text-right">Amount (₹)</th>
                <th class="text-right">Share %</th>
              </tr>
            </thead>
            <tbody>
              ${(data.categoryBreakdown || []).slice(0, 5).map((c) => `
                <tr>
                  <td><strong>${escapeXML(c.name)}</strong></td>
                  <td class="text-right font-mono font-bold">${formatINR(c.amount)}</td>
                  <td class="text-right font-mono">${c.percentage}%</td>
                </tr>
              `).join("")}
              ${(!data.categoryBreakdown || data.categoryBreakdown.length === 0) ? `
                <tr><td colspan="3" class="text-center text-muted" style="padding: 18px;">No category data available</td></tr>
              ` : ""}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Running Balance Line Chart -->
      <div class="chart-container">
        <div class="chart-header-row">
          <div class="chart-heading">Running Balance Over Time</div>
        </div>
        ${runningBalanceSVG}
      </div>

      <div class="running-footer">
        <div>Generated by SplitLedger AI • Financial Summary Report</div>
        <div>Page 3 of 8</div>
      </div>
    </div>

    <div class="page-break"></div>

    <!-- =======================================================================
         PAGE 4: GROUP ANALYTICS
         ======================================================================= -->
    <div class="page-sheet avoid-break">
      <div class="running-header">
        <span>SplitLedger AI • Financial Summary Report</span>
        <span>Group Analytics</span>
      </div>

      <h2 class="page-title">Group Analytics</h2>
      <p class="page-subtitle">Expenses and settlement status across all your shared groups</p>

      ${(data.groups && data.groups.length > 0) ? `
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 28%;">Group Name</th>
              <th style="width: 14%;">Type</th>
              <th style="width: 12%;" class="text-center">Members</th>
              <th style="width: 16%;" class="text-right">Total Expense</th>
              <th style="width: 15%;" class="text-right">Pending</th>
              <th style="width: 15%;" class="text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.groups.map((g) => {
              const pending = g.outstandingBalance || 0;
              return `
                <tr>
                  <td><strong>${escapeXML(g.name)}</strong></td>
                  <td style="text-transform: capitalize; color: #64748b;">${escapeXML(g.type || "General")}</td>
                  <td class="text-center font-mono">${g.memberCount || 1}</td>
                  <td class="text-right font-mono font-bold">${formatINR(g.totalSpent / 100)}</td>
                  <td class="text-right font-mono" style="color: ${pending > 0 ? '#b45309' : '#64748b'};">${formatINR(pending)}</td>
                  <td class="text-center">
                    <span class="badge ${pending > 0 ? 'badge-pending' : 'badge-settled'}">
                      ${pending > 0 ? 'Pending' : 'All Settled'}
                    </span>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      ` : `
        <div class="empty-card">
          <div style="font-size: 13px; font-weight: 700; color: #475569;">No Groups Found</div>
          <div style="margin-top: 4px;">You have not created or joined any shared expense groups yet.</div>
        </div>
      `}

      <div class="running-footer">
        <div>Generated by SplitLedger AI • Financial Summary Report</div>
        <div>Page 4 of 8</div>
      </div>
    </div>

    <div class="page-break"></div>

    <!-- =======================================================================
         PAGE 5: MEMBER SUMMARY
         ======================================================================= -->
    <div class="page-sheet avoid-break">
      <div class="running-header">
        <span>SplitLedger AI • Financial Summary Report</span>
        <span>Member Summary</span>
      </div>

      <h2 class="page-title">Member Summary</h2>
      <p class="page-subtitle">Individual balances, amounts paid, and net positions across all members</p>

      ${(data.members && data.members.length > 0) ? `
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 25%;">Member</th>
              <th style="width: 15%;" class="text-right">Paid</th>
              <th style="width: 15%;" class="text-right">Owes</th>
              <th style="width: 15%;" class="text-right">Gets Back</th>
              <th style="width: 15%;" class="text-right">Net Position</th>
              <th style="width: 15%;" class="text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.members.map((m) => {
              const net = m.netPosition ?? ((m.paid || 0) - (m.owes || 0));
              const isPositive = net >= 0;
              return `
                <tr>
                  <td><strong>${escapeXML(m.name)}</strong></td>
                  <td class="text-right font-mono">${formatINR(m.paid || 0)}</td>
                  <td class="text-right font-mono">${formatINR(m.owes || 0)}</td>
                  <td class="text-right font-mono val-positive">${formatINR(m.receivable || (isPositive ? net : 0))}</td>
                  <td class="text-right font-mono font-bold ${isPositive ? 'val-positive' : 'val-negative'}">
                    ${isPositive ? '+' : ''}${formatINR(net)}
                  </td>
                  <td class="text-center">
                    <span class="badge ${isPositive ? 'badge-settled' : 'badge-pending'}">
                      ${isPositive ? 'Gets Back' : 'Owes'}
                    </span>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      ` : `
        <div class="empty-card">
          <div style="font-size: 13px; font-weight: 700; color: #475569;">No Member Splits Recorded</div>
          <div style="margin-top: 4px;">Individual member balances will appear once you share expenses with friends.</div>
        </div>
      `}

      <div class="running-footer">
        <div>Generated by SplitLedger AI • Financial Summary Report</div>
        <div>Page 5 of 8</div>
      </div>
    </div>

    <div class="page-break"></div>

    <!-- =======================================================================
         PAGE 6: SETTLEMENT ANALYSIS
         ======================================================================= -->
    <div class="page-sheet avoid-break">
      <div class="running-header">
        <span>SplitLedger AI • Financial Summary Report</span>
        <span>Settlement Analysis</span>
      </div>

      <h2 class="page-title">Settlement Analysis</h2>
      <p class="page-subtitle">Debt optimization savings, clearance rates, and payment methods</p>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Pending Settlements</div>
          <div class="kpi-value" style="color: #b45309;">${formatINR(pendingSettlementAmount)}</div>
          <div class="kpi-sub">${pendingSettlementCount} transfers waiting</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Completed Settlements</div>
          <div class="kpi-value val-positive">${formatINR(completedSettlementAmount)}</div>
          <div class="kpi-sub">${completedSettlementCount} transfers cleared</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Debt Netting Savings</div>
          <div class="kpi-value val-positive">
            ${data.settlementAnalytics?.debtOptimizationSavings?.transfersSaved || 0} Saved
          </div>
          <div class="kpi-sub">Redundant transfers eliminated</div>
        </div>
      </div>

      <!-- Payment Methods -->
      <div class="chart-container" style="margin-top: 24px;">
        <div class="chart-header-row">
          <div class="chart-heading">Payment Methods Used</div>
        </div>
        ${paymentRailsSVG}
      </div>

      <table class="data-table" style="margin-top: 14px;">
        <thead>
          <tr>
            <th>Payment Method</th>
            <th class="text-center">Count</th>
            <th class="text-right">Total Amount (₹)</th>
            <th class="text-right">Usage Share %</th>
          </tr>
        </thead>
        <tbody>
          ${(data.paymentMethods || []).map((p) => `
            <tr>
              <td><strong>${escapeXML(p.name)}</strong></td>
              <td class="text-center font-mono">${p.count}</td>
              <td class="text-right font-mono font-bold">${formatINR(p.amount)}</td>
              <td class="text-right font-mono">${p.percentage}%</td>
            </tr>
          `).join("")}
          ${(!data.paymentMethods || data.paymentMethods.length === 0) ? `
            <tr>
              <td><strong>UPI</strong></td>
              <td class="text-center font-mono">${transactionCount}</td>
              <td class="text-right font-mono font-bold">${formatINR(totalExpense)}</td>
              <td class="text-right font-mono">100.0%</td>
            </tr>
          ` : ""}
        </tbody>
      </table>

      <div class="running-footer">
        <div>Generated by SplitLedger AI • Financial Summary Report</div>
        <div>Page 6 of 8</div>
      </div>
    </div>

    <div class="page-break"></div>

    <!-- =======================================================================
         PAGE 7: TOP TRANSACTIONS
         ======================================================================= -->
    <div class="page-sheet avoid-break">
      <div class="running-header">
        <span>SplitLedger AI • Financial Summary Report</span>
        <span>Top Transactions</span>
      </div>

      <h2 class="page-title">Top Transactions</h2>
      <p class="page-subtitle">Your 10 largest expenses recorded during this period</p>

      ${(top10.length > 0) ? `
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 8%;">#</th>
              <th style="width: 18%;">Date</th>
              <th style="width: 32%;">Title</th>
              <th style="width: 16%;">Category</th>
              <th style="width: 14%;">Group</th>
              <th style="width: 12%;" class="text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${top10.map((tx) => `
              <tr>
                <td class="font-mono text-muted">${tx.rank}</td>
                <td style="color: #64748b;">${escapeXML(tx.date)}</td>
                <td>
                  <div style="font-weight: 700; color: #0f172a;">${escapeXML(tx.title)}</div>
                  <div class="font-mono" style="font-size: 8.5px; color: #94a3b8;">${escapeXML(tx.publicId)}</div>
                </td>
                <td>${escapeXML(tx.category)}</td>
                <td style="color: #64748b;">${escapeXML(tx.group)}</td>
                <td class="text-right font-mono font-bold val-negative">${formatINR(tx.amount)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      ` : `
        <div class="empty-card">
          <div style="font-size: 13px; font-weight: 700; color: #475569;">No Transactions Found</div>
          <div style="margin-top: 4px;">Transactions will appear here once logged into the ledger.</div>
        </div>
      `}

      <div class="running-footer">
        <div>Generated by SplitLedger AI • Financial Summary Report</div>
        <div>Page 7 of 8</div>
      </div>
    </div>

    <div class="page-break"></div>

    <!-- =======================================================================
         PAGE 8: AI INSIGHTS (FINAL PAGE)
         ======================================================================= -->
    <div class="page-sheet avoid-break">
      <div class="running-header">
        <span>SplitLedger AI • Financial Summary Report</span>
        <span>AI Insights</span>
      </div>

      <h2 class="page-title">AI Insights</h2>
      <p class="page-subtitle">Smart spending patterns and observations calculated directly from your transaction history</p>

      ${cleanInsights.length > 0 ? `
        <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 16px;">
          ${cleanInsights.map((insight, idx) => `
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; display: flex; align-items: flex-start; gap: 12px;">
              <div style="background: #eef2ff; color: #4f46e5; width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 11px; flex-shrink: 0;">
                ${idx + 1}
              </div>
              <div style="font-size: 12px; font-weight: 500; color: #1e293b; line-height: 1.5;">
                ${escapeXML(insight)}
              </div>
            </div>
          `).join("")}
        </div>
      ` : `
        <div class="empty-card" style="margin-top: 24px; padding: 48px 32px;">
          <div style="width: 44px; height: 44px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto; font-size: 20px;">
            💡
          </div>
          <div style="font-size: 14px; font-weight: 700; color: #1e293b;">
            Not enough transaction history to generate AI insights
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 6px; max-width: 420px; margin-left: auto; margin-right: auto;">
            Add at least 3 transactions to see personalized spending patterns, category trends, and smart debt minimization observations.
          </div>
        </div>
      `}

      <div class="running-footer">
        <div>Generated by SplitLedger AI • Financial Summary Report</div>
        <div>Page 8 of 8</div>
      </div>
    </div>

  </div>

  <script>
    function exportDataBlob(format) {
      if (format === 'csv') {
        const a = document.createElement('a');
        a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(${JSON.stringify(generateCSVExport(data))});
        a.download = '${escapeXML(data.reportTitle.toLowerCase().replace(/\\s+/g, "-"))}.csv';
        a.click();
      } else if (format === 'excel') {
        const a = document.createElement('a');
        a.href = 'data:application/vnd.ms-excel;charset=utf-8,' + encodeURIComponent(${JSON.stringify(generateExcelWorkbook(data))});
        a.download = '${escapeXML(data.reportTitle.toLowerCase().replace(/\\s+/g, "-"))}.xls';
        a.click();
      }
    }
  </script>
</body>
</html>`;
}

// ============================================================================
// CLEAN MULTI-SHEET EXCEL WORKBOOK (.XLS)
// ============================================================================

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
    <Cell><Data ss:Type="String">${sanitize(formatDate(data.generatedAt))}</Data></Cell>
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
