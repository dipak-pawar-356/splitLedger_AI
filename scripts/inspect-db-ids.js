const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function main() {
  const g = await sql("SELECT id, public_id, name, created_at FROM groups ORDER BY id ASC");
  console.log("GROUPS:", JSON.stringify(g, null, 2));

  const inv = await sql("SELECT id, public_id, group_id, token, status FROM invitations ORDER BY id DESC LIMIT 10");
  console.log("INVITATIONS:", JSON.stringify(inv, null, 2));
}

main().catch(console.error);
