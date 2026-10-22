# SPEC.md — Enterprise Authentication, Session Management & Security Architecture

> **Status**: `FINALIZED`
>
> ⚠️ **Planning Lock**: Enterprise security specifications, threat models, cryptographic requirements, and database schema finalized for implementation.

## Vision
Transform SplitLedger AI's authentication and access management into a banking- and fintech-grade security platform. Provide defense-in-depth, strict session isolation across devices, atomic refresh token rotation with reuse attack detection, instant token revocation, continuous anomaly detection (impossible travel, IP velocity, brute-force), unified permission validation, and a modern User Security Center UI without introducing regressions to existing ledger, group, settlement, or payment workflows.

---

## Key Requirements & Architecture

### 1. Access Token Security
- Short-lived JWT Access Tokens (10–15 minutes expiry).
- Signed using high-entropy HMAC-SHA256 (with constant-time verification) or asymmetric keypair.
- Never stored in `localStorage` or vulnerable storage.
- Stored in `HttpOnly; Secure; SameSite=Lax` cookies (`sl_access_token`) and supported via `Authorization: Bearer <token>` for external API/mobile access.
- Payload includes:
  - `sub` (User Public ID)
  - `uid` (User DB ID)
  - `sid` (Session Public ID)
  - `did` (Device Public ID)
  - `ver` (Token Version)
  - `role` ('user' | 'admin')
  - `iat` (Issued At)
  - `exp` (Expiration)
  - `iss` ('splitledger-ai')
  - `aud` ('splitledger-api')
- Validated on every incoming request. Revoked or expired tokens rejected immediately.

### 2. Refresh Token Rotation & Zero-Reuse Protection
- Cryptographically random 256-bit entropy opaque token (`crypto.randomBytes(32)`).
- Configurable lifetime (default: 30 days).
- Stored in database strictly as a **SHA-256 hash**. Raw tokens are never stored in plaintext.
- Stored on client in `HttpOnly; Secure; SameSite=Strict` cookie (`sl_refresh_token`).
- **Atomic Rotation Rules**:
  - Every token refresh request generates a new Access Token and a new Refresh Token.
  - The old refresh token becomes immediately invalid.
- **Token Reuse Attack Detection**:
  - If a rotated or invalid refresh token is re-submitted:
    - Immediately revoke the entire session lineage (`status = 'revoked'`, `revocationReason = 'token_reuse_detected'`).
    - Record a critical security audit event (`type: "token_reuse_detected"`, `severity: "critical"`).
    - Dispatch high-priority alert notification to the user.

### 3. Centralized Token Revocation & Invalidation
- Instant server-side revocation on:
  - User logout
  - Password change or credential reset
  - Email update
  - Admin account suspension or locking
  - Suspicious login detection (risk score >= 70)
  - Refresh token reuse attempt
  - User selects "Logout All Devices" or "Terminate Session"
  - Idle timeout or absolute session expiry
- Once revoked, tokens are rejected in sub-millisecond lookups via indexed database sessions table with in-memory TTL cache.

### 4. Database Schema: First-Class Security Tables
- **`sessions` table**:
  - `id`, `public_id`, `user_id`, `device_id`, `refresh_token_hash`, `token_version`, `ip_address`, `user_agent`, `browser`, `os`, `device_type`, `country`, `city`, `region`, `status` ('active'|'expired'|'revoked'), `revocation_reason`, `last_active_at`, `idle_expires_at`, `expires_at`, `created_at`, `updated_at`.
- **`devices` table**:
  - `id`, `public_id`, `user_id`, `fingerprint`, `name`, `browser`, `os`, `device_type`, `last_ip`, `last_location`, `is_trusted`, `first_seen_at`, `last_active_at`, `created_at`, `updated_at`.
- **`security_audit_events` table**:
  - Structured security logs: `id`, `public_id`, `user_id`, `action`, `status`, `risk_level`, `ip_address`, `user_agent`, `browser`, `os`, `location`, `details` (jsonb), `created_at`.

### 5. Anomaly & Suspicious Login Detection
- Real-time scoring on authentication:
  - **Impossible Travel**: Haversine formula calculation over time delta ($v > 900 \text{ km/h}$, $\Delta t < 4 \text{ hours}$) -> +60 risk points.
  - **New Device**: Device fingerprint mismatch -> +25 risk points.
  - **New Country / Region**: Unseen geolocation -> +30 risk points.
  - **Brute-Force Velocity**: $>5$ failures in 10 minutes -> +50 risk points.
  - **Token Reuse**: Replay attack -> +100 risk points.
- Risk classification:
  - Low (<30): Allow and record audit log.
  - Medium (30–69): Allow, issue security notification alert.
  - High / Critical (>=70): Terminate/revoke session, block access, dispatch critical alert.

### 6. Production Security Headers & Perimeter Defense
- Hardened HTTP response headers in `next.config.ts` and `src/middleware.ts`:
  - `Content-Security-Policy`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`
  - Secure, HttpOnly, SameSite cookies.

### 7. User Security Center UI
- Modern, responsive dashboard tab in `/dashboard/account`:
  - Active login sessions with live indicators, device icons, IP, approximate location, relative active time, and current session badge.
  - "Logout from All Other Devices" and "Logout from All Devices" actions.
  - Individual session termination.
  - Trusted devices manager with renaming and removal.
  - Security posture score card and security alert notifications.

### 8. Backward Compatibility & Zero-Regression Guarantee
- Seamless compatibility with:
  - Existing Clerk authentication flows (binds Clerk user to authoritative SplitLedger session and device rows).
  - Dev/test fallback in Vitest / local dev.
  - All existing 52 test files and 396 tests must pass without any regressions.

---

## Success Criteria
- [ ] Relational `sessions`, `devices`, and `security_audit_events` tables deployed and auto-migrated.
- [ ] Short-lived signed JWT access tokens (15m) and SHA-256 hashed refresh tokens.
- [ ] Atomic refresh token rotation with reuse attack detection and session lineage revocation.
- [ ] Centralized token revocation on logout, password change, and "Logout All Devices".
- [ ] Real-time anomaly detection with Haversine impossible travel calculation and risk scoring.
- [ ] Enterprise security headers and secure cookie configuration applied.
- [ ] User Security Center UI displaying live database sessions and trusted device management.
- [ ] 100% test pass rate across vitest suite with zero regressions.
