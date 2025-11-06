# Dietary Restrictions System - Database Structure

## Overview

The DishCovery dietary restrictions system uses a categorized approach to organize user dietary needs, food allergies, and intolerances.

---

## Database Tables

### 1. `restriction_categories`

Defines the main categories for organizing restrictions.

| category_id | category_name     | description                                              |
|-------------|-------------------|----------------------------------------------------------|
| 1           | Allergy           | Food allergies that can cause adverse reactions          |
| 2           | Intolerance       | Food intolerances and medical conditions affecting diet  |
| 3           | Dietary Lifestyle | Dietary preferences and lifestyle choices                |

---

### 2. `restrictions`

Stores all available dietary restrictions, mapped to categories.

**Structure:**
```sql
CREATE TABLE restrictions (
    restriction_id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    restriction_name VARCHAR(100) NOT NULL,
    description TEXT,
    severity_level VARCHAR(50),
    requires_admin_approval TINYINT(1),
    is_active TINYINT(1),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES restriction_categories(category_id)
);
```

**Current Data (17 restrictions):**

#### Category 1: Allergy (10 restrictions)
All marked as **severe** severity level

| ID  | Restriction Name | Description |
|-----|------------------|-------------|
| 6   | Nut allergy | Allergic to tree nuts (almonds, walnuts, cashews, pecans, hazelnuts) |
| 7   | Peanut allergy | Allergic to peanuts and peanut-derived ingredients |
| 8   | Shellfish allergy | Allergic to shellfish (shrimp, crab, lobster, clams, mussels) |
| 9   | Fish allergy | Allergic to all types of fish |
| 10  | Egg allergy | Allergic to eggs and egg-derived ingredients |
| 11  | Soy allergy | Allergic to soybeans and soy-based products |
| 12  | Dairy allergy | Allergic to milk proteins (casein or whey) |
| 13  | Wheat allergy | Allergic to wheat and wheat-derived ingredients |
| 14  | Sesame allergy | Allergic to sesame seeds and sesame oil |
| 15  | Legume allergy | Allergic to legumes (beans, lentils, chickpeas, peas) |

#### Category 2: Intolerance (2 restrictions)

| ID  | Restriction Name | Severity | Description |
|-----|------------------|----------|-------------|
| 16  | Celiac disease | severe | Autoimmune disorder requiring strict gluten-free diet |
| 17  | Lactose intolerance | moderate | Difficulty digesting lactose (milk sugar) |

#### Category 3: Dietary Lifestyle (5 restrictions)
All marked as **moderate** severity level

| ID  | Restriction Name | Description |
|-----|------------------|-------------|
| 1   | Dairy free | Does not consume milk, cheese, butter, or any dairy products |
| 2   | Gluten free | Avoids wheat, barley, rye, and gluten-containing grains |
| 3   | Halal | Follows Islamic dietary laws and food preparation standards |
| 4   | Vegan | Excludes all animal products including meat, dairy, eggs, and honey |
| 5   | Vegetarian | Does not consume meat or fish, may include dairy and eggs |

---

### 3. Related Tables

#### `user_restrictions`
Maps users to their selected restrictions.

```sql
- user_id (FK → users)
- restriction_id (FK → restrictions)
- member_id (optional, for household members)
- approved_by (FK → admin_users, if requires_admin_approval)
```

#### `recipe_restrictions`
Maps recipes to restrictions they satisfy/avoid.

```sql
- recipe_id (FK → recipes)
- restriction_id (FK → restrictions)
```

---

## Key Design Decisions

### 1. Severity Levels
- **Severe**: All allergies and celiac disease (life-threatening or serious health impact)
- **Moderate**: Dietary lifestyle choices and lactose intolerance

### 2. Admin Approval
- Currently all restrictions have `requires_admin_approval = 0`
- Can be enabled for custom user-requested restrictions in the future

### 3. Separation of Allergies vs Dietary Preferences
- **Allergies** (Category 1): Medical conditions requiring strict avoidance
- **Intolerances** (Category 2): Digestive or autoimmune conditions
- **Dietary Lifestyle** (Category 3): Personal choices and preferences

### 4. Dairy Allergy vs Dairy Free
- **Dairy allergy** (Category 1): Medical allergy to milk proteins
- **Dairy free** (Category 3): Lifestyle choice to avoid dairy
- Users can select both if needed

### 5. Gluten Intolerance Variants
- **Celiac disease** (Category 2): Severe autoimmune disorder
- **Gluten free** (Category 3): Lifestyle choice or mild sensitivity

---

## Migration History

### Migration 003 (2025-01-06)
**Purpose**: Restructure restrictions system with proper categorization

**Changes Made**:
1. Cleared all existing user_restrictions and recipe_restrictions
2. Deleted and reset restrictions table
3. Updated restriction_categories names and descriptions:
   - "Allergies" → "Allergy"
   - "Health Conditions" → "Intolerance"
   - "Dietary Lifestyle" (unchanged)
4. Populated 17 new restrictions across 3 categories
5. Set appropriate severity levels (severe for allergies, moderate for lifestyle)

**Impact**:
- ⚠️ **All user restriction selections were cleared** (empty database, so no impact)
- ✅ System now has standardized, categorized restrictions
- ✅ Frontend can filter/display restrictions by category
- ✅ Recipe matching can prioritize by severity level

---

## Usage in Application

### Frontend Display
```javascript
// Group restrictions by category for display
const groupedRestrictions = {
  'Allergy': [...],          // Show with warning icon
  'Intolerance': [...],       // Show with caution icon
  'Dietary Lifestyle': [...]  // Show with preference icon
};
```

### Recipe Filtering
```sql
-- Find recipes that match user's restrictions
SELECT r.*
FROM recipes r
WHERE NOT EXISTS (
    SELECT 1
    FROM user_restrictions ur
    JOIN restrictions res ON ur.restriction_id = res.restriction_id
    WHERE ur.user_id = ?
    AND res.severity_level = 'severe'
    AND r.recipe_id NOT IN (
        SELECT recipe_id
        FROM recipe_restrictions
        WHERE restriction_id = ur.restriction_id
    )
);
```

---

## Future Enhancements

1. **Custom User Restrictions**
   - Allow users to add custom restrictions with admin approval
   - Store in same table with `requires_admin_approval = 1`

2. **Ingredient-Level Mapping**
   - Link restrictions to specific ingredients
   - Auto-detect recipe compliance based on ingredients

3. **Severity-Based Warnings**
   - Show different warning levels in UI based on severity
   - Require confirmation for severe allergies

4. **Restriction Combinations**
   - Track common restriction combinations (e.g., Vegan → Dairy free + Egg allergy)
   - Suggest related restrictions when user selects one

---

## Rollback

If you need to restore previous state:

```sql
-- Clear new data
DELETE FROM user_restrictions;
DELETE FROM recipe_restrictions;
DELETE FROM restrictions;

-- Would need to re-import old restrictions data from backup
-- (Current migration had empty dependencies, so nothing to restore)
```

---

## Verification Query

To verify the current state:

```sql
SELECT
    rc.category_name,
    COUNT(r.restriction_id) as count,
    GROUP_CONCAT(r.restriction_name ORDER BY r.restriction_name SEPARATOR ', ') as restrictions
FROM restriction_categories rc
LEFT JOIN restrictions r ON rc.category_id = r.category_id
WHERE r.is_active = 1
GROUP BY rc.category_id, rc.category_name
ORDER BY rc.category_id;
```

Expected output:
- Allergy: 10 restrictions
- Intolerance: 2 restrictions
- Dietary Lifestyle: 5 restrictions
- **Total: 17 active restrictions**
