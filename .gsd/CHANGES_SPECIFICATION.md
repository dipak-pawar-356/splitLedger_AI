# Changes Specification: Enterprise Authentication, Session Management & Security Architecture

> **Authoritative Specification Document**: Comprehensive reference detailing all architectural, cryptographic, database, backend, security middleware, and frontend changes for SplitLedger AI.
> **Milestone**: Enterprise Authentication, Session Management & Security Architecture (Milestone 2)
> **Status**: Verified & Complete (100% Test Pass Rate, 0 TypeScript Errors)

---

## 1. Executive Summary & Architecture Overview

The entire authentication, session management, and access control subsystem of SplitLedger AI has been upgraded to a financial-grade, production-ready enterprise security architecture meeting standards comparable to banking platforms, payment gateways, and cloud-native SaaS systems.

All 20 core security objectives specified in the requirements have been designed, implemented, and empirically verified without causing a single regression to existing ledger, group, settlement, UPI payment, profile, reporting, or notification workflows.

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT TERMINALS & PWA                                           │
│   • Browser (Desktop / Mobile)    • Progressive Web App (PWA)     • Secure Mobile Web Intent    │
│   Cookies: sl_access_token (15m, HttpOnly, SameSite=Lax, Secure)                                │
│            sl_refresh_token (30d, HttpOnly, SameSite=Strict, Secure)                            │
└──────────────────────────────────────────────┬──────────────────────────────────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                         ENTERPRISE HTTP PERIMETER & MIDDLEWARE                                  │
│   • Strict HTTP Headers: 2-Year HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff    │
│   • Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy                        │
│   • Bearer / Cookie Access Token Pre-verification with Constant-Time Signature Validation       │
└──────────────────────────────────────────────┬──────────────────────────────────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                           CENTRALIZED SECURITY & IAM SERVICES                                   │
│  ┌─────────────────────────┐  ┌───────────────────────────┐  ┌───────────────────────────────┐  │
│  │  Crypto Token Service   │  │ Refresh Token Rotation    │  │  Anomaly & Threat Detector    │  │
│  │  (token-service.ts)     │  │ (auth-session.ts)         │  │  (anomaly-detector.ts)        │  │
│  │  • 15m JWT Access Token │  │ • Atomic Pair Rotation    │  │  • Haversine Distance Calc    │  │
│  │  • timingSafeEqual      │  │ • SHA-256 Hash in DB      │  │  • Impossible Travel (>900km) │  │
│  │  • Token Versioning     │  │ • Replay -> Revoke Lineage│  │  • Device Fingerprint Hash    │  │
│  └─────────────────────────┘  └───────────────────────────┘  └───────────────────────────────┘  │
└──────────────────────────────────────────────┬──────────────────────────────────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                         POSTGRESQL RELATIONAL SECURITY SCHEMA                                   │
│   • sessions: id, public_id, user_id, device_id, refresh_token_hash, status, token_version,    │
│               ip, browser, os, location, idle_expires_at, expires_at, last_active_at            │
│   • devices: id, public_id, user_id, fingerprint, name, browser, os, is_trusted, last_active    │
│   • security_audit_events: id, public_id, user_id, action, status, risk_level, risk_score       │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Detailed Implementation Across All 20 Security Dimensions

### 1. Access Token Security
- **Short-Lived Lifetime**: Configured to 15 minutes (900 seconds) via `ACCESS_TOKEN_EXPIRY_SECONDS` in [`token-service.ts`](file:///d:/Project_2k24_25/splitLedger_AI/src/lib/security/token-service.ts).
- **Cryptographic Signing**: Signed using HMAC-SHA256 (`alg: HS256`) via Node.js native `crypto.createHmac`.
- **Constant-Time Verification**: Verification utilizes `crypto.timingSafeEqual` over raw signature buffers to completely eliminate timing side-channel attacks.
- **Zero LocalStorage**: Never stored in browser `localStorage` or `sessionStorage`. Transported via `HttpOnly; Secure; SameSite=Lax` cookies (`sl_access_token`) or `Authorization: Bearer <token>`.
- **Payload Schema**:
  ```typescript
  export interface AccessTokenPayload {
    sub: string;             // User Public ID (e.g. "usr_102")
    uid: number;             // Internal Database User ID
    sid: string;             // Session Public ID ("sess_...")
    did?: string;            // Device Public ID ("dev_...")
    ver: number;             // Token Version (incremented on revocation/invalidation)
    role: "user" | "admin";  // Authorization Role
    iat: number;             // Issued At timestamp
    exp: number;             // Expiration timestamp
    iss: "splitledger-ai";   // Authoritative Issuer
    aud: "splitledger-api";  // Audience
  }
  ```

### 2. Refresh Token Rotation & Zero-Reuse Protection
- **Opaque High-Entropy Generation**: Generated using 256-bit cryptographically secure pseudo-random bytes (`crypto.randomBytes(32).toString('base64url')`).
- **Zero Plaintext Database Storage**: Refresh tokens are stored strictly as SHA-256 hashes (`crypto.createHash('sha256').update(token).digest('hex')`). Raw tokens are never persisted.
- **Atomic Rotation**: Every refresh request atomically generates a new Access Token and a new Refresh Token, updating the session row in PostgreSQL with the new hash.
- **Replay / Reuse Attack Detection**:
  - If a rotated, stale, or previously used refresh token is submitted:
    - The entire session lineage is marked `status = 'revoked'` with `revocationReason = 'token_reuse_detected'`.
    - Session `tokenVersion` is bumped.
    - Cookies are purged.
    - A critical incident (`risk_level: "critical"`, `risk_score: 100`) is recorded in `security_audit_events`.
    - High-priority security notification is dispatched to the user.

### 3. Centralized Token Revocation & Invalidation
- Instant server-side invalidation implemented in [`src/actions/auth-session.ts`](file:///d:/Project_2k24_25/splitLedger_AI/src/actions/auth-session.ts) and [`src/actions/account.ts`](file:///d:/Project_2k24_25/splitLedger_AI/src/actions/account.ts):
  - `terminateSession()`: Revokes an individual session by `publicId`.
  - `terminateAllOtherSessions()`: Revokes all sessions except the active caller.
  - `forceLogoutAllDevices()`: Revokes all active sessions and refresh tokens across all devices for the user.
- **Automatic Invalidation Triggers**:
  - User password changes trigger `forceLogoutAllDevices(user.id, "password_changed")`.
  - Account deactivations trigger `forceLogoutAllDevices(user.id, "account_deactivated")`.
  - Account deletions trigger `forceLogoutAllDevices(user.id, "account_deleted")`.
  - Device removals trigger `revocationReason = "device_removed"` for all sessions tied to that device.

### 4. Relational Session Management
- Migrated from unstructured JSON blobs in `profiles` to a first-class, indexed PostgreSQL table:
  - **`sessions` table** in [`src/lib/db/schema/schema.ts`](file:///d:/Project_2k24_25/splitLedger_AI/src/lib/db/schema/schema.ts):
    - `id`, `public_id`, `user_id`, `device_id`, `refresh_token_hash`, `token_version`, `ip_address`, `user_agent`, `browser`, `os`, `device_type`, `country`, `city`, `region`, `status` (`'active'` | `'expired'` | `'revoked'`), `revocation_reason`, `last_active_at`, `idle_expires_at`, `expires_at`, `created_at`, `updated_at`.
    - Composite B-Tree indexes: `(user_id, status)`, `public_id`, `refresh_token_hash`, `status`, `(expires_at, status)`.

### 5. Device Tracking & Hardware Fingerprinting
- **`devices` table** in [`src/lib/db/schema/schema.ts`](file:///d:/Project_2k24_25/splitLedger_AI/src/lib/db/schema/schema.ts):
  - Stores: `fingerprint` (SHA-256 hash of client terminal attributes), `name`, `browser`, `os`, `device_type`, `last_ip`, `last_location`, `is_trusted`, `first_seen_at`, `last_active_at`.
  - Users can view recognized devices, rename devices inline, trust or untrust devices, and remove devices from authorized hardware.

### 6. Force Logout All Devices
- Interactive destructive action in [`src/components/account/active-sessions-card.tsx`](file:///d:/Project_2k24_25/splitLedger_AI/src/components/account/active-sessions-card.tsx).
- Displays confirmation dialog warning user of immediate invalidation across all hardware.
- Atomically marks all active database sessions as revoked, purges authentication cookies, logs an audit event, and redirects to `/sign-in`.

### 7. Real-Time Suspicious Login & Anomaly Detection
- Built in [`src/lib/security/anomaly-detector.ts`](file:///d:/Project_2k24_25/splitLedger_AI/src/lib/security/anomaly-detector.ts):
  - **Haversine Distance**: Calculates great-circle distance between consecutive login coordinates:
    $$d = 2 R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \text{lat}}{2}\right) + \cos(\text{lat}_1)\cos(\text{lat}_2)\sin^2\left(\frac{\Delta \text{lon}}{2}\right)}\right)$$
    where Earth radius $R = 6371\text{ km}$.
  - **Impossible Travel**: Flags logins where velocity $v = \frac{\Delta d}{\Delta t} > 900\text{ km/h}$ within $\Delta t < 4\text{ hours}$ (+60 risk points).
  - **Unrecognized Devices**: Unseen hardware fingerprints assign +25 risk points.
  - **Foreign Country Anomalies**: Unseen countries assign +30 risk points.
  - **Brute-Force Bursts**: Sliding-window tracking flags rapid failures (+45 to +60 risk points).
  - **Automated Mitigations**: Dispatches in-app security notifications and integrates with `threatMonitor`.

### 8. Login Security & Rate Limiting
- Protected by sliding-window brute-force velocity tracking (`recordFailedAttempt` and `resetFailedAttempts`).
- Replay attacks blocked via cryptographic hash verification and token versioning.

### 9. Logout Security & Cookie Invalidation
- `serverLogout()` in [`src/actions/auth-session.ts`](file:///d:/Project_2k24_25/splitLedger_AI/src/actions/auth-session.ts) revokes the database session row and clears `sl_access_token` and `sl_refresh_token` cookies.
- Integrated into [`src/components/profile-menu.tsx`](file:///d:/Project_2k24_25/splitLedger_AI/src/components/profile-menu.tsx) to guarantee both client-side and server-side state destruction upon sign out.

### 10. API Security & Server Authorization
- `requireAuth()` and `getCurrentUser()` in [`src/lib/auth.ts`](file:///d:/Project_2k24_25/splitLedger_AI/src/lib/auth.ts):
  - Prioritizes native SplitLedger access tokens (`sl_access_token`, Bearer header, forwarded headers).
  - Validates session active status via `validateSession()`.
  - Rejects revoked or expired sessions immediately.
  - Suspended or locked accounts are blocked.

### 11. Database Security
- Zero plaintext passwords or refresh tokens are ever stored.
- Refresh tokens are hashed using SHA-256 before insertion or matching.

### 12. Audit Logging
- Dedicated `security_audit_events` table in [`src/lib/db/schema/schema.ts`](file:///d:/Project_2k24_25/splitLedger_AI/src/lib/db/schema/schema.ts):
  - Records: `user_id`, `action`, `status` (`success` | `failure` | `blocked`), `risk_level` (`low` | `medium` | `high` | `critical`), `risk_score`, client IP, browser, OS, location, and structured JSON details.

### 13. Permission Validation & Role Enforcement
- Access tokens embed `role` (`'user'` | `'admin'`) and `ver` (token version).
- Integrated with existing RBAC and group permission matrix.

### 14. Session Expiration Policies
- **Idle Timeout**: Automatically set to 7 days from last activity (`IDLE_SESSION_EXPIRY_SECONDS = 7 * 86400`).
- **Absolute Lifetime**: 30 days maximum lifespan (`REFRESH_TOKEN_EXPIRY_SECONDS = 30 * 86400`).
- **Activity Touch Throttling**: Updates `lastActiveAt` at most once every 2 minutes to minimize Neon serverless database write pressure.

### 15. HTTP Security Headers & Perimeter Hardening
- Configured in [`next.config.ts`](file:///d:/Project_2k24_25/splitLedger_AI/next.config.ts) and [`src/middleware.ts`](file:///d:/Project_2k24_25/splitLedger_AI/src/middleware.ts):
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (2-Year HSTS)
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`
  - `X-XSS-Protection: 1; mode=block`

### 16. User Security Center UI
- Enhanced [`src/components/account/active-sessions-card.tsx`](file:///d:/Project_2k24_25/splitLedger_AI/src/components/account/active-sessions-card.tsx) in `/dashboard/account`:
  - Live database sessions with device icons, current session badge, IP, location, and relative last active timestamp.
  - "Terminate" button for non-current sessions.
  - "Terminate Other Sessions" and "Logout All Devices" dialog.
  - Trusted device manager with inline renaming, trust toggling, and removal.
  - Suspicious activity alert banner and recent login history list.

### 17. Automatic Security Checks
- Automated token version checks prevent stale token reuse.
- Inactive, revoked, or expired sessions rejected during API and Server Action invocations.

### 18. Performance & Scalability
- Composite B-Tree indexes on `sessions(user_id, status)`, `sessions(public_id)`, and `sessions(refresh_token_hash)`.
- Database activity updates throttled to avoid cold-start or write lock bottlenecks.
- Zero external heavyweight dependencies; built on native Node.js `crypto`.

### 19. Full Compatibility
- Compatible with:
  - **Clerk Authentication**: Binds Clerk users to authoritative SplitLedger sessions and device records.
  - **Next.js 15 App Router & Server Actions**: Fully compatible with `headers()` and `cookies()`.
  - **PostgreSQL & Drizzle ORM**: Idempotent auto-migration in [`src/lib/db/auto-migrate.ts`](file:///d:/Project_2k24_25/splitLedger_AI/src/lib/db/auto-migrate.ts).
  - **PWA & Mobile Browsers**: Responsive UI and standard cookie transport.

### 20. Zero Regressions & Verification
- 53 of 53 test files passed (100%).
- 407 of 407 unit & integration tests passed.
- Dedicated test suite created in [`src/lib/security/__tests__/enterprise-auth.test.ts`](file:///d:/Project_2k24_25/splitLedger_AI/src/lib/security/__tests__/enterprise-auth.test.ts).

---

## 3. Database Schema Definitions (DDL & Drizzle ORM)

```sql
-- 1. sessions table
CREATE TABLE IF NOT EXISTS "sessions" (
  "id" serial PRIMARY KEY,
  "public_id" text UNIQUE NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "device_id" text,
  "refresh_token_hash" text NOT NULL,
  "token_version" integer DEFAULT 1 NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "browser" text,
  "os" text,
  "device_type" text DEFAULT 'desktop' NOT NULL,
  "country" text,
  "city" text,
  "region" text,
  "status" text DEFAULT 'active' NOT NULL,
  "revocation_reason" text,
  "last_active_at" timestamp DEFAULT now() NOT NULL,
  "idle_expires_at" timestamp NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "session_user_idx" ON "sessions" ("user_id", "status");
CREATE INDEX IF NOT EXISTS "session_public_id_idx" ON "sessions" ("public_id");
CREATE INDEX IF NOT EXISTS "session_token_hash_idx" ON "sessions" ("refresh_token_hash");
CREATE INDEX IF NOT EXISTS "session_status_idx" ON "sessions" ("status");
CREATE INDEX IF NOT EXISTS "session_expires_idx" ON "sessions" ("expires_at", "status");

-- 2. devices table
CREATE TABLE IF NOT EXISTS "devices" (
  "id" serial PRIMARY KEY,
  "public_id" text UNIQUE NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "fingerprint" text NOT NULL,
  "name" text NOT NULL,
  "browser" text,
  "os" text,
  "device_type" text DEFAULT 'desktop' NOT NULL,
  "last_ip" text,
  "last_location" text,
  "is_trusted" boolean DEFAULT false NOT NULL,
  "first_seen_at" timestamp DEFAULT now() NOT NULL,
  "last_active_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "device_user_fingerprint_idx" ON "devices" ("user_id", "fingerprint");
CREATE INDEX IF NOT EXISTS "device_user_trusted_idx" ON "devices" ("user_id", "is_trusted");
CREATE INDEX IF NOT EXISTS "device_public_id_idx" ON "devices" ("public_id");
CREATE INDEX IF NOT EXISTS "device_user_idx" ON "devices" ("user_id");

-- 3. security_audit_events table
CREATE TABLE IF NOT EXISTS "security_audit_events" (
  "id" serial PRIMARY KEY,
  "public_id" text UNIQUE NOT NULL,
  "user_id" integer REFERENCES "users"("id") ON DELETE CASCADE,
  "action" text NOT NULL,
  "status" text DEFAULT 'success' NOT NULL,
  "risk_level" text DEFAULT 'low' NOT NULL,
  "risk_score" integer DEFAULT 0 NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "browser" text,
  "os" text,
  "location" text,
  "details" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "sec_audit_user_idx" ON "security_audit_events" ("user_id");
CREATE INDEX IF NOT EXISTS "sec_audit_action_idx" ON "security_audit_events" ("action");
CREATE INDEX IF NOT EXISTS "sec_audit_risk_idx" ON "security_audit_events" ("risk_level");
CREATE INDEX IF NOT EXISTS "sec_audit_created_idx" ON "security_audit_events" ("created_at");
```

---

## 4. Deliverables & File Modification Inventory

| Phase | Plan | Component | Deliverable Files |
|-------|------|-----------|-------------------|
| Phase 7 | 7.1 | PostgreSQL Security Schema & Auto-Migration | [`src/lib/db/schema/schema.ts`](file:///d:/Project_2k24_25/splitLedger_AI/src/lib/db/schema/schema.ts), [`src/lib/db/auto-migrate.ts`](file:///d:/Project_2k24_25/splitLedger_AI/src/lib/db/auto-migrate.ts) |
| Phase 7 | 7.2 | Cryptographic Token Service & Refresh Rotation | [`src/lib/security/token-service.ts`](file:///d:/Project_2k24_25/splitLedger_AI/src/lib/security/token-service.ts), [`src/actions/auth-session.ts`](file:///d:/Project_2k24_25/splitLedger_AI/src/actions/auth-session.ts) |
| Phase 7 | 7.3 | Centralized Invalidation & Force Logout Engine | [`src/actions/auth-session.ts`](file:///d:/Project_2k24_25/splitLedger_AI/src/actions/auth-session.ts), [`src/actions/account.ts`](file:///d:/Project_2k24_25/splitLedger_AI/src/actions/account.ts) |
| Phase 8 | 8.1 | Real-Time Anomaly & Threat Detection Engine | [`src/lib/security/anomaly-detector.ts`](file:///d:/Project_2k24_25/splitLedger_AI/src/lib/security/anomaly-detector.ts) |
| Phase 8 | 8.2 | HTTP Security Headers & Session Middleware | [`next.config.ts`](file:///d:/Project_2k24_25/splitLedger_AI/next.config.ts), [`src/middleware.ts`](file:///d:/Project_2k24_25/splitLedger_AI/src/middleware.ts), [`src/lib/auth.ts`](file:///d:/Project_2k24_25/splitLedger_AI/src/lib/auth.ts) |
| Phase 9 | 9.1 | User Security Center & Multi-Device UI | [`src/components/account/active-sessions-card.tsx`](file:///d:/Project_2k24_25/splitLedger_AI/src/components/account/active-sessions-card.tsx) |
| Phase 9 | 9.2 | Secure Logout & Enterprise Verification Suite | [`src/components/profile-menu.tsx`](file:///d:/Project_2k24_25/splitLedger_AI/src/components/profile-menu.tsx), [`src/lib/security/__tests__/enterprise-auth.test.ts`](file:///d:/Project_2k24_25/splitLedger_AI/src/lib/security/__tests__/enterprise-auth.test.ts) |

---

## 5. Verification & Quality Gates

```bash
> splitledger-ai@0.1.0 test
> vitest --run

 Test Files  53 passed (53)
      Tests  407 passed (407)
   Start at  15:44:31
   Duration  10.26s

> npx tsc --noEmit
# 0 Errors
```

All 20 security requirements are completely satisfied, documented, tested, and production-ready.
