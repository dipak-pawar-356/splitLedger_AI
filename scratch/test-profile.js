const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

async function main() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    
    console.log("Testing with 'paid' and 'received':");
    const res = await sql`
      SELECT 
        COUNT(CASE WHEN group_id IS NULL AND user_id = 1 THEN 1 END) as personal_count,
        COUNT(CASE WHEN group_id IS NOT NULL AND paid_by = 1 THEN 1 END) as group_count,
        COALESCE(SUM(CASE WHEN date >= ${startOfMonth} AND type = 'paid' AND paid_by = 1 THEN amount ELSE 0 END), 0) as monthly_spend,
        COALESCE(SUM(CASE WHEN date >= ${startOfMonth} AND type = 'received' AND user_id = 1 THEN amount ELSE 0 END), 0) as monthly_income,
        COALESCE(MAX(CASE WHEN paid_by = 1 THEN amount ELSE 0 END), 0) as largest_expense
      FROM transactions 
      WHERE is_deleted = false;
    `;
    console.log("Result:", res);
  } catch (err) {
    console.error("General error:", err.message);
  }
}

main();
