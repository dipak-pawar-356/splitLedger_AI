-- Data Integrity Verification Queries
-- Run these queries to verify referential integrity across the database

-- Check for orphaned transactions (transactions with non-existent users)
SELECT COUNT(*) as orphaned_transactions_user 
FROM transactions t 
LEFT JOIN users u ON t.user_id = u.id 
WHERE u.id IS NULL;

-- Check for orphaned transactions (transactions with non-existent contacts)
SELECT COUNT(*) as orphaned_transactions_contact 
FROM transactions t 
LEFT JOIN contacts c ON t.contact_id = c.id 
WHERE t.contact_id IS NOT NULL AND c.id IS NULL;

-- Check for orphaned transactions (transactions with non-existent groups)
SELECT COUNT(*) as orphaned_transactions_group 
FROM transactions t 
LEFT JOIN groups g ON t.group_id = g.id 
WHERE t.group_id IS NOT NULL AND g.id IS NULL;

-- Check for orphaned group members (members with non-existent groups)
SELECT COUNT(*) as orphaned_group_members_group 
FROM group_members gm 
LEFT JOIN groups g ON gm.group_id = g.id 
WHERE g.id IS NULL;

-- Check for orphaned group members (members with non-existent users)
SELECT COUNT(*) as orphaned_group_members_user 
FROM group_members gm 
LEFT JOIN users u ON gm.user_id = u.id 
WHERE gm.user_id IS NOT NULL AND u.id IS NULL;

-- Check for orphaned group members (members with non-existent contacts)
SELECT COUNT(*) as orphaned_group_members_contact 
FROM group_members gm 
LEFT JOIN contacts c ON gm.contact_id = c.id 
WHERE gm.contact_id IS NOT NULL AND c.id IS NULL;

-- Check for orphaned expense splits (splits with non-existent transactions)
SELECT COUNT(*) as orphaned_expense_splits_transaction 
FROM expense_splits es 
LEFT JOIN transactions t ON es.transaction_id = t.id 
WHERE t.id IS NULL;

-- Check for orphaned settlements (settlements with non-existent groups)
SELECT COUNT(*) as orphaned_settlements_group 
FROM settlements s 
LEFT JOIN groups g ON s.group_id = g.id 
WHERE s.group_id IS NOT NULL AND g.id IS NULL;

-- Check for orphaned settlements (settlements with non-existent from users)
SELECT COUNT(*) as orphaned_settlements_from_user 
FROM settlements s 
LEFT JOIN users u ON s.from_user_id = u.id 
WHERE s.from_user_id IS NOT NULL AND u.id IS NULL;

-- Check for orphaned settlements (settlements with non-existent to users)
SELECT COUNT(*) as orphaned_settlements_to_user 
FROM settlements s 
LEFT JOIN users u ON s.to_user_id = u.id 
WHERE s.to_user_id IS NOT NULL AND u.id IS NULL;

-- Check for orphaned invitations (invitations with non-existent groups)
SELECT COUNT(*) as orphaned_invitations_group 
FROM invitations i 
LEFT JOIN groups g ON i.group_id = g.id 
WHERE g.id IS NULL;

-- Check for orphaned invitations (invitations with non-existent invited by users)
SELECT COUNT(*) as orphaned_invitations_invited_by 
FROM invitations i 
LEFT JOIN users u ON i.invited_by = u.id 
WHERE u.id IS NULL;

-- Check for duplicate publicIds (should be unique)
SELECT public_id, COUNT(*) as count 
FROM transactions 
GROUP BY public_id 
HAVING COUNT(*) > 1;

SELECT public_id, COUNT(*) as count 
FROM contacts 
GROUP BY public_id 
HAVING COUNT(*) > 1;

SELECT public_id, COUNT(*) as count 
FROM groups 
GROUP BY public_id 
HAVING COUNT(*) > 1;

SELECT public_id, COUNT(*) as count 
FROM settlements 
GROUP BY public_id 
HAVING COUNT(*) > 1;

SELECT public_id, COUNT(*) as count 
FROM invitations 
GROUP BY public_id 
HAVING COUNT(*) > 1;

-- Check for transactions with invalid amounts (should be positive)
SELECT COUNT(*) as invalid_amount_transactions 
FROM transactions 
WHERE amount <= 0;

-- Check for settlements with invalid amounts (should be positive)
SELECT COUNT(*) as invalid_amount_settlements 
FROM settlements 
WHERE amount <= 0;

-- Check for expense splits with invalid amounts (should be non-negative)
SELECT COUNT(*) as invalid_amount_expense_splits 
FROM expense_splits 
WHERE amount < 0;
