-- Migration to ensure contacts table has phone column
-- This fixes the schema mismatch between Drizzle ORM and actual PostgreSQL database

-- Check if phone column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'contacts' 
        AND column_name = 'phone'
    ) THEN
        ALTER TABLE contacts ADD COLUMN phone text;
    END IF;
END $$;

-- Add comment to phone column
COMMENT ON COLUMN contacts.phone IS 'Phone number for the contact';
