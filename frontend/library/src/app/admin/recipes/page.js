'use client';
import React, { useState } from 'react';
import './styles.css';

const RecipeManagement = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('This Week');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [searchTerm, setSearchTerm] = useState('');
  const [mealTypeFilter, setMealTypeFilter] = useState('All');
  const [healthFilter, setHealthFilter] = useState('All'); // New state for health filter
  const [editingRecipeId, setEditingRecipeId] = useState(null); // Track recipe being edited

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

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

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

  // Icons Components (unchanged)
  const DashboardIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
    </svg>
  );

  const RecipeIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/>
    </svg>
  );

  const UsersIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 7c0-2.21-1.79-4-4-4S8 4.79 8 7s1.79 4 4 4 4-1.79 4-4zm-4 6c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z"/>
    </svg>
  );

  const DietaryIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/>
    </svg>
  );

  const IngredientsIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4l2-4z"/>
      <path d="M8 10c-2 0-4 2-4 4s2 4 4 4h8c2 0 4-2 4-4s-2-4-4-4H8z"/>
    </svg>
  );

  const FeedbackIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 13.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1-4.5h-2V6h2v5z"/>
    </svg>
  );

  const SettingsIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
    </svg>
  );

  const SearchIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
    </svg>
  );

  const MenuIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
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
    <div className={`dashboard-container ${!sidebarVisible ? 'sidebar-hidden' : ''}`}>
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <button className="hamburger-menu" onClick={toggleSidebar}>
            <MenuIcon />
          </button>
          <h2 className="app-name header-app-name">DishCovery</h2>
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
        </div>
        <div className="header-right">
          <div className="admin-profile">
            <span className="admin-name">Admin</span>
            <span className="admin-role">Administrator</span>
            <div className="admin-avatar">AD</div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`sidebar ${!sidebarVisible ? 'hidden' : ''}`}>
        <nav className="sidebar-nav">
          <div className="nav-item">
            <span className="nav-icon"><DashboardIcon /></span>
            <span className="nav-text">Dashboard</span>
          </div>
          
          <div className="nav-section-header">Account Management</div>
          <div className="nav-item">
            <span className="nav-icon"><UsersIcon /></span>
            <span className="nav-text">Users</span>
          </div>
          <div className="nav-item">
            <span className="nav-icon"><UsersIcon /></span>
            <span className="nav-text">Admins</span>
          </div>
          
          <div className="nav-section-header">Content Management</div>
          <div className="nav-item active">
            <span className="nav-icon"><RecipeIcon /></span>
            <span className="nav-text">Recipes</span>
          </div>
          <div className="nav-item">
            <span className="nav-icon"><DietaryIcon /></span>
            <span className="nav-text">Dietary Restrictions</span>
          </div>
          <div className="nav-item">
            <span className="nav-icon"><IngredientsIcon /></span>
            <span className="nav-text">Ingredients</span>
          </div>
          
          <div className="nav-section-header">Support</div>
          <div className="nav-item">
            <span className="nav-icon"><FeedbackIcon /></span>
            <span className="nav-text">Feedback</span>
          </div>
          
          <div className="nav-section-header">System</div>
          <div className="nav-item">
            <span className="nav-icon"><SettingsIcon /></span>
            <span className="nav-text">Settings</span>
          </div>
        </nav>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {sidebarVisible && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}

      {/* Main Content */}
      <div className="main-content">
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
    </div>
  );
};

export default RecipeManagement;