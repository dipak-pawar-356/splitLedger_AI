# Database Schema Documentation

## Overview

SplitLedger AI uses a PostgreSQL database with Drizzle ORM. The schema follows immutable ledger principles where transactions are never modified - all balances are derived from transaction history.

## Core Tables

### users
User accounts and authentication data.

| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| clerkUserId | text | Clerk user ID (unique) |
| email | text | User email |
| name | text | User display name |
| avatar | text | Profile picture URL |
| defaultCurrency | text | Default currency (USD, EUR, etc.) |
| theme | text | UI theme preference |
| emailVerified | boolean | Email verification status |
| createdAt | timestamp | Account creation date |
| updatedAt | timestamp | Last update timestamp |

### profiles
Extended user settings and preferences.

| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| userId | integer | Foreign key to users |
| phone | text | Phone number |
| timezone | text | User timezone |
| language | text | Preferred language |
| notificationsEnabled | boolean | Global notification setting |
| emailNotifications | boolean | Email notification preference |
| whatsappNotifications | boolean | WhatsApp notification preference |
| autoSettlement | boolean | Auto-settlement preference |
| createdAt | timestamp | Profile creation date |
| updatedAt | timestamp | Last update timestamp |

### contacts
Personal contacts for individual ledgers.

| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| userId | integer | Foreign key to users |
| name | text | Contact name |
| avatar | text | Profile picture URL |
| phone | text | Phone number |
| email | text | Email address |
| openingBalance | bigint | Opening balance (in minor units) |
| currency | text | Currency for this contact |
| notes | text | Additional notes |
| notificationPreference | text | Preferred notification method |
| isArchived | boolean | Archive status |
| createdAt | timestamp | Creation date |
| updatedAt | timestamp | Last update timestamp |

### groups
Expense groups for shared expenses.

| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| name | text | Group name |
| description | text | Group description |
| coverImage | text | Cover image URL |
| type | enum | Group type (trip, friends, family, etc.) |
| currency | text | Group currency |
| splitMethod | enum | Default split method |
| createdBy | integer | Foreign key to users (creator) |
| isActive | boolean | Active status |
| createdAt | timestamp | Creation date |
| updatedAt | timestamp | Last update timestamp |

### group_members
Membership information for groups.

| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| groupId | integer | Foreign key to groups |
| userId | integer | Foreign key to users (optional) |
| contactId | integer | Foreign key to contacts (optional) |
| isAdmin | boolean | Admin status |
| joinedAt | timestamp | Join date |

### transactions
Immutable financial transactions (core ledger).

| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| userId | integer | Foreign key to users |
| contactId | integer | Foreign key to contacts (optional) |
| groupId | integer | Foreign key to groups (optional) |
| categoryId | integer | Foreign key to categories (optional) |
| type | enum | Transaction type (paid, received, lent, borrowed, repaid, adjustment) |
| amount | bigint | Amount in minor units |
| currency | text | Currency code |
| description | text | Transaction description |
| paymentMethod | text | Payment method |
| date | timestamp | Transaction date |
| status | text | Transaction status |
| notes | text | Additional notes |
| receiptUrl | text | Receipt image URL |
| reminderDate | timestamp | Reminder date |
| isRecurring | boolean | Recurring transaction flag |
| recurringPattern | text | Recurring pattern |
| createdAt | timestamp | Creation date |
| updatedAt | timestamp | Last update timestamp |

### expense_splits
Details of how expenses are split among participants.

| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| transactionId | integer | Foreign key to transactions |
| userId | integer | Foreign key to users (optional) |
| contactId | integer | Foreign key to contacts (optional) |
| splitMethod | enum | Split method used |
| amount | bigint | Split amount in minor units |
| percentage | integer | Percentage split |
| shares | integer | Share-based split |
| isExcluded | boolean | Excluded from split |
| createdAt | timestamp | Creation date |

### settlements
Settlement records between users/contacts.

| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| groupId | integer | Foreign key to groups (optional) |
| fromUserId | integer | Foreign key to users (payer) |
| fromContactId | integer | Foreign key to contacts (payer) |
| toUserId | integer | Foreign key to users (payee) |
| toContactId | integer | Foreign key to contacts (payee) |
| amount | bigint | Settlement amount in minor units |
| currency | text | Currency code |
| status | text | Settlement status |
| paymentMethod | text | Payment method |
| paidAt | timestamp | Payment completion date |
| notes | text | Additional notes |
| createdAt | timestamp | Creation date |
| updatedAt | timestamp | Last update timestamp |

### categories
Expense categories for better organization.

| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| userId | integer | Foreign key to users (optional for default categories) |
| name | text | Category name |
| icon | text | Icon identifier |
| color | text | Display color |
| isDefault | boolean | Default category flag |
| createdAt | timestamp | Creation date |

### notifications
User notifications for various events.

| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| userId | integer | Foreign key to users |
| type | enum | Notification type |
| title | text | Notification title |
| message | text | Notification message |
| status | enum | Delivery status |
| metadata | jsonb | Additional metadata |
| readAt | timestamp | Read timestamp |
| sentAt | timestamp | Sent timestamp |
| createdAt | timestamp | Creation date |

### comments
Comments on transactions, settlements, or groups.

| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| userId | integer | Foreign key to users |
| transactionId | integer | Foreign key to transactions (optional) |
| settlementId | integer | Foreign key to settlements (optional) |
| groupId | integer | Foreign key to groups (optional) |
| parentId | integer | Foreign key to comments (for replies) |
| content | text | Comment content |
| mentions | text | Mentioned users |
| attachments | jsonb | Attached files |
| reactions | jsonb | Emoji reactions |
| createdAt | timestamp | Creation date |
| updatedAt | timestamp | Last update timestamp |

### receipts
Receipt uploads and OCR extraction data.

| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| transactionId | integer | Foreign key to transactions |
| url | text | Storage URL |
| originalFileName | text | Original file name |
| fileSize | integer | File size in bytes |
| mimeType | text | MIME type |
| merchant | text | Extracted merchant name |
| extractedDate | timestamp | Extracted date |
| extractedAmount | bigint | Extracted amount |
| extractedGst | bigint | Extracted GST amount |
| confidenceScore | integer | OCR confidence score |
| ocrData | jsonb | Raw OCR data |
| createdAt | timestamp | Creation date |

### audit_logs
Complete audit trail of all actions.

| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| userId | integer | Foreign key to users |
| action | enum | Action type (create, update, delete, settle, invite, comment, ai_suggestion) |
| entityType | text | Entity type affected |
| entityId | integer | Entity ID affected |
| changes | jsonb | Change details |
| ipAddress | text | User IP address |
| userAgent | text | User agent string |
| createdAt | timestamp | Creation date |

### ai_analysis
AI analysis results for transactions and receipts.

| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| transactionId | integer | Foreign key to transactions (optional) |
| receiptId | integer | Foreign key to receipts (optional) |
| userId | integer | Foreign key to users |
| analysisType | text | Type of analysis |
| suggestions | jsonb | AI suggestions |
| confidenceScore | integer | Confidence score |
| isApplied | boolean | Whether suggestion was applied |
| createdAt | timestamp | Creation date |

### invitations
Group invitations for new members.

| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| groupId | integer | Foreign key to groups |
| invitedBy | integer | Foreign key to users |
| email | text | Invitee email |
| token | text | Unique invitation token |
| status | text | Invitation status |
| expiresAt | timestamp | Expiration date |
| acceptedAt | timestamp | Acceptance timestamp |
| createdAt | timestamp | Creation date |

## Monetary Values

All monetary values are stored as `bigint` in minor units (cents/paise) to avoid floating-point precision issues.

- USD: $100.00 → 10000
- EUR: €50.50 → 5050
- INR: ₹500.00 → 50000

## Indexes

The schema includes strategic indexes for:
- User lookups (clerkUserId, email)
- Transaction queries (userId, contactId, groupId, date)
- Group membership (groupId, userId, contactId)
- Notification delivery (userId, status)
- Audit trail (entityType, entityId, action, createdAt)

## Relationships

- Users → Profiles (1:1)
- Users → Contacts (1:N)
- Users → Groups (1:N)
- Users → Transactions (1:N)
- Groups → GroupMembers (1:N)
- Groups → Transactions (1:N)
- Contacts → Transactions (1:N)
- Transactions → ExpenseSplits (1:N)
- Transactions → Receipts (1:N)
- Transactions → Comments (1:N)
- Settlements → Comments (1:N)

## Data Integrity

- Foreign key constraints ensure referential integrity
- Unique constraints prevent duplicates
- Check constraints validate data ranges
- Cascade deletes handle orphaned records appropriately
