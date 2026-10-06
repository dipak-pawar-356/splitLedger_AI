const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_ingh7PZJQRk0@ep-solitary-unit-azqy8jn9-pooler.c-3.ap-southeast-1.aws.neon.tech/splitledger?sslmode=require&channel_binding=require";

const sql = neon(DATABASE_URL);

async function runMigration() {
  console.log("Starting migration for Transaction Versioning & Audit Logs...");

  try {
    // 1. Transactions table columns
    console.log("1. Checking transactions table columns...");
    await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS title TEXT`;
    await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tags JSONB`;
    await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS location TEXT`;
    await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL`;
    await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_personal BOOLEAN DEFAULT true`;
    await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false`;
    await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`;
    await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS deleted_by INTEGER REFERENCES users(id) ON DELETE SET NULL`;
    await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1`;
    await sql`CREATE INDEX IF NOT EXISTS transaction_updated_by_idx ON transactions(updated_by)`;
    await sql`CREATE INDEX IF NOT EXISTS transaction_deleted_idx ON transactions(is_deleted)`;
    await sql`CREATE INDEX IF NOT EXISTS transaction_user_deleted_date_idx ON transactions(user_id, is_deleted, date)`;
    await sql`CREATE INDEX IF NOT EXISTS transaction_group_deleted_idx ON transactions(group_id, is_deleted)`;
    console.log("✓ Transactions table columns updated.");

    // 2. Transaction Versions table
    console.log("2. Creating transaction_versions table...");
    await sql`
      CREATE TABLE IF NOT EXISTS transaction_versions (
        id SERIAL PRIMARY KEY,
        public_id TEXT UNIQUE NOT NULL,
        transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
        version_number INTEGER NOT NULL,
        edited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        reason TEXT,
        changes JSONB NOT NULL,
        snapshot JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS tx_version_tx_idx ON transaction_versions(transaction_id)`;
    await sql`CREATE INDEX IF NOT EXISTS tx_version_tx_ver_idx ON transaction_versions(transaction_id, version_number)`;
    await sql`CREATE INDEX IF NOT EXISTS tx_version_public_id_idx ON transaction_versions(public_id)`;
    await sql`CREATE INDEX IF NOT EXISTS tx_version_edited_by_idx ON transaction_versions(edited_by)`;
    await sql`CREATE INDEX IF NOT EXISTS tx_version_created_idx ON transaction_versions(created_at)`;
    console.log("✓ transaction_versions table created.");

    // 3. Audit Logs table columns
    console.log("3. Enhancing audit_logs table...");
    await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS public_id TEXT UNIQUE`;
    await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_public_id TEXT`;
    await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS before_data JSONB`;
    await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS after_data JSONB`;
    await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS reason TEXT`;
    await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'success'`;
    await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS browser TEXT`;
    await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS device TEXT`;
    
    // Change action column from enum to text if needed, or allow text values
    try {
      await sql`ALTER TABLE audit_logs ALTER COLUMN action TYPE TEXT`;
    } catch (e) {
      console.log("Action column type update note:", e.message);
    }

    await sql`CREATE INDEX IF NOT EXISTS audit_public_id_idx ON audit_logs(public_id)`;
    await sql`CREATE INDEX IF NOT EXISTS audit_entity_public_idx ON audit_logs(entity_type, entity_public_id)`;
    await sql`CREATE INDEX IF NOT EXISTS audit_action_idx ON audit_logs(action)`;
    await sql`CREATE INDEX IF NOT EXISTS audit_created_idx ON audit_logs(created_at)`;
    console.log("✓ audit_logs table enhanced.");

    // 4. Backfill transactions title and default version
    console.log("4. Backfilling default values for transactions...");
    await sql`UPDATE transactions SET title = description WHERE title IS NULL`;
    await sql`UPDATE transactions SET is_personal = (group_id IS NULL) WHERE is_personal IS NULL`;
    await sql`UPDATE transactions SET version = 1 WHERE version IS NULL`;
    await sql`UPDATE transactions SET is_deleted = false WHERE is_deleted IS NULL`;
    console.log("✓ Backfill completed.");

    console.log("🎉 Migration finished successfully!");
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  }
}

runMigration();
