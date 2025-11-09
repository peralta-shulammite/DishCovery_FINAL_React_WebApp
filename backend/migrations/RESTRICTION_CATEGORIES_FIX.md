# Restriction Categories Table Fix

## Issue
The `restriction_categories` table was experiencing "SQL logic error" when running queries like:
```sql
SELECT * FROM restriction_categories LIMIT 0, 1000
```

## Root Cause
The table structure had two issues:
1. **`category_name` column was nullable** - This could cause issues with constraints and queries
2. **`is_active` column had no default value** - This could cause issues when inserting or querying

## Fix Applied
The fix script (`ensure_restriction_categories_fixed.js`) made the following changes:

1. **Made `category_name` NOT NULL**
   - Changed from nullable to NOT NULL
   - Ensures data integrity

2. **Added default value to `is_active`**
   - Set default value to `1` (active)
   - Ensures consistent behavior

3. **Verified unique constraint**
   - Confirmed unique constraint exists on `category_name`
   - Prevents duplicate category names

## Current Table Structure
```
category_id: INT PRIMARY KEY AUTO_INCREMENT
category_name: VARCHAR(100) NOT NULL UNIQUE
description: TEXT NULLABLE
is_active: TINYINT(1) DEFAULT 1
```

## Test Results
All query formats now work correctly:
- ✅ `SELECT * FROM restriction_categories` - Works
- ✅ `SELECT * FROM restriction_categories LIMIT 0, 1000` - Works
- ✅ `SELECT * FROM restriction_categories LIMIT 1000 OFFSET 0` - Works
- ✅ `SELECT * FROM restriction_categories WHERE is_active = 1` - Works

## Current Data
The table contains 3 categories:
- ID: 1, Name: Allergy, Active: 1
- ID: 2, Name: Intolerance, Active: 1
- ID: 3, Name: Dietary Lifestyle, Active: 0

## How to Run the Fix
If you need to run the fix again:
```bash
cd backend
node migrations/ensure_restriction_categories_fixed.js
```

## Notes
- The fix script is idempotent - it can be run multiple times safely
- The script checks the current structure before making changes
- All changes are logged for transparency

