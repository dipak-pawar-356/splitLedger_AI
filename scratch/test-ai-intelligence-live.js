const { db } = require("../src/lib/db");
const { users, profiles, transactions, groups, groupMembers, settlements, categories, budgets } = require("../src/lib/db/schema/schema");
const { eq } = require("drizzle-orm");

async function testLiveAI() {
  console.log("=== Testing Database Connectivity & Financial Data ===");
  const allUsers = await db.select({ id: users.id, name: users.name, email: users.email }).from(users).limit(5);
  console.log("Active users in DB:", allUsers);

  if (allUsers.length === 0) {
    console.log("No users found.");
    return;
  }

  const userId = allUsers[0].id;
  console.log(`Using user ID ${userId} (${allUsers[0].name})`);

  const txCount = await db.select().from(transactions).where(eq(transactions.userId, userId)).limit(5);
  console.log(`User transactions found: ${txCount.length}`);

  const userBudgets = await db.select().from(budgets).where(eq(budgets.userId, userId)).limit(5);
  console.log(`User budgets found: ${userBudgets.length}`);

  const userSettlements = await db.select().from(settlements).limit(5);
  console.log(`Settlements found in DB: ${userSettlements.length}`);

  console.log("Database tables verified successfully.");
}

testLiveAI().then(() => process.exit(0)).catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
