import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const openApiSpec = {
    openapi: "3.0.0",
    info: {
      title: "SplitLedger AI Public REST API",
      version: "1.0.0",
      description: "Enterprise REST API ecosystem for expense splitting, financial ledger tracking, settlements, and AI intelligence.",
      contact: {
        name: "Developer Support",
        url: "https://splitledger.ai/docs",
      },
    },
    servers: [
      {
        url: "/api/v1",
        description: "Production API Server v1",
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "ApiKey",
          description: "SplitLedger API Key (sk_live_...)",
        },
      },
      schemas: {
        Transaction: {
          type: "object",
          properties: {
            id: { type: "integer" },
            title: { type: "string" },
            description: { type: "string" },
            amount: { type: "number", description: "Monetary amount in INR (₹)" },
            currency: { type: "string", example: "INR" },
            type: { type: "string", enum: ["paid", "received", "lent", "borrowed"] },
            date: { type: "string", format: "date-time" },
            groupId: { type: "integer", nullable: true },
          },
          required: ["id", "amount", "currency", "type", "date"],
        },
        Group: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            currency: { type: "string", example: "INR" },
            memberCount: { type: "integer" },
          },
          required: ["id", "name", "currency"],
        },
        Settlement: {
          type: "object",
          properties: {
            fromUserId: { type: "integer" },
            toUserId: { type: "integer" },
            amount: { type: "number" },
            currency: { type: "string", example: "INR" },
          },
          required: ["fromUserId", "toUserId", "amount", "currency"],
        },
      },
    },
    security: [
      {
        ApiKeyAuth: [],
      },
    ],
    paths: {
      "/transactions": {
        get: {
          summary: "List personal and group transactions",
          operationId: "listTransactions",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
            { name: "groupId", in: "query", schema: { type: "integer" } },
          ],
          responses: {
            "200": {
              description: "Paginated list of transactions",
              content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Transaction" } } } },
            },
          },
        },
        post: {
          summary: "Create a new transaction",
          operationId: "createTransaction",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/Transaction" } } },
          },
          responses: {
            "201": { description: "Transaction created successfully" },
          },
        },
      },
      "/groups": {
        get: {
          summary: "List user groups",
          operationId: "listGroups",
          responses: {
            "200": {
              description: "Array of groups",
              content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Group" } } } },
            },
          },
        },
      },
      "/settlements": {
        get: {
          summary: "Calculate optimized settlements for a group",
          operationId: "getSettlements",
          parameters: [
            { name: "groupId", in: "query", schema: { type: "integer" } },
          ],
          responses: {
            "200": {
              description: "Optimized settlement graph",
              content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Settlement" } } } },
            },
          },
        },
      },
    },
  };

  return NextResponse.json(openApiSpec, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
