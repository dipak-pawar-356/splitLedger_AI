const { neon } = require("@neondatabase/serverless");

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_ingh7PZJQRk0@ep-solitary-unit-azqy8jn9-pooler.c-3.ap-southeast-1.aws.neon.tech/splitledger?sslmode=require&channel_binding=require";

const sql = neon(DATABASE_URL);

async function runMigration() {
  console.log("Applying saved_reports and scheduled_reports migration...");

  try {
    // 1. Create saved_reports table
    await sql`
      CREATE TABLE IF NOT EXISTS saved_reports (
        id SERIAL PRIMARY KEY,
        public_id TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        report_type TEXT NOT NULL,
        filters JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;
    console.log("Created saved_reports table.");

    await sql`CREATE INDEX IF NOT EXISTS saved_report_user_idx ON saved_reports(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS saved_report_public_id_idx ON saved_reports(public_id);`;

    // 2. Create scheduled_reports table
    await sql`
      CREATE TABLE IF NOT EXISTS scheduled_reports (
        id SERIAL PRIMARY KEY,
        public_id TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        saved_report_id INTEGER REFERENCES saved_reports(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        frequency TEXT DEFAULT 'monthly' NOT NULL,
        recipient_email TEXT NOT NULL,
        format TEXT DEFAULT 'pdf' NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        last_run_at TIMESTAMP,
        next_run_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;
    console.log("Created scheduled_reports table.");

    await sql`CREATE INDEX IF NOT EXISTS scheduled_report_user_idx ON scheduled_reports(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS scheduled_report_public_id_idx ON scheduled_reports(public_id);`;
    await sql`CREATE INDEX IF NOT EXISTS scheduled_report_active_idx ON scheduled_reports(is_active);`;

    console.log("Reports migration completed successfully!");
  } catch (error) {
    console.error("Error during migration:", error);
    process.exit(1);
  }
}

runMigration();
