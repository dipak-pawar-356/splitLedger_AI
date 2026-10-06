-- Migration to add publicId columns to all public-facing entities
-- This replaces sequential numeric IDs with secure random IDs for security

-- Helper function to generate secure random IDs
CREATE OR REPLACE FUNCTION generate_public_id()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..16 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Add publicId column to contacts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contacts' AND column_name = 'public_id'
  ) THEN
    ALTER TABLE contacts ADD COLUMN public_id TEXT UNIQUE;
    -- Generate public IDs for existing records
    UPDATE contacts SET public_id = generate_public_id() WHERE public_id IS NULL;
    ALTER TABLE contacts ALTER COLUMN public_id SET NOT NULL;
    CREATE INDEX contact_public_id_idx ON contacts(public_id);
  END IF;
END $$;

-- Add publicId column to groups table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'groups' AND column_name = 'public_id'
  ) THEN
    ALTER TABLE groups ADD COLUMN public_id TEXT UNIQUE;
    -- Generate public IDs for existing records
    UPDATE groups SET public_id = generate_public_id() WHERE public_id IS NULL;
    ALTER TABLE groups ALTER COLUMN public_id SET NOT NULL;
    CREATE INDEX group_public_id_idx ON groups(public_id);
  END IF;
END $$;

-- Add publicId column to transactions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'public_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN public_id TEXT UNIQUE;
    -- Generate public IDs for existing records
    UPDATE transactions SET public_id = generate_public_id() WHERE public_id IS NULL;
    ALTER TABLE transactions ALTER COLUMN public_id SET NOT NULL;
    CREATE INDEX transaction_public_id_idx ON transactions(public_id);
  END IF;
END $$;

-- Add publicId column to settlements table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'settlements' AND column_name = 'public_id'
  ) THEN
    ALTER TABLE settlements ADD COLUMN public_id TEXT UNIQUE;
    -- Generate public IDs for existing records
    UPDATE settlements SET public_id = generate_public_id() WHERE public_id IS NULL;
    ALTER TABLE settlements ALTER COLUMN public_id SET NOT NULL;
    CREATE INDEX settlement_public_id_idx ON settlements(public_id);
  END IF;
END $$;

-- Add publicId column to invitations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invitations' AND column_name = 'public_id'
  ) THEN
    ALTER TABLE invitations ADD COLUMN public_id TEXT UNIQUE;
    -- Generate public IDs for existing records
    UPDATE invitations SET public_id = generate_public_id() WHERE public_id IS NULL;
    ALTER TABLE invitations ALTER COLUMN public_id SET NOT NULL;
    CREATE INDEX invitation_public_id_idx ON invitations(public_id);
  END IF;
END $$;

-- Add comments to public_id columns
COMMENT ON COLUMN contacts.public_id IS 'Secure random public ID for URL-safe access (replaces sequential ID)';
COMMENT ON COLUMN groups.public_id IS 'Secure random public ID for URL-safe access (replaces sequential ID)';
COMMENT ON COLUMN transactions.public_id IS 'Secure random public ID for URL-safe access (replaces sequential ID)';
COMMENT ON COLUMN settlements.public_id IS 'Secure random public ID for URL-safe access (replaces sequential ID)';
COMMENT ON COLUMN invitations.public_id IS 'Secure random public ID for URL-safe access (replaces sequential ID)';
