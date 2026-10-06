/**
 * Global Internationalization (i18n) & Localization (L10N) Engine
 */

export type SupportedLocale =
  | "en"
  | "hi"
  | "mr"
  | "gu"
  | "ta"
  | "te"
  | "bn"
  | "es"
  | "fr"
  | "de"
  | "ar"
  | "ja"
  | "zh";

export interface LocaleConfig {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  direction: "ltr" | "rtl";
  defaultCurrency: string;
  dateFormat: string;
}

export const SUPPORTED_LOCALES: Record<SupportedLocale, LocaleConfig> = {
  en: { code: "en", name: "English", nativeName: "English", direction: "ltr", defaultCurrency: "INR", dateFormat: "DD/MM/YYYY" },
  hi: { code: "hi", name: "Hindi", nativeName: "हिन्दी", direction: "ltr", defaultCurrency: "INR", dateFormat: "DD/MM/YYYY" },
  mr: { code: "mr", name: "Marathi", nativeName: "मराठी", direction: "ltr", defaultCurrency: "INR", dateFormat: "DD/MM/YYYY" },
  gu: { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી", direction: "ltr", defaultCurrency: "INR", dateFormat: "DD/MM/YYYY" },
  ta: { code: "ta", name: "Tamil", nativeName: "தமிழ்", direction: "ltr", defaultCurrency: "INR", dateFormat: "DD/MM/YYYY" },
  te: { code: "te", name: "Telugu", nativeName: "తెలుగు", direction: "ltr", defaultCurrency: "INR", dateFormat: "DD/MM/YYYY" },
  bn: { code: "bn", name: "Bengali", nativeName: "বাংলা", direction: "ltr", defaultCurrency: "INR", dateFormat: "DD/MM/YYYY" },
  es: { code: "es", name: "Spanish", nativeName: "Español", direction: "ltr", defaultCurrency: "EUR", dateFormat: "DD/MM/YYYY" },
  fr: { code: "fr", name: "French", nativeName: "Français", direction: "ltr", defaultCurrency: "EUR", dateFormat: "DD/MM/YYYY" },
  de: { code: "de", name: "German", nativeName: "Deutsch", direction: "ltr", defaultCurrency: "EUR", dateFormat: "DD.MM.YYYY" },
  ar: { code: "ar", name: "Arabic", nativeName: "العربية", direction: "rtl", defaultCurrency: "AED", dateFormat: "YYYY/MM/DD" },
  ja: { code: "ja", name: "Japanese", nativeName: "日本語", direction: "ltr", defaultCurrency: "JPY", dateFormat: "YYYY/MM/DD" },
  zh: { code: "zh", name: "Chinese", nativeName: "中文", direction: "ltr", defaultCurrency: "CNY", dateFormat: "YYYY-MM-DD" },
};

export const DEFAULT_LOCALE: SupportedLocale = "en";

export const TRANSLATIONS: Record<SupportedLocale, Record<string, string>> = {
  en: {
    dashboard: "Dashboard",
    groups: "Groups",
    transactions: "Transactions",
    reports: "Reports",
    analytics: "Analytics",
    ai_assistant: "AI Assistant",
    settings: "Settings",
    settlements: "Settlements",
    add_expense: "Add Expense",
    create_group: "Create Group",
    settle_up: "Settle Up",
    total_spent: "Total Spent",
    you_owe: "You Owe",
    you_are_owed: "You Are Owed",
  },
  hi: {
    dashboard: "डैशबोर्ड",
    groups: "समूह",
    transactions: "लेनदेन",
    reports: "रिपोर्ट",
    analytics: "एनालिटिक्स",
    ai_assistant: "एआई सहायक",
    settings: "सेटिंग्स",
    settlements: "निपटान",
    add_expense: "खर्च जोड़ें",
    create_group: "समूह बनाएं",
    settle_up: "हिसाब चुकता करें",
    total_spent: "कुल खर्च",
    you_owe: "आपकी देनदारी",
    you_are_owed: "आपको मिलने हैं",
  },
  mr: {
    dashboard: "डॅशबोर्ड",
    groups: "गट",
    transactions: "व्यवहार",
    reports: "अहवाल",
    analytics: "अॅनालिटिक्स",
    ai_assistant: "एआय सहाय्यक",
    settings: "सेटिंग्ज",
    settlements: "हिशोब चुकता",
    add_expense: "खर्च जोडा",
    create_group: "नवीन गट तयार करा",
    settle_up: "हिशोब पूर्ण करा",
    total_spent: "एकूण खर्च",
    you_owe: "तुम्हाला देणे आहे",
    you_are_owed: "तुम्हाला येणे आहे",
  },
  gu: {
    dashboard: "ડેશબોર્ડ",
    groups: "જૂથો",
    transactions: "વ્યવહારો",
    reports: "અહેવાલો",
    analytics: "વિશ્લેષણ",
    ai_assistant: "AI સહાયક",
    settings: "સેટિંગ્સ",
    settlements: "ચુકવણી",
    add_expense: "ખર્ચ ઉમેરો",
    create_group: "જૂથ બનાવો",
    settle_up: "હિસાબ પતાવો",
    total_spent: "કુલ ખર્ચ",
    you_owe: "તમારે આપવાના છે",
    you_are_owed: "તમારે લેવાના છે",
  },
  ta: {
    dashboard: "டாஷ்போர்டு",
    groups: "குழுக்கள்",
    transactions: "பரிவர்த்தனைகள்",
    reports: "அறிக்கைகள்",
    analytics: "பகுப்பாய்வு",
    ai_assistant: "AI உதவியாளர்",
    settings: "அமைப்புகள்",
    settlements: "தீர்வு",
    add_expense: "செலவைச் சேர்",
    create_group: "குழுவை உருவாக்கு",
    settle_up: "செட்டில் செய்",
    total_spent: "மொத்த செலவு",
    you_owe: "நீங்கள் தரவேண்டியது",
    you_are_owed: "உங்களுக்கு வரவேண்டியது",
  },
  te: {
    dashboard: "డ్యాష్‌బోర్డ్",
    groups: "సమూహాలు",
    transactions: "లావాదేవీలు",
    reports: "నివేదికలు",
    analytics: "విశ్లేషణ",
    ai_assistant: "AI సహాయకుడు",
    settings: "సెట్టింగ్‌లు",
    settlements: "పరిష్కారాలు",
    add_expense: "ఖర్చును జోడించండి",
    create_group: "సమూహాన్ని సృష్టించండి",
    settle_up: "సెటిల్ చేయండి",
    total_spent: "మొత్తం ఖర్చు",
    you_owe: "మీరు ఇవ్వాల్సినవి",
    you_are_owed: "మీకు రావలసినవి",
  },
  bn: {
    dashboard: "ড্যাশবোর্ড",
    groups: "গ্রুপ",
    transactions: "লেনদেন",
    reports: "প্রতিবেদন",
    analytics: "অ্যানালিটিক্স",
    ai_assistant: "এআই সহকারী",
    settings: "সেটিংস",
    settlements: "নিষ্পত্তি",
    add_expense: "খরচ যোগ করুন",
    create_group: "গ্রুপ তৈরি করুন",
    settle_up: "হিসাব মেটান",
    total_spent: "মোট খরচ",
    you_owe: "আপনার দেনা",
    you_are_owed: "আপনার পাওনা",
  },
  es: {
    dashboard: "Panel",
    groups: "Grupos",
    transactions: "Transacciones",
    reports: "Informes",
    analytics: "Analítica",
    ai_assistant: "Asistente IA",
    settings: "Ajustes",
    settlements: "Liquidaciones",
    add_expense: "Añadir Gasto",
    create_group: "Crear Grupo",
    settle_up: "Saldar Cuentas",
    total_spent: "Total Gastado",
    you_owe: "Debes",
    you_are_owed: "Te Deben",
  },
  fr: {
    dashboard: "Tableau de bord",
    groups: "Groupes",
    transactions: "Transactions",
    reports: "Rapports",
    analytics: "Analytique",
    ai_assistant: "Assistant IA",
    settings: "Paramètres",
    settlements: "Règlements",
    add_expense: "Ajouter une dépense",
    create_group: "Créer un groupe",
    settle_up: "Régler les comptes",
    total_spent: "Total dépensé",
    you_owe: "Vous devez",
    you_are_owed: "On vous doit",
  },
  de: {
    dashboard: "Dashboard",
    groups: "Gruppen",
    transactions: "Transaktionen",
    reports: "Berichte",
    analytics: "Analysen",
    ai_assistant: "KI-Assistent",
    settings: "Einstellungen",
    settlements: "Abrechnungen",
    add_expense: "Ausgabe hinzufügen",
    create_group: "Gruppe erstellen",
    settle_up: "Abrechnen",
    total_spent: "Gesamtausgaben",
    you_owe: "Du schuldest",
    you_are_owed: "Dir wird geschuldet",
  },
  ar: {
    dashboard: "لوحة التحكم",
    groups: "المجموعات",
    transactions: "المعاملات",
    reports: "التقارير",
    analytics: "التحليلات",
    ai_assistant: "مساعد الذكاء الاصطناعي",
    settings: "الإعدادات",
    settlements: "التسويات",
    add_expense: "إضافة مصروف",
    create_group: "إنشاء مجموعة",
    settle_up: "تسوية الحساب",
    total_spent: "إجمالي المصروفات",
    you_owe: "عليك",
    you_are_owed: "لك",
  },
  ja: {
    dashboard: "ダッシュボード",
    groups: "グループ",
    transactions: "取引履歴",
    reports: "レポート",
    analytics: "分析",
    ai_assistant: "AIアシスタント",
    settings: "設定",
    settlements: "精算",
    add_expense: "支出を追加",
    create_group: "グループ作成",
    settle_up: "精算する",
    total_spent: "総支出",
    you_owe: "支払い予定",
    you_are_owed: "受取予定",
  },
  zh: {
    dashboard: "仪表盘",
    groups: "群组",
    transactions: "交易记录",
    reports: "报告",
    analytics: "分析",
    ai_assistant: "AI助手",
    settings: "设置",
    settlements: "结算",
    add_expense: "添加支出",
    create_group: "创建群组",
    settle_up: "结清账目",
    total_spent: "总支出",
    you_owe: "你应付",
    you_are_owed: "应退你",
  },
};

/**
 * Translate key to target locale with English fallback
 */
export function t(key: string, locale: string = "en"): string {
  const normalizedLocale = (locale.slice(0, 2).toLowerCase() as SupportedLocale) || "en";
  const dict = TRANSLATIONS[normalizedLocale] || TRANSLATIONS.en;
  return dict[key] || TRANSLATIONS.en[key] || key;
}

/**
 * Check if a locale requires Right-to-Left (RTL) text layout
 */
export function isRTL(locale: string = "en"): boolean {
  const normalizedLocale = (locale.slice(0, 2).toLowerCase() as SupportedLocale) || "en";
  return SUPPORTED_LOCALES[normalizedLocale]?.direction === "rtl";
}
