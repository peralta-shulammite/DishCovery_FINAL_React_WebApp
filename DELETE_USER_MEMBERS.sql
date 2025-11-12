-- SQL to delete all records from user_members table
-- IMPORTANT: Must delete child records first due to foreign key constraints
-- Works with Aiven cloud database and safe update mode

-- Step 1: Disable safe update mode temporarily
SET SQL_SAFE_UPDATES = 0;

-- Step 2: Delete from child tables first (to avoid foreign key constraint errors)
-- Delete member-related restrictions
DELETE FROM user_restrictions WHERE member_id IS NOT NULL;

-- Delete member-related excluded ingredients  
DELETE FROM user_excluded_ingredients WHERE member_id IS NOT NULL;

-- Step 3: Now delete from user_members (all records)
DELETE FROM user_members;

-- Step 4: Reset auto-increment counter
ALTER TABLE user_members AUTO_INCREMENT = 1;

-- Step 5: Re-enable safe update mode
SET SQL_SAFE_UPDATES = 1;

-- ============================================
-- ALTERNATIVE: If you want to delete only for specific user_id
-- ============================================
-- SET SQL_SAFE_UPDATES = 0;
-- 
-- -- Get member IDs for the user first
-- -- Then delete child records
-- DELETE ur FROM user_restrictions ur
-- INNER JOIN user_members um ON ur.member_id = um.member_id
-- WHERE um.user_id = 132;
-- 
-- DELETE uei FROM user_excluded_ingredients uei
-- INNER JOIN user_members um ON uei.member_id = um.member_id
-- WHERE um.user_id = 132;
-- 
-- -- Then delete members
-- DELETE FROM user_members WHERE user_id = 132;
-- 
-- SET SQL_SAFE_UPDATES = 1;

