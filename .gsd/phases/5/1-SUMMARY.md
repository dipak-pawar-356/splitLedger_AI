# Plan 5.1 Summary: Group QR Join Flow & Pending Requests State

## Delivered
1. Group QR links generate exact origin-aware `/join-group/[publicId]` URLs without leaking to third-party endpoints.
2. Unauthenticated scanners are guided through sign-in with return URL preserved.
3. Authenticated scanners submit join requests stored in `group_join_requests` and `group_members` with status `'pending'`.
4. Pending users are restricted to the Waiting for Approval screen and excluded from active member counts.
