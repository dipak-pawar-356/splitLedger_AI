// ==========================================
// TYPE DEFINITIONS ACROSS ALL 14 DOMAINS
// ==========================================

export interface GeneralPreferences {
  appName: string;
  displayName: string;
  defaultLandingPage: string;
  autoRefreshInterval: number; // 0 (off), 15, 30, 60 seconds
  compactSidebar: boolean;
  enableAnimations: boolean;
  autoSaveDrafts: boolean;
  sessionTimeoutMinutes: number;
}

export interface AppearancePreferences {
  theme: "light" | "dark" | "system";
  accentColor: "indigo" | "emerald" | "violet" | "rose" | "amber" | "cyan";
  borderRadius: "sharp" | "rounded" | "pill";
  tableDensity: "compact" | "comfortable" | "relaxed";
  fontScale: "small" | "normal" | "large";
}

export interface RegionalPreferences {
  currency: string; // Default: INR
  useIndianNumberSystem: boolean; // true: 1,00,000 | false: 100,000
  language: string;
  country: string;
  state: string;
  city: string;
  timezone: string;
  dateFormat: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
  timeFormat: "12h" | "24h";
  decimalPrecision: number;
  firstDayOfWeek: "sunday" | "monday";
}

export interface DashboardPreferences {
  visibleCards: {
    quickActions: boolean;
    recentActivity: boolean;
    financialSummary: boolean;
    budgetWidget: boolean;
    settlementWidget: boolean;
    analyticsWidget: boolean;
    notificationsWidget: boolean;
  };
  cardOrder: string[];
}

export interface GroupPreferences {
  defaultCurrency: string; // Default: INR
  defaultSplitType: "equal" | "percentage" | "exact" | "shares";
  defaultReminderDays: number;
  defaultCategory: string;
  autoInvite: boolean;
  guestMemberPolicy: "allow" | "require_approval" | "disallow";
  defaultSettlementMethod: "upi" | "bank_transfer" | "cash";
}

export interface TransactionPreferences {
  defaultType: "personal" | "group";
  defaultPaymentMethod: "upi" | "card" | "netbanking" | "cash";
  autoDetectCategory: boolean;
  autoSaveDrafts: boolean;
  autoReceiptCompression: boolean;
  ocrAutoScan: boolean;
}

export interface ReportPreferences {
  defaultFormat: "pdf" | "csv" | "json";
  defaultPeriod: "monthly" | "quarterly" | "yearly";
  includeCharts: boolean;
  includeAnalytics: boolean;
  includeSettlements: boolean;
  includeTimeline: boolean;
  defaultPaperSize: "A4" | "Letter";
  showBrandingWatermark: boolean;
}

export interface ExpenseNotificationTriggers {
  created: boolean;
  updated: boolean;
  deleted: boolean;
  approved: boolean;
  rejected: boolean;
  receiptUploaded: boolean;
  receiptRemoved: boolean;
  commentAdded: boolean;
  mentioned: boolean;
  reminders: boolean;
  recurring: boolean;
  adminEdited: boolean;
}

export interface GroupNotificationTriggers {
  created: boolean;
  added: boolean;
  removed: boolean;
  roleChanged: boolean;
  renamed: boolean;
  memberJoined: boolean;
  guestConverted: boolean;
  settingsUpdated: boolean;
  inviteAccepted: boolean;
  inviteRejected: boolean;
  inviteExpired: boolean;
  memberLeft: boolean;
}

export interface SettlementNotificationTriggers {
  suggested: boolean;
  updated: boolean;
  paid: boolean;
  received: boolean;
  cancelled: boolean;
  reminders: boolean;
  partialSettlement: boolean;
  fullSettlement: boolean;
  approved: boolean;
  rejected: boolean;
}

export interface ReminderNotificationTriggers {
  pendingPayment: boolean;
  pendingReceipt: boolean;
  upcomingSettlement: boolean;
  monthlyBudget: boolean;
  weeklySpending: boolean;
  inactiveGroups: boolean;
  inactiveMembers: boolean;
  outstandingBalance: boolean;
  recurringExpense: boolean;
  frequency: "daily" | "weekly" | "monthly" | "custom";
  customTime: string;
  customDays: string[];
}

export interface InvitationNotificationTriggers {
  received: boolean;
  accepted: boolean;
  rejected: boolean;
  cancelled: boolean;
  expired: boolean;
  reminders: boolean;
  guestRegistration: boolean;
  groupJoined: boolean;
}

export interface ReportNotificationTriggers {
  pdfReady: boolean;
  csvReady: boolean;
  jsonReady: boolean;
  analyticsReady: boolean;
  exportFailed: boolean;
  exportCompleted: boolean;
  scheduledReport: boolean;
  monthlyReport: boolean;
  annualReport: boolean;
  budgetReport: boolean;
  settlementReport: boolean;
}

export interface SecurityNotificationTriggers {
  passwordChanged: boolean;
  emailChanged: boolean;
  phoneChanged: boolean;
  profileUpdated: boolean;
  newDeviceLogin: boolean;
  unknownDeviceLogin: boolean;
  suspiciousActivity: boolean;
  sessionExpired: boolean;
  twoFactorChanged: boolean;
  accountRecovery: boolean;
}

export interface EmailNotificationSettings {
  enabled: boolean;
  verifiedEmailOnly: boolean;
  htmlEmails: boolean;
  receiveAttachments: boolean;
  weeklySummary: boolean;
  monthlySummary: boolean;
  securityAlerts: boolean;
  financialReports: boolean;
  frequency: "instant" | "daily" | "weekly";
}

export interface WhatsAppNotificationSettings {
  enabled: boolean;
  verifiedNumber: string;
  reminders: boolean;
  settlements: boolean;
  invitations: boolean;
  paymentConfirmation: boolean;
  expenseReminder: boolean;
  monthlySummary: boolean;
  budgetAlerts: boolean;
}

export interface BrowserNotificationSettings {
  enabled: boolean;
  sound: boolean;
  permissionStatus: "default" | "granted" | "denied";
}

export interface QuietHoursSettings {
  enabled: boolean;
  start: string;
  end: string;
  weekendOnly: boolean;
  weekdaysOnly: boolean;
  emergencyOnly: boolean;
  suppressLowPriority: boolean;
}

export interface NotificationScheduleSettings {
  morningSummary: { enabled: boolean; time: string };
  eveningSummary: { enabled: boolean; time: string };
  weeklyReport: { enabled: boolean; day: string };
  monthlyReport: { enabled: boolean; dayOfMonth: number };
  budgetReminder: { enabled: boolean; dayOfMonth: number };
  settlementReminder: { enabled: boolean; dayOfWeek: string };
}

export interface ChannelRoutingRule {
  primary: "inApp" | "email" | "whatsapp" | "browser" | "desktopPush";
  secondary: "inApp" | "email" | "whatsapp" | "browser" | "desktopPush";
  fallback: "inApp" | "email" | "whatsapp" | "browser" | "desktopPush";
}

export interface NotificationPreferences {
  // General switches
  masterEnabled: boolean;
  realTime: boolean;
  dailySummary: boolean;
  weeklySummary: boolean;
  monthlySummary: boolean;
  importantOnly: boolean;
  productUpdates: boolean;

  // Channels
  channels: {
    inApp: boolean;
    email: boolean;
    whatsapp: boolean;
    browser: boolean;
    desktopPush: boolean;
  };

  // High-level category flags (for quick toggling)
  categories: {
    expenses: boolean;
    settlements: boolean;
    invitations: boolean;
    reminders: boolean;
    budgets: boolean;
    security: boolean;
    system: boolean;
    reports: boolean;
  };

  // Detailed Triggers
  expensesTriggers: ExpenseNotificationTriggers;
  groupsTriggers: GroupNotificationTriggers;
  settlementsTriggers: SettlementNotificationTriggers;
  remindersTriggers: ReminderNotificationTriggers;
  invitationsTriggers: InvitationNotificationTriggers;
  reportsTriggers: ReportNotificationTriggers;
  securityTriggers: SecurityNotificationTriggers;

  // Channel Specific
  emailSettings: EmailNotificationSettings;
  whatsappSettings: WhatsAppNotificationSettings;
  browserSettings: BrowserNotificationSettings;
  channelRouting: Record<string, ChannelRoutingRule>;

  // Controls & Rules
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  quietHours: QuietHoursSettings;
  schedule: NotificationScheduleSettings;
}

export interface AccessibilityPreferences {
  highContrast: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  focusIndicators: boolean;
  screenReaderOptimized: boolean;
}

export interface PrivacyPreferences {
  profileVisibility: "public" | "group_only" | "private";
  showEmail: boolean;
  showPhone: boolean;
  showBio: boolean;
  showActivity: boolean;
  showGroups: boolean;
  showFinancials: boolean;
  allowSearchIndexing: boolean;
}

export interface DataBackupPreferences {
  autoBackupSchedule: "daily" | "weekly" | "monthly" | "off";
  retentionPeriodDays: number;
}

export interface ConnectedServicesStatus {
  clerkAuth: boolean;
  emailService: boolean;
  whatsappService: boolean;
  cloudStorage: boolean;
}

export interface AllSettingsState {
  general: GeneralPreferences;
  appearance: AppearancePreferences;
  regional: RegionalPreferences;
  dashboard: DashboardPreferences;
  groups: GroupPreferences;
  transactions: TransactionPreferences;
  reports: ReportPreferences;
  notifications: NotificationPreferences;
  accessibility: AccessibilityPreferences;
  privacy: PrivacyPreferences;
  dataBackup: DataBackupPreferences;
  connectedServices: ConnectedServicesStatus;
}

// Default factory settings
export const DEFAULT_SETTINGS: AllSettingsState = {
  general: {
    appName: "SplitLedger AI",
    displayName: "",
    defaultLandingPage: "/dashboard",
    autoRefreshInterval: 30,
    compactSidebar: false,
    enableAnimations: true,
    autoSaveDrafts: true,
    sessionTimeoutMinutes: 60,
  },
  appearance: {
    theme: "system",
    accentColor: "indigo",
    borderRadius: "rounded",
    tableDensity: "comfortable",
    fontScale: "normal",
  },
  regional: {
    currency: "INR",
    useIndianNumberSystem: true,
    language: "en",
    country: "India",
    state: "Maharashtra",
    city: "Mumbai",
    timezone: "Asia/Kolkata",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "12h",
    decimalPrecision: 2,
    firstDayOfWeek: "monday",
  },
  dashboard: {
    visibleCards: {
      quickActions: true,
      recentActivity: true,
      financialSummary: true,
      budgetWidget: true,
      settlementWidget: true,
      analyticsWidget: true,
      notificationsWidget: true,
    },
    cardOrder: ["financialSummary", "quickActions", "analyticsWidget", "budgetWidget", "settlementWidget", "recentActivity"],
  },
  groups: {
    defaultCurrency: "INR",
    defaultSplitType: "equal",
    defaultReminderDays: 7,
    defaultCategory: "General",
    autoInvite: true,
    guestMemberPolicy: "allow",
    defaultSettlementMethod: "upi",
  },
  transactions: {
    defaultType: "personal",
    defaultPaymentMethod: "upi",
    autoDetectCategory: true,
    autoSaveDrafts: true,
    autoReceiptCompression: true,
    ocrAutoScan: true,
  },
  reports: {
    defaultFormat: "pdf",
    defaultPeriod: "monthly",
    includeCharts: true,
    includeAnalytics: true,
    includeSettlements: true,
    includeTimeline: true,
    defaultPaperSize: "A4",
    showBrandingWatermark: true,
  },
  notifications: {
    masterEnabled: true,
    realTime: true,
    dailySummary: true,
    weeklySummary: true,
    monthlySummary: true,
    importantOnly: false,
    productUpdates: false,
    channels: {
      inApp: true,
      email: true,
      whatsapp: false,
      browser: false,
      desktopPush: false,
    },
    categories: {
      expenses: true,
      settlements: true,
      invitations: true,
      reminders: true,
      budgets: true,
      security: true,
      system: true,
      reports: true,
    },
    expensesTriggers: {
      created: true,
      updated: true,
      deleted: true,
      approved: true,
      rejected: true,
      receiptUploaded: true,
      receiptRemoved: true,
      commentAdded: true,
      mentioned: true,
      reminders: true,
      recurring: true,
      adminEdited: true,
    },
    groupsTriggers: {
      created: true,
      added: true,
      removed: true,
      roleChanged: true,
      renamed: true,
      memberJoined: true,
      guestConverted: true,
      settingsUpdated: true,
      inviteAccepted: true,
      inviteRejected: true,
      inviteExpired: true,
      memberLeft: true,
    },
    settlementsTriggers: {
      suggested: true,
      updated: true,
      paid: true,
      received: true,
      cancelled: true,
      reminders: true,
      partialSettlement: true,
      fullSettlement: true,
      approved: true,
      rejected: true,
    },
    remindersTriggers: {
      pendingPayment: true,
      pendingReceipt: true,
      upcomingSettlement: true,
      monthlyBudget: true,
      weeklySpending: true,
      inactiveGroups: true,
      inactiveMembers: false,
      outstandingBalance: true,
      recurringExpense: true,
      frequency: "weekly",
      customTime: "10:00",
      customDays: ["monday", "friday"],
    },
    invitationsTriggers: {
      received: true,
      accepted: true,
      rejected: true,
      cancelled: true,
      expired: true,
      reminders: true,
      guestRegistration: true,
      groupJoined: true,
    },
    reportsTriggers: {
      pdfReady: true,
      csvReady: true,
      jsonReady: true,
      analyticsReady: true,
      exportFailed: true,
      exportCompleted: true,
      scheduledReport: true,
      monthlyReport: true,
      annualReport: true,
      budgetReport: true,
      settlementReport: true,
    },
    securityTriggers: {
      passwordChanged: true,
      emailChanged: true,
      phoneChanged: true,
      profileUpdated: true,
      newDeviceLogin: true,
      unknownDeviceLogin: true,
      suspiciousActivity: true,
      sessionExpired: true,
      twoFactorChanged: true,
      accountRecovery: true,
    },
    emailSettings: {
      enabled: true,
      verifiedEmailOnly: true,
      htmlEmails: true,
      receiveAttachments: true,
      weeklySummary: true,
      monthlySummary: true,
      securityAlerts: true,
      financialReports: true,
      frequency: "instant",
    },
    whatsappSettings: {
      enabled: false,
      verifiedNumber: "",
      reminders: true,
      settlements: true,
      invitations: true,
      paymentConfirmation: true,
      expenseReminder: true,
      monthlySummary: false,
      budgetAlerts: true,
    },
    browserSettings: {
      enabled: false,
      sound: true,
      permissionStatus: "default",
    },
    channelRouting: {
      expenses: { primary: "inApp", secondary: "email", fallback: "whatsapp" },
      settlements: { primary: "inApp", secondary: "whatsapp", fallback: "email" },
      security: { primary: "email", secondary: "inApp", fallback: "whatsapp" },
      reminders: { primary: "inApp", secondary: "whatsapp", fallback: "email" },
    },
    soundEnabled: true,
    vibrationEnabled: true,
    quietHours: {
      enabled: false,
      start: "22:00",
      end: "07:00",
      weekendOnly: false,
      weekdaysOnly: false,
      emergencyOnly: true,
      suppressLowPriority: true,
    },
    schedule: {
      morningSummary: { enabled: true, time: "08:00" },
      eveningSummary: { enabled: true, time: "19:00" },
      weeklyReport: { enabled: true, day: "sunday" },
      monthlyReport: { enabled: true, dayOfMonth: 1 },
      budgetReminder: { enabled: true, dayOfMonth: 25 },
      settlementReminder: { enabled: true, dayOfWeek: "friday" },
    },
  },
  accessibility: {
    highContrast: false,
    reducedMotion: false,
    largeText: false,
    focusIndicators: true,
    screenReaderOptimized: false,
  },
  privacy: {
    profileVisibility: "group_only",
    showEmail: false,
    showPhone: false,
    showBio: true,
    showActivity: true,
    showGroups: true,
    showFinancials: false,
    allowSearchIndexing: false,
  },
  dataBackup: {
    autoBackupSchedule: "weekly",
    retentionPeriodDays: 365,
  },
  connectedServices: {
    clerkAuth: true,
    emailService: true,
    whatsappService: false,
    cloudStorage: true,
  },
};
