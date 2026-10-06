# SplitLedger AI API Documentation

## Overview

SplitLedger AI provides a RESTful API for managing expense splitting, contacts, transactions, groups, and settlements. All API endpoints require authentication via Clerk.

## Base URL

```
https://api.splitledger.ai
```

## Authentication

All API requests require authentication using Clerk. Include the Clerk session token in the `Authorization` header:

```
Authorization: Bearer <clerk_session_token>
```

## Endpoints

### Contacts

#### Get All Contacts
```http
GET /api/contacts
```

**Response:**
```json
{
  "contacts": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "currency": "USD",
      "openingBalance": 0,
      "notes": "Friend from college",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Get Contact by ID
```http
GET /api/contacts/:id
```

#### Create Contact
```http
POST /api/contacts
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+1234567890",
  "currency": "USD",
  "openingBalance": 0,
  "notes": "Optional notes"
}
```

#### Update Contact
```http
PUT /api/contacts/:id
Content-Type: application/json

{
  "name": "Jane Smith",
  "email": "jane.smith@example.com"
}
```

#### Delete Contact
```http
DELETE /api/contacts/:id
```

### Transactions

#### Get All Transactions
```http
GET /api/transactions?page=1&limit=20&sortBy=date&sortOrder=desc
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `sortBy` (optional): Field to sort by
- `sortOrder` (optional): Sort order (asc/desc)

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

#### Get Transaction by ID
```http
GET /api/transactions/:id
```

#### Create Transaction
```http
POST /api/transactions
Content-Type: application/json

{
  "type": "paid",
  "amount": 100.50,
  "currency": "USD",
  "description": "Dinner at restaurant",
  "date": "2024-01-01",
  "contactId": 1,
  "categoryId": 1,
  "groupId": 1,
  "paymentMethod": "card",
  "receiptUrl": "https://example.com/receipt.jpg"
}
```

**Transaction Types:**
- `paid`: You paid for something
- `received`: You received money
- `lent`: You lent money
- `borrowed`: You borrowed money
- `repaid`: You repaid a debt

#### Update Transaction
```http
PUT /api/transactions/:id
Content-Type: application/json

{
  "amount": 150.00,
  "description": "Updated description"
}
```

#### Delete Transaction
```http
DELETE /api/transactions/:id
```

### Groups

#### Get All Groups
```http
GET /api/groups
```

#### Get Group by ID
```http
GET /api/groups/:id
```

#### Create Group
```http
POST /api/groups
Content-Type: application/json

{
  "name": "Trip to Paris",
  "description": "Summer 2024 trip",
  "type": "trip",
  "currency": "EUR"
}
```

**Group Types:**
- `trip`: Travel expenses
- `home`: Household expenses
- `office`: Office expenses
- `friends`: Friends group
- `family`: Family group
- `other`: Other

#### Add Member to Group
```http
POST /api/groups/:id/members
Content-Type: application/json

{
  "contactId": 1
}
```

#### Remove Member from Group
```http
DELETE /api/groups/:id/members/:memberId
```

#### Delete Group
```http
DELETE /api/groups/:id
```

### Settlements

#### Get All Settlements
```http
GET /api/settlements
```

#### Get Settlement by ID
```http
GET /api/settlements/:id
```

#### Create Settlement
```http
POST /api/settlements
Content-Type: application/json

{
  "fromUserId": 1,
  "toUserId": 2,
  "amount": 50.00,
  "currency": "USD",
  "groupId": 1,
  "paymentMethod": "bank_transfer",
  "notes": "Settlement for dinner"
}
```

#### Update Settlement Status
```http
PUT /api/settlements/:id/status
Content-Type: application/json

{
  "status": "completed"
}
```

**Status Values:**
- `pending`: Settlement pending
- `completed`: Settlement completed
- `cancelled`: Settlement cancelled

#### Delete Settlement
```http
DELETE /api/settlements/:id
```

### Webhooks

#### Stripe Webhook
```http
POST /api/webhooks/stripe
```

Handles Stripe events for subscription management.

**Events Handled:**
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

#### Clerk Webhook
```http
POST /api/webhooks/clerk
```

Handles Clerk authentication events.

**Events Handled:**
- `user.created`
- `user.updated`
- `user.deleted`

### Integrations

#### Plaid Integration
```http
POST /api/integrations/plaid
Content-Type: application/json

{
  "publicToken": "public-sandbox-xxx"
}
```

Exchanges Plaid public token for access token.

#### Export Data
```http
POST /api/integrations/export
Content-Type: application/json

{
  "format": "json",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "includeContacts": true,
  "includeTransactions": true,
  "includeGroups": true
}
```

**Formats:**
- `json`: JSON format
- `csv`: CSV format
- `pdf`: PDF format

#### Import Data
```http
POST /api/integrations/import
Content-Type: multipart/form-data

file: <file>
format: json
```

## Error Responses

All endpoints return standard error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

**Common Error Codes:**
- `UNAUTHORIZED`: Invalid or missing authentication
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid request data
- `INTERNAL_ERROR`: Server error

## Rate Limiting

API requests are rate limited:
- 100 requests per minute per user
- 1000 requests per hour per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Pagination

List endpoints support pagination using `page` and `limit` query parameters.

## Webhooks

Configure webhooks to receive real-time notifications about events in your account.

### Webhook Events

- `transaction.created`: New transaction created
- `transaction.updated`: Transaction updated
- `transaction.deleted`: Transaction deleted
- `settlement.created`: New settlement created
- `settlement.completed`: Settlement completed
- `group.created`: New group created
- `group.updated`: Group updated

### Webhook Signature

Webhook payloads are signed for security. Verify signatures using the webhook secret.

## SDK

Official SDKs are available for:
- JavaScript/TypeScript
- Python
- Go

See the [SDK documentation](./SDK.md) for details.
