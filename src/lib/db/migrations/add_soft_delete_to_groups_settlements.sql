-- Migration to add soft delete columns to groups and settlements tables
-- This adds is_deleted, deleted_at, and deleted_by columns for soft delete functionality

-- Add soft delete columns to groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS deleted_by INTEGER;

-- Update existing records
UPDATE groups SET is_deleted = false WHERE is_deleted IS NULL;

-- Add foreign key constraint for deleted_by
ALTER TABLE groups ADD CONSTRAINT groups_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add index for is_deleted
CREATE INDEX IF NOT EXISTS groups_deleted_idx ON groups(is_deleted);

-- Add soft delete columns to settlements table
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS deleted_by INTEGER;

-- Update existing records
UPDATE settlements SET is_deleted = false WHERE is_deleted IS NULL;

-- Add foreign key constraint for deleted_by
ALTER TABLE settlements ADD CONSTRAINT settlements_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add index for is_deleted
CREATE INDEX IF NOT EXISTS settlements_deleted_idx ON settlements(is_deleted);

-- Make columns NOT NULL (after data is populated)
ALTER TABLE groups ALTER COLUMN is_deleted SET NOT NULL;
ALTER TABLE settlements ALTER COLUMN is_deleted SET NOT NULL;
