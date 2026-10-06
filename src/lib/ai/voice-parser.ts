/**
 * Multilingual Voice & Text Command NLP Parser
 * Interprets speech and text input across English, Hindi, Marathi, and Hinglish.
 * Calculates dynamic confidence metrics and performs strict missing-parameter validation.
 */

export interface CommandConfidenceBreakdown {
  intentConfidence: number; // 0.0 - 1.0
  entityConfidence: number; // 0.0 - 1.0
  speechConfidence: number; // 0.0 - 1.0
  extractionConfidence: number; // 0.0 - 1.0
  overallConfidence: number; // 0.0 - 1.0
}

export type CommandValidationStatus = "valid" | "missing_parameters" | "invalid";

export interface ParsedVoiceCommand {
  rawTranscript: string;
  action:
    | "add_expense"
    | "record_income"
    | "create_group"
    | "create_trip"
    | "set_budget"
    | "invite_member"
    | "show_balance"
    | "who_owes_me"
    | "generate_report"
    | "today_expenses"
    | "delete_last_expense"
    | "undo_previous"
    | "search_expenses"
    | "open_reports"
    | "show_budgets"
    | "open_notes"
    | "unknown";
  confidence: number;
  confidenceBreakdown: CommandConfidenceBreakdown;
  validationStatus: CommandValidationStatus;
  missingField?: "amount" | "category" | "groupName" | "tripName" | "budgetAmount" | "searchTerm";
  clarificationPrompt?: string;
  requiresConfirmation: boolean;
  parameters: {
    amount?: number;
    currency?: string;
    category?: string;
    title?: string;
    groupName?: string;
    tripName?: string;
    budgetAmount?: number;
    memberName?: string;
    reportFormat?: "pdf" | "csv" | "json";
    searchTerm?: string;
  };
  feedbackMessage: string;
  confirmationDetails?: {
    actionLabel: string;
    primaryDetail: string;
    secondaryDetail: string;
    badgeText: string;
  };
}

/**
 * Calculate dynamic confidence metrics based on transcript clarity, matched keywords, and extracted entities
 */
function calculateConfidenceBreakdown(
  rawTranscript: string,
  matchedIntentWeight: number,
  expectedEntitiesCount: number,
  extractedEntitiesCount: number,
  entityQualityScore: number
): CommandConfidenceBreakdown {
  const words = rawTranscript.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Speech confidence: evaluate token clarity and sentence structure
  let speechConfidence = 0.85;
  if (wordCount >= 2 && wordCount <= 12) {
    speechConfidence = Math.min(0.98, 0.88 + wordCount * 0.01);
  } else if (wordCount < 2) {
    speechConfidence = 0.65;
  } else {
    speechConfidence = 0.82;
  }

  // Intent confidence: scales with keyword match weight
  const intentConfidence = Math.min(0.99, Math.max(0.4, matchedIntentWeight));

  // Extraction confidence: ratio of expected required fields to extracted fields
  const extractionConfidence = expectedEntitiesCount > 0
    ? Math.min(1.0, extractedEntitiesCount / expectedEntitiesCount)
    : 1.0;

  // Entity confidence: quality of values (e.g. positive number, clean string)
  const entityConfidence = Math.min(0.98, Math.max(0.2, entityQualityScore));

  // Overall confidence: weighted combination
  const overallConfidence = Math.round(
    (intentConfidence * 0.35 +
      entityConfidence * 0.30 +
      extractionConfidence * 0.20 +
      speechConfidence * 0.15) *
      100
  ) / 100;

  return {
    intentConfidence: Math.round(intentConfidence * 100) / 100,
    entityConfidence: Math.round(entityConfidence * 100) / 100,
    speechConfidence: Math.round(speechConfidence * 100) / 100,
    extractionConfidence: Math.round(extractionConfidence * 100) / 100,
    overallConfidence,
  };
}

/**
 * Parse spoken transcript or typed text into structured, validated executable command
 */
export function parseVoiceCommand(transcript: string): ParsedVoiceCommand {
  const clean = transcript.trim();
  const lower = clean.toLowerCase();

  // Extract amount helper: supports "₹500", "500 rs", "500 rupees", "rs 500", "500.50"
  const amountMatch = lower.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:rupees|rupaye|rs)?/i);
  const extractedAmount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, "")) : undefined;

  // A. Delete Last Expense / Transaction
  if (
    (lower.includes("delete") || lower.includes("remove") || lower.includes("hatao") || lower.includes("kadha")) &&
    (lower.includes("last") || lower.includes("previous") || lower.includes("latest") || lower.includes("magcha") || lower.includes("shevat"))
  ) {
    const confidenceBreakdown = calculateConfidenceBreakdown(clean, 0.96, 0, 0, 0.95);
    return {
      rawTranscript: clean,
      action: "delete_last_expense",
      confidence: confidenceBreakdown.overallConfidence,
      confidenceBreakdown,
      validationStatus: "valid",
      requiresConfirmation: true,
      parameters: {},
      feedbackMessage: "Preparing to delete your latest recorded transaction from the ledger.",
      confirmationDetails: {
        actionLabel: "Delete Latest Transaction",
        primaryDetail: "Most Recent Expense",
        secondaryDetail: "Soft-delete from PostgreSQL",
        badgeText: "Delete",
      },
    };
  }

  // B. Undo Previous Action
  if (
    lower === "undo" ||
    lower.startsWith("undo ") ||
    lower.includes("undo previous") ||
    lower.includes("undo last") ||
    lower.includes("revert action")
  ) {
    const confidenceBreakdown = calculateConfidenceBreakdown(clean, 0.95, 0, 0, 0.95);
    return {
      rawTranscript: clean,
      action: "undo_previous",
      confidence: confidenceBreakdown.overallConfidence,
      confidenceBreakdown,
      validationStatus: "valid",
      requiresConfirmation: true,
      parameters: {},
      feedbackMessage: "Reverting your last financial action from audit history.",
      confirmationDetails: {
        actionLabel: "Undo Last Action",
        primaryDetail: "Revert Previous Operation",
        secondaryDetail: "Audit Log Rollback",
        badgeText: "Undo",
      },
    };
  }

  // C. Search Expenses / Transactions
  if (
    lower.startsWith("search") ||
    lower.includes("search for") ||
    lower.includes("shodha") ||
    lower.includes("dhoondo")
  ) {
    const searchTerm = clean
      .replace(/^(?:search(?:\s+for)?|shodha|dhoondo)\s+/i, "")
      .replace(/\s+expenses?$/i, "")
      .replace(/\s+transactions?$/i, "")
      .trim();
    const confidenceBreakdown = calculateConfidenceBreakdown(clean, 0.95, 1, searchTerm ? 1 : 0, 0.95);
    return {
      rawTranscript: clean,
      action: "search_expenses",
      confidence: confidenceBreakdown.overallConfidence,
      confidenceBreakdown,
      validationStatus: "valid",
      requiresConfirmation: false,
      parameters: { searchTerm: searchTerm || "All" },
      feedbackMessage: `Searching your ledger for "${searchTerm || "all"}" transactions.`,
      confirmationDetails: {
        actionLabel: "Search Transactions",
        primaryDetail: searchTerm || "Transactions",
        secondaryDetail: "Filter by Keyword",
        badgeText: "Search",
      },
    };
  }

  // D. Open Reports
  if (
    (lower.includes("open") || lower.includes("show") || lower.includes("view") || lower.includes("go to") || lower === "reports" || lower === "monthly report") &&
    lower.includes("report") &&
    !lower.includes("csv") &&
    !lower.includes("generate")
  ) {
    const confidenceBreakdown = calculateConfidenceBreakdown(clean, 0.96, 0, 0, 0.95);
    return {
      rawTranscript: clean,
      action: "open_reports",
      confidence: confidenceBreakdown.overallConfidence,
      confidenceBreakdown,
      validationStatus: "valid",
      requiresConfirmation: false,
      parameters: {},
      feedbackMessage: "Navigating to financial reports and export center.",
      confirmationDetails: {
        actionLabel: "Open Reports",
        primaryDetail: "Financial Analytics & Export",
        secondaryDetail: "/dashboard/reports",
        badgeText: "Navigation",
      },
    };
  }

  // E. Show Budgets
  if (
    (lower.includes("open") || lower.includes("show") || lower.includes("view") || lower.includes("go to")) &&
    lower.includes("budget") &&
    !lower.includes("set") &&
    !lower.includes("create")
  ) {
    const confidenceBreakdown = calculateConfidenceBreakdown(clean, 0.96, 0, 0, 0.95);
    return {
      rawTranscript: clean,
      action: "show_budgets",
      confidence: confidenceBreakdown.overallConfidence,
      confidenceBreakdown,
      validationStatus: "valid",
      requiresConfirmation: false,
      parameters: {},
      feedbackMessage: "Navigating to your spending budgets overview.",
      confirmationDetails: {
        actionLabel: "Show Budgets",
        primaryDetail: "Monthly Spending Limits",
        secondaryDetail: "/dashboard/budgets",
        badgeText: "Navigation",
      },
    };
  }

  // F. Open Notes
  if (
    (lower.includes("open") || lower.includes("show") || lower.includes("view") || lower.includes("go to")) &&
    (lower.includes("note") || lower.includes("journal"))
  ) {
    const confidenceBreakdown = calculateConfidenceBreakdown(clean, 0.96, 0, 0, 0.95);
    return {
      rawTranscript: clean,
      action: "open_notes",
      confidence: confidenceBreakdown.overallConfidence,
      confidenceBreakdown,
      validationStatus: "valid",
      requiresConfirmation: false,
      parameters: {},
      feedbackMessage: "Navigating to your personal notes & daily journal.",
      confirmationDetails: {
        actionLabel: "Open Notes",
        primaryDetail: "Notes & Daily Journal",
        secondaryDetail: "/dashboard/notes",
        badgeText: "Navigation",
      },
    };
  }

  // G. Today's Expenses Query
  if (
    lower.includes("today") &&
    (lower.includes("expense") || lower.includes("spending") || lower.includes("spent") || lower.includes("kharch"))
  ) {
    const confidenceBreakdown = calculateConfidenceBreakdown(clean, 0.95, 0, 0, 0.95);
    return {
      rawTranscript: clean,
      action: "today_expenses",
      confidence: confidenceBreakdown.overallConfidence,
      confidenceBreakdown,
      validationStatus: "valid",
      requiresConfirmation: false,
      parameters: {},
      feedbackMessage: "Calculating total expenses recorded today in INR (₹).",
      confirmationDetails: {
        actionLabel: "Today's Expenses",
        primaryDetail: "Daily Spending Audit",
        secondaryDetail: "Transactions for Today",
        badgeText: "Query",
      },
    };
  }

  // 1. Who Owes Me Query
  if (
    lower.includes("who owes me") ||
    lower.includes("unsettled") ||
    lower.includes("koni paise dyayche") ||
    lower.includes("kiske paas") ||
    lower.includes("paisa lena") ||
    lower.includes("dues") ||
    lower.includes("pending money")
  ) {
    const confidenceBreakdown = calculateConfidenceBreakdown(clean, 0.95, 0, 0, 0.95);
    return {
      rawTranscript: clean,
      action: "who_owes_me",
      confidence: confidenceBreakdown.overallConfidence,
      confidenceBreakdown,
      validationStatus: "valid",
      requiresConfirmation: false,
      parameters: {},
      feedbackMessage: "Auditing group settlements to check who owes you pending dues in INR (₹).",
      confirmationDetails: {
        actionLabel: "Audit Receivables",
        primaryDetail: "Pending Dues",
        secondaryDetail: "Group Member Balances",
        badgeText: "Query",
      },
    };
  }

  // 2. Show Balance Query
  if (
    lower.includes("show my balance") ||
    lower.includes("my balance") ||
    lower.includes("balance check") ||
    lower.includes("what is my balance") ||
    lower.includes("balance sanga") ||
    lower.includes("shillak kiti") ||
    lower.includes("balance batao") ||
    (lower.includes("balance") && (lower.includes("kiti") || lower.includes("sanga") || lower.includes("batao") || lower.includes("maza") || lower.includes("mera")))
  ) {
    const confidenceBreakdown = calculateConfidenceBreakdown(clean, 0.96, 0, 0, 0.95);
    return {
      rawTranscript: clean,
      action: "show_balance",
      confidence: confidenceBreakdown.overallConfidence,
      confidenceBreakdown,
      validationStatus: "valid",
      requiresConfirmation: false,
      parameters: {},
      feedbackMessage: "Checking your current ledger balance across personal accounts and split groups in INR (₹).",
      confirmationDetails: {
        actionLabel: "Ledger Balance Audit",
        primaryDetail: "View All Balances",
        secondaryDetail: "Personal & Split Accounts",
        badgeText: "Query",
      },
    };
  }

  // 3. Set Budget Command
  if (
    !lower.includes("trip") &&
    (lower.includes("budget") || lower.includes("limit")) &&
    (lower.includes("set") || lower.includes("create") || lower.includes("theva") || lower.includes("rakho") || lower.includes("banao"))
  ) {
    let category = "General Spending";
    if (lower.includes("food") || lower.includes("khana") || lower.includes("jevan")) category = "Food & Dining";
    else if (lower.includes("grocery") || lower.includes("kirana")) category = "Groceries";
    else if (lower.includes("petrol") || lower.includes("fuel")) category = "Petrol & Fuel";
    else if (lower.includes("shopping")) category = "Shopping";

    // Check if budget amount is missing
    if (!extractedAmount || extractedAmount <= 0) {
      const confidenceBreakdown = calculateConfidenceBreakdown(clean, 0.90, 1, 0, 0.50);
      return {
        rawTranscript: clean,
        action: "set_budget",
        confidence: confidenceBreakdown.overallConfidence,
        confidenceBreakdown,
        validationStatus: "missing_parameters",
        missingField: "budgetAmount",
        clarificationPrompt: `What budget limit would you like to set for ${category}?`,
        requiresConfirmation: true,
        parameters: { category },
        feedbackMessage: `Please specify the monthly spending limit for ${category}.`,
      };
    }

    const confidenceBreakdown = calculateConfidenceBreakdown(clean, 0.94, 1, 1, 0.95);
    return {
      rawTranscript: clean,
      action: "set_budget",
      confidence: confidenceBreakdown.overallConfidence,
      confidenceBreakdown,
      validationStatus: "valid",
      requiresConfirmation: true,
      parameters: {
        budgetAmount: extractedAmount,
        category,
        title: `${category} Budget`,
      },
      feedbackMessage: `Creating a monthly spending budget of ₹${extractedAmount} for ${category}.`,
      confirmationDetails: {
        actionLabel: "Create Monthly Budget",
        primaryDetail: `₹${extractedAmount} Limit`,
        secondaryDetail: category,
        badgeText: "Budget",
      },
    };
  }

  // 4. Create Group Command (Checked BEFORE Create Trip so "Goa Trip Group" matches group)
  if (
    (lower.includes("group") || lower.includes("dal") || lower.includes("gath")) &&
    (lower.includes("create") || lower.includes("make") || lower.includes("banao") || lower.includes("banva") || lower.includes("new"))
  ) {
    const rawName = clean
      .replace(/\b(?:create|make|banao|banva|new|a|the|group|trip)\b/gi, "")
      .trim();
    const groupName = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : "";

    if (!groupName) {
      const confidenceBreakdown = calculateConfidenceBreakdown(clean, 0.88, 1, 0, 0.40);
      return {
        rawTranscript: clean,
        action: "create_group",
        confidence: confidenceBreakdown.overallConfidence,
        confidenceBreakdown,
        validationStatus: "missing_parameters",
        missingField: "groupName",
        clarificationPrompt: "What would you like to name the group?",
        requiresConfirmation: true,
        parameters: {},
        feedbackMessage: "Please provide a name for the new split group.",
      };
    }

    const confidenceBreakdown = calculateConfidenceBreakdown(clean, 0.94, 1, 1, 0.95);
    return {
      rawTranscript: clean,
      action: "create_group",
      confidence: confidenceBreakdown.overallConfidence,
      confidenceBreakdown,
      validationStatus: "valid",
      requiresConfirmation: true,
      parameters: { groupName },
      feedbackMessage: `Creating a new split group named "${groupName}".`,
      confirmationDetails: {
        actionLabel: "Create Split Group",
        primaryDetail: groupName,
        secondaryDetail: "Group with Equal Split",
        badgeText: "Group",
      },
    };
  }

  // 5. Create Trip Command
  if (
    lower.includes("trip") &&
    (lower.includes("create") || lower.includes("make") || lower.includes("banao") || lower.includes("banva") || lower.includes("new"))
  ) {
    let rawTrip = clean
      .replace(/\b(?:create|make|banao|banva|new|a|the|trip|group)\b/gi, "")
      .trim();
    if (rawTrip.toLowerCase().includes("with")) {
      rawTrip = rawTrip.split(/\bwith\b/i)[0].trim();
    }
    if (rawTrip.toLowerCase().includes("budget")) {
      rawTrip = rawTrip.split(/\bbudget\b/i)[0].trim();
    }
    const tripName = rawTrip ? rawTrip.charAt(0).toUpperCase() + rawTrip.slice(1) : "";

    if (!tripName) {
      const confidenceBreakdown = calculateConfidenceBreakdown(clean, 0.90, 1, 0, 0.50);
      return {
        rawTranscript: clean,
        action: "create_trip",
        confidence: confidenceBreakdown.overallConfidence,
        confidenceBreakdown,
        validationStatus: "missing_parameters",
        missingField: "tripName",
        clarificationPrompt: "What is the destination or name of the trip?",
        requiresConfirmation: true,
        parameters: { budgetAmount: extractedAmount },
        feedbackMessage: "Please specify the destination or name of the trip.",
      };
    }

    const confidenceBreakdown = calculateConfidenceBreakdown(clean, 0.95, 1, 1, 0.95);
    return {
      rawTranscript: clean,
      action: "create_trip",
      confidence: confidenceBreakdown.overallConfidence,
      confidenceBreakdown,
      validationStatus: "valid",
      requiresConfirmation: true,
      parameters: {
        tripName,
        groupName: tripName,
        budgetAmount: extractedAmount,
      },
      feedbackMessage: `Creating a dedicated vacation trip group named "${tripName}"${extractedAmount ? ` with budget ₹${extractedAmount}` : ""}.`,
      confirmationDetails: {
        actionLabel: "Create Trip Group",
        primaryDetail: tripName,
        secondaryDetail: extractedAmount ? `Budget: ₹${extractedAmount}` : "Vacation Split Group",
        badgeText: "Trip",
      },
    };
  }

  // 6. Record Income
  if (
    lower.includes("income") ||
    lower.includes("salary") ||
    lower.includes("received") ||
    lower.includes("paisa aala") ||
    lower.includes("paisa aaya") ||
    lower.includes("credited")
  ) {
    if (!extractedAmount || extractedAmount <= 0) {
      const confidenceBreakdown = calculateConfidenceBreakdown(clean, 0.90, 1, 0, 0.40);
      return {
        rawTranscript: clean,
        action: "record_income",
        confidence: confidenceBreakdown.overallConfidence,
        confidenceBreakdown,
        validationStatus: "missing_parameters",
        missingField: "amount",
        clarificationPrompt: "What was the income or credit amount in rupees?",
        requiresConfirmation: true,
        parameters: {},
        feedbackMessage: "Please specify the income amount.",
      };
    }

    const confidenceBreakdown = calculateConfidenceBreakdown(clean, 0.95, 1, 1, 0.96);
    return {
      rawTranscript: clean,
      action: "record_income",
      confidence: confidenceBreakdown.overallConfidence,
      confidenceBreakdown,
      validationStatus: "valid",
      requiresConfirmation: true,
      parameters: {
        amount: extractedAmount,
        currency: "INR",
        title: lower.includes("salary") ? "Monthly Salary Credit" : "Income Credit",
        category: "Salary / Income",
      },
      feedbackMessage: `Recording ₹${extractedAmount} income inflow to your personal ledger.`,
      confirmationDetails: {
        actionLabel: "Record Income Inflow",
        primaryDetail: `₹${extractedAmount}`,
        secondaryDetail: lower.includes("salary") ? "Monthly Salary Credit" : "Income Credit",
        badgeText: "Income",
      },
    };
  }

  // 7. Generate Report
  if (lower.includes("report") || lower.includes("statement") || lower.includes("generate pdf")) {
    const format = lower.includes("csv") ? "csv" : lower.includes("json") ? "json" : "pdf";
    const confidenceBreakdown = calculateConfidenceBreakdown(clean, 0.95, 1, 1, 0.95);
    return {
      rawTranscript: clean,
      action: "generate_report",
      confidence: confidenceBreakdown.overallConfidence,
      confidenceBreakdown,
      validationStatus: "valid",
      requiresConfirmation: true,
      parameters: { reportFormat: format },
      feedbackMessage: `Generating your monthly financial report in ${format.toUpperCase()} format.`,
      confirmationDetails: {
        actionLabel: "Generate Financial Report",
        primaryDetail: `${format.toUpperCase()} Format`,
        secondaryDetail: "Monthly Ledger Summary",
        badgeText: "Report",
      },
    };
  }

  // 8. Add Expense Command (English, Hindi, Marathi, Hinglish)
  if (
    lower.includes("add") ||
    lower.includes("expense") ||
    lower.includes("spent") ||
    lower.includes("kharch") ||
    lower.includes("jhala") ||
    lower.includes("kela") ||
    lower.includes("karo") ||
    lower.includes("dila") ||
    lower.includes("paid") ||
    lower.includes("food") ||
    lower.includes("petrol") ||
    lower.includes("grocery") ||
    lower.includes("shopping")
  ) {
    let category = "Food & Dining";
    if (lower.includes("petrol") || lower.includes("fuel") || lower.includes("diesel")) {
      category = "Petrol & Fuel";
    } else if (lower.includes("travel") || lower.includes("flight") || lower.includes("hotel") || lower.includes("uber") || lower.includes("ola")) {
      category = "Travel & Trips";
    } else if (lower.includes("grocery") || lower.includes("groceries") || lower.includes("zepto") || lower.includes("blinkit") || lower.includes("kirana")) {
      category = "Groceries";
    } else if (lower.includes("shopping") || lower.includes("amazon") || lower.includes("myntra") || lower.includes("kapde")) {
      category = "Shopping";
    } else if (lower.includes("bill") || lower.includes("wifi") || lower.includes("electricity") || lower.includes("light bill")) {
      category = "Bills & Utilities";
    } else if (lower.includes("khana") || lower.includes("jevan") || lower.includes("lunch") || lower.includes("dinner") || lower.includes("coffee") || lower.includes("chai")) {
      category = "Food & Dining";
    }

    // MISSING PARAMETER CHECK: If amount is not extracted, prompt user!
    if (!extractedAmount || extractedAmount <= 0) {
      const confidenceBreakdown = calculateConfidenceBreakdown(clean, 0.88, 1, 0, 0.45);
      return {
        rawTranscript: clean,
        action: "add_expense",
        confidence: confidenceBreakdown.overallConfidence,
        confidenceBreakdown,
        validationStatus: "missing_parameters",
        missingField: "amount",
        clarificationPrompt: `What was the amount spent in rupees for ${category}?`,
        requiresConfirmation: true,
        parameters: { category },
        feedbackMessage: `I identified a ${category} expense, but need the amount to log it.`,
      };
    }

    const confidenceBreakdown = calculateConfidenceBreakdown(clean, 0.95, 1, 1, 0.95);
    return {
      rawTranscript: clean,
      action: "add_expense",
      confidence: confidenceBreakdown.overallConfidence,
      confidenceBreakdown,
      validationStatus: "valid",
      requiresConfirmation: true,
      parameters: {
        amount: extractedAmount,
        currency: "INR",
        category,
        title: `${category} Expense`,
      },
      feedbackMessage: `Recording ₹${extractedAmount} expense under ${category}.`,
      confirmationDetails: {
        actionLabel: "Log Expense to Ledger",
        primaryDetail: `₹${extractedAmount}`,
        secondaryDetail: category,
        badgeText: "Expense",
      },
    };
  }

  // Unknown fallback
  const confidenceBreakdown = calculateConfidenceBreakdown(clean, 0.30, 1, 0, 0.20);
  return {
    rawTranscript: clean,
    action: "unknown",
    confidence: confidenceBreakdown.overallConfidence,
    confidenceBreakdown,
    validationStatus: "invalid",
    requiresConfirmation: false,
    parameters: {},
    feedbackMessage: `I heard "${clean}", but couldn't identify a financial action. Try saying "Add ₹500 Food Expense", "Check my balance", or "Create Goa trip".`,
  };
}
