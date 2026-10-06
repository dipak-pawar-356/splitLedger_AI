# SplitLedger AI

A production-ready SaaS application for expense sharing, personal ledger management, and AI-powered financial insights.

## Features

- **Personal Ledger**: Track all your financial transactions with contacts
- **Group Expenses**: Create groups for trips, friends, family, office, and events
- **Expense Splitting**: Multiple split methods (equal, exact, percentage, shares)
- **Settlement Engine**: Automatic calculation of optimal settlements
- **AI Assistant**: OpenAI-powered expense categorization and insights
- **Receipt Scanner**: OCR-based receipt extraction
- **Notifications**: Email, WhatsApp, and in-app notifications
- **Reports**: Comprehensive financial reports and analytics
- **Audit Trail**: Complete activity timeline and audit logging

## Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful, accessible components
- **Framer Motion** - Smooth animations
- **Recharts** - Data visualization

### Backend
- **Next.js Server Actions** - Server-side logic
- **API Routes** - RESTful endpoints

### Database
- **Neon PostgreSQL** - Serverless PostgreSQL
- **Drizzle ORM** - Type-safe database queries

### Authentication
- **Clerk** - Secure authentication

### AI
- **OpenAI GPT-4** - AI-powered insights

### Storage
- **S3 Compatible** - File storage for receipts

### Validation
- **Zod** - Schema validation

### Forms
- **React Hook Form** - Form management

### Email
- **Resend** - Transactional email

### WhatsApp
- **WhatsApp Business API** - Messaging

### Testing
- **Vitest** - Unit testing
- **Playwright** - E2E testing

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Neon PostgreSQL account
- Clerk account
- OpenAI API key
- Resend API key (optional)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
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

Edit `.env` with your credentials:
```env
DATABASE_URL="postgresql://user:password@host:5432/splitledger?sslmode=require"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your-clerk-publishable-key"
CLERK_SECRET_KEY="your-clerk-secret-key"
OPENAI_API_KEY="your-openai-api-key"
RESEND_API_KEY="your-resend-api-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

4. Set up the database:
```bash
npm run db:generate
npm run db:push
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
splitledger-ai/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── dashboard/         # Dashboard pages
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Landing page
│   │   └── globals.css       # Global styles
│   ├── components/            # React components
│   │   ├── dashboard/         # Dashboard components
│   │   ├── providers/         # Context providers
│   │   └── ui/                # shadcn/ui components
│   ├── db/                    # Database configuration
│   │   ├── schema.ts          # Drizzle schema
│   │   └── index.ts           # Database client
│   └── lib/                   # Utility functions
│       ├── auth.ts            # Authentication helpers
│       ├── ai.ts              # AI integration
│       ├── constants.ts       # App constants
│       ├── notifications.ts   # Notification system
│       ├── settlement.ts      # Settlement algorithm
│       └── utils.ts           # Utility functions
├── drizzle/                   # Drizzle migrations
├── public/                    # Static assets
├── .env.example              # Environment variables template
├── drizzle.config.ts         # Drizzle configuration
├── next.config.ts            # Next.js configuration
├── package.json              # Dependencies
├── tailwind.config.ts        # Tailwind configuration
└── tsconfig.json             # TypeScript configuration
```

## Database Schema

The application uses a comprehensive relational database with the following main tables:

- **users** - User accounts and profiles
- **contacts** - Personal contacts for ledgers
- **groups** - Expense groups
- **group_members** - Group membership
- **transactions** - Financial transactions (immutable ledger)
- **expense_splits** - Expense split details
- **settlements** - Settlement records
- **categories** - Expense categories
- **notifications** - User notifications
- **comments** - Transaction/group comments
- **receipts** - Receipt uploads and OCR data
- **audit_logs** - Complete audit trail
- **ai_analysis** - AI analysis results
- **invitations** - Group invitations

All monetary values are stored as BIGINT (minor units) for precision.

## Key Features

### Immutable Ledger
- Transactions are never modified directly
- All balances are calculated from transaction history
- Complete audit trail for every action

### Settlement Algorithm
The settlement engine uses a debt simplification algorithm to:
- Calculate minimum number of transactions
- Optimize settlement paths
- Handle partial settlements
- Support multiple currencies

### AI Integration
- Automatic expense categorization
- Description improvement suggestions
- Receipt OCR and data extraction
- Duplicate detection
- Settlement recommendations

### Security
- Role-based access control
- Server-side validation
- CSRF protection
- Rate limiting
- Signed URLs for file uploads
- Data encryption at rest

## API Endpoints

### Server Actions
- `createTransaction` - Create a new transaction
- `updateTransaction` - Update transaction (creates new record)
- `createContact` - Add a new contact
- `createGroup` - Create an expense group
- `calculateSettlements` - Calculate optimal settlements
- `analyzeExpense` - AI expense analysis
- `uploadReceipt` - Upload and process receipt

### API Routes
- `/api/webhooks/clerk` - Clerk webhooks
- `/api/webhooks/resend` - Resend webhooks
- `/api/ai/analyze` - AI analysis endpoint
- `/api/reports/generate` - Report generation

## Deployment

### Vercel
1. Connect your repository to Vercel
2. Add environment variables
3. Deploy

### Manual Deployment
```bash
npm run build
npm start
```

## Testing

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
npm run test:e2e
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support, email support@splitledger.ai or open an issue in the repository.
