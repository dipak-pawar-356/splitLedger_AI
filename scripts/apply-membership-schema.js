const { neon } = require("@neondatabase/serverless");

async function run() {
  const connStr = process.env.DATABASE_URL;
  if (!connStr) {
    console.error("DATABASE_URL is not set!");
    process.exit(1);
  }

  console.log("Connecting to Neon PostgreSQL...");
  const sql = neon(connStr);

  try {
    console.log("1. Adding columns to group_members...");
    await sql`ALTER TABLE group_members ADD COLUMN IF NOT EXISTS membership_status TEXT DEFAULT 'active' NOT NULL`;
    console.log("✓ Added membership_status to group_members");
    
    await sql`ALTER TABLE group_members ADD COLUMN IF NOT EXISTS historical_inclusion_decision TEXT`;
    console.log("✓ Added historical_inclusion_decision to group_members");
    
    await sql`ALTER TABLE group_members ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP`;
    console.log("✓ Added activated_at to group_members");
    
    await sql`ALTER TABLE group_members ADD COLUMN IF NOT EXISTS delegated_permissions JSONB DEFAULT '{}'::jsonb`;
    console.log("✓ Added delegated_permissions to group_members");

    await sql`CREATE INDEX IF NOT EXISTS group_member_status_idx ON group_members(membership_status)`;
    console.log("✓ Created index group_member_status_idx");

    console.log("2. Creating table group_join_requests if not exists...");
    await sql`
      CREATE TABLE IF NOT EXISTS group_join_requests (
        id SERIAL PRIMARY KEY,
        public_id TEXT UNIQUE NOT NULL,
        group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        status TEXT DEFAULT 'pending' NOT NULL,
        include_in_historical_expenses BOOLEAN DEFAULT false,
        approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        approved_at TIMESTAMP,
        rejected_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
    console.log("✓ Table group_join_requests ensured");

    await sql`CREATE INDEX IF NOT EXISTS join_request_group_idx ON group_join_requests(group_id)`;
    await sql`CREATE INDEX IF NOT EXISTS join_request_user_idx ON group_join_requests(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS join_request_status_idx ON group_join_requests(status)`;
    await sql`CREATE INDEX IF NOT EXISTS join_request_public_id_idx ON group_join_requests(public_id)`;
    console.log("✓ Created indexes for group_join_requests");

    console.log("3. Verifying columns on group_members...");
    const cols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'group_members'
    `;
    console.log("group_members columns:", cols.map(c => c.column_name).join(", "));

    console.log("MIGRATION COMPLETED SUCCESSFULLY!");
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

run();
