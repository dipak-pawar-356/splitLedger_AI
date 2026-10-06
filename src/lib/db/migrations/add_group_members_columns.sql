-- Safe migration to add missing columns to group_members table
-- This migration adds columns that exist in Drizzle schema but are missing from the database

-- Step 1: Add missing columns as nullable first to avoid data loss
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT false;
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP DEFAULT NOW();
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS invitation_id INTEGER;

-- Step 2: Update existing records to set default values
UPDATE group_members SET is_guest = false WHERE is_guest IS NULL;
UPDATE group_members SET joined_at = NOW() WHERE joined_at IS NULL;

-- Step 3: Add foreign key constraint for invitation_id
ALTER TABLE group_members ADD CONSTRAINT group_members_invitation_id_fkey FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE SET NULL;

-- Step 4: Add indexes
CREATE INDEX IF NOT EXISTS group_member_invitation_idx ON group_members(invitation_id);
