-- Migration: Add verification columns to recipes table
-- This adds the verification_status, verifier_name, and verifier_credentials columns
-- to the recipes table for storing recipe verification information

-- Check if columns exist before adding (MySQL doesn't support IF NOT EXISTS for ALTER TABLE)
-- Run this migration on both local and cloud databases

ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(255) NULL 
AFTER updated_at;

ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS verifier_name VARCHAR(255) NULL 
AFTER verification_status;

ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS verifier_credentials VARCHAR(500) NULL 
AFTER verifier_name;

-- Note: If your MySQL version doesn't support IF NOT EXISTS in ALTER TABLE,
-- you may need to check manually or use a stored procedure.
-- For Aiven/MySQL 8.0+, you can use:
-- ALTER TABLE recipes 
-- ADD COLUMN verification_status VARCHAR(255) NULL AFTER updated_at,
-- ADD COLUMN verifier_name VARCHAR(255) NULL AFTER verification_status,
-- ADD COLUMN verifier_credentials VARCHAR(500) NULL AFTER verifier_name;

