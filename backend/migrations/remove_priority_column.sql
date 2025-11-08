-- Migration: Remove priority column from feedback table
-- This migration removes the priority field (low, medium, high) from the feedback system

-- Remove the priority column from the feedback table
ALTER TABLE feedback 
DROP COLUMN IF EXISTS priority;

-- Note: This migration will remove all priority data from existing feedback records
-- Make sure to backup your database before running this migration in production

