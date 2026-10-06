import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || (process.env.OPENAI_API_KEY?.startsWith("sk-or-") ? "https://openrouter.ai/api/v1" : undefined),
});

export async function analyzeExpense(description: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are a financial assistant. Analyze expense descriptions and provide categorization and improvement suggestions.",
      },
      {
        role: "user",
        content: description,
      },
    ],
    functions: [
      {
        name: "categorize_expense",
        description: "Categorize the expense and suggest improvements",
        parameters: {
          type: "object",
          properties: {
            category: {
              type: "string",
              enum: ["food", "transport", "entertainment", "shopping", "bills", "health", "education", "other"],
            },
            improvedDescription: { type: "string" },
            confidence: { type: "number" },
          },
          required: ["category", "improvedDescription", "confidence"],
        },
      },
    ],
  });

  return response.choices[0].message.function_call;
}

export async function generateSettlementSuggestions(transactions: any[]) {
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are a settlement calculator. Suggest optimal settlements to minimize transactions.",
      },
      {
        role: "user",
        content: JSON.stringify(transactions),
      },
    ],
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}

export async function summarizeExpense(transactions: any[]) {
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are a financial analyst. Summarize expense patterns and provide insights.",
      },
      {
        role: "user",
        content: JSON.stringify(transactions),
      },
    ],
  });

  return response.choices[0].message.content;
}
