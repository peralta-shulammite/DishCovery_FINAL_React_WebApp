'use client';
import React, { useState } from 'react';
import AdminLayout from '../../components/adminlayout';
import './styles.css';

const RecipeManagementContent = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('This Week');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [mealTypeFilter, setMealTypeFilter] = useState('All');
  const [healthFilter, setHealthFilter] = useState('All');
  const [editingRecipeId, setEditingRecipeId] = useState(null);

  // Sample recipe data
  const [recipes, setRecipes] = useState([
    {
      id: 1,
      title: "Quinoa Buddha Bowl",
      description: "Nutritious bowl with quinoa, roasted vegetables, and tahini dressing",
      images: ["/api/placeholder/300/200"],
      mealType: "Heavy Meal",
      instructions: [
        "Cook quinoa according to package directions",
        "Roast vegetables at 400°F for 25 minutes",
        "Prepare tahini dressing by whisking tahini, lemon juice, and water",
        "Assemble bowl with quinoa, vegetables, and dressing"
      ],
      ingredients: {
        main: ["Quinoa", "Sweet potato", "Broccoli", "Chickpeas"],
        condiments: ["Tahini", "Lemon juice", "Olive oil"],
        optional: ["Avocado", "Pumpkin seeds", "Fresh herbs"]
      },
      dietaryTags: ["Vegan", "Gluten-free", "High-protein"],
      healthTags: ["Diabetic-safe", "Heart-healthy"],
      verificationStatus: "Checked by: Dr. Sarah Johnson, Nutritionist",
      engagement: { tried: 245, saved: 189 },
      dateAdded: "2024-01-15"
    },
    {
      id: 2,
      title: "Green Smoothie Bowl",
      description: "Refreshing smoothie bowl with spinach, banana, and tropical fruits",
      images: ["/api/placeholder/300/200"],
      mealType: "Smoothie",
      instructions: [
        "Blend spinach, banana, and mango until smooth",
        "Pour into bowl",
        "Top with granola, coconut flakes, and fresh berries",
        "Drizzle with honey if desired"
      ],
      ingredients: {
        main: ["Spinach", "Banana", "Mango", "Coconut milk"],
        condiments: ["Honey", "Chia seeds"],
        optional: ["Granola", "Coconut flakes", "Fresh berries"]
      },
      dietaryTags: ["Vegan", "Raw", "Dairy-free"],
      healthTags: ["Antioxidant-rich", "Peanut-free"],
      verificationStatus: "AI-generated",
      engagement: { tried: 156, saved: 234 },
      dateAdded: "2024-01-20"
    },
    {
      id: 3,
      title: "Mediterranean Grilled Chicken",
      description: "Herb-marinated chicken with Mediterranean vegetables",
      images: ["/api/placeholder/300/200"],
      mealType: "Heavy Meal",
      instructions: [
        "Marinate chicken in olive oil, lemon, and herbs for 2 hours",
        "Grill chicken for 6-8 minutes per side",
        "Roast vegetables with olive oil and seasonings",
        "Serve with tzatziki sauce"
      ],
      ingredients: {
        main: ["Chicken breast", "Zucchini", "Bell peppers", "Red onion"],
        condiments: ["Olive oil", "Lemon juice", "Greek yogurt", "Garlic"],
        optional: ["Feta cheese", "Olives", "Fresh herbs"]
      },
      dietaryTags: ["Gluten-free", "High-protein", "Mediterranean"],
      healthTags: ["Heart-healthy", "Low-carb"],
      verificationStatus: "Checked by: Maria Rodriguez, Dietitian",
      engagement: { tried: 312, saved: 267 },
      dateAdded: "2024-01-18"
    }
  ]);

  // Form state for adding/editing recipes
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    images: [],
    mealType: 'Light Meal',
    instructions: [''],
    ingredients: {
      main: [''],
      condiments: [''],
      optional: ['']
    },
    dietaryTags: [],
    healthTags: [],
    verificationStatus: 'AI-generated',
    verifierName: '',
    verifierCredentials: ''
  });

  const mealTypes = ['Breakfast', 'Dessert', 'Dinner', 'Heavy Meal', 'Light Meal', 'Lunch', 'Smoothie', 'Snack'].sort();
  const dietaryOptions = ['Dairy-free', 'Gluten-free', 'Halal', 'Keto', 'Mediterranean', 'Paleo', 'Vegan', 'Vegetarian'].sort();
  const healthOptions = ['Antioxidant-rich', 'Diabetic-safe', 'Heart-healthy', 'High-protein', 'Low-carb', 'Low-sodium', 'Peanut-free'].sort();

  const handleAddRecipe = () => {
    setEditingRecipeId(null);
    resetForm();
    setShowAddModal(true);
  };

  const handleViewRecipe = (recipe) => {
    setSelectedRecipe(recipe);
    setShowViewModal(true);
  };

  const handleEditRecipe = (recipe) => {
    setEditingRecipeId(recipe.id);
    setFormData({
      ...recipe,
      verifierName: recipe.verificationStatus.includes('Checked by') ? recipe.verificationStatus.split(': ')[1].split(', ')[0] : '',
      verifierCredentials: recipe.verificationStatus.includes('Checked by') ? recipe.verificationStatus.split(', ')[1] || '' : ''
    });
    setShowViewModal(false);
    setShowAddModal(true);
  };

  const handleDeleteRecipe = (recipeId) => {
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      setRecipes(recipes.filter(recipe => recipe.id !== recipeId));
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const verificationStatus = formData.verificationStatus === 'AI-generated'
      ? 'AI-generated'
      : `Checked by: ${formData.verifierName}, ${formData.verifierCredentials}`;
    
    const recipeData = {
      ...formData,
      verificationStatus,
      engagement: formData.id ? formData.engagement : { tried: 0, saved: 0 },
      dateAdded: formData.id ? formData.dateAdded : new Date().toISOString().split('T')[0],
      id: formData.id || Date.now()
    };

    if (editingRecipeId) {
      setRecipes(recipes.map(r => r.id === editingRecipeId ? recipeData : r));
    } else {
      setRecipes([...recipes, recipeData]);
    }

    setShowAddModal(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      images: [],
      mealType: 'Light Meal',
      instructions: [''],
      ingredients: {
        main: [''],
        condiments: [''],
        optional: ['']
      },
      dietaryTags: [],
      healthTags: [],
      verificationStatus: 'AI-generated',
      verifierName: '',
      verifierCredentials: ''
    });
    setEditingRecipeId(null);
  };

  const addInstructionStep = () => {
    setFormData({
      ...formData,
      instructions: [...formData.instructions, '']
    });
  };

  const updateInstruction = (index, value) => {
    const newInstructions = [...formData.instructions];
    newInstructions[index] = value;
    setFormData({
      ...formData,
      instructions: newInstructions
    });
  };

  const removeInstruction = (index) => {
    if (formData.instructions.length > 1) {
      const newInstructions = formData.instructions.filter((_, i) => i !== index);
      setFormData({
        ...formData,
        instructions: newInstructions
      });
    }
  };

  const addIngredient = (category) => {
    setFormData({
      ...formData,
      ingredients: {
        ...formData.ingredients,
        [category]: [...formData.ingredients[category], '']
      }
    });
  };

  const updateIngredient = (category, index, value) => {
    const newIngredients = { ...formData.ingredients };
    newIngredients[category][index] = value;
    setFormData({
      ...formData,
      ingredients: newIngredients
    });
  };

  const removeIngredient = (category, index) => {
    if (formData.ingredients[category].length > 1) {
      const newIngredients = { ...formData.ingredients };
      newIngredients[category] = newIngredients[category].filter((_, i) => i !== index);
      setFormData({
        ...formData,
        ingredients: newIngredients
      });
    }
  };

  const toggleTag = (tagType, tag) => {
    const currentTags = formData[tagType];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    
    setFormData({
      ...formData,
      [tagType]: newTags
    });
  };

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         recipe.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMealType = mealTypeFilter === 'All' || recipe.mealType === mealTypeFilter;
    const matchesStatus = statusFilter === 'All' || 
                         (statusFilter === 'AI-generated' && recipe.verificationStatus === 'AI-generated') ||
                         (statusFilter === 'Verified' && recipe.verificationStatus.includes('Checked by'));
    const matchesHealth = healthFilter === 'All' || recipe.healthTags.includes(healthFilter);
    
    return matchesSearch && matchesMealType && matchesStatus && matchesHealth;
  });

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files).slice(0, 4);
    const imageUrls = files.map(file => URL.createObjectURL(file));
    setFormData({
      ...formData,
      images: imageUrls
    });
  };

  // Icon components
  const SearchIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
    </svg>
  );

  const PlusIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
    </svg>
  );

  const GridIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 3v8h8V3H3zm6 6H5V5h4v4zm-6 4v8h8v-8H3zm6 6H5v-4h4v4zm4-16v8h8V3h-8zm6 6h-4V5h4v4zm-6 4v8h8v-8h-8zm6 6h-4v-4h4v4z"/>
    </svg>
  );

  const ListIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
    </svg>
  );

  const EditIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
    </svg>
  );

  const DeleteIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
    </svg>
  );

  const HeartIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  );

  const TryIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  );

  const CloseIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>
  );

  return (
    <div className="dashboard-content">
      {/* Recipe Management Controls */}
      <div className="controls-container">
        <div className="search-container">
          <input 
            type="text" 
            placeholder="Search recipes..." 
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="search-btn">
            <SearchIcon />
          </button>
        </div>
        <div className="status-filters">
          <span className="filter-label">Status:</span>
          <button className={`filter-btn ${statusFilter === 'All' ? 'active' : ''}`} onClick={() => setStatusFilter('All')}>All</button>
          <button className={`filter-btn ${statusFilter === 'AI-generated' ? 'active' : ''}`} onClick={() => setStatusFilter('AI-generated')}>AI-generated</button>
          <button className={`filter-btn ${statusFilter === 'Verified' ? 'active' : ''}`} onClick={() => setStatusFilter('Verified')}>Verified</button>
        </div>
        <div className="date-range">
          <span className="filter-label">Meal Type:</span>
          <select value={mealTypeFilter} onChange={(e) => setMealTypeFilter(e.target.value)} className="date-select">
            <option value="All">All Types</option>
            {mealTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div className="date-range">
          <span className="filter-label">Health Filter:</span>
          <select value={healthFilter} onChange={(e) => setHealthFilter(e.target.value)} className="date-select">
            <option value="All">All Health Tags</option>
            {healthOptions.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>
        <div className="date-range">
          <span className="filter-label">View:</span>
          <button className={`filter-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>
            <GridIcon />
          </button>
          <button className={`filter-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>
            <ListIcon />
          </button>
        </div>
        <button className="export-btn" onClick={handleAddRecipe}>
          <PlusIcon />
          Add Recipe
        </button>
      </div>

      {/* Recipe Display */}
      <div className={`recipe-display ${viewMode}`}>
        {filteredRecipes.length === 0 ? (
          <div className="no-recipes">
            <p>No recipes found matching your criteria.</p>
          </div>
        ) : (
          filteredRecipes.map(recipe => (
            <div key={recipe.id} className="recipe-card" onClick={() => handleViewRecipe(recipe)}>
              <div className="recipe-image">
                <img src={recipe.images[0]} alt={recipe.title} />
                <div className="recipe-actions">
                  <button className="recipe-action-btn edit" onClick={(e) => { 
                    e.stopPropagation(); 
                    handleEditRecipe(recipe);
                  }}>
                    <EditIcon />
                  </button>
                  <button className="recipe-action-btn delete" onClick={(e) => { 
                    e.stopPropagation(); 
                    handleDeleteRecipe(recipe.id); 
                  }}>
                    <DeleteIcon />
                  </button>
                </div>
              </div>
              <div className="recipe-info">
                <h3 className="recipe-title">{recipe.title}</h3>
                <p className="recipe-description">{recipe.description}</p>
                <div className="recipe-meta">
                  <span className="meal-type">{recipe.mealType}</span>
                  <div className="recipe-tags">
                    {recipe.dietaryTags.slice(0, 2).map(tag => (
                      <span key={tag} className="tag dietary">{tag}</span>
                    ))}
                    {recipe.dietaryTags.length > 2 && <span className="tag-more">+{recipe.dietaryTags.length - 2}</span>}
                  </div>
                </div>
                <div className="recipe-engagement">
                  <div className="engagement-item">
                    <TryIcon />
                    <span>{recipe.engagement.tried}</span>
                  </div>
                  <div className="engagement-item">
                    <HeartIcon />
                    <span>{recipe.engagement.saved}</span>
                  </div>
                </div>
                <div className="recipe-verification">
                  <span className={`verification-badge ${recipe.verificationStatus === 'AI-generated' ? 'ai' : 'verified'}`}>
                    {recipe.verificationStatus}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Recipe Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingRecipeId ? 'Edit Recipe' : 'Add New Recipe'}</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleFormSubmit} className="recipe-form">
              <div className="form-section">
                <label className="form-label">Recipe Title *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>
              <div className="form-section">
                <label className="form-label">Short Description *</label>
                <textarea
                  className="form-textarea"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows="3"
                  required
                />
              </div>
              <div className="form-section">
                <label className="form-label">Photos (1-4 required) *</label>
                <input
                  type="file"
                  className="form-input"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  required={!formData.images.length}
                />
                {formData.images.length > 0 && (
                  <div className="image-preview">
                    {formData.images.map((image, index) => (
                      <img key={index} src={image} alt={`Preview ${index + 1}`} className="preview-image" />
                    ))}
                  </div>
                )}
              </div>
              <div className="form-section">
                <label className="form-label">Meal Type *</label>
                <select
                  className="form-select"
                  value={formData.mealType}
                  onChange={(e) => setFormData({...formData, mealType: e.target.value})}
                >
                  {mealTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="form-section">
                <label className="form-label">Instructions *</label>
                {formData.instructions.map((instruction, index) => (
                  <div key={index} className="instruction-item">
                    <span className="step-number">{index + 1}.</span>
                    <textarea
                      className="form-textarea"
                      value={instruction}
                      onChange={(e) => updateInstruction(index, e.target.value)}
                      placeholder="Enter instruction step..."
                      rows="2"
                      required
                    />
                    {formData.instructions.length > 1 && (
                      <button type="button" className="remove-btn" onClick={() => removeInstruction(index)}>
                        <CloseIcon />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="add-btn" onClick={addInstructionStep}>
                  + Add Step
                </button>
              </div>
              <div className="form-section">
                <label className="form-label">Ingredients</label>
                {['main', 'condiments', 'optional'].map(category => (
                  <div key={category} className="ingredient-category">
                    <h4 className="category-title">{category.charAt(0).toUpperCase() + category.slice(1)} Ingredients</h4>
                    {formData.ingredients[category].map((ingredient, index) => (
                      <div key={index} className="ingredient-input-group">
                        <input
                          type="text"
                          className="form-input"
                          value={ingredient}
                          onChange={(e) => updateIngredient(category, index, e.target.value)}
                          placeholder={`Enter ${category} ingredient...`}
                        />
                        {formData.ingredients[category].length > 1 && (
                          <button type="button" className="remove-btn" onClick={() => removeIngredient(category, index)}>
                            <CloseIcon />
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" className="add-btn" onClick={() => addIngredient(category)}>
                      + Add {category.charAt(0).toUpperCase() + category.slice(1)}
                    </button>
                  </div>
                ))}
              </div>
              <div className="form-section">
                <label className="form-label">Dietary Lifestyle Tags</label>
                <div className="tag-grid">
                  {dietaryOptions.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      className={`tag-btn ${formData.dietaryTags.includes(tag) ? 'active' : ''}`}
                      onClick={() => toggleTag('dietaryTags', tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-section">
                <label className="form-label">Health Filter Tags</label>
                <div className="tag-grid">
                  {healthOptions.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      className={`tag-btn ${formData.healthTags.includes(tag) ? 'active' : ''}`}
                      onClick={() => toggleTag('healthTags', tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-section">
                <label className="form-label">Verification Status</label>
                <select
                  className="form-select"
                  value={formData.verificationStatus}
                  onChange={(e) => setFormData({...formData, verificationStatus: e.target.value})}
                >
                  <option value="AI-generated">AI-generated</option>
                  <option value="Checked by: Nutritionist">Checked by: Nutritionist</option>
                  <option value="Checked by: Dietitian">Checked by: Dietitian</option>
                  <option value="Checked by: Doctor">Checked by: Doctor</option>
                </select>
              </div>
              {formData.verificationStatus !== 'AI-generated' && (
                <>
                  <div className="form-section">
                    <label className="form-label">Verifier Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.verifierName}
                      onChange={(e) => setFormData({...formData, verifierName: e.target.value})}
                      placeholder="Enter verifier's name"
                    />
                  </div>
                  <div className="form-section">
                    <label className="form-label">Credentials</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.verifierCredentials}
                      onChange={(e) => setFormData({...formData, verifierCredentials: e.target.value})}
                      placeholder="Enter credentials"
                    />
                  </div>
                </>
              )}
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  {editingRecipeId ? 'Update Recipe' : 'Add Recipe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Recipe Modal */}
      {showViewModal && selectedRecipe && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedRecipe.title}</h2>
              <button className="modal-close" onClick={() => setShowViewModal(false)}>×</button>
            </div>
            <div className="recipe-details">
              <div className="recipe-images">
                <img src={selectedRecipe.images[0]} alt={selectedRecipe.title} className="main-image" />
              </div>
              <div className="recipe-meta-info">
                <p className="recipe-desc">{selectedRecipe.description}</p>
                <div className="meta-badges">
                  <span className="meal-type-badge">{selectedRecipe.mealType}</span>
                  <span className={`verification-badge ${selectedRecipe.verificationStatus === 'AI-generated' ? 'ai' : 'verified'}`}>
                    {selectedRecipe.verificationStatus}
                  </span>
                </div>
              </div>
              <div className="recipe-engagement-stats">
                <div className="engagement-stat">
                  <TryIcon />
                  <span>{selectedRecipe.engagement.tried} people tried this</span>
                </div>
                <div className="engagement-stat">
                  <HeartIcon />
                  <span>{selectedRecipe.engagement.saved} people saved this</span>
                </div>
              </div>
              <div className="recipe-tags-display">
                <div className="tag-group">
                  <h4>Dietary Tags:</h4>
                  <div className="tags">
                    {selectedRecipe.dietaryTags.map(tag => (
                      <span key={tag} className="tag dietary">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="tag-group">
                  <h4>Health Tags:</h4>
                  <div className="tags">
                    {selectedRecipe.healthTags.map(tag => (
                      <span key={tag} className="tag health">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="recipe-ingredients-display">
                <h4>Ingredients:</h4>
                <div className="ingredients-grid">
                  <div className="ingredient-group">
                    <h5>Main Ingredients:</h5>
                    <ul>
                      {selectedRecipe.ingredients.main.map((ingredient, index) => (
                        <li key={index}>{ingredient}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="ingredient-group">
                    <h5>Condiments:</h5>
                    <ul>
                      {selectedRecipe.ingredients.condiments.map((ingredient, index) => (
                        <li key={index}>{ingredient}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="ingredient-group">
                    <h5>Optional:</h5>
                    <ul>
                      {selectedRecipe.ingredients.optional.map((ingredient, index) => (
                        <li key={index}>{ingredient}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="recipe-instructions-display">
                <h4>Instructions:</h4>
                <ol className="instructions-list">
                  {selectedRecipe.instructions.map((instruction, index) => (
                    <li key={index}>{instruction}</li>
                  ))}
                </ol>
              </div>
              <div className="recipe-actions-modal">
                <button className="btn-edit" onClick={() => handleEditRecipe(selectedRecipe)}>
                  <EditIcon />
                  Edit Recipe
                </button>
                <button className="btn-delete" onClick={() => {
                  setShowViewModal(false);
                  handleDeleteRecipe(selectedRecipe.id);
                }}>
                  <DeleteIcon />
                  Delete Recipe
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const RecipeManagement = () => {
  return (
    <AdminLayout currentPage="Recipes">
      <RecipeManagementContent />
    </AdminLayout>
  );
};

export default RecipeManagement;