import { neon } from '@neondatabase/serverless';

const url1 = 'postgresql://neondb_owner:npg_B0u2EXZOeLIc@ep-shiny-hall-b3aop30s-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const url2 = 'postgresql://neondb_owner:npg_ingh7PZJQRk0@ep-solitary-unit-azqy8jn9-pooler.c-3.ap-southeast-1.aws.neon.tech/splitledger?sslmode=require&channel_binding=require';

async function test(name, url) {
  console.log(`\n--- Testing ${name} ---`);
  try {
    const sql = neon(url);
    const tables = await sql("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log(`${name} SUCCESS! Found ${tables.length} tables:`, tables.map(t => t.table_name).join(', '));
    if (tables.some(t => t.table_name === 'groups')) {
      const groups = await sql("SELECT id, public_id, name, created_at FROM groups ORDER BY id DESC LIMIT 5");
      console.log(`${name} Groups:`, groups);
    }
  } catch (err) {
    console.error(`${name} ERROR:`, err.message, 'Code:', err.code, 'Status:', err.status);
  }
}

async function run() {
  await test('URL 1 (shiny-hall / neondb)', url1);
  await test('URL 2 (solitary-unit / splitledger - original)', url2);
}

run();
