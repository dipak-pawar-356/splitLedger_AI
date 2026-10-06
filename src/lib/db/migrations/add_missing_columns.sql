-- Safe migration to add missing columns to transactions table
-- This migration adds columns that exist in Drizzle schema but are missing from the database

-- Step 1: Add missing columns as nullable first to avoid data loss
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS paid_by INTEGER;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS paid_by_contact INTEGER;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS parent_transaction_id INTEGER;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS deleted_by INTEGER;

-- Step 2: Update existing records to set created_by = user_id for backward compatibility
UPDATE transactions SET created_by = user_id WHERE created_by IS NULL;
UPDATE transactions SET paid_by = user_id WHERE paid_by IS NULL;
UPDATE transactions SET version = 1 WHERE version IS NULL;
UPDATE transactions SET is_deleted = false WHERE is_deleted IS NULL;

-- Step 3: Add foreign key constraints
ALTER TABLE transactions ADD CONSTRAINT transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD CONSTRAINT transactions_paid_by_fkey FOREIGN KEY (paid_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD CONSTRAINT transactions_paid_by_contact_fkey FOREIGN KEY (paid_by_contact) REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD CONSTRAINT transactions_parent_transaction_id_fkey FOREIGN KEY (parent_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD CONSTRAINT transactions_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

-- Step 4: Add indexes
CREATE INDEX IF NOT EXISTS transaction_created_by_idx ON transactions(created_by);
CREATE INDEX IF NOT EXISTS transaction_parent_idx ON transactions(parent_transaction_id);
CREATE INDEX IF NOT EXISTS transaction_deleted_idx ON transactions(is_deleted);

-- Step 5: Make columns NOT NULL (after data is populated)
ALTER TABLE transactions ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE transactions ALTER COLUMN version SET NOT NULL;
ALTER TABLE transactions ALTER COLUMN is_deleted SET NOT NULL;

-- Step 6: Add missing unique constraint to group_members
-- First remove any duplicates if they exist
DELETE FROM group_members ct1 USING group_members ct2 
WHERE ct1.id > ct2.id 
AND ct1.group_id = ct2.group_id 
AND (ct1.user_id = ct2.user_id OR ct1.contact_id = ct2.contact_id);

-- Then add the unique constraint
ALTER TABLE group_members ADD CONSTRAINT unique_group_member UNIQUE (group_id, user_id, contact_id);
