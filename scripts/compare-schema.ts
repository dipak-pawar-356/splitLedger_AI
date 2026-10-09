import { neon } from '@neondatabase/serverless';
import * as schema from '../src/lib/db/schema/schema';
import { getTableColumns } from 'drizzle-orm';

async function main() {
  const sql = neon(process.env.DATABASE_URL);
  
  const dbColumns = await sql("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public'");
  
  const dbColMap = new Map();
  for (const row of dbColumns) {
    if (!dbColMap.has(row.table_name)) {
      dbColMap.set(row.table_name, new Set());
    }
    dbColMap.get(row.table_name).add(row.column_name);
  }

  const missingColumns = [];

  for (const [key, val] of Object.entries(schema)) {
    // Check if it's a pgTable
    if (val && typeof val === 'object' && val[Symbol.for('drizzle:Name')]) {
      const tableName = val[Symbol.for('drizzle:Name')];
      const tableInDb = dbColMap.get(tableName);
      if (!tableInDb) {
        console.warn(`TABLE MISSING IN DB: ${tableName}`);
        continue;
      }

      const cols = getTableColumns(val);
      for (const [colKey, colObj] of Object.entries(cols)) {
        const colName = colObj.name;
        if (!tableInDb.has(colName)) {
          missingColumns.push({ table: tableName, column: colName, type: colObj.columnType });
        }
      }
    }
  }

  console.log(`Found ${missingColumns.length} missing columns across all tables:`);
  for (const m of missingColumns) {
    console.log(`- ${m.table}.${m.column} (${m.type})`);
  }
}

main().catch(console.error);
