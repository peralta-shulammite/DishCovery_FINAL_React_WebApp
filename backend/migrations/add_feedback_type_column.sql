-- Migration: Add feedback_type column to feedback table
-- This allows distinguishing between general feedback, medical condition requests, and issue reports

-- Check if column exists before adding
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'feedback'
    AND COLUMN_NAME = 'feedback_type'
);

-- Add feedback_type column if it doesn't exist
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE feedback ADD COLUMN feedback_type VARCHAR(50) DEFAULT ''general'' AFTER message',
  'SELECT ''Column feedback_type already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update existing rows to have 'general' as default
UPDATE feedback SET feedback_type = 'general' WHERE feedback_type IS NULL OR feedback_type = '';

-- Add comment to column
ALTER TABLE feedback MODIFY COLUMN feedback_type VARCHAR(50) DEFAULT 'general' 
  COMMENT 'Type of feedback: general, medical_condition, issue_report';

