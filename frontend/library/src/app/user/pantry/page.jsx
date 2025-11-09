'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './styles.css';
import UserLayout from '../../components/user/userlayout';
import { pantryAPI } from '../utils/pantryAPI';
import { INGREDIENT_CATEGORIES, getCategoryCount, getCategoryName } from '../utils/ingredientCategories';

// Backend API service integrated directly
// Note: API_BASE_URL should NOT include /api to avoid double /api/api/ in URLs
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side: check if we're on Vercel
    if (window.location.hostname.includes('vercel.app')) {
      return 'https://dishcovery-backend-wvhn.onrender.com';
    }
    // For localhost testing, always use localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
  }
  // Fallback to environment variable or localhost (ensure it doesn't include /api)
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
  return envUrl.replace(/\/api\/?$/, ''); // Remove trailing /api if present
};

const API_BASE_URL = getApiBaseUrl();
const API_URL = `${API_BASE_URL}/api`;

const pantryService = {
  getAuthToken() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  },

  createHeaders() {
    const token = this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  },

  async handleResponse(response) {
    const data = await response.json();
    if (!response.ok) {
      console.error('API Error:', data);
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    return data;
  },

  async getIngredients() {
    try {
      const response = await fetch(`${API_URL}/pantry/ingredients`, {
        method: 'GET',
        headers: this.createHeaders(),
      });
      const result = await this.handleResponse(response);
      return result.ingredients || [];
    } catch (error) {
      console.error('Error fetching ingredients:', error);
      throw error;
    }
  },

  async saveIngredientSelection(selectedIngredients) {
    try {
      const response = await fetch(`${API_URL}/pantry/save-selection`, {
        method: 'POST',
        headers: this.createHeaders(),
        body: JSON.stringify({ selectedIngredients })
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error saving ingredient selection:', error);
      throw error;
    }
  },

  async getUserSelection() {
    try {
      const response = await fetch(`${API_URL}/pantry/my-selection`, {
        method: 'GET',
        headers: this.createHeaders(),
      });
      const result = await this.handleResponse(response);
      return result.selectedIngredients || [];
    } catch (error) {
      console.error('Error fetching user selection:', error);
      throw error;
    }
  },

  async generateRecipe(selectedIngredients) {
    try {
      const response = await fetch(`${API_URL}/pantry/generate-recipe`, {
        method: 'POST',
        headers: this.createHeaders(),
        body: JSON.stringify({ selectedIngredients })
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error generating recipes:', error);
      throw error;
    }
  },

  async requestIngredient(ingredientData) {
    try {
      const response = await fetch(`${API_URL}/pantry/request-ingredient`, {
        method: 'POST',
        headers: this.createHeaders(),
        body: JSON.stringify(ingredientData)
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error requesting ingredient:', error);
      throw error;
    }
  }
};

export default function DishCoveryPantry() {
  const router = useRouter();
  const dishCoveryTopRef = useRef(null);
  const dishCoveryAvatarRef = useRef(null);
  
  // Navigation states
  const [dishCoveryShowSignInModal, setDishCoveryShowSignInModal] = useState(false);
  const [dishCoveryShowSignUpModal, setDishCoveryShowSignUpModal] = useState(false);
  const [dishCoveryShowOneMoreStepModal, setDishCoveryShowOneMoreStepModal] = useState(false);
  const [dishCoveryIsLoggedIn, setDishCoveryIsLoggedIn] = useState(false);
  const [dishCoveryShowMobileMenu, setDishCoveryShowMobileMenu] = useState(false);
  const [dishCoveryShowAvatarDropdown, setDishCoveryShowAvatarDropdown] = useState(false);
  
  // Pantry states
  const [dishCoverySelectedIngredients, setDishCoverySelectedIngredients] = useState([]);
  const [dishCoverySearchTerm, setDishCoverySearchTerm] = useState('');
  const [dishCoverySelectedCategory, setDishCoverySelectedCategory] = useState('All');
  const [dishCoverySortBy, setDishCoverySortBy] = useState('name');
  const [dishCoveryShowSortMenu, setDishCoveryShowSortMenu] = useState(false);
  
  // Backend integration states
  const [dishCoveryIngredients, setDishCoveryIngredients] = useState([]);
  const [dishCoveryLoading, setDishCoveryLoading] = useState(true);
  const [dishCoveryError, setDishCoveryError] = useState(null);
  const [dishCoverySaving, setDishCoverySaving] = useState(false);
  const [dishCoveryGenerating, setDishCoveryGenerating] = useState(false);
  
  // Request ingredient modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestFormData, setRequestFormData] = useState({
    ingredientName: '',
    category: 'Other',
    dietaryRestrictions: [],
    dietaryLifestyles: [],
    image: null
  });
  
  const [dishCoveryUser, setDishCoveryUser] = useState(null);

  const dishCoveryScrollToTop = useCallback(() => {
    dishCoveryTopRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const [dishCoveryHoverStates, setDishCoveryHoverStates] = useState({
    logo: false,
    signIn: false,
    scanNav: false,
    avatar: false,
    generateBtn: false,
  });

  const dishCoveryHandleHover = (element, isHover) => {
    setDishCoveryHoverStates((prev) => ({ ...prev, [element]: isHover }));
  };

  const dishCoveryNavLinks = [
    { name: "Home", href: "/user/home" },
    { name: "My Pantry", href: "/user/pantry" },
    { name: "Favorites", href: "/user/favorites" },
  ];


  // Check authentication status (DISABLED FOR TESTING)
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        setDishCoveryUser(user);
        setDishCoveryIsLoggedIn(true);
      } catch (error) {
        console.error('Error parsing user data:', error);
        setDishCoveryIsLoggedIn(false);
      }
    } else {
      // TEMPORARILY DISABLED: router.push('/auth/login');
      // For testing, set mock user and logged in state
      setDishCoveryIsLoggedIn(true);
      setDishCoveryUser({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com'
      });
      console.log('Auth redirect disabled for testing - using mock user');
    }
  }, [router]);

  // Load ingredients from backend database
  useEffect(() => {
    const loadIngredients = async () => {
      if (!dishCoveryIsLoggedIn) return;
      
      try {
        setDishCoveryLoading(true);
        setDishCoveryError(null);
        
        console.log('Loading pantry ingredients from database...');
        
        // Fetch ingredients from database using pantryAPI
        const response = await pantryAPI.getAvailableIngredients();
        
        if (response.success && response.ingredients) {
          setDishCoveryIngredients(response.ingredients);
          console.log('✅ Loaded ingredients from database:', response.ingredients.length);
        } else {
          throw new Error('No ingredients returned from API');
        }
        
        // ✅ Fetch user's selected ingredients - no default selection
        try {
          const userSelection = await pantryService.getUserSelection();
          // Only set if user has saved selections, otherwise start empty
          setDishCoverySelectedIngredients(userSelection || []);
        } catch (selectionError) {
          console.warn('Could not load user selection:', selectionError);
          // ✅ No default selection - start with empty array
          setDishCoverySelectedIngredients([]);
        }
        
      } catch (error) {
        console.error('❌ Error loading ingredients:', error);
        setDishCoveryError('Failed to load ingredients from database. Please try again later.');
        setDishCoveryIngredients([]);
      } finally {
        setDishCoveryLoading(false);
      }
    };

    loadIngredients();
  }, [dishCoveryIsLoggedIn]);

  // Auto-save selection when ingredients change
  useEffect(() => {
    const saveSelection = async () => {
      if (!dishCoveryIsLoggedIn || dishCoverySelectedIngredients.length === 0) return;
      
      try {
        await pantryService.saveIngredientSelection(dishCoverySelectedIngredients);
        console.log('✅ Selection auto-saved to backend');
      } catch (error) {
        console.error('❌ Error auto-saving to backend:', error);
        // Fallback: save to localStorage for testing
        localStorage.setItem('selectedIngredients', JSON.stringify(dishCoverySelectedIngredients));
        console.log('Selection saved to localStorage as fallback');
      }
    };

    const timeoutId = setTimeout(saveSelection, 1000);
    return () => clearTimeout(timeoutId);
  }, [dishCoverySelectedIngredients, dishCoveryIsLoggedIn]);

  useEffect(() => {
    const dishCoveryHandleClickOutside = (event) => {
      if (dishCoveryAvatarRef.current && !dishCoveryAvatarRef.current.contains(event.target)) {
        setDishCoveryShowAvatarDropdown(false);
      }
      
      if (!event.target.closest('.sort-dropdown')) {
        setDishCoveryShowSortMenu(false);
      }
    };
    document.addEventListener('mousedown', dishCoveryHandleClickOutside);
    return () => document.removeEventListener('mousedown', dishCoveryHandleClickOutside);
  }, []);

  // ✅ Use shared ingredient categories (synced across pages)
  const dishCoveryCategories = INGREDIENT_CATEGORIES;

  const dishCoverySortOptions = [
    { id: 'name', name: 'Name (A-Z)' },
    { id: 'category', name: 'Category' },
    { id: 'selected', name: 'Selected First' },
  ];

  // ✅ Use shared category count function (synced logic)
  const dishCoveryGetCategoryCount = (categoryId) => {
    return getCategoryCount(dishCoveryIngredients, categoryId);
  };

  // ✅ Filter and sort ingredients - clean category filtering based on ingredient_type
  const dishCoveryFilteredIngredients = dishCoveryIngredients
    .filter(ingredient => {
      // Search filter
      const matchesSearch = !dishCoverySearchTerm || 
        ingredient.name.toLowerCase().includes(dishCoverySearchTerm.toLowerCase());
      
      // Category filter - use ingredient_type from database (not category)
      const matchesCategory = dishCoverySelectedCategory === 'All' || 
        (ingredient.ingredient_type && ingredient.ingredient_type === dishCoverySelectedCategory);
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (dishCoverySortBy === 'selected') {
        const aSelected = dishCoverySelectedIngredients.includes(a.id);
        const bSelected = dishCoverySelectedIngredients.includes(b.id);
        if (aSelected && !bSelected) return -1;
        if (!aSelected && bSelected) return 1;
        return a.name.localeCompare(b.name);
      } else if (dishCoverySortBy === 'category') {
        // Sort by ingredient_type (from database)
        const aType = a.ingredient_type || '';
        const bType = b.ingredient_type || '';
        if (aType === bType) {
          return a.name.localeCompare(b.name);
        }
        return aType.localeCompare(bType);
      } else {
        return a.name.localeCompare(b.name);
      }
    });

  const dishCoveryToggleIngredient = async (ingredientId) => {
    setDishCoverySelectedIngredients(prev => {
      const newSelection = prev.includes(ingredientId)
        ? prev.filter(id => id !== ingredientId)
        : [...prev, ingredientId];
      
      return newSelection;
    });
  };

  // ✅ UPDATED: Same logic as scanning page - use filter endpoint and navigate to recipe page
  const dishCoveryHandleGenerateRecipe = async () => {
    if (dishCoverySelectedIngredients.length === 0) {
      alert('Please select at least one ingredient!');
      return;
    }

    try {
      setDishCoveryGenerating(true);
      
      console.log('🍳 Generating recipes with selected ingredients:', dishCoverySelectedIngredients);
      
      // Import recipesAPI dynamically
      const { recipesAPI } = await import('../utils/recipesAPI');
      
      // Get filtered recipes based on selected ingredients (same logic as scanning)
      const result = await recipesAPI.getFilteredRecipes({
        scannedIngredients: dishCoverySelectedIngredients,
        limit: 50
      });
      
      console.log('✅ Filtered recipes:', result);
      
      if (result.recipes && result.recipes.length > 0) {
        // Navigate to recipe page with ingredient IDs as query parameter (same as scanning)
        const ingredientIdsParam = dishCoverySelectedIngredients.join(',');
        window.location.href = `/user/recipe?ingredients=${ingredientIdsParam}`;
      } else {
        alert('⚠️ No recipes found matching your ingredients. Try different ingredients!');
        setDishCoveryGenerating(false);
      }
      
    } catch (error) {
      console.error('❌ Error generating recipes:', error);
      alert(`Failed to generate recipes: ${error.message}. Please try again.`);
      setDishCoveryGenerating(false);
    }
  };

  const handleRequestIngredient = async (e) => {
    e.preventDefault();
    
    if (!requestFormData.ingredientName.trim()) {
      alert('Please enter an ingredient name');
      return;
    }

    try {
      await pantryService.requestIngredient(requestFormData);
      alert('Ingredient request submitted successfully! Admin will review it soon.');
      setShowRequestModal(false);
      setRequestFormData({
        ingredientName: '',
        category: 'Other',
        dietaryRestrictions: [],
        dietaryLifestyles: [],
        image: null
      });
    } catch (error) {
      alert('Error submitting request: ' + error.message);
    }
  };

  const dishCoveryHandleSignInClick = () => {
    setDishCoveryShowSignInModal(true);
    setDishCoveryShowMobileMenu(false);
  };

  const dishCoveryHandleScanClick = () => {
    if (!dishCoveryIsLoggedIn) {
      setDishCoveryShowSignInModal(true);
    } else {
      window.location.href = '/user/scanning';
    }
    setDishCoveryShowMobileMenu(false);
  };

  const dishCoveryToggleMobileMenu = () => {
    setDishCoveryShowMobileMenu((prev) => !prev);
  };

  const dishCoveryHandleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    setDishCoveryIsLoggedIn(false);
    setDishCoveryUser(null);
    setDishCoveryShowAvatarDropdown(false);
    setDishCoveryShowMobileMenu(false);
    router.push('/');
  };

  // Loading state
  if (dishCoveryLoading) {
    return (
      <div className="pantry-container">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', padding: '40px 20px' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid rgba(46, 125, 50, 0.1)', borderTop: '4px solid #2E7D32', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }}></div>
          <p>Loading your pantry...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (dishCoveryError) {
    return (
      <div className="pantry-container">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', padding: '40px 20px', textAlign: 'center' }}>
          <h2 style={{ color: '#D32F2F', marginBottom: '12px' }}>Oops! Something went wrong</h2>
          <p style={{ marginBottom: '24px' }}>{dishCoveryError}</p>
          <button onClick={() => window.location.reload()} style={{ background: '#2E7D32', color: 'white', border: 'none', borderRadius: '20px', padding: '12px 24px', cursor: 'pointer' }}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <UserLayout 
      isLoggedIn={dishCoveryIsLoggedIn}
      user={dishCoveryUser}
      onSignInClick={dishCoveryHandleSignInClick}
      onLogout={dishCoveryHandleLogout}
    >
    <div ref={dishCoveryTopRef} className="pantry-container">

      <main className="pantry-main-content">
        <div className="pantry-hero">
          <h1 className="pantry-title">My Pantry</h1>
          <p className="pantry-subtitle">
            Select your available ingredients and we'll generate personalized recipes just for you.
          </p>
          
          {dishCoverySelectedIngredients.length > 0 && (
            <div className="ingredients-counter">
              <svg className="counter-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
              </svg>
              {dishCoverySelectedIngredients.length} ingredient{dishCoverySelectedIngredients.length > 1 ? 's' : ''} selected
            </div>
          )}
        </div>

        <div className="pantry-search-section">
          <div className="search-and-filter-container">
            <div className="search-container">
              <svg className="search-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
              <input
                type="text"
                placeholder="Search ingredients..."
                className="search-input"
                value={dishCoverySearchTerm}
                onChange={(e) => setDishCoverySearchTerm(e.target.value)}
              />
              {dishCoverySearchTerm && (
                <button className="clear-search" onClick={() => setDishCoverySearchTerm('')}>×</button>
              )}
            </div>
            
            <div className="category-filters">
              {dishCoveryCategories.map((category) => (
                <button
                  key={category.id}
                  className={`filter-chip ${dishCoverySelectedCategory === category.id ? 'filter-chip-active' : ''}`}
                  onClick={() => setDishCoverySelectedCategory(category.id)}
                >
                  <span className="filter-icon">{category.icon}</span>
                  {category.name}
                  <span className="filter-count">{dishCoveryGetCategoryCount(category.id)}</span>
                </button>
              ))}
              
              {dishCoverySelectedCategory !== 'All' && (
                <button className="clear-filters-btn" onClick={() => setDishCoverySelectedCategory('All')}>
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{width: '12px', height: '12px'}}>
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="ingredients-section">
          <div className="section-header">
            <div className="results-count">
              {dishCoveryFilteredIngredients.length} ingredient{dishCoveryFilteredIngredients.length !== 1 ? 's' : ''} found
              {dishCoverySelectedCategory !== 'All' && ` in ${getCategoryName(dishCoverySelectedCategory)}`}
            </div>
            
            <div className="sort-dropdown">
              <button
                className={`sort-btn ${dishCoveryShowSortMenu ? 'sort-dropdown-open' : ''}`}
                onClick={() => setDishCoveryShowSortMenu(!dishCoveryShowSortMenu)}
              >
                <svg className="sort-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z"/>
                </svg>
                Sort by {dishCoverySortOptions.find(option => option.id === dishCoverySortBy)?.name}
              </button>
              
              {dishCoveryShowSortMenu && (
                <div className="sort-menu">
                  {dishCoverySortOptions.map((option) => (
                    <button
                      key={option.id}
                      className={`sort-option ${dishCoverySortBy === option.id ? 'sort-option-active' : ''}`}
                      onClick={() => {
                        setDishCoverySortBy(option.id);
                        setDishCoveryShowSortMenu(false);
                      }}
                    >
                      {option.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="ingredients-grid">
            {dishCoveryFilteredIngredients.map((ingredient) => (
              <div
                key={ingredient.id}
                className={`ingredient-card ${dishCoverySelectedIngredients.includes(ingredient.id) ? 'ingredient-selected' : ''}`}
                onClick={() => dishCoveryToggleIngredient(ingredient.id)}
              >
                <div className="ingredient-image-container">
                  <img 
                    src={ingredient.image} 
                    alt={ingredient.name}
                    className="ingredient-image"
                  />
                  {dishCoverySelectedIngredients.includes(ingredient.id) && (
                    <div className="ingredient-checkmark">
                      <svg viewBox="0 0 24 24" fill="white">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                      </svg>
                    </div>
                  )}
                </div>
                <div className="ingredient-info">
                  <h3 className="ingredient-name">{ingredient.name}</h3>
                  <span className="ingredient-category">{ingredient.ingredient_type || ingredient.category || 'Other'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {dishCoveryFilteredIngredients.length === 0 && (dishCoverySearchTerm || dishCoverySelectedCategory !== 'All') && (
          <div className="no-results">
            <svg className="no-results-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <h3>No ingredients found</h3>
            <p>
              {dishCoverySearchTerm && dishCoverySelectedCategory !== 'All' 
                ? `No "${dishCoverySearchTerm}" found in ${dishCoveryCategories.find(c => c.id === dishCoverySelectedCategory)?.name}.`
                : dishCoverySearchTerm 
                ? `No ingredients match "${dishCoverySearchTerm}".`
                : `No ingredients in ${dishCoveryCategories.find(c => c.id === dishCoverySelectedCategory)?.name}.`
              }
            </p>
            <div style={{display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap'}}>
              {dishCoverySearchTerm && (
                <button 
                  className="clear-search-btn"
                  onClick={() => setDishCoverySearchTerm('')}
                >
                  Clear Search
                </button>
              )}
              {dishCoverySelectedCategory !== 'All' && (
                <button 
                  className="clear-search-btn"
                  onClick={() => setDishCoverySelectedCategory('All')}
                >
                  Show All Categories
                </button>
              )}
              <button 
                className="clear-search-btn"
                onClick={() => setShowRequestModal(true)}
                style={{ background: '#2E7D32' }}
              >
                Request New Ingredient
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Request Ingredient Modal */}
      {showRequestModal && (
        <div className="modal-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Request New Ingredient</h2>
              <button className="modal-close" onClick={() => setShowRequestModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleRequestIngredient} className="recipe-form">
              <div className="form-section">
                <label className="form-label">Ingredient Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={requestFormData.ingredientName}
                  onChange={(e) => setRequestFormData({ ...requestFormData, ingredientName: e.target.value })}
                  placeholder="Enter ingredient name"
                  required
                />
              </div>

              <div className="form-section">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={requestFormData.category}
                  onChange={(e) => setRequestFormData({ ...requestFormData, category: e.target.value })}
                >
                  <option value="Protein">Protein</option>
                  <option value="Vegetable">Vegetable</option>
                  <option value="Grain">Grain</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Pantry">Pantry</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowRequestModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {dishCoverySelectedIngredients.length > 0 && (
        <div className="generate-recipe-container">
          <button
            className={`generate-recipe-btn ${dishCoveryHoverStates.generateBtn ? 'generate-recipe-btn-hover' : ''} ${dishCoveryGenerating ? 'generating' : ''}`}
            onClick={dishCoveryHandleGenerateRecipe}
            onMouseEnter={() => dishCoveryHandleHover('generateBtn', true)}
            onMouseLeave={() => dishCoveryHandleHover('generateBtn', false)}
            disabled={dishCoveryGenerating}
          >
            {dishCoveryGenerating ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  marginRight: '8px'
                }}></div>
                Generating...
              </>
            ) : (
              <>
                Generate Recipe
                <span className="generate-count">({dishCoverySelectedIngredients.length})</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
    </UserLayout>
  );
}