import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || (process.env.OPENAI_API_KEY?.startsWith("sk-or-") ? "https://openrouter.ai/api/v1" : undefined),
});

export interface ExpenseAnalysis {
  category: string;
  improvedDescription: string;
  confidence: number;
  suggestions: string[];
}

export async function analyzeExpense(description: string, amount: number): Promise<ExpenseAnalysis> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a financial assistant that analyzes expense descriptions. 
          Categorize expenses into: food, transport, shopping, entertainment, utilities, rent, health, education, travel, other.
          Provide an improved description and suggestions for better tracking.
          Return JSON with: category, improvedDescription, confidence (0-100), suggestions (array).`
        },
        {
          role: "user",
          content: `Analyze this expense: "${description}" with amount ${amount}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      category: result.category || "other",
      improvedDescription: result.improvedDescription || description,
      confidence: result.confidence || 50,
      suggestions: result.suggestions || [],
    };
  } catch (error) {
    console.error("AI analysis failed:", error);
    return {
      category: "other",
      improvedDescription: description,
      confidence: 0,
      suggestions: [],
    };
  }
}

export async function generateReceiptSummary(ocrData: any): Promise<any> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Extract key information from receipt data. Return JSON with: merchant, date, amount, gst, category, items (array).`
        },
        {
          role: "user",
          content: `Extract information from this receipt: ${JSON.stringify(ocrData)}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    console.error("Receipt analysis failed:", error);
    return null;
  }
}

export async function suggestSettlements(balances: any[]): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Analyze outstanding balances and suggest optimal settlement strategies. 
          Return JSON with: suggestions (array of strings), priority (high/medium/low).`
        },
        {
          role: "user",
          content: `Suggest settlements for these balances: ${JSON.stringify(balances)}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.suggestions || [];
  } catch (error) {
    console.error("Settlement suggestions failed:", error);
    return [];
  }
}
