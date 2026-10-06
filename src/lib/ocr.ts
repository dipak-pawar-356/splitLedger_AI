import Tesseract from "tesseract.js";
import { generateReceiptSummary } from "./ai";

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
      logger: (m) => console.log(m),
    });

    const text = result.data.text;
    const confidence = result.data.confidence;

    // Parse the OCR text to extract structured data
    const receiptData = parseReceiptText(text);

    // Enhance with AI analysis
    const aiAnalysis = await generateReceiptSummary(text);
    
    return {
      ...receiptData,
      ...aiAnalysis,
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

  // Extract date (common patterns)
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

  // Extract amount (look for total, sum, amount keywords)
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

  // Extract GST/VAT
  const gstPattern = /(?:gst|vat|tax)[:\s]*[$€₹£]?\s*([\d,]+\.?\d*)/i;
  const gstMatch = text.match(gstPattern);
  if (gstMatch) {
    data.gst = parseFloat(gstMatch[1].replace(/,/g, ""));
  }

  // Extract merchant (usually first non-empty line or contains common keywords)
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

export async function processReceiptUpload(
  file: File,
  transactionId?: number
): Promise<{ url: string; data: ReceiptData }> {
  // Convert file to buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to S3 (implement based on your S3 setup)
  const url = await uploadToS3(file);

  // Extract OCR data
  const receiptData = await extractReceiptData(buffer);

  // Save to database
  if (transactionId) {
    await saveReceiptToDatabase(transactionId, url, file, receiptData);
  }

  return { url, data: receiptData };
}

async function uploadToS3(file: File): Promise<string> {
  // Implement S3 upload logic here
  // This is a placeholder - implement based on your S3 configuration
  const timestamp = Date.now();
  const fileName = `receipts/${timestamp}-${file.name}`;
  return `https://your-s3-bucket/${fileName}`;
}

async function saveReceiptToDatabase(
  transactionId: number,
  url: string,
  file: File,
  data: ReceiptData
) {
  const { db } = await import("@/lib/db");
  const { receipts } = await import("@/lib/db/schema/schema");

  await db.insert(receipts).values({
    transactionId,
    url,
    originalFileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    merchant: data.merchant,
    extractedDate: data.date ? new Date(data.date) : null,
    extractedAmount: data.amount ? Math.round(data.amount * 100) : null,
    extractedGst: data.gst ? Math.round(data.gst * 100) : null,
    confidenceScore: Math.round(data.confidence),
    ocrData: data as any,
  });
}
