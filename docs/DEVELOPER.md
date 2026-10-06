# SplitLedger AI Developer Documentation

## Project Overview

SplitLedger AI is a Next.js 15 application built with TypeScript, featuring expense tracking, contact management, group expenses, and AI-powered features.

## Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **State Management**: React Hooks
- **Forms**: React Hook Form
- **Charts**: Recharts

### Backend
- **Runtime**: Node.js
- **API**: Next.js API Routes
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: Clerk
- **File Storage**: Vercel Blob (planned)

### Security
- **RBAC**: Custom role-based access control
- **Rate Limiting**: In-memory rate limiter
- **CSRF Protection**: Token-based CSRF protection
- **Validation**: Zod schemas

### Testing
- **Unit Tests**: Vitest
- **E2E Tests**: Playwright
- **Testing Library**: React Testing Library

### Deployment
- **Platform**: Vercel
- **CI/CD**: GitHub Actions
- **Environment**: Production, Staging, Development

## Project Structure

```
splitLedger_AI/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Authentication routes
│   │   ├── (public)/          # Public pages
│   │   ├── api/               # API routes
│   │   │   ├── integrations/  # Integration endpoints
│   │   │   └── webhooks/      # Webhook handlers
│   │   └── dashboard/         # Dashboard pages
│   ├── actions/               # Server actions
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── lazy-image.tsx    # Lazy loading image
│   │   ├── pagination.tsx    # Pagination component
│   │   └── virtual-list.tsx  # Virtual list component
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utility libraries
│   │   ├── auth/             # Authentication utilities
│   │   ├── db/               # Database configuration
│   │   ├── security/         # Security utilities
│   │   ├── settlements/      # Settlement calculations
│   │   ├── cache.ts          # Caching utilities
│   │   └── pagination.ts     # Pagination utilities
│   └── test/                  # Test setup
├── e2e/                       # E2E tests
├── docs/                      # Documentation
├── .github/                   # GitHub workflows
└── public/                    # Static assets
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Clerk account
- Vercel account (for deployment)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/splitledger-ai.git
cd splitledger-ai
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure environment variables (see [Environment Variables](#environment-variables))

5. Set up the database:
```bash
npm run db:generate
npm run db:migrate
npm run db:push
```

6. Run the development server:
```bash
npm run dev
```

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/splitledger

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Plaid (for bank integration)
PLAID_CLIENT_ID=xxx
PLAID_SECRET=xxx
PLAID_ENV=sandbox

# AI Services (optional)
OPENAI_API_KEY=sk_xxx

# File Storage
BLOB_READ_WRITE_TOKEN=xxx

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Database Schema

### Tables

#### users
```typescript
{
  id: number
  clerkUserId: string
  email: string
  name: string
  avatar: string
  defaultCurrency: string
  theme: string
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}
```

#### profiles
```typescript
{
  id: number
  userId: number
  phone: string
  timezone: string
  language: string
  notificationsEnabled: boolean
  emailNotifications: boolean
  whatsappNotifications: boolean
  autoSettlement: boolean
  createdAt: Date
  updatedAt: Date
}
```

#### contacts
```typescript
{
  id: number
  userId: number
  name: string
  email: string
  phone: string
  currency: string
  openingBalance: number
  notes: string
  createdAt: Date
  updatedAt: Date
}
```

#### transactions
```typescript
{
  id: number
  userId: number
  type: string
  amount: number
  currency: string
  description: string
  date: Date
  contactId: number
  categoryId: number
  groupId: number
  paymentMethod: string
  status: string
  receiptUrl: string
  createdAt: Date
  updatedAt: Date
}
```

#### groups
```typescript
{
  id: number
  userId: number
  name: string
  description: string
  type: string
  currency: string
  coverImage: string
  createdAt: Date
  updatedAt: Date
}
```

#### groupMembers
```typescript
{
  id: number
  groupId: number
  contactId: number
  role: string
  joinedAt: Date
}
```

#### settlements
```typescript
{
  id: number
  fromUserId: number
  fromContactId: number
  toUserId: number
  toContactId: number
  amount: number
  currency: string
  groupId: number
  paymentMethod: string
  status: string
  notes: string
  paidAt: Date
  createdAt: Date
  updatedAt: Date
}
```

## Server Actions

Server actions are defined in `src/actions/` and handle CRUD operations.

### Creating a Server Action

```typescript
"use server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createContact(data: CreateContactInput) {
  const user = await requireAuth();

  const [contact] = await db
    .insert(contacts)
    .values({
      userId: user.id,
      ...data,
    })
    .returning();

  revalidatePath("/dashboard/contacts");
  return contact;
}
```

### Using Server Actions in Components

```typescript
"use client";

import { createContact } from "@/actions/contacts";

export function CreateContactForm() {
  async function handleSubmit(formData: FormData) {
    const name = formData.get("name") as string;
    await createContact({ name });
  }

  return (
    <form action={handleSubmit}>
      <input name="name" />
      <button type="submit">Create</button>
    </form>
  );
}
```

## Custom Hooks

Custom hooks are defined in `src/hooks/` and provide reusable stateful logic.

### Available Hooks

- `useAuth()`: Authentication state
- `useTransactions()`: Transactions data
- `useContacts()`: Contacts data
- `useGroups()`: Groups data
- `useSettlements()`: Settlements data

### Creating a Custom Hook

```typescript
"use client";

import { useState, useEffect } from "react";

export function useCustomHook() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch("/api/endpoint");
        const data = await response.json();
        setData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { data, loading, error };
}
```

## Security

### RBAC

Role-based access control is implemented in `src/lib/security/rbac.ts`.

```typescript
import { hasPermission } from "@/lib/security/rbac";

// Check if user has permission
if (hasPermission(userRole, "transactions.delete")) {
  // Allow action
}
```

### Rate Limiting

Rate limiting is implemented in `src/lib/security/rate-limit.ts`.

```typescript
import { checkRateLimit } from "@/lib/security/rate-limit";

const result = checkRateLimit(userId, 100, 60000);
if (!result.allowed) {
  return new Response("Rate limit exceeded", { status: 429 });
}
```

### CSRF Protection

CSRF protection is implemented in `src/lib/security/csrf.ts`.

```typescript
import { generateCSRFToken, validateCSRFToken } from "@/lib/security/csrf";

// Generate token
const token = generateCSRFToken();

// Validate token
const isValid = validateCSRFToken(token, request);
```

## Caching

Caching utilities are in `src/lib/cache.ts`.

```typescript
import { createCachedFunction, CACHE_KEYS } from "@/lib/cache";

const getContacts = createCachedFunction(
  async (userId: string) => {
    return db.select().from(contacts).where(eq(contacts.userId, userId));
  },
  CACHE_KEYS.CONTACTS(userId),
  300 // 5 minutes TTL
);
```

## Pagination

Pagination utilities are in `src/lib/pagination.ts`.

```typescript
import { parsePaginationParams, createPaginatedResponse } from "@/lib/pagination";

const params = parsePaginationParams(searchParams);
const response = createPaginatedResponse(data, total, params);
```

## Testing

### Unit Tests

Run unit tests with Vitest:
```bash
npm run test
```

### E2E Tests

Run E2E tests with Playwright:
```bash
npm run test:e2e
```

### Writing Tests

```typescript
import { describe, it, expect } from "vitest";

describe("Feature", () => {
  it("should do something", () => {
    expect(true).toBe(true);
  });
});
```

## Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

```bash
npm run build
vercel --prod
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m 'Add my feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Open a pull request

## Code Style

- Use TypeScript for all new code
- Follow ESLint rules
- Use Prettier for formatting
- Write tests for new features
- Document complex logic

## Performance Optimization

- Use Next.js Image component for images
- Implement lazy loading for large lists
- Use caching for frequently accessed data
- Optimize database queries with indexes
- Use server components where possible

## Troubleshooting

### Database Connection Issues

Check DATABASE_URL in `.env` file and ensure PostgreSQL is running.

### Authentication Issues

Verify Clerk keys are correct and webhook is configured properly.

### Build Errors

Clear Next.js cache: `rm -rf .next`

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Clerk Documentation](https://clerk.com/docs)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
