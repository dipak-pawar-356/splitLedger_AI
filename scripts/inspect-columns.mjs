import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL);
  
  const notifCols = await sql("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'notifications'");
  console.log("Notifications columns:", notifCols.map(c => c.column_name).join(', '));

  const invCols = await sql("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'invitations'");
  console.log("Invitations columns:", invCols.map(c => c.column_name).join(', '));
}

main().catch(console.error);
