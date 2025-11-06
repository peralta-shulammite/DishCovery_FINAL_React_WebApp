# Database Migration Guide

This directory contains SQL migration scripts for the DishCovery recipe management system.

## Migration Files

- **`001_recipe_system_setup.sql`** - Main migration script that creates all required tables and columns
- **`run_migration.js`** - Node.js script to execute the migration safely
- **`README.md`** - This file

---

## What This Migration Does

### 1. Alters `recipes` table
- ✅ Adds `verification_status` column
- ✅ Adds `verifier_name` column
- ✅ Adds `verifier_credentials` column
- ✅ Adds `tried_count` column (engagement metric)
- ✅ Adds `saved_count` column (engagement metric)
- ✅ Modifies `instructions` to TEXT (for JSON storage)
- ✅ Modifies `image_url` to TEXT (for JSON array storage)
- ✅ Adds indexes for performance

### 2. Creates new tables

**`recipe_ingredients`** - Stores ingredients with alternatives
- ingredient_id (PK)
- recipe_id (FK → recipes)
- category (main/condiments/optional)
- ingredient
- alternative
- display_order

**`dietary_tags`** - Lookup table for dietary tags
- tag_id (PK)
- tag_name (UNIQUE)
- description
- is_active

Pre-populated with: Dairy-free, Gluten-free, Halal, Keto, Mediterranean, Paleo, Vegan, Vegetarian

**`recipe_dietary_tags`** - Junction table (many-to-many)
- id (PK)
- recipe_id (FK → recipes)
- tag_id (FK → dietary_tags)

**`recipe_images`** - Alternative to JSON storage (optional)
- image_id (PK)
- recipe_id (FK → recipes)
- image_url
- display_order
- is_primary

---

## How to Run the Migration

### Option 1: Using Node.js Script (Recommended)

```bash
cd backend/migrations
node run_migration.js
```

This will:
- Connect to your database using credentials from `.env`
- Execute all SQL statements
- Show progress for each step
- Verify the migration was successful
- Handle errors gracefully (skip if already exists)

### Option 2: Manual MySQL Execution

If you prefer to run SQL manually:

```bash
mysql -h <host> -P <port> -u <user> -p<password> <database> < 001_recipe_system_setup.sql
```

Or connect to MySQL and copy-paste the SQL.

---

## Verification

After running the migration, verify it worked:

### Check recipes table structure
```sql
DESCRIBE recipes;
```

You should see new columns:
- verification_status
- verifier_name
- verifier_credentials
- tried_count
- saved_count

### Check new tables exist
```sql
SHOW TABLES;
```

You should see:
- recipe_ingredients
- dietary_tags
- recipe_dietary_tags
- recipe_images

### Check dietary tags were populated
```sql
SELECT * FROM dietary_tags;
```

Should return 8 tags.

---

## Rollback

If you need to undo this migration (⚠️ **WARNING: This deletes data!**):

```sql
DROP TABLE IF EXISTS recipe_dietary_tags;
DROP TABLE IF EXISTS recipe_ingredients;
DROP TABLE IF EXISTS recipe_images;
DROP TABLE IF EXISTS dietary_tags;

ALTER TABLE recipes
DROP COLUMN IF EXISTS verification_status,
DROP COLUMN IF EXISTS verifier_name,
DROP COLUMN IF EXISTS verifier_credentials,
DROP COLUMN IF EXISTS tried_count,
DROP COLUMN IF EXISTS saved_count;
```

---

## Troubleshooting

### Error: "Column already exists"
This is normal if you run the migration twice. The script will skip existing columns.

### Error: "Table already exists"
This is normal if tables were created previously. The script will skip existing tables.

### Error: "Access denied"
Check your database credentials in `backend/.env`:
- DB_HOST
- DB_PORT
- DB_USER
- DB_PASSWORD
- DB_NAME

### Error: "Cannot connect to database"
Ensure your database server is running and accessible.

---

## Next Steps

After migration is complete:

1. ✅ Update backend API routes to use new tables
2. ✅ Test CRUD operations in admin panel
3. ✅ Verify frontend displays data correctly

---

## Support

If you encounter issues:
1. Check the error message carefully
2. Verify database credentials
3. Ensure you have proper database permissions (CREATE, ALTER, INSERT)
4. Check the migration log output for details
