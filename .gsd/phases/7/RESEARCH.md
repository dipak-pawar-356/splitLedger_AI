# Phase 7 Research: Enterprise Authentication, Session Management & Cryptographic Security Architecture

## 1. Executive Summary & Context

SplitLedger AI handles sensitive financial records, peer-to-peer settlement claims, dynamic UPI transactions, and organizational budgets. Under regulatory standards (such as RBI master directions for digital payments, SOC 2 Type II, ISO 27001, and OWASP ASVS Level 3), authentication and session management must provide **defense-in-depth, strict session isolation, guaranteed zero token reuse, cryptographic freshness, and continuous anomaly detection**.

This document outlines the architectural blueprint, vulnerability analysis of the legacy implementation, mathematical and cryptographic specifications, and integration strategy to achieve financial-grade security without introducing regressions to existing application features or test suites.

---

## 2. Forensic Analysis of Existing Authentication Implementation

### Current Request Lifecycle
```
[Client Request]
       │
       ▼
[Next.js Middleware (clerkMiddleware)]
       │ ── Reads auth() & sets 'x-clerk-user-id' header
       ▼
[Server Actions / API Routes]
       │ ── Invokes requireAuth() / getCurrentUser()
       ▼
[src/lib/auth.ts: getCurrentUser()]
       ├── Priority 1: Clerk auth().userId
       ├── Priority 2: Header 'x-clerk-user-id'
       ├── Priority 3: Cookie extraction (base64url payload extraction WITHOUT signature verification)
       └── Fallback: DEV_USER (id: 1) if isDevOrTest()
```

### Identified Security Vulnerabilities & Exploit Scenarios

| Vulnerability ID | Category | Flaw in Existing Implementation | Attack Vector & Risk |
|---|---|---|---|
| **VULN-01** | Cryptographic Verification | `extractUserIdFromClerkJwt()` extracts `parts[1]` (payload) via base64url decode without verifying signature against Clerk's JWKS or HMAC secret. | **Authentication Bypass / Identity Forgery**: An attacker can forge an arbitrary JWT payload in cookie with `{"sub":"target_user_id"}` and gain unauthorized access if priority 1/2 are bypassed. |
| **VULN-02** | Dev/Test Fallback Leakage | In `src/lib/auth.ts`, if `!process.env.CLERK_SECRET_KEY` or `isDevOrTest()` returns true, any unauthenticated request resolves as `DEV_USER` (User ID 1). | **Privilege Escalation**: Misconfigured staging/production environments or requests where credentials fail will silently authenticate the caller as the root owner of the database. |
| **VULN-03** | Phantom Session Management | Sessions and devices are stored as static/mock JSON blobs in `profiles.activeSessions` and `profiles.trustedDevices`. `manageSessions("terminate")` merely filters a JSON array. | **Session Hijacking / Inability to Revoke**: Terminating a session has zero effect on the active token. A stolen token or compromised browser session remains valid indefinitely. |
| **VULN-04** | Missing Refresh Token Rotation | No refresh tokens exist in SplitLedger DB. No rotation, no lineage tracking, no reuse detection. | **Persistent Session Theft**: If an access token or session token is exfiltrated, it cannot be rotated or invalidated centrally. |
| **VULN-05** | No Multi-Device Force Logout | In `src/components/profile-menu.tsx`, logout only calls client-side `signOut()`. No server-side session destruction occurs. | **Zombie Sessions**: "Logout from all devices" does not invalidate other browser sessions or native API tokens. |
| **VULN-06** | Zero Anomaly & Velocity Detection | No impossible travel calculation, no device fingerprinting, no IP velocity tracking. | **Credential Stuffing & Geolocation Spying**: An attacker logging in from a foreign country immediately after a legitimate domestic login is undetected. |
| **VULN-07** | Client State Desynchronization | Client-side components rely on loosely synchronized local state without heartbeats, idle timeouts, or silent refresh. | **Session Staling & UX Breakage**: Users suddenly encounter 401 errors or unhandled promise rejections during financial mutations. |

---

## 3. Cryptographic Architecture & Token Engine

### 3.1 Dual-Token Architecture

```
┌────────────────────────────────────────────────────────┐
│                      Client                            │
│  HttpOnly Cookie: sl_access_token (15m expiry)         │
│  HttpOnly Cookie: sl_refresh_token (30d expiry)        │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
               │ [API / Action Request]   │ [Refresh / Rotate]
               ▼                          ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│     Access Token Guard       │ │   Token Rotation Engine      │
│  • Verify HMAC-SHA256 / EdDSA│ │  • Constant-time hash match  │
│  • Check Token Version       │ │  • Issue new (AT + RT) pair  │
│  • Check Session Expiry      │ │  • Invalidate old RT         │
│  • Check Session Status      │ │  • Detect Reuse -> Revoke All│
└──────────────────────────────┘ └──────────────────────────────┘
```

### 3.2 Access Token Specification
- **Format**: Signed JWT
- **Algorithm**: HMAC-SHA256 (`HS256`) with 256-bit high-entropy enterprise secret (`SPLITLEDGER_AUTH_SECRET` or fallback derived from secure master key), upgradeable to `RS256` / `Ed25519`.
- **Lifetime**: 15 minutes (900 seconds).
- **Payload Schema**:
  ```json
  {
    "sub": "usr_abc123",
    "uid": 1,
    "sid": "sess_xyz789",
    "did": "dev_qwe456",
    "ver": 1,
    "role": "user",
    "iat": 1729600000,
    "exp": 1729600900,
    "iss": "splitledger-ai",
    "aud": "splitledger-api"
  }
  ```

### 3.3 Refresh Token Specification & Rotation State Machine
- **Format**: Cryptographically random 256-bit token (`crypto.randomBytes(32).toString('base64url')`).
- **Database Storage**: SHA-256 hash (`crypto.createHash('sha256').update(token).digest('hex')`). **NEVER stored in plaintext.**
- **Lifetime**: Configurable, default 30 days.
- **Rotation Rules**:
  1. Each refresh generates **both** a new Access Token and a new Refresh Token.
  2. The old Refresh Token hash is replaced in the database with the new token hash.
  3. If a client presents an old/revoked Refresh Token (or an unknown token for that session), **Replay/Reuse Attack is detected**:
     - The entire session is marked `status = 'revoked'` with `revocationReason = 'token_reuse_detected'`.
     - A high-severity Security Event (`CRITICAL`) is recorded in `security_audit_logs`.
     - All active tokens for that session are invalidated immediately.
     - The user is notified via notification engine.

---

## 4. Database Schema Design: Dedicated Financial Security Tables

### 4.1 `sessions` Table
| Column | Type | Constraints / Details |
|---|---|---|
| `id` | `serial` | Primary Key |
| `public_id` | `text` | Unique, prefixed `sess_` |
| `user_id` | `integer` | Foreign Key `users(id)` ON DELETE CASCADE |
| `device_id` | `text` | References `devices.public_id` |
| `refresh_token_hash` | `text` | SHA-256 hash of active refresh token |
| `token_version` | `integer` | Default 1, incremented on forced revocation |
| `ip_address` | `text` | Client IPv4 / IPv6 |
| `user_agent` | `text` | Full User-Agent string |
| `browser` | `text` | Parsed browser name & major version |
| `os` | `text` | Parsed OS name & version |
| `device_type` | `text` | `desktop` \| `mobile` \| `tablet` |
| `country` | `text` | Geolocation country name/code |
| `city` | `text` | Geolocation city name |
| `status` | `text` | `active` \| `expired` \| `revoked` |
| `revocation_reason` | `text` | Nullable: `logout`, `force_logout`, `reuse`, `suspicious` |
| `last_active_at` | `timestamp` | Updated on API activity (debounced) |
| `idle_expires_at` | `timestamp` | Idle expiration threshold (e.g. 7 days) |
| `expires_at` | `timestamp` | Absolute expiration threshold (e.g. 30 days) |
| `created_at` | `timestamp` | Default NOW() |
| `updated_at` | `timestamp` | Default NOW() |

**Indexes**:
- `session_user_idx`: `(user_id, status)`
- `session_public_id_idx`: `(public_id)`
- `session_token_hash_idx`: `(refresh_token_hash)`
- `session_expires_idx`: `(expires_at, status)`

### 4.2 `devices` Table
| Column | Type | Constraints / Details |
|---|---|---|
| `id` | `serial` | Primary Key |
| `public_id` | `text` | Unique, prefixed `dev_` |
| `user_id` | `integer` | Foreign Key `users(id)` ON DELETE CASCADE |
| `fingerprint` | `text` | Secure SHA-256 digest of browser/hardware attributes |
| `name` | `text` | e.g. "Work MacBook Pro", "Pixel 8" |
| `browser` | `text` | e.g. "Chrome 128" |
| `os` | `text` | e.g. "macOS Sonoma" |
| `device_type` | `text` | `desktop` \| `mobile` \| `tablet` |
| `last_ip` | `text` | Latest IP |
| `last_location` | `text` | e.g. "Bangalore, India" |
| `is_trusted` | `boolean` | Default `false` |
| `first_seen_at` | `timestamp` | Default NOW() |
| `last_active_at` | `timestamp` | Default NOW() |
| `created_at` | `timestamp` | Default NOW() |
| `updated_at` | `timestamp` | Default NOW() |

**Indexes**:
- `device_user_fingerprint_idx`: `(user_id, fingerprint)`
- `device_user_trusted_idx`: `(user_id, is_trusted)`

### 4.3 `security_audit_logs` Table
Extends the existing audit log capability specifically for IAM/Auth security:
- `user_id`, `action`, `status` (`success` | `failure` | `blocked`), `risk_level` (`low` | `medium` | `high` | `critical`), `ip_address`, `device`, `browser`, `details` (JSONB), `created_at`.

---

## 5. Anomaly Detection Engine & Risk Scoring

### 5.1 Anomaly Factors & Weights

$$RiskScore = \sum (FactorWeight \times Severity)$$

1. **Impossible Travel Anomaly**:
   - Calculate distance using Haversine formula between $Location_{t-1}$ and $Location_t$.
   - Calculate velocity: $v = \frac{\Delta d}{\Delta t}$.
   - If $v > 900 \text{ km/h}$ and $\Delta t < 4 \text{ hours}$, flag as **Impossible Travel** (+60 risk points).
2. **Unrecognized Device**:
   - Device fingerprint not found in user's historical devices (+25 risk points).
3. **Foreign Geolocation / Rapid Country Switch**:
   - Login from a new country never previously seen (+30 risk points).
4. **Brute Force Velocity**:
   - $> 5$ failed attempts from IP or email within 10 minutes (+50 risk points).
5. **Token Reuse Violation**:
   - Replay of an invalidated refresh token (+100 risk points -> instant revocation).

### 5.2 Dynamic Risk Actions
- **Score < 30 (Low)**: Proceed normally, record audit log.
- **Score 30 - 69 (Medium)**: Proceed, issue high-priority security alert notification to user, flag device as untrusted.
- **Score >= 70 (High / Critical)**: Revoke suspect session lineage, terminate connection, reject refresh request, require re-authentication.

---

## 6. Backward Compatibility & Zero-Regression Strategy

1. **Dual Verification Pipeline in `src/lib/auth.ts`**:
   - Priority 1: SplitLedger native secure session cookie (`sl_access_token` / `sl_refresh_token`).
   - Priority 2: Clerk official `auth()` integration (when Clerk keys are active).
   - Priority 3: Forwarded headers / fallback in Dev/Test.
   - When a user logs in via Clerk, SplitLedger automatically provisions or links a session in the `sessions` table and issues the corresponding device tracking record.
2. **Mock Test Isolation**:
   - Existing unit tests that mock `requireAuth: vi.fn()` will continue to mock cleanly without modification.
   - All 52 test files and 396 tests remain 100% green.
3. **No Breaking Schema Changes**:
   - `users` and `profiles` tables remain intact with foreign keys preserved.
   - `profiles.activeSessions` and `profiles.trustedDevices` will be synced from the authoritative `sessions` and `devices` tables for legacy UI compatibility.
