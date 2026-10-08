const { neon } = require('@neondatabase/serverless');
const crypto = require('crypto');

const sql = neon(process.env.DATABASE_URL);

function generateRandomNumericId(length = 16, excludeIds = []) {
  const targetLength = Math.max(15, Math.min(20, length));
  while (true) {
    const bytes = crypto.randomBytes(targetLength);
    const firstDigit = ((bytes[0] % 9) + 1).toString();
    let restDigits = '';
    for (let i = 1; i < targetLength; i++) {
      restDigits += (bytes[i] % 10).toString();
    }
    const id = firstDigit + restDigits;
    if (!excludeIds.includes(id)) {
      return id;
    }
  }
}

async function run() {
  console.log("Applying column alterations...");
  await sql("ALTER TABLE groups ADD COLUMN IF NOT EXISTS legacy_public_id text;");
  await sql("ALTER TABLE invitations ADD COLUMN IF NOT EXISTS legacy_token text;");

  console.log("Fetching existing groups...");
  const existingGroups = await sql("SELECT id, public_id, name FROM groups ORDER BY id ASC");
  
  const assignedGroupIds = [];

  for (const group of existingGroups) {
    const isAlreadyNumeric15to20 = /^\d{15,20}$/.test(group.public_id);
    if (!isAlreadyNumeric15to20) {
      const newNumericId = generateRandomNumericId(16, assignedGroupIds);
      assignedGroupIds.push(newNumericId);
      console.log(`Migrating Group ${group.id} ("${group.name}"): "${group.public_id}" -> "${newNumericId}"`);
      await sql(
        "UPDATE groups SET public_id = $1, legacy_public_id = $2 WHERE id = $3",
        [newNumericId, group.public_id, group.id]
      );
    } else {
      assignedGroupIds.push(group.public_id);
      console.log(`Group ${group.id} already has 15-20 digit ID: ${group.public_id}`);
    }
  }

  console.log("Fetching existing invitations...");
  const existingInvitations = await sql("SELECT id, public_id, group_id, token, status FROM invitations ORDER BY id ASC");
  
  const assignedInvitationTokens = [];

  for (const inv of existingInvitations) {
    const isToken15to20 = /^\d{15,20}$/.test(inv.token);
    // Find the group's current publicId
    const [groupRecord] = await sql("SELECT public_id FROM groups WHERE id = $1", [inv.group_id]);
    const groupPublicId = groupRecord ? groupRecord.public_id : "";
    const exclude = [...assignedGroupIds, groupPublicId, String(inv.group_id), ...assignedInvitationTokens];

    if (!isToken15to20) {
      const newToken = generateRandomNumericId(16, exclude);
      const newPublicId = generateRandomNumericId(16, [...exclude, newToken]);
      assignedInvitationTokens.push(newToken);

      console.log(`Migrating Invitation ${inv.id}: Token "${inv.token}" -> "${newToken}", publicId "${inv.public_id}" -> "${newPublicId}"`);
      await sql(
        "UPDATE invitations SET token = $1, legacy_token = $2, public_id = $3 WHERE id = $4",
        [newToken, inv.token, newPublicId, inv.id]
      );
    } else {
      assignedInvitationTokens.push(inv.token);
      console.log(`Invitation ${inv.id} already has 15-20 digit token: ${inv.token}`);
    }
  }

  console.log("Migration completed successfully!");
  const updatedGroups = await sql("SELECT id, public_id, legacy_public_id, name FROM groups ORDER BY id ASC");
  console.log("UPDATED GROUPS:", JSON.stringify(updatedGroups, null, 2));

  const updatedInv = await sql("SELECT id, public_id, group_id, token, legacy_token, status FROM invitations ORDER BY id DESC LIMIT 5");
  console.log("UPDATED INVITATIONS:", JSON.stringify(updatedInv, null, 2));
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
