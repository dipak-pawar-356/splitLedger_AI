import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

async function runMigration() {
  console.log("Starting migration to add missing columns...");
  
  try {
    // Step 1: Add missing columns as nullable first
    console.log("Adding missing columns to transactions table...");
    try {
      await db.execute(sql`ALTER TABLE transactions ADD COLUMN created_by INTEGER`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log("created_by column already exists");
      } else {
        throw e;
      }
    }
    
    try {
      await db.execute(sql`ALTER TABLE transactions ADD COLUMN paid_by INTEGER`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log("paid_by column already exists");
      } else {
        throw e;
      }
    }
    
    try {
      await db.execute(sql`ALTER TABLE transactions ADD COLUMN paid_by_contact INTEGER`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log("paid_by_contact column already exists");
      } else {
        throw e;
      }
    }
    
    try {
      await db.execute(sql`ALTER TABLE transactions ADD COLUMN version INTEGER DEFAULT 1`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log("version column already exists");
      } else {
        throw e;
      }
    }
    
    try {
      await db.execute(sql`ALTER TABLE transactions ADD COLUMN parent_transaction_id INTEGER`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log("parent_transaction_id column already exists");
      } else {
        throw e;
      }
    }
    
    try {
      await db.execute(sql`ALTER TABLE transactions ADD COLUMN is_deleted BOOLEAN DEFAULT false`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log("is_deleted column already exists");
      } else {
        throw e;
      }
    }
    
    try {
      await db.execute(sql`ALTER TABLE transactions ADD COLUMN deleted_at TIMESTAMP`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log("deleted_at column already exists");
      } else {
        throw e;
      }
    }
    
    try {
      await db.execute(sql`ALTER TABLE transactions ADD COLUMN deleted_by INTEGER`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log("deleted_by column already exists");
      } else {
        throw e;
      }
    }
    
    // Step 2: Update existing records
    console.log("Updating existing records...");
    await db.execute(sql`UPDATE transactions SET created_by = user_id WHERE created_by IS NULL`);
    await db.execute(sql`UPDATE transactions SET paid_by = user_id WHERE paid_by IS NULL`);
    await db.execute(sql`UPDATE transactions SET version = 1 WHERE version IS NULL`);
    await db.execute(sql`UPDATE transactions SET is_deleted = false WHERE is_deleted IS NULL`);
    
    // Step 3: Add foreign key constraints
    console.log("Adding foreign key constraints...");
    try {
      await db.execute(sql`ALTER TABLE transactions ADD CONSTRAINT transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log("created_by foreign key already exists");
      } else {
        throw e;
      }
    }
    
    try {
      await db.execute(sql`ALTER TABLE transactions ADD CONSTRAINT transactions_paid_by_fkey FOREIGN KEY (paid_by) REFERENCES users(id) ON DELETE SET NULL`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log("paid_by foreign key already exists");
      } else {
        throw e;
      }
    }
    
    try {
      await db.execute(sql`ALTER TABLE transactions ADD CONSTRAINT transactions_paid_by_contact_fkey FOREIGN KEY (paid_by_contact) REFERENCES contacts(id) ON DELETE SET NULL`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log("paid_by_contact foreign key already exists");
      } else {
        throw e;
      }
    }
    
    try {
      await db.execute(sql`ALTER TABLE transactions ADD CONSTRAINT transactions_parent_transaction_id_fkey FOREIGN KEY (parent_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log("parent_transaction_id foreign key already exists");
      } else {
        throw e;
      }
    }
    
    try {
      await db.execute(sql`ALTER TABLE transactions ADD CONSTRAINT transactions_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log("deleted_by foreign key already exists");
      } else {
        throw e;
      }
    }
    
    // Step 4: Add indexes
    console.log("Adding indexes...");
    try {
      await db.execute(sql`CREATE INDEX transaction_created_by_idx ON transactions(created_by)`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log("created_by index already exists");
      } else {
        throw e;
      }
    }
    
    try {
      await db.execute(sql`CREATE INDEX transaction_parent_idx ON transactions(parent_transaction_id)`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log("parent_transaction_id index already exists");
      } else {
        throw e;
      }
    }
    
    try {
      await db.execute(sql`CREATE INDEX transaction_deleted_idx ON transactions(is_deleted)`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log("is_deleted index already exists");
      } else {
        throw e;
      }
    }
    
    // Step 5: Make columns NOT NULL
    console.log("Making columns NOT NULL...");
    try {
      await db.execute(sql`ALTER TABLE transactions ALTER COLUMN created_by SET NOT NULL`);
    } catch (e: any) {
      console.log("Could not set created_by to NOT NULL:", e.message);
    }
    
    try {
      await db.execute(sql`ALTER TABLE transactions ALTER COLUMN version SET NOT NULL`);
    } catch (e: any) {
      console.log("Could not set version to NOT NULL:", e.message);
    }
    
    try {
      await db.execute(sql`ALTER TABLE transactions ALTER COLUMN is_deleted SET NOT NULL`);
    } catch (e: any) {
      console.log("Could not set is_deleted to NOT NULL:", e.message);
    }
    
    // Step 6: Handle group_members unique constraint
    console.log("Adding unique constraint to group_members...");
    try {
      await db.execute(sql`DELETE FROM group_members ct1 USING group_members ct2 WHERE ct1.id > ct2.id AND ct1.group_id = ct2.group_id AND (ct1.user_id = ct2.user_id OR ct1.contact_id = ct2.contact_id)`);
      await db.execute(sql`ALTER TABLE group_members ADD CONSTRAINT unique_group_member UNIQUE (group_id, user_id, contact_id)`);
    } catch (e: any) {
      console.log("Could not add unique constraint to group_members:", e.message);
    }

    // Step 7: Add missing columns to group_members table
    console.log("Adding missing columns to group_members table...");
    try {
      await db.execute(sql`ALTER TABLE group_members ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT false`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log("is_guest column already exists in group_members");
      } else {
        throw e;
      }
    }

    try {
      await db.execute(sql`ALTER TABLE group_members ADD COLUMN IF NOT EXISTS nickname TEXT`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log("nickname column already exists in group_members");
      } else {
        throw e;
      }
    }

    try {
      await db.execute(sql`ALTER TABLE group_members ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP DEFAULT NOW()`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log("joined_at column already exists in group_members");
      } else {
        throw e;
      }
    }

    try {
      await db.execute(sql`ALTER TABLE group_members ADD COLUMN IF NOT EXISTS invitation_id INTEGER`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log("invitation_id column already exists in group_members");
      } else {
        throw e;
      }
    }

    // Update existing records
    console.log("Updating group_members existing records...");
    await db.execute(sql`UPDATE group_members SET is_guest = false WHERE is_guest IS NULL`);
    await db.execute(sql`UPDATE group_members SET joined_at = NOW() WHERE joined_at IS NULL`);

    // Add foreign key constraint for invitation_id
    console.log("Adding foreign key constraint for invitation_id...");
    try {
      await db.execute(sql`ALTER TABLE group_members ADD CONSTRAINT group_members_invitation_id_fkey FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE SET NULL`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log("invitation_id foreign key already exists");
      } else {
        throw e;
      }
    }

    // Add index for invitation_id
    console.log("Adding index for invitation_id...");
    try {
      await db.execute(sql`CREATE INDEX IF NOT EXISTS group_member_invitation_idx ON group_members(invitation_id)`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log("invitation_id index already exists");
      } else {
        throw e;
      }
    }

    // Step 8: Add soft delete columns to groups table
    console.log("Adding soft delete columns to groups table...");
    try {
      await db.execute(sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log("groups.is_deleted column already exists");
      } else {
        throw e;
      }
    }

    try {
      await db.execute(sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log("groups.deleted_at column already exists");
      } else {
        throw e;
      }
    }

    try {
      await db.execute(sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS deleted_by INTEGER`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log("groups.deleted_by column already exists");
      } else {
        throw e;
      }
    }

    // Update existing records
    console.log("Updating groups existing records...");
    await db.execute(sql`UPDATE groups SET is_deleted = false WHERE is_deleted IS NULL`);

    // Add foreign key constraint for deleted_by
    console.log("Adding foreign key constraint for groups.deleted_by...");
    try {
      await db.execute(sql`ALTER TABLE groups ADD CONSTRAINT groups_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log("groups.deleted_by foreign key already exists");
      } else {
        throw e;
      }
    }

    // Add index for is_deleted
    console.log("Adding index for groups.is_deleted...");
    try {
      await db.execute(sql`CREATE INDEX IF NOT EXISTS groups_deleted_idx ON groups(is_deleted)`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log("groups.is_deleted index already exists");
      } else {
        throw e;
      }
    }

    // Make is_deleted NOT NULL
    try {
      await db.execute(sql`ALTER TABLE groups ALTER COLUMN is_deleted SET NOT NULL`);
    } catch (e: any) {
      console.log("Could not set groups.is_deleted to NOT NULL:", e.message);
    }

    // Step 9: Add soft delete columns to settlements table
    console.log("Adding soft delete columns to settlements table...");
    try {
      await db.execute(sql`ALTER TABLE settlements ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log("settlements.is_deleted column already exists");
      } else {
        throw e;
      }
    }

    try {
      await db.execute(sql`ALTER TABLE settlements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log("settlements.deleted_at column already exists");
      } else {
        throw e;
      }
    }

    try {
      await db.execute(sql`ALTER TABLE settlements ADD COLUMN IF NOT EXISTS deleted_by INTEGER`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log("settlements.deleted_by column already exists");
      } else {
        throw e;
      }
    }

    // Update existing records
    console.log("Updating settlements existing records...");
    await db.execute(sql`UPDATE settlements SET is_deleted = false WHERE is_deleted IS NULL`);

    // Add foreign key constraint for deleted_by
    console.log("Adding foreign key constraint for settlements.deleted_by...");
    try {
      await db.execute(sql`ALTER TABLE settlements ADD CONSTRAINT settlements_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log("settlements.deleted_by foreign key already exists");
      } else {
        throw e;
      }
    }

    // Add index for is_deleted
    console.log("Adding index for settlements.is_deleted...");
    try {
      await db.execute(sql`CREATE INDEX IF NOT EXISTS settlements_deleted_idx ON settlements(is_deleted)`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log("settlements.is_deleted index already exists");
      } else {
        throw e;
      }
    }

    // Make is_deleted NOT NULL
    try {
      await db.execute(sql`ALTER TABLE settlements ALTER COLUMN is_deleted SET NOT NULL`);
    } catch (e: any) {
      console.log("Could not set settlements.is_deleted to NOT NULL:", e.message);
    }

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

runMigration().then(() => {
  console.log("Migration script finished");
  process.exit(0);
}).catch((error) => {
  console.error("Migration script failed:", error);
  process.exit(1);
});
