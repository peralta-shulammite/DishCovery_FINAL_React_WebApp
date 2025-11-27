-- Manual SQL script to add/fix subtitle columns
-- Run this directly in MySQL Workbench

-- For recipes table
-- Check if tagalog_des exists and subtitle doesn't - rename it
SET @recipes_has_tagalog := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recipes' AND COLUMN_NAME = 'tagalog_des');
SET @recipes_has_subtitle := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recipes' AND COLUMN_NAME = 'subtitle');

-- Case 1: Both exist - copy data and drop tagalog_des
SET @sql_recipes = IF(@recipes_has_subtitle > 0 AND @recipes_has_tagalog > 0,
    'UPDATE recipes SET subtitle = tagalog_des WHERE subtitle IS NULL AND tagalog_des IS NOT NULL; ALTER TABLE recipes DROP COLUMN tagalog_des;',
    IF(@recipes_has_tagalog > 0 AND @recipes_has_subtitle = 0,
        'ALTER TABLE recipes CHANGE COLUMN tagalog_des subtitle VARCHAR(255) NULL;',
        IF(@recipes_has_subtitle = 0 AND @recipes_has_tagalog = 0,
            'ALTER TABLE recipes ADD COLUMN subtitle VARCHAR(255) NULL AFTER recipe_name;',
            'SELECT "recipes.subtitle already exists" as status;'
        )
    )
);

PREPARE stmt_recipes FROM @sql_recipes;
EXECUTE stmt_recipes;
DEALLOCATE PREPARE stmt_recipes;

-- For ingredients table
SET @ingredients_has_tagalog := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ingredients' AND COLUMN_NAME = 'tagalog_des');
SET @ingredients_has_subtitle := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ingredients' AND COLUMN_NAME = 'subtitle');

-- Case 1: Both exist - copy data and drop tagalog_des
SET @sql_ingredients = IF(@ingredients_has_subtitle > 0 AND @ingredients_has_tagalog > 0,
    'UPDATE ingredients SET subtitle = tagalog_des WHERE subtitle IS NULL AND tagalog_des IS NOT NULL; ALTER TABLE ingredients DROP COLUMN tagalog_des;',
    IF(@ingredients_has_tagalog > 0 AND @ingredients_has_subtitle = 0,
        'ALTER TABLE ingredients CHANGE COLUMN tagalog_des subtitle VARCHAR(255) NULL;',
        IF(@ingredients_has_subtitle = 0 AND @ingredients_has_tagalog = 0,
            'ALTER TABLE ingredients ADD COLUMN subtitle VARCHAR(255) NULL AFTER ingredient_name;',
            'SELECT "ingredients.subtitle already exists" as status;'
        )
    )
);

PREPARE stmt_ingredients FROM @sql_ingredients;
EXECUTE stmt_ingredients;
DEALLOCATE PREPARE stmt_ingredients;

SELECT 'Migration completed successfully!' as status;
