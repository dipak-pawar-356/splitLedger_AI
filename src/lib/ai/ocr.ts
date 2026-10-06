import Tesseract from "tesseract.js";

export interface ReceiptData {
  merchant?: string;
  date?: string;
  amount?: number;
  currency?: string;
  gst?: number;
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  confidence: number;
  rawText: string;
}

export async function extractReceiptData(imageBuffer: Buffer): Promise<ReceiptData> {
  try {
    const result = await Tesseract.recognize(imageBuffer, "eng", {
      logger: (m: any) => console.log(m),
    });

    const text = result.data.text;
    const confidence = result.data.confidence;

    const receiptData = parseReceiptText(text);

    return {
      ...receiptData,
      confidence,
      rawText: text,
    };
  } catch (error) {
    console.error("OCR extraction failed:", error);
    throw new Error("Failed to extract receipt data");
  }
}

function parseReceiptText(text: string): Partial<ReceiptData> {
  const lines = text.split("\n").filter((line) => line.trim());
  const data: Partial<ReceiptData> = {};

  const datePatterns = [
    /\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/,
    /\d{4}[-/]\d{1,2}[-/]\d{1,2}/,
    /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      data.date = match[0];
      break;
    }
  }

  const amountPatterns = [
    /(?:total|sum|amount|grand total)[:\s]*[$€₹£]?\s*([\d,]+\.?\d*)/i,
    /[$€₹£]\s*([\d,]+\.?\d*)/,
  ];

  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      data.amount = parseFloat(match[1].replace(/,/g, ""));
      break;
    }
  }

  const gstPattern = /(?:gst|vat|tax)[:\s]*[$€₹£]?\s*([\d,]+\.?\d*)/i;
  const gstMatch = text.match(gstPattern);
  if (gstMatch) {
    data.gst = parseFloat(gstMatch[1].replace(/,/g, ""));
  }

  const merchantKeywords = ["store", "shop", "restaurant", "cafe", "market", "mart"];
  for (const line of lines) {
    if (line.length > 5 && line.length < 50) {
      const lowerLine = line.toLowerCase();
      if (merchantKeywords.some((keyword) => lowerLine.includes(keyword))) {
        data.merchant = line.trim();
        break;
      }
    }
  }

  return data;
}
