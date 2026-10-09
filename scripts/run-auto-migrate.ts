import { ensureDatabaseSchema } from '../src/lib/db/auto-migrate';
import { neon } from '@neondatabase/serverless';

async function main() {
  console.log("Running ensureDatabaseSchema...");
  await ensureDatabaseSchema();
  console.log("ensureDatabaseSchema finished successfully!");

  const sql = neon(process.env.DATABASE_URL!);
  const tables = await sql("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
  console.log(`Total public tables now: ${tables.length}`);
  console.log(tables.map(t => t.table_name).join(', '));
}

main().catch(console.error);
