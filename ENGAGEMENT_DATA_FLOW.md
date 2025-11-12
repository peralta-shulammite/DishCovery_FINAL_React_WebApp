# Engagement Data Flow: "People Tried This" & "People Saved This"

## 📊 Database Storage

### Table: `user_recipe_interactions`

**Location:** `backend/migrations/create_user_recipe_interactions.js`

**Structure:**
```sql
CREATE TABLE user_recipe_interactions (
  interaction_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  recipe_id INT NOT NULL,
  is_saved TINYINT(1) DEFAULT 0,      -- 1 = saved, 0 = not saved
  is_tried TINYINT(1) DEFAULT 0,      -- 1 = tried, 0 = not tried
  rating INT DEFAULT NULL,
  saved_at DATETIME DEFAULT NULL,
  tried_at DATETIME DEFAULT NULL,
  rated_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_recipe (user_id, recipe_id)
)
```

**Key Points:**
- Each row represents ONE user's interaction with ONE recipe
- `is_saved = 1` means that user saved the recipe
- `is_tried = 1` means that user tried the recipe
- One user can have only ONE row per recipe (UNIQUE constraint)

---

## 💾 Where Data is Saved

### 1. **"People Saved This" (Save/Favorite Recipe)**

**API Endpoint:** `POST /api/user/recipes/:id/save`
**File:** `backend/routes/userRecipes.js` (lines 68-121)

**How it works:**
```javascript
// When user clicks "Save" button:
1. Check if interaction exists for this user + recipe
2. If exists: UPDATE user_recipe_interactions SET is_saved = 1, saved_at = NOW()
3. If not exists: INSERT INTO user_recipe_interactions (user_id, recipe_id, is_saved, saved_at) VALUES (?, ?, 1, NOW())
```

**Frontend Call:**
- `frontend/library/src/app/user/recipe/api.js` → `favoritesAPI.addToFavorites(recipeId)`
- Calls: `POST /api/user/recipes/${recipeId}/save`

---

### 2. **"People Tried This" (Mark Recipe as Tried)**

**API Endpoint:** `POST /api/user/recipes/:id/tried`
**File:** `backend/routes/userRecipes.js` (lines 258-307)

**How it works:**
```javascript
// When user clicks "Tried" button:
1. Check if interaction exists for this user + recipe
2. If exists: UPDATE user_recipe_interactions SET is_tried = 1, tried_at = NOW()
3. If not exists: INSERT INTO user_recipe_interactions (user_id, recipe_id, is_tried, tried_at) VALUES (?, ?, 1, NOW())
```

**Frontend Call:**
- `frontend/library/src/app/user/recipe/api.js` → `triedAPI.markAsTried(recipeId)`
- Calls: `POST /api/user/recipes/${recipeId}/tried`

---

## 📈 How Admin Recipe Cards Calculate Totals

### Admin Recipes Query

**File:** `backend/routes/adminRecipes.js` (lines 206-242)

**SQL Query:**
```sql
SELECT 
  r.recipe_id as id,
  r.recipe_name as title,
  -- ... other recipe fields ...
  COUNT(DISTINCT CASE WHEN uri.is_saved = 1 THEN uri.user_id END) as save_count,
  COUNT(DISTINCT CASE WHEN uri.is_tried = 1 THEN uri.user_id END) as tried_count
FROM recipes r
LEFT JOIN user_recipe_interactions uri ON r.recipe_id = uri.recipe_id
GROUP BY r.recipe_id
```

**How it works:**
1. **LEFT JOIN** with `user_recipe_interactions` to get all interactions for each recipe
2. **COUNT(DISTINCT ...)** counts unique users:
   - `save_count` = number of DISTINCT users where `is_saved = 1`
   - `tried_count` = number of DISTINCT users where `is_tried = 1`
3. **GROUP BY r.recipe_id** ensures one row per recipe with aggregated counts

**Example:**
- Recipe ID 5 has 3 users who saved it and 2 users who tried it
- Query returns: `save_count = 3`, `tried_count = 2`

---

## 🔄 Data Transformation Flow

### Step 1: Database Query Returns Counts
```javascript
// adminRecipes.js line 229-230
save_count: 3,      // from COUNT(DISTINCT ...)
tried_count: 2      // from COUNT(DISTINCT ...)
```

### Step 2: Engagement Object Created
```javascript
// adminRecipes.js line 287-291
const engagement = {
  tried_count: recipe.tried_count || 0,  // 2
  save_count: recipe.save_count || 0,    // 3
  average_rating: recipe.average_rating || 0
};
```

### Step 3: Transformer Converts to Frontend Format
```javascript
// recipeTransformer.js line 100-103
const engagementData = {
  tried: engagement?.tried_count || engagement?.tried || 0,  // 2
  saved: engagement?.save_count || engagement?.saved || 0   // 3
};
```

### Step 4: Frontend Receives Data
```javascript
// Recipe object sent to frontend:
{
  id: 5,
  title: "Recipe Name",
  engagement: {
    tried: 2,    // "2 people tried this"
    saved: 3    // "3 people saved this"
  }
}
```

---

## 🎯 Frontend Display

### Admin Recipe Cards

**File:** `frontend/library/src/app/admin/recipes/page.js` (lines 1055-1062)

**Display Code:**
```jsx
<div className="engagement-badge tried-badge">
  <TryIcon />
  <span>{recipe.engagement?.tried || recipe.tried_count || 0} tried</span>
</div>
<div className="engagement-badge saved-badge">
  <HeartIcon />
  <span>{recipe.engagement?.saved || recipe.save_count || 0} saved</span>
</div>
```

**Recipe Detail Modal:**
```jsx
// Lines 1742-1749
<div className="engagement-badge tried-badge">
  <TryIcon />
  <span>{selectedRecipe.engagement?.tried || selectedRecipe.tried_count || 0} people tried this</span>
</div>
<div className="engagement-badge saved-badge">
  <HeartIcon />
  <span>{selectedRecipe.engagement?.saved || selectedRecipe.save_count || 0} people saved this</span>
</div>
```

---

## ✅ Summary

1. **Data Storage:** `user_recipe_interactions` table
   - `is_saved = 1` → user saved the recipe
   - `is_tried = 1` → user tried the recipe

2. **Data Entry:**
   - Save: `POST /api/user/recipes/:id/save` → sets `is_saved = 1`
   - Tried: `POST /api/user/recipes/:id/tried` → sets `is_tried = 1`

3. **Data Aggregation:**
   - Admin query uses `COUNT(DISTINCT CASE WHEN ...)` to count unique users
   - Returns `save_count` and `tried_count` per recipe

4. **Data Display:**
   - Transformer converts to `engagement.tried` and `engagement.saved`
   - Frontend displays: `{count} people tried this` and `{count} people saved this`

---

## 🔍 Verification

To verify the counts are working:

1. **Check Database:**
   ```sql
   SELECT 
     recipe_id,
     COUNT(DISTINCT CASE WHEN is_saved = 1 THEN user_id END) as save_count,
     COUNT(DISTINCT CASE WHEN is_tried = 1 THEN user_id END) as tried_count
   FROM user_recipe_interactions
   GROUP BY recipe_id;
   ```

2. **Check API Response:**
   - Call `GET /api/admin/recipes`
   - Check `data[].engagement.tried` and `data[].engagement.saved`

3. **Check Frontend:**
   - Open admin recipes page
   - Verify counts match database

---

## 🐛 Common Issues

1. **Counts showing 0:**
   - Check if `user_recipe_interactions` table has data
   - Verify `is_saved = 1` or `is_tried = 1` (not just 0)

2. **Counts not updating:**
   - Check if API endpoints are being called
   - Verify database transactions are committing
   - Check browser console for errors

3. **Wrong counts:**
   - Verify GROUP BY is correct in query
   - Check for duplicate rows in `user_recipe_interactions`
   - Ensure DISTINCT is used in COUNT

