// ✅ Shared Ingredient Categories - Synced across all pages
// Based on ingredient_type from Aiven Cloud database
// This ensures consistent category filtering and segregation logic

export const INGREDIENT_CATEGORIES = [
  { id: 'All', name: 'All Items' },
  { id: 'Vegetable', name: 'Vegetables' },
  { id: 'Protein', name: 'Protein' },
  { id: 'Poultry', name: 'Poultry' },
  { id: 'Meat', name: 'Meat' },
  { id: 'Legume', name: 'Legume' },
  { id: 'Herb & Spice', name: 'Herb & Spice' },
  { id: 'Fruit', name: 'Fruit' },
  { id: 'Fish', name: 'Fish' },
  { id: 'Citrus Fruit', name: 'Citrus Fruit' },
];

// ✅ Helper function to get category count based on ingredient_type
export const getCategoryCount = (ingredients, categoryId) => {
  if (categoryId === 'All') {
    return ingredients.length;
  }
  // Filter by ingredient_type (from database) - case-sensitive for consistency
  return ingredients.filter(ingredient => 
    ingredient.ingredient_type && ingredient.ingredient_type === categoryId
  ).length;
};

// ✅ Helper function to filter ingredients by ingredient_type
export const filterByCategory = (ingredients, categoryId) => {
  if (categoryId === 'All') {
    return ingredients;
  }
  // Clean and consistent filtering based on ingredient_type from database
  return ingredients.filter(ingredient => 
    ingredient.ingredient_type && ingredient.ingredient_type === categoryId
  );
};

// ✅ Helper function to get category name by ID
export const getCategoryName = (categoryId) => {
  const category = INGREDIENT_CATEGORIES.find(c => c.id === categoryId);
  return category ? category.name : categoryId;
};

