'use client';
import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/adminlayout';
import { recipeAPI, handleAPIError } from './api.js';
import './styles.css';

const RecipeManagement = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('This Week');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [searchTerm, setSearchTerm] = useState('');
  const [mealTypeFilter, setMealTypeFilter] = useState('All');
  const [healthFilter, setHealthFilter] = useState('All'); // New state for health filter
  const [editingRecipeId, setEditingRecipeId] = useState(null); // Track recipe being edited
  
  // Database connection states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recipes, setRecipes] = useState([]); // Now connected to database

  // Form state for adding/editing recipes - UPDATED with alternative ingredients
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    images: [],
    mealType: 'Light Meal',
    instructions: [''],
    ingredients: {
      main: [{ ingredient: '', alternative: '' }],
      condiments: [{ ingredient: '', alternative: '' }],
      optional: [{ ingredient: '', alternative: '' }]
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

  // Fetch recipes from database
  const fetchRecipes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters = {
        search: searchTerm,
        status: statusFilter,
        mealType: mealTypeFilter
      };
      
      console.log('Fetching recipes with filters:', filters);
      
      const fetchedRecipes = await recipeAPI.getAll(filters);
      setRecipes(fetchedRecipes);
      
    } catch (err) {
      const errorMessage = handleAPIError(err);
      setError(errorMessage);
      console.error('Error fetching recipes:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load recipes on component mount and when filters change
  useEffect(() => {
    fetchRecipes();
  }, [searchTerm, statusFilter, mealTypeFilter]);

  const handleAddRecipe = () => {
    setEditingRecipeId(null);
    resetForm();
    setShowAddModal(true);
  };

  const handleViewRecipe = (recipe) => {
    setSelectedRecipe(recipe);
    setShowViewModal(true);
  };

  // UPDATED handleEditRecipe function to handle new ingredient structure
  const handleEditRecipe = (recipe) => {
    setEditingRecipeId(recipe.id);
    
    // Convert old array format to new object format if needed
    const convertIngredients = (ingredients) => {
      if (Array.isArray(ingredients)) {
        return ingredients.map(item => 
          typeof item === 'string' 
            ? { ingredient: item, alternative: '' }
            : item
        );
      }
      return ingredients || [{ ingredient: '', alternative: '' }];
    };

    setFormData({
      ...recipe,
      ingredients: {
        main: convertIngredients(recipe.ingredients.main),
        condiments: convertIngredients(recipe.ingredients.condiments),
        optional: convertIngredients(recipe.ingredients.optional)
      },
      verifierName: recipe.verificationStatus.includes('Checked by') ? recipe.verificationStatus.split(': ')[1].split(', ')[0] : '',
      verifierCredentials: recipe.verificationStatus.includes('Checked by') ? recipe.verificationStatus.split(', ')[1] || '' : ''
    });
    setShowViewModal(false);
    setShowAddModal(true);
  };

  const handleDeleteRecipe = async (recipeId) => {
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      try {
        await recipeAPI.delete(recipeId);
        
        // Remove from local state
        setRecipes(recipes.filter(recipe => recipe.id !== recipeId));
        setShowViewModal(false);
        alert('Recipe deleted successfully!');
      } catch (err) {
        const errorMessage = handleAPIError(err);
        alert(`Error deleting recipe: ${errorMessage}`);
      }
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      if (editingRecipeId) {
        // Update existing recipe
        await recipeAPI.update(editingRecipeId, formData);
        alert('Recipe updated successfully!');
      } else {
        // Create new recipe
        await recipeAPI.create(formData);
        alert('Recipe added successfully!');
      }

      setShowAddModal(false);
      resetForm();
      fetchRecipes(); // Refresh the list
    } catch (err) {
      const errorMessage = handleAPIError(err);
      alert(`Error saving recipe: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // UPDATED resetForm function
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      images: [],
      mealType: 'Light Meal',
      instructions: [''],
      ingredients: {
        main: [{ ingredient: '', alternative: '' }],
        condiments: [{ ingredient: '', alternative: '' }],
        optional: [{ ingredient: '', alternative: '' }]
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

  // UPDATED addIngredient function
  const addIngredient = (category) => {
    setFormData({
      ...formData,
      ingredients: {
        ...formData.ingredients,
        [category]: [...formData.ingredients[category], { ingredient: '', alternative: '' }]
      }
    });
  };

  // UPDATED updateIngredient function to handle both ingredient and alternative
  const updateIngredient = (category, index, field, value) => {
    const newIngredients = { ...formData.ingredients };
    newIngredients[category][index][field] = value;
    setFormData({
      ...formData,
      ingredients: newIngredients
    });
  };

  // UPDATED removeIngredient function
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

  // Show loading state
  if (loading && recipes.length === 0) {
    return (
      <AdminLayout currentPage="Recipes">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div style={{ textAlign: 'center' }}>
            <h3>Loading recipes...</h3>
            <p>Please wait while we fetch your recipes from the database.</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Show error state
  if (error && recipes.length === 0) {
    return (
      <AdminLayout currentPage="Recipes">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div style={{ textAlign: 'center', color: '#dc2626' }}>
            <h3>Error loading recipes</h3>
            <p>{error}</p>
            <button 
              onClick={fetchRecipes} 
              style={{ 
                marginTop: '10px', 
                padding: '10px 20px', 
                background: '#2E7D32', 
                color: 'white', 
                border: 'none', 
                borderRadius: '5px', 
                cursor: 'pointer' 
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Icons Components
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
    <AdminLayout currentPage="Recipes">
      <div className="dashboard-content">
        {/* Recipe Management Controls */}
        <div className="controls-container">
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
              {!loading && recipes.length === 0 && (
                <p>Start by adding your first recipe!</p>
              )}
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

                {/* UPDATED Ingredients Section with Alternatives */}
                <div className="form-section">
                  <label className="form-label">Ingredients</label>
                  {['main', 'condiments', 'optional'].map(category => (
                    <div key={category} className="ingredient-category">
                      <h4 className="category-title">{category.charAt(0).toUpperCase() + category.slice(1)} Ingredients</h4>
                      {formData.ingredients[category].map((item, index) => (
                        <div key={index} className="ingredient-item-group">
                          <div className="ingredient-input-row">
                            <div className="ingredient-input-container">
                              <label className="ingredient-label">Ingredient {index + 1}</label>
                              <input
                                type="text"
                                className="form-input"
                                value={item.ingredient}
                                onChange={(e) => updateIngredient(category, index, 'ingredient', e.target.value)}
                                placeholder={`Enter ${category} ingredient...`}
                                required={category === 'main' && index === 0}
                              />
                            </div>
                            <div className="ingredient-input-container">
                              <label className="ingredient-label">Alternative (Optional)</label>
                              <input
                                type="text"
                                className="form-input alternative-input"
                                value={item.alternative}
                                onChange={(e) => updateIngredient(category, index, 'alternative', e.target.value)}
                                placeholder={`Alternative for ${item.ingredient || 'ingredient'}...`}
                              />
                            </div>
                          </div>
                          {formData.ingredients[category].length > 1 && (
                            <button type="button" className="remove-btn ingredient-remove" onClick={() => removeIngredient(category, index)}>
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
                  <button type="submit" className="btn-submit" disabled={loading}>
                    {loading ? 'Saving...' : (editingRecipeId ? 'Update Recipe' : 'Add Recipe')}
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

                {/* UPDATED Ingredients Display with Alternatives */}
                <div className="recipe-ingredients-display">
                  <h4>Ingredients:</h4>
                  <div className="ingredients-grid">
                    <div className="ingredient-group">
                      <h5>Main Ingredients:</h5>
                      <ul>
                        {selectedRecipe.ingredients.main.map((item, index) => (
                          <li key={index} className="ingredient-with-alternative">
                            <span className="main-ingredient">{typeof item === 'string' ? item : item.ingredient}</span>
                            {typeof item === 'object' && item.alternative && (
                              <span className="alternative-ingredient">
                                <em>Alternative: {item.alternative}</em>
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="ingredient-group">
                      <h5>Condiments:</h5>
                      <ul>
                        {selectedRecipe.ingredients.condiments.map((item, index) => (
                          <li key={index} className="ingredient-with-alternative">
                            <span className="main-ingredient">{typeof item === 'string' ? item : item.ingredient}</span>
                            {typeof item === 'object' && item.alternative && (
                              <span className="alternative-ingredient">
                                <em>Alternative: {item.alternative}</em>
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="ingredient-group">
                      <h5>Optional:</h5>
                      <ul>
                        {selectedRecipe.ingredients.optional.map((item, index) => (
                          <li key={index} className="ingredient-with-alternative">
                            <span className="main-ingredient">{typeof item === 'string' ? item : item.ingredient}</span>
                            {typeof item === 'object' && item.alternative && (
                              <span className="alternative-ingredient">
                                <em>Alternative: {item.alternative}</em>
                              </span>
                            )}
                          </li>
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
    </AdminLayout>
  );
};

export default RecipeManagement;