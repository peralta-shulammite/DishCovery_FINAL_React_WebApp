-- ============================================
-- Fix Invalid Image URLs in DishCovery Database
-- ============================================
-- Run this in MySQL Workbench connected to Aiven

-- Step 1: View current invalid URLs
SELECT
    recipe_id,
    image_id,
    LEFT(image_url, 100) as url_preview,
    CHAR_LENGTH(image_url) as url_length,
    CASE
        WHEN image_url LIKE 'blob:%' THEN 'BLOB URL (Invalid)'
        WHEN image_url LIKE '%google.com/imgres%' THEN 'Google Search URL (Invalid)'
        WHEN image_url LIKE 'data:image/%' THEN 'Base64 (Valid)'
        WHEN image_url LIKE 'http%' THEN 'External URL'
        ELSE 'Unknown'
    END as url_type
FROM recipe_images
ORDER BY recipe_id;

-- Step 2: Delete invalid blob URLs
DELETE FROM recipe_images
WHERE image_url LIKE 'blob:%';

-- Step 3: Delete Google search URLs (not direct image links)
DELETE FROM recipe_images
WHERE image_url LIKE '%google.com/imgres%';

-- Step 4: Delete any other invalid URLs
DELETE FROM recipe_images
WHERE image_url NOT LIKE 'http%'
  AND image_url NOT LIKE 'data:image/%';

-- Step 5: Verify cleanup
SELECT
    'After cleanup' as status,
    COUNT(*) as total_images
FROM recipe_images;

-- Step 6: Show recipes without images (need to add images)
SELECT
    r.recipe_id,
    r.recipe_name,
    COUNT(ri.image_id) as image_count
FROM recipes r
LEFT JOIN recipe_images ri ON r.recipe_id = ri.recipe_id
GROUP BY r.recipe_id
HAVING image_count = 0;

-- ============================================
-- Next Steps:
-- 1. Add proper images to recipes via admin panel
-- 2. Use direct image URLs (e.g., from Imgur, Cloudinary)
--    OR upload files (will be converted to base64)
-- ============================================
