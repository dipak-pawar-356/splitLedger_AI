import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL);
  const userId = 1;

  console.log("Testing individual queries with userId = 1...\n");

  const queries = [
    { name: "1. profiles", q: "SELECT phone FROM profiles WHERE user_id = 1 LIMIT 1" },
    { name: "2. currentMonth tx", q: "SELECT COALESCE(SUM(CASE WHEN type IN ('received', 'lent', 'repaid') THEN amount ELSE 0 END), 0) as income, COALESCE(SUM(CASE WHEN type IN ('paid', 'borrowed') THEN amount ELSE 0 END), 0) as expense, COUNT(*) as count FROM transactions WHERE user_id = 1 AND is_deleted = false" },
    { name: "3. active groups", q: "SELECT g.id, g.public_id, g.name, g.type, g.currency, (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) as member_count FROM groups g INNER JOIN group_members gm ON g.id = gm.group_id WHERE gm.user_id = 1 AND g.is_deleted = false AND g.is_active = true ORDER BY g.created_at DESC LIMIT 6" },
    { name: "4. unique members", q: "SELECT gm.group_id, gm.user_id FROM group_members gm INNER JOIN groups g ON gm.group_id = g.id WHERE g.is_deleted = false AND gm.group_id IN (SELECT group_id FROM group_members WHERE user_id = 1)" },
    { name: "5. pending settlements", q: "SELECT s.id, s.public_id, s.amount, s.from_user_id, s.to_user_id, s.status, u_to.name as to_user_name, u_from.name as from_user_name FROM settlements s LEFT JOIN users u_to ON s.to_user_id = u_to.id LEFT JOIN users u_from ON s.from_user_id = u_from.id WHERE s.is_deleted = false AND s.status = 'pending' AND (s.from_user_id = 1 OR s.to_user_id = 1)" },
    { name: "6. unread notifications", q: "SELECT COUNT(*) as count FROM notifications WHERE user_id = 1 AND read_at IS NULL" },
    { name: "7. invitations", q: "SELECT status FROM invitations WHERE invited_by = 1" },
    { name: "8. contacts", q: "SELECT c.id, c.public_id, c.name, c.email, c.phone, c.avatar, COALESCE(SUM(CASE WHEN s.from_contact_id = c.id AND s.status = 'pending' THEN -s.amount WHEN s.to_contact_id = c.id AND s.status = 'pending' THEN s.amount ELSE 0 END), 0) as balance FROM contacts c LEFT JOIN settlements s ON (s.from_contact_id = c.id OR s.to_contact_id = c.id) WHERE c.user_id = 1 AND c.is_deleted = false GROUP BY c.id, c.public_id, c.name, c.email, c.phone, c.avatar ORDER BY c.name ASC LIMIT 5" },
    { name: "9. recent transactions", q: "SELECT t.id, t.public_id, t.title, t.description, t.type, t.amount, t.currency, t.date, t.status, t.payment_method, c.name as category_name, g.name as group_name, ct.name as contact_name FROM transactions t LEFT JOIN categories c ON t.category_id = c.id LEFT JOIN groups g ON t.group_id = g.id LEFT JOIN contacts ct ON t.contact_id = ct.id WHERE t.user_id = 1 AND t.is_deleted = false ORDER BY t.date DESC LIMIT 8" },
    { name: "10. recent activity", q: "SELECT a.id, a.public_id, a.action, a.entity_type, a.entity_public_id, u.name as user_name, u.avatar as user_avatar, a.reason, a.created_at FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id WHERE a.user_id = 1 ORDER BY a.created_at DESC LIMIT 10" },
    { name: "11. active budgets", q: "SELECT id, public_id, name, amount, alert_threshold FROM budgets WHERE user_id = 1 AND is_deleted = false AND status = 'active'" },
  ];

  for (const { name, q } of queries) {
    try {
      const res = await sql(q);
      console.log(`✓ ${name} succeeded (${res.length} rows)`);
    } catch (e) {
      console.error(`✗ ${name} FAILED:`, e.message);
    }
  }
}

main().catch(console.error);
