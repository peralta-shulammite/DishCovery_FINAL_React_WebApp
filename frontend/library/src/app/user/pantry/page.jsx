'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './styles.css';
import UserLayout from '../../components/user/userlayout'

// Backend API service integrated directly
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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
      const response = await fetch(`${API_BASE_URL}/pantry/ingredients`, {
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
      const response = await fetch(`${API_BASE_URL}/pantry/save-selection`, {
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
      const response = await fetch(`${API_BASE_URL}/pantry/my-selection`, {
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
      const response = await fetch(`${API_BASE_URL}/pantry/generate-recipe`, {
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
      const response = await fetch(`${API_BASE_URL}/pantry/request-ingredient`, {
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

  // Fallback ingredients for testing (when backend is unavailable)
  const fallbackIngredients = [
    // Proteins
    { id: 1, name: 'Chicken Breast', category: 'Protein', image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=200&h=200&fit=crop' },
    { id: 2, name: 'Ground Beef', category: 'Protein', image: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=200&h=200&fit=crop' },
    { id: 3, name: 'Salmon', category: 'Protein', image: 'https://images.unsplash.com/photo-1567623103079-74d7d37ad37b?w=200&h=200&fit=crop' },
    { id: 4, name: 'Eggs', category: 'Protein', image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=200&h=200&fit=crop' },
    { id: 5, name: 'Tofu', category: 'Protein', image: 'https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?w=200&h=200&fit=crop' },
    { id: 25, name: 'Shrimp', category: 'Protein', image: 'https://images.unsplash.com/photo-1565680018434-b513d5573b07?w=200&h=200&fit=crop' },
    { id: 26, name: 'Pork Chops', category: 'Protein', image: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=200&h=200&fit=crop' },
    
    // Vegetables
    { id: 6, name: 'Onions', category: 'Vegetable', image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=200&h=200&fit=crop' },
    { id: 7, name: 'Garlic', category: 'Vegetable', image: 'https://images.unsplash.com/photo-1498654200943-1088dd4438ae?w=200&h=200&fit=crop' },
    { id: 8, name: 'Tomatoes', category: 'Vegetable', image: 'https://images.unsplash.com/photo-1546470427-e6e4ec0b3fa0?w=200&h=200&fit=crop' },
    { id: 9, name: 'Bell Peppers', category: 'Vegetable', image: 'https://images.unsplash.com/photo-1525607551316-4a8e16d1f9ba?w=200&h=200&fit=crop' },
    { id: 10, name: 'Carrots', category: 'Vegetable', image: 'https://images.unsplash.com/photo-1447175008436-054170c2e979?w=200&h=200&fit=crop' },
    { id: 11, name: 'Broccoli', category: 'Vegetable', image: 'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=200&h=200&fit=crop' },
    { id: 12, name: 'Spinach', category: 'Vegetable', image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=200&h=200&fit=crop' },
    { id: 13, name: 'Mushrooms', category: 'Vegetable', image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=200&h=200&fit=crop' },
    { id: 27, name: 'Zucchini', category: 'Vegetable', image: 'https://images.unsplash.com/photo-1507334566648-4e22ee3e6e6a?w=200&h=200&fit=crop' },
    { id: 28, name: 'Asparagus', category: 'Vegetable', image: 'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=200&h=200&fit=crop' },
    
    // Grains & Starches
    { id: 14, name: 'Rice', category: 'Grain', image: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=200&h=200&fit=crop' },
    { id: 15, name: 'Pasta', category: 'Grain', image: 'https://images.unsplash.com/photo-1621996346565-e3dbc6d2c5f7?w=200&h=200&fit=crop' },
    { id: 16, name: 'Potatoes', category: 'Grain', image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=200&h=200&fit=crop' },
    { id: 17, name: 'Bread', category: 'Grain', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop' },
    { id: 29, name: 'Quinoa', category: 'Grain', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&h=200&fit=crop' },
    
    // Dairy
    { id: 18, name: 'Milk', category: 'Dairy', image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200&h=200&fit=crop' },
    { id: 19, name: 'Cheese', category: 'Dairy', image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=200&h=200&fit=crop' },
    { id: 20, name: 'Butter', category: 'Dairy', image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=200&h=200&fit=crop' },
    { id: 21, name: 'Yogurt', category: 'Dairy', image: 'https://images.unsplash.com/photo-1571212515416-0d6ce5003db4?w=200&h=200&fit=crop' },
    { id: 30, name: 'Cream Cheese', category: 'Dairy', image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=200&h=200&fit=crop' },
    
    // Pantry Staples
    { id: 22, name: 'Olive Oil', category: 'Pantry', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=200&h=200&fit=crop' },
    { id: 23, name: 'Salt', category: 'Pantry', image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=200&h=200&fit=crop' },
    { id: 24, name: 'Black Pepper', category: 'Pantry', image: 'https://images.unsplash.com/photo-1506905025911-1aa6f9364a5e?w=200&h=200&fit=crop' },
    { id: 31, name: 'Soy Sauce', category: 'Pantry', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=200&h=200&fit=crop' },
    { id: 32, name: 'Flour', category: 'Pantry', image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=200&h=200&fit=crop' },
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

  // Load ingredients from backend with fallback
  useEffect(() => {
    const loadIngredients = async () => {
      try {
        setDishCoveryLoading(true);
        setDishCoveryError(null);
        
        console.log('Loading pantry ingredients...');
        
        // Try to load from backend first
        try {
          const ingredients = await pantryService.getIngredients();
          setDishCoveryIngredients(ingredients);
          
          const userSelection = await pantryService.getUserSelection();
          setDishCoverySelectedIngredients(userSelection);
          
          console.log('Loaded ingredients from backend:', ingredients.length);
        } catch (backendError) {
          console.warn('Backend unavailable, using fallback ingredients:', backendError.message);
          // Use fallback ingredients when backend is not available
          setDishCoveryIngredients(fallbackIngredients);
          setDishCoverySelectedIngredients([]);
        }
        
      } catch (error) {
        console.error('Error loading ingredients:', error);
        setDishCoveryError('Failed to load ingredients. Using offline mode.');
        setDishCoveryIngredients(fallbackIngredients);
      } finally {
        setDishCoveryLoading(false);
      }
    };

    loadIngredients();
  }, [dishCoveryIsLoggedIn]);

  // Auto-save selection when ingredients change (with fallback for testing)
  useEffect(() => {
    const saveSelection = async () => {
      if (!dishCoveryIsLoggedIn || dishCoverySelectedIngredients.length === 0) return;
      
      try {
        await pantryService.saveIngredientSelection(dishCoverySelectedIngredients);
        console.log('Selection auto-saved to backend');
      } catch (error) {
        console.error('Error auto-saving to backend:', error);
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

  const dishCoveryCategories = [
    { id: 'All', name: 'All Items' },
    { id: 'Protein', name: 'Proteins' },
    { id: 'Vegetable', name: 'Vegetables' },
    { id: 'Grain', name: 'Grains' },
    { id: 'Dairy', name: 'Dairy' },
    { id: 'Pantry', name: 'Pantry' },
  ];

  const dishCoverySortOptions = [
    { id: 'name', name: 'Name (A-Z)' },
    { id: 'category', name: 'Category' },
    { id: 'selected', name: 'Selected First' },
  ];

  // Get counts for each category
  const dishCoveryGetCategoryCount = (categoryId) => {
    if (categoryId === 'All') return dishCoveryIngredients.length;
    return dishCoveryIngredients.filter(ingredient => ingredient.category === categoryId).length;
  };

  // Filter and sort ingredients
  const dishCoveryFilteredIngredients = dishCoveryIngredients
    .filter(ingredient => {
      const matchesSearch = ingredient.name.toLowerCase().includes(dishCoverySearchTerm.toLowerCase());
      const matchesCategory = dishCoverySelectedCategory === 'All' || ingredient.category === dishCoverySelectedCategory;
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
        if (a.category === b.category) {
          return a.name.localeCompare(b.name);
        }
        return a.category.localeCompare(b.category);
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

  const dishCoveryHandleGenerateRecipe = async () => {
    if (dishCoverySelectedIngredients.length === 0) {
      alert('Please select some ingredients first!');
      return;
    }

    try {
      setDishCoveryGenerating(true);
      
      const result = await pantryService.generateRecipe(dishCoverySelectedIngredients);
      
      if (result.success) {
        localStorage.setItem('generatedRecipes', JSON.stringify(result.recipes));
        localStorage.setItem('usedIngredients', JSON.stringify(dishCoverySelectedIngredients));
        router.push('/user/recipe-results');
      } else {
        alert(result.message || 'Failed to generate recipes');
      }
      
    } catch (error) {
      console.error('Error generating recipes:', error);
      alert('Failed to generate recipes. Please try again.');
    } finally {
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
              {dishCoverySelectedCategory !== 'All' && ` in ${dishCoveryCategories.find(c => c.id === dishCoverySelectedCategory)?.name}`}
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
                  <span className="ingredient-category">{ingredient.category}</span>
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