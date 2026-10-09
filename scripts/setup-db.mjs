import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

async function main() {
  const connStr = process.env.DATABASE_URL;
  if (!connStr) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  console.log("Connecting to database at:", connStr.replace(/:[^:@]+@/, ':****@'));
  const sql = neon(connStr);

  const sqlFile = path.resolve(process.cwd(), 'drizzle/0000_previous_mikhail_rasputin.sql');
  const rawSql = fs.readFileSync(sqlFile, 'utf8');

  // Statements separated by --> statement-breakpoint
  const statements = rawSql
    .split('--> statement-breakpoint')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Found ${statements.length} base statements in 0000 migration.`);

  let succeeded = 0;
  let skippedOrFailed = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await sql(stmt);
      succeeded++;
    } catch (err) {
      // If type or table already exists, continue gracefully
      if (err.message && (err.message.includes('already exists') || err.message.includes('duplicate key'))) {
        succeeded++;
      } else {
        console.warn(`Statement ${i + 1} warning: ${err.message}`);
        skippedOrFailed++;
      }
    }
  }

  console.log(`Base migration finished: ${succeeded} succeeded, ${skippedOrFailed} skipped/warned.`);

  // Now run auto-migrate logic
  console.log("\nRunning auto-migration extensions...");
  // We can import or run ensureDatabaseSchema
  const autoMigrateFile = path.resolve(process.cwd(), 'src/lib/db/auto-migrate.ts');
  console.log("Checking tables in database...");

  const tables = await sql("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
  console.log(`Total public tables now: ${tables.length}`);
  console.log(tables.map(t => t.table_name).join(', '));
}

main().catch(console.error);
