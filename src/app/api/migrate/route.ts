import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    console.log("Starting migration to add missing columns...");
    
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

    // Step 20: Create budgets table
    console.log("Creating budgets table if not exists...");
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS budgets (
          id SERIAL PRIMARY KEY,
          public_id TEXT UNIQUE NOT NULL,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
          group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,
          name TEXT NOT NULL,
          description TEXT,
          amount BIGINT NOT NULL,
          currency TEXT DEFAULT 'INR' NOT NULL,
          period TEXT DEFAULT 'monthly' NOT NULL,
          start_date TIMESTAMP NOT NULL,
          end_date TIMESTAMP NOT NULL,
          alert_threshold INTEGER DEFAULT 80 NOT NULL,
          status TEXT DEFAULT 'active' NOT NULL,
          notes TEXT,
          is_deleted BOOLEAN DEFAULT false NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS budget_user_idx ON budgets(user_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS budget_public_id_idx ON budgets(public_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS budget_category_idx ON budgets(category_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS budget_group_idx ON budgets(group_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS budget_user_deleted_idx ON budgets(user_id, is_deleted)`);
      console.log("budgets table and indexes verified!");
    } catch (e: any) {
      console.log("Error creating budgets table:", e.message);
    }

    // Step 21: Add enterprise notification columns & indexes
    console.log("Verifying notification columns...");
    try {
      await db.execute(sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS public_id TEXT`);
      await db.execute(sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'transaction'`);
      await db.execute(sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium'`);
      await db.execute(sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL`);
      await db.execute(sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL`);
      await db.execute(sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
      await db.execute(sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false`);
      await db.execute(sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false`);
      await db.execute(sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false`);
      await db.execute(sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false`);
      await db.execute(sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`);
      await db.execute(sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`);

      await db.execute(sql`CREATE INDEX IF NOT EXISTS notification_public_id_idx ON notifications(public_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS notification_user_read_idx ON notifications(user_id, is_read)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS notification_user_deleted_idx ON notifications(user_id, is_deleted)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS notification_priority_idx ON notifications(priority)`);

      // Profiles columns
      await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS expense_notifications BOOLEAN DEFAULT true`);
      await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS settlement_notifications BOOLEAN DEFAULT true`);
      await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS group_notifications BOOLEAN DEFAULT true`);
      await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invitation_notifications BOOLEAN DEFAULT true`);
      await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS budget_notifications BOOLEAN DEFAULT true`);
      await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reminder_notifications BOOLEAN DEFAULT true`);
      await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sound_enabled BOOLEAN DEFAULT true`);
      await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS desktop_notifications BOOLEAN DEFAULT false`);
      console.log("Notification columns verified!");
    } catch (e: any) {
      console.log("Error verifying notification columns:", e.message);
    }

    // Step 22: Add extended profile & account management columns
    console.log("Verifying extended profile and account management columns...");
    try {
      await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS public_id TEXT`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS user_public_id_idx ON users(public_id)`);

      await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT`);
      await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT`);
      await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS occupation TEXT`);
      await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company TEXT`);
      await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT`);
      await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth TIMESTAMP`);
      await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India'`);
      await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state TEXT`);
      await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT`);
      await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin_code TEXT`);
      await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS secondary_email TEXT`);
      await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS secondary_phone TEXT`);
      await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp_number TEXT`);
      await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact TEXT`);
      await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mobile_verified BOOLEAN DEFAULT false`);
      await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active'`);
      await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false`);
      await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS recovery_email TEXT`);
      await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS recovery_phone TEXT`);
      await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS recovery_codes JSONB`);
      await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_settings JSONB`);
      await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_sessions JSONB`);
      await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trusted_devices JSONB`);
      await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS login_history JSONB`);
      console.log("Extended profile and account management columns verified!");
    } catch (e: any) {
      console.log("Error verifying extended profile columns:", e.message);
    }

    console.log("Migration completed successfully!");

    return NextResponse.json({ success: true, message: "Migration completed successfully" });
  } catch (error) {
    console.error("Migration failed:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
