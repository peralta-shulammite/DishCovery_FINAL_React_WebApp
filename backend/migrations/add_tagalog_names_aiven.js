import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Aiven Database Configuration
const dbConfig = {
  host: 'dishcovery-mysql-askiapesa-1f7c.i.aivencloud.com',
  port: 26758,
  user: 'avnadmin',
  password: 'AVNS_V_0Tp7_nC5ZERnJ39Zn',
  database: 'dishcovery_db',
  ssl: { rejectUnauthorized: false } // Aiven requires SSL
};

// Comprehensive Tagalog translations mapping
const tagalogTranslations = {
  // Meats & Proteins
  'chicken': 'Manok',
  'pork': 'Baboy',
  'beef': 'Baka',
  'fish': 'Isda',
  'egg': 'Itlog',
  'shrimp': 'Hipon',
  'crab': 'Alimango',
  'squid': 'Pusit',
  'tilapia': 'Tilapia',
  'milkfish': 'Bangus',
  'tuna': 'Tuna',
  'salmon': 'Salmon',
  'chicken breast': 'Pechay ng Manok',
  'ground pork': 'Giniling na Baboy',
  'ground beef': 'Giniling na Baka',
  
  // Vegetables
  'garlic': 'Bawang',
  'onion': 'Sibuyas',
  'tomato': 'Kamatis',
  'ginger': 'Luya',
  'potato': 'Patatas',
  'carrot': 'Karot',
  'cabbage': 'Repolyo',
  'eggplant': 'Talong',
  'okra': 'Okra',
  'string beans': 'Sitaw',
  'string bean': 'Sitaw',
  'squash': 'Kalabasa',
  'sayote': 'Sayote',
  'water spinach': 'Kangkong',
  'asparagus': 'Asparagus',
  'beet': 'Beet',
  'bell pepper': 'Bell Pepper',
  'brussels sprouts': 'Brussels Sprouts',
  'celery': 'Kintsay',
  'corn': 'Mais',
  'cucumber': 'Pipino',
  'green bean': 'Sitaw',
  'green beans': 'Sitaw',
  'green onion': 'Sibuyas na Mura',
  'spinach': 'Spinach',
  'lettuce': 'Lettuce',
  'broccoli': 'Broccoli',
  'cauliflower': 'Cauliflower',
  'pechay': 'Pechay',
  'pechay baguio': 'Pechay Baguio',
  'radish': 'Labanos',
  'bitter melon': 'Ampalaya',
  'ampalaya': 'Ampalaya',
  'winged bean': 'Sigarilyas',
  'jicama': 'Singkamas',
  'chayote': 'Sayote',
  
  // Fruits
  'banana': 'Saging',
  'mango': 'Mangga',
  'pineapple': 'Pinya',
  'coconut': 'Niyog',
  'coconut milk': 'Gata',
  'papaya': 'Papaya',
  'watermelon': 'Pakwan',
  'avocado': 'Abokado',
  'orange': 'Dalandan',
  'lemon': 'Lemon',
  'calamansi': 'Calamansi',
  'guava': 'Bayabas',
  'jackfruit': 'Langka',
  'durian': 'Durian',
  'rambutan': 'Rambutan',
  'lanzones': 'Lanzones',
  'star apple': 'Kaimito',
  'santol': 'Santol',
  
  // Grains & Staples
  'rice': 'Kanin',
  'flour': 'Harina',
  'bread': 'Tinapay',
  'noodles': 'Pansit',
  'pasta': 'Pasta',
  
  // Dairy & Others
  'milk': 'Gatas',
  'butter': 'Mantikilya',
  'cheese': 'Keso',
  'yogurt': 'Yogurt',
  
  // Condiments & Seasonings
  'salt': 'Asin',
  'pepper': 'Paminta',
  'oil': 'Mantika',
  'vinegar': 'Suka',
  'soy sauce': 'Toyo',
  'fish sauce': 'Patis',
  'sugar': 'Asukal',
  'brown sugar': 'Pulang Asukal',
  'honey': 'Honey',
  'oyster sauce': 'Oyster Sauce',
  'sesame oil': 'Sesame Oil',
  
  // Nuts & Legumes
  'peanut': 'Mani',
  'peanuts': 'Mani',
  'almond': 'Almendras',
  'almonds': 'Almendras',
  'cashew': 'Kasuy',
  'cashews': 'Kasuy',
  'mung bean': 'Munggo',
  'mung beans': 'Munggo',
  'tofu': 'Tofu',
  'tofu': 'Tokwa',
  
  // Common recipe terms
  'adobo': 'Adobo',
  'sinigang': 'Sinigang',
  'sinugba': 'Sinugba',
  'tinola': 'Tinola',
  'kare-kare': 'Kare-kare',
  'pancit': 'Pancit',
  'lumpia': 'Lumpia',
  'lechon': 'Lechon',
  'sisig': 'Sisig',
  'bistek': 'Bistek',
  'afritada': 'Afritada',
  'caldereta': 'Caldereta',
  'menudo': 'Menudo',
  'mechado': 'Mechado',
  'paksiw': 'Paksiw',
  'pinakbet': 'Pinakbet',
  'laing': 'Laing',
  'ginataan': 'Ginataan',
  'halo-halo': 'Halo-halo',
  'bibingka': 'Bibingka',
  'puto': 'Puto',
  'kakanin': 'Kakanin',
  'soup': 'Sabaw',
  'stew': 'Nilaga',
  'fried': 'Prito',
  'grilled': 'Inihaw',
  'steamed': 'Steamed',
  'roasted': 'Inihaw',
  'salad': 'Ensalada',
  'dessert': 'Dessert',
  'snack': 'Meryenda',
  'breakfast': 'Almusal',
  'lunch': 'Tanghalian',
  'dinner': 'Hapunan',
  'wrap': 'Wrap',
  'wraps': 'Wraps',
  'stir-fry': 'Ginisang',
  'stir fry': 'Ginisang',
  'curry': 'Kari',
  'scramble': 'Ginisang',
  'scrambled': 'Ginisang',
  'omelette': 'Tortang',
  'omelet': 'Tortang',
  'smoothie': 'Smoothie',
  'toast': 'Toast',
  'bake': 'Inihaw',
  'baked': 'Inihaw',
  'rice bake': 'Inihaw na Kanin'
};

// Function to translate English to Tagalog
function translateToTagalog(englishName) {
  if (!englishName) return null;
  
  const lowerName = englishName.toLowerCase().trim();
  
  // Check exact match first
  if (tagalogTranslations[lowerName]) {
    return tagalogTranslations[lowerName];
  }
  
  // Try to match multi-word phrases first (longer matches first)
  const sortedKeys = Object.keys(tagalogTranslations).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (lowerName.includes(key)) {
      // If the whole name matches a key, return that translation
      if (lowerName === key || lowerName.startsWith(key + ' ') || lowerName.endsWith(' ' + key) || lowerName.includes(' ' + key + ' ')) {
        // For compound names, try to translate parts
        const parts = lowerName.split(/\s+/);
        const translatedParts = parts.map(part => {
          // Remove common punctuation
          const cleanPart = part.replace(/[.,!?;:()]/g, '');
          if (tagalogTranslations[cleanPart]) {
            return tagalogTranslations[cleanPart];
          }
          // If part contains the key, use the translation
          if (cleanPart.includes(key)) {
            return tagalogTranslations[key];
          }
          // Keep common connecting words
          if (['with', 'and', '&', 'or', 'in', 'on', 'at'].includes(cleanPart)) {
            return cleanPart;
          }
          // Capitalize first letter for untranslated words
          return cleanPart.charAt(0).toUpperCase() + cleanPart.slice(1);
        });
        return translatedParts.join(' ');
      }
    }
  }
  
  // Try word-by-word translation
  const words = lowerName.split(/\s+/);
  const translatedWords = words.map(word => {
    const cleanWord = word.replace(/[.,!?;:()]/g, '');
    if (tagalogTranslations[cleanWord]) {
      return tagalogTranslations[cleanWord];
    }
    // Check if word contains any translation key
    for (const [key, value] of Object.entries(tagalogTranslations)) {
      if (cleanWord.includes(key)) {
        return value;
      }
    }
    // Keep common connecting words
    if (['with', 'and', '&', 'or', 'in', 'on', 'at', 'the', 'a', 'an'].includes(cleanWord)) {
      return cleanWord;
    }
    // Capitalize first letter for untranslated words
    return cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1);
  });
  
  return translatedWords.join(' ');
}

async function addTagalogNames() {
  let connection;
  
  try {
    console.log('🔌 Connecting to Aiven database...');
    console.log(`📍 Host: ${dbConfig.host}`);
    console.log(`📍 Database: ${dbConfig.database}`);
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to Aiven database successfully!\n');
    
    // ============================================
    // UPDATE RECIPES TABLE
    // ============================================
    console.log('📋 Fetching all recipes from database...');
    const [recipes] = await connection.query(`
      SELECT recipe_id, recipe_name, subtitle
      FROM recipes
      WHERE is_active = 1
      ORDER BY recipe_name
    `);
    
    console.log(`✅ Found ${recipes.length} active recipes\n`);
    
    let recipesUpdated = 0;
    let recipesSkipped = 0;
    
    for (const recipe of recipes) {
      const recipeId = recipe.recipe_id;
      const recipeName = recipe.recipe_name;
      const currentSubtitle = recipe.subtitle;
      
      // Update even if subtitle exists (force update)
      // Uncomment the lines below if you want to skip existing subtitles
      // if (currentSubtitle && currentSubtitle.trim() !== '') {
      //   console.log(`⏭️  Skipping recipe "${recipeName}" - subtitle already exists: "${currentSubtitle}"`);
      //   recipesSkipped++;
      //   continue;
      // }
      
      // Generate Tagalog translation
      const tagalogName = translateToTagalog(recipeName);
      
      if (tagalogName) {
        try {
          await connection.query(`
            UPDATE recipes
            SET subtitle = ?
            WHERE recipe_id = ?
          `, [tagalogName, recipeId]);
          
          console.log(`✅ Updated recipe "${recipeName}" → "${tagalogName}"`);
          recipesUpdated++;
        } catch (error) {
          console.error(`❌ Error updating recipe "${recipeName}":`, error.message);
        }
      }
    }
    
    console.log(`\n📊 Recipes Summary:`);
    console.log(`   - Updated: ${recipesUpdated}`);
    console.log(`   - Skipped: ${recipesSkipped}`);
    console.log(`   - Total: ${recipes.length}\n`);
    
    // ============================================
    // UPDATE INGREDIENTS TABLE
    // ============================================
    console.log('📋 Fetching all ingredients from database...');
    const [ingredients] = await connection.query(`
      SELECT ingredient_id, ingredient_name, subtitle
      FROM ingredients
      WHERE is_active = 1
      ORDER BY ingredient_name
    `);
    
    console.log(`✅ Found ${ingredients.length} active ingredients\n`);
    
    let ingredientsUpdated = 0;
    let ingredientsSkipped = 0;
    
    for (const ingredient of ingredients) {
      const ingredientId = ingredient.ingredient_id;
      const ingredientName = ingredient.ingredient_name;
      const currentSubtitle = ingredient.subtitle;
      
      // Update even if subtitle exists (force update)
      // Uncomment the lines below if you want to skip existing subtitles
      // if (currentSubtitle && currentSubtitle.trim() !== '') {
      //   console.log(`⏭️  Skipping ingredient "${ingredientName}" - subtitle already exists: "${currentSubtitle}"`);
      //   ingredientsSkipped++;
      //   continue;
      // }
      
      // Generate Tagalog translation
      const tagalogName = translateToTagalog(ingredientName);
      
      if (tagalogName) {
        try {
          await connection.query(`
            UPDATE ingredients
            SET subtitle = ?
            WHERE ingredient_id = ?
          `, [tagalogName, ingredientId]);
          
          console.log(`✅ Updated ingredient "${ingredientName}" → "${tagalogName}"`);
          ingredientsUpdated++;
        } catch (error) {
          console.error(`❌ Error updating ingredient "${ingredientName}":`, error.message);
        }
      }
    }
    
    console.log(`\n📊 Ingredients Summary:`);
    console.log(`   - Updated: ${ingredientsUpdated}`);
    console.log(`   - Skipped: ${ingredientsSkipped}`);
    console.log(`   - Total: ${ingredients.length}\n`);
    
    console.log('✅ Tagalog names update completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the migration
addTagalogNames()
  .then(() => {
    console.log('\n🎉 Migration completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

