const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_ingh7PZJQRk0@ep-solitary-unit-azqy8jn9-pooler.c-3.ap-southeast-1.aws.neon.tech/splitledger?sslmode=require&channel_binding=require";

const sql = neon(DATABASE_URL);

async function runMigration() {
  console.log("Starting migration to add missing columns...");
  
  try {
    // Step 1: Add missing columns as nullable first
    console.log("Adding missing columns to transactions table...");
    
    try {
      await sql`ALTER TABLE transactions ADD COLUMN created_by INTEGER`;
      console.log("✓ Added created_by column");
    } catch (e) {
      if (e.message.includes('already exists') || e.message.includes('duplicate column')) {
        console.log("✓ created_by column already exists");
      } else {
        throw e;
      }
    }
    
    try {
      await sql`ALTER TABLE transactions ADD COLUMN paid_by INTEGER`;
      console.log("✓ Added paid_by column");
    } catch (e) {
      if (e.message.includes('already exists') || e.message.includes('duplicate column')) {
        console.log("✓ paid_by column already exists");
      } else {
        throw e;
      }
    }
    
    try {
      await sql`ALTER TABLE transactions ADD COLUMN paid_by_contact INTEGER`;
      console.log("✓ Added paid_by_contact column");
    } catch (e) {
      if (e.message.includes('already exists') || e.message.includes('duplicate column')) {
        console.log("✓ paid_by_contact column already exists");
      } else {
        throw e;
      }
    }
    
    try {
      await sql`ALTER TABLE transactions ADD COLUMN version INTEGER DEFAULT 1`;
      console.log("✓ Added version column");
    } catch (e) {
      if (e.message.includes('already exists') || e.message.includes('duplicate column')) {
        console.log("✓ version column already exists");
      } else {
        throw e;
      }
    }
    
    try {
      await sql`ALTER TABLE transactions ADD COLUMN parent_transaction_id INTEGER`;
      console.log("✓ Added parent_transaction_id column");
    } catch (e) {
      if (e.message.includes('already exists') || e.message.includes('duplicate column')) {
        console.log("✓ parent_transaction_id column already exists");
      } else {
        throw e;
      }
    }
    
    try {
      await sql`ALTER TABLE transactions ADD COLUMN is_deleted BOOLEAN DEFAULT false`;
      console.log("✓ Added is_deleted column");
    } catch (e) {
      if (e.message.includes('already exists') || e.message.includes('duplicate column')) {
        console.log("✓ is_deleted column already exists");
      } else {
        throw e;
      }
    }
    
    try {
      await sql`ALTER TABLE transactions ADD COLUMN deleted_at TIMESTAMP`;
      console.log("✓ Added deleted_at column");
    } catch (e) {
      if (e.message.includes('already exists') || e.message.includes('duplicate column')) {
        console.log("✓ deleted_at column already exists");
      } else {
        throw e;
      }
    }
    
    try {
      await sql`ALTER TABLE transactions ADD COLUMN deleted_by INTEGER`;
      console.log("✓ Added deleted_by column");
    } catch (e) {
      if (e.message.includes('already exists') || e.message.includes('duplicate column')) {
        console.log("✓ deleted_by column already exists");
      } else {
        throw e;
      }
    }
    
    // Step 2: Update existing records
    console.log("Updating existing records...");
    await sql`UPDATE transactions SET created_by = user_id WHERE created_by IS NULL`;
    await sql`UPDATE transactions SET paid_by = user_id WHERE paid_by IS NULL`;
    await sql`UPDATE transactions SET version = 1 WHERE version IS NULL`;
    await sql`UPDATE transactions SET is_deleted = false WHERE is_deleted IS NULL`;
    console.log("✓ Updated existing records");
    
    // Step 3: Add foreign key constraints
    console.log("Adding foreign key constraints...");
    try {
      await sql`ALTER TABLE transactions ADD CONSTRAINT transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL`;
      console.log("✓ Added created_by foreign key");
    } catch (e) {
      if (e.message.includes('already exists') || e.message.includes('duplicate')) {
        console.log("✓ created_by foreign key already exists");
      } else {
        console.log("Warning: Could not add created_by foreign key:", e.message);
      }
    }
    
    try {
      await sql`ALTER TABLE transactions ADD CONSTRAINT transactions_paid_by_fkey FOREIGN KEY (paid_by) REFERENCES users(id) ON DELETE SET NULL`;
      console.log("✓ Added paid_by foreign key");
    } catch (e) {
      if (e.message.includes('already exists') || e.message.includes('duplicate')) {
        console.log("✓ paid_by foreign key already exists");
      } else {
        console.log("Warning: Could not add paid_by foreign key:", e.message);
      }
    }
    
    try {
      await sql`ALTER TABLE transactions ADD CONSTRAINT transactions_paid_by_contact_fkey FOREIGN KEY (paid_by_contact) REFERENCES contacts(id) ON DELETE SET NULL`;
      console.log("✓ Added paid_by_contact foreign key");
    } catch (e) {
      if (e.message.includes('already exists') || e.message.includes('duplicate')) {
        console.log("✓ paid_by_contact foreign key already exists");
      } else {
        console.log("Warning: Could not add paid_by_contact foreign key:", e.message);
      }
    }
    
    try {
      await sql`ALTER TABLE transactions ADD CONSTRAINT transactions_parent_transaction_id_fkey FOREIGN KEY (parent_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL`;
      console.log("✓ Added parent_transaction_id foreign key");
    } catch (e) {
      if (e.message.includes('already exists') || e.message.includes('duplicate')) {
        console.log("✓ parent_transaction_id foreign key already exists");
      } else {
        console.log("Warning: Could not add parent_transaction_id foreign key:", e.message);
      }
    }
    
    try {
      await sql`ALTER TABLE transactions ADD CONSTRAINT transactions_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL`;
      console.log("✓ Added deleted_by foreign key");
    } catch (e) {
      if (e.message.includes('already exists') || e.message.includes('duplicate')) {
        console.log("✓ deleted_by foreign key already exists");
      } else {
        console.log("Warning: Could not add deleted_by foreign key:", e.message);
      }
    }
    
    // Step 4: Add indexes
    console.log("Adding indexes...");
    try {
      await sql`CREATE INDEX transaction_created_by_idx ON transactions(created_by)`;
      console.log("✓ Added created_by index");
    } catch (e) {
      if (e.message.includes('already exists') || e.message.includes('duplicate')) {
        console.log("✓ created_by index already exists");
      } else {
        console.log("Warning: Could not add created_by index:", e.message);
      }
    }
    
    try {
      await sql`CREATE INDEX transaction_parent_idx ON transactions(parent_transaction_id)`;
      console.log("✓ Added parent_transaction_id index");
    } catch (e) {
      if (e.message.includes('already exists') || e.message.includes('duplicate')) {
        console.log("✓ parent_transaction_id index already exists");
      } else {
        console.log("Warning: Could not add parent_transaction_id index:", e.message);
      }
    }
    
    try {
      await sql`CREATE INDEX transaction_deleted_idx ON transactions(is_deleted)`;
      console.log("✓ Added is_deleted index");
    } catch (e) {
      if (e.message.includes('already exists') || e.message.includes('duplicate')) {
        console.log("✓ is_deleted index already exists");
      } else {
        console.log("Warning: Could not add is_deleted index:", e.message);
      }
    }
    
    // Step 5: Make columns NOT NULL
    console.log("Making columns NOT NULL...");
    try {
      await sql`ALTER TABLE transactions ALTER COLUMN created_by SET NOT NULL`;
      console.log("✓ Set created_by to NOT NULL");
    } catch (e) {
      console.log("Warning: Could not set created_by to NOT NULL:", e.message);
    }
    
    try {
      await sql`ALTER TABLE transactions ALTER COLUMN version SET NOT NULL`;
      console.log("✓ Set version to NOT NULL");
    } catch (e) {
      console.log("Warning: Could not set version to NOT NULL:", e.message);
    }
    
    try {
      await sql`ALTER TABLE transactions ALTER COLUMN is_deleted SET NOT NULL`;
      console.log("✓ Set is_deleted to NOT NULL");
    } catch (e) {
      console.log("Warning: Could not set is_deleted to NOT NULL:", e.message);
    }
    
    // Step 6: Handle group_members unique constraint
    console.log("Adding unique constraint to group_members...");
    try {
      await sql`DELETE FROM group_members ct1 USING group_members ct2 WHERE ct1.id > ct2.id AND ct1.group_id = ct2.group_id AND (ct1.user_id = ct2.user_id OR ct1.contact_id = ct2.contact_id)`;
      await sql`ALTER TABLE group_members ADD CONSTRAINT unique_group_member UNIQUE (group_id, user_id, contact_id)`;
      console.log("✓ Added unique constraint to group_members");
    } catch (e) {
      console.log("Warning: Could not add unique constraint to group_members:", e.message);
    // Step 7: Profiles table notification columns
    console.log("Adding missing columns to profiles table...");
    const profileCols = [
      "expense_notifications BOOLEAN DEFAULT true",
      "settlement_notifications BOOLEAN DEFAULT true",
      "group_notifications BOOLEAN DEFAULT true",
      "invitation_notifications BOOLEAN DEFAULT true",
      "budget_notifications BOOLEAN DEFAULT true",
      "reminder_notifications BOOLEAN DEFAULT true",
      "sound_enabled BOOLEAN DEFAULT true",
      "desktop_notifications BOOLEAN DEFAULT false",
    ];
    for (const colDef of profileCols) {
      try {
        await sql(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ${colDef}`);
      } catch (e) {
        console.log("Warning for profile column:", e.message);
      }
    }
    console.log("✓ Added/verified profiles table notification columns");

    console.log("\n✓ Migration completed successfully!");
  } catch (error) {
    console.error("\n✗ Migration failed:", error);
    process.exit(1);
  }
}

runMigration().then(() => {
  console.log("Migration script finished");
  process.exit(0);
}).catch((error) => {
  console.error("Migration script failed:", error);
  process.exit(1);
});
