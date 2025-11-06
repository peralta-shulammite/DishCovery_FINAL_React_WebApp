-- =====================================================
-- DishCovery Recipe System Migration - SIMPLIFIED
-- Version: 001
-- Description: Add missing columns and tables for recipe management
-- Date: 2025-01-05
-- =====================================================

-- Add verification columns (will error if already exists - that's okay!)
ALTER TABLE recipes ADD COLUMN verification_status VARCHAR(100) DEFAULT 'AI-generated';

ALTER TABLE recipes ADD COLUMN verifier_name VARCHAR(100) NULL;

ALTER TABLE recipes ADD COLUMN verifier_credentials VARCHAR(255) NULL;

ALTER TABLE recipes ADD COLUMN tried_count INT DEFAULT 0;

ALTER TABLE recipes ADD COLUMN saved_count INT DEFAULT 0;

-- Modify instructions column to support JSON
ALTER TABLE recipes MODIFY COLUMN instructions TEXT COMMENT 'JSON array of instruction steps';

-- Modify image_url to support multiple images (store as JSON array)
ALTER TABLE recipes MODIFY COLUMN image_url TEXT COMMENT 'JSON array of image URLs';

-- Add indexes (will error if already exists - that's okay!)
CREATE INDEX idx_meal_type ON recipes(meal_type);

CREATE INDEX idx_is_active ON recipes(is_active);

CREATE INDEX idx_verification_status ON recipes(verification_status);

CREATE INDEX idx_created_at ON recipes(created_at);

-- Create recipe_ingredients table
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    ingredient_id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id INT NOT NULL,
    category ENUM('main', 'condiments', 'optional') NOT NULL,
    ingredient VARCHAR(255) NOT NULL,
    alternative VARCHAR(255) NULL COMMENT 'Alternative ingredient for allergies/preferences',
    display_order INT DEFAULT 0 COMMENT 'Order to display ingredient in list',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_recipe_ingredients_recipe
        FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_recipe_id (recipe_id),
    INDEX idx_category (category),
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create dietary_tags lookup table
CREATE TABLE IF NOT EXISTS dietary_tags (
    tag_id INT AUTO_INCREMENT PRIMARY KEY,
    tag_name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) NULL COMMENT 'Description of the dietary tag',
    is_active TINYINT(1) DEFAULT 1 COMMENT 'Whether this tag is active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tag_name (tag_name),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pre-populate dietary_tags
INSERT INTO dietary_tags (tag_name, description) VALUES
    ('Dairy-free', 'Does not contain milk or dairy products'),
    ('Gluten-free', 'Does not contain wheat, barley, rye, or gluten'),
    ('Halal', 'Permissible according to Islamic law'),
    ('Keto', 'Low-carb, high-fat ketogenic diet'),
    ('Mediterranean', 'Based on Mediterranean diet principles'),
    ('Paleo', 'Based on foods similar to what might have been eaten in the Paleolithic era'),
    ('Vegan', 'Does not contain any animal products'),
    ('Vegetarian', 'Does not contain meat or fish')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Create recipe_dietary_tags junction table
CREATE TABLE IF NOT EXISTS recipe_dietary_tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id INT NOT NULL,
    tag_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_recipe_dietary_tags_recipe
        FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_recipe_dietary_tags_tag
        FOREIGN KEY (tag_id) REFERENCES dietary_tags(tag_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY unique_recipe_tag (recipe_id, tag_id),
    INDEX idx_recipe_id (recipe_id),
    INDEX idx_tag_id (tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create recipe_images table (optional)
CREATE TABLE IF NOT EXISTS recipe_images (
    image_id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id INT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    display_order INT DEFAULT 1 COMMENT 'Order to display image (1-4)',
    is_primary TINYINT(1) DEFAULT 0 COMMENT 'Is this the main/featured image?',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_recipe_images_recipe
        FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_recipe_id (recipe_id),
    INDEX idx_is_primary (is_primary),
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
