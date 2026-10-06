-- Add composite indexes for performance optimization
-- These indexes optimize common query patterns and reduce N+1 query issues

-- Transactions table composite indexes
CREATE INDEX IF NOT EXISTS transaction_user_deleted_date_idx ON transactions(user_id, is_deleted, date);
CREATE INDEX IF NOT EXISTS transaction_group_deleted_idx ON transactions(group_id, is_deleted);

-- Settlements table composite indexes
CREATE INDEX IF NOT EXISTS settlement_group_status_idx ON settlements(group_id, status);
CREATE INDEX IF NOT EXISTS settlement_from_user_status_idx ON settlements(from_user_id, status);
CREATE INDEX IF NOT EXISTS settlement_to_user_status_idx ON settlements(to_user_id, status);

-- Contacts table composite index
CREATE INDEX IF NOT EXISTS contact_user_deleted_idx ON contacts(user_id, is_deleted);

-- Groups table composite index
CREATE INDEX IF NOT EXISTS group_created_by_deleted_idx ON groups(created_by, is_deleted);
