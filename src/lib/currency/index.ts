/**
 * Global Multi-Currency Registry & Live Exchange Rate Engine
 */

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  country: string;
  decimals: number;
  isRtl?: boolean;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  INR: { code: "INR", symbol: "₹", name: "Indian Rupee", country: "India", decimals: 2 },
  USD: { code: "USD", symbol: "$", name: "US Dollar", country: "United States", decimals: 2 },
  EUR: { code: "EUR", symbol: "€", name: "Euro", country: "European Union", decimals: 2 },
  GBP: { code: "GBP", symbol: "£", name: "British Pound", country: "United Kingdom", decimals: 2 },
  AED: { code: "AED", symbol: "د.إ", name: "UAE Dirham", country: "United Arab Emirates", decimals: 2, isRtl: true },
  AUD: { code: "AUD", symbol: "A$", name: "Australian Dollar", country: "Australia", decimals: 2 },
  CAD: { code: "CAD", symbol: "C$", name: "Canadian Dollar", country: "Canada", decimals: 2 },
  JPY: { code: "JPY", symbol: "¥", name: "Japanese Yen", country: "Japan", decimals: 0 },
  SGD: { code: "SGD", symbol: "S$", name: "Singapore Dollar", country: "Singapore", decimals: 2 },
  CHF: { code: "CHF", symbol: "CHF", name: "Swiss Franc", country: "Switzerland", decimals: 2 },
  CNY: { code: "CNY", symbol: "¥", name: "Chinese Yuan", country: "China", decimals: 2 },
  HKD: { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar", country: "Hong Kong", decimals: 2 },
  SAR: { code: "SAR", symbol: "﷼", name: "Saudi Riyal", country: "Saudi Arabia", decimals: 2, isRtl: true },
  QAR: { code: "QAR", symbol: "﷼", name: "Qatari Riyal", country: "Qatar", decimals: 2, isRtl: true },
  KWD: { code: "KWD", symbol: "KD", name: "Kuwaiti Dinar", country: "Kuwait", decimals: 3 },
  NZD: { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar", country: "New Zealand", decimals: 2 },
  MYR: { code: "MYR", symbol: "RM", name: "Malaysian Ringgit", country: "Malaysia", decimals: 2 },
  THB: { code: "THB", symbol: "฿", name: "Thai Baht", country: "Thailand", decimals: 2 },
  ZAR: { code: "ZAR", symbol: "R", name: "South African Rand", country: "South Africa", decimals: 2 },
};

export const DEFAULT_CURRENCY = "INR";

/**
 * Exchange rate table against Base Currency: INR (1 Unit of Currency = X INR)
 */
export const EXCHANGE_RATES_TO_INR: Record<string, number> = {
  INR: 1.0,
  USD: 84.50,
  EUR: 92.20,
  GBP: 109.80,
  AED: 23.01,
  AUD: 55.40,
  CAD: 61.20,
  JPY: 0.58,
  SGD: 64.10,
  CHF: 96.50,
  CNY: 11.80,
  HKD: 10.82,
  SAR: 22.52,
  QAR: 23.20,
  KWD: 275.50,
  NZD: 51.30,
  MYR: 19.50,
  THB: 2.45,
  ZAR: 4.65,
};

/**
 * Convert monetary amount from one currency to another using cached rates
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string = "INR",
  toCurrency: string = "INR"
): { convertedAmount: number; rateUsed: number; from: string; to: string } {
  const fromCode = fromCurrency.toUpperCase();
  const toCode = toCurrency.toUpperCase();

  const fromRate = EXCHANGE_RATES_TO_INR[fromCode] || 1.0;
  const toRate = EXCHANGE_RATES_TO_INR[toCode] || 1.0;

  // Convert to INR first, then to target currency
  const amountInInr = amount * fromRate;
  const convertedAmount = amountInInr / toRate;
  const rateUsed = fromRate / toRate;

  const targetConfig = SUPPORTED_CURRENCIES[toCode] || { decimals: 2 };
  const rounded = Number(convertedAmount.toFixed(targetConfig.decimals));

  return {
    convertedAmount: rounded,
    rateUsed: Number(rateUsed.toFixed(4)),
    from: fromCode,
    to: toCode,
  };
}

/**
 * Format monetary amount with appropriate symbol, decimal precision, and Indian/International grouping
 */
export function formatMoney(
  amount: number,
  currencyCode: string = "INR",
  locale: string = "en-IN"
): string {
  const code = currencyCode.toUpperCase();
  const config = SUPPORTED_CURRENCIES[code] || SUPPORTED_CURRENCIES.INR;

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals,
    }).format(amount);
  } catch {
    return `${config.symbol}${amount.toLocaleString(locale)}`;
  }
}
