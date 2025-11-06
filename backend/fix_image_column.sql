-- Fix image_url column to support base64 images
-- Current: VARCHAR (too small)
-- New: MEDIUMTEXT (supports up to 16MB)

ALTER TABLE recipe_images 
MODIFY COLUMN image_url MEDIUMTEXT NOT NULL;

-- Verify the change
DESCRIBE recipe_images;
