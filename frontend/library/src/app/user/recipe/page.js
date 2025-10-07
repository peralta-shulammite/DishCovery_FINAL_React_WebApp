'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBars, 
  faSearch, 
  faStar,
  faStarHalfStroke,
  faChevronDown,
  faFilter,
  faHome,
  faUtensils,
  faBook,
  faHeart,
  faTimes,
  faChevronLeft,
  faChevronRight,
  faShieldAlt,
  faUserMd,
  faRobot,
  faExchangeAlt,
  faEye,
  faAward,
  faGrid3x3,
  faList,
  faClock,
  faUsers,
  faUser,
  faLeaf,
  faDroplet,
  faMagic,
  faChefHat
} from '@fortawesome/free-solid-svg-icons';
import { 
  faComment,
  faStar as faStarRegular,
  faHeart as faHeartRegular
} from '@fortawesome/free-regular-svg-icons';
import { recipeAPI, favoritesAPI } from './api';
import './styles.css';
import UserLayout from '../../components/user/userlayout';

const RecipePage = () => {
  // DishCovery Navigation States
  const dishCoveryTopRef = useRef(null);
  const [dishCoveryIsLoggedIn, setDishCoveryIsLoggedIn] = useState(true);
  const [dishCoveryShowAvatarDropdown, setDishCoveryShowAvatarDropdown] = useState(false);
  const [dishCoveryShowMobileMenu, setDishCoveryShowMobileMenu] = useState(false);
  const [dishCoveryUser, setDishCoveryUser] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com'
  });
  const dishCoveryAvatarRef = useRef(null);
  const iconRef = useRef(null);

  // DishCovery Search and Filter States
  const [dishCoverySearchQuery, setDishCoverySearchQuery] = useState('');
  const [dishCoverySortBy, setDishCoverySortBy] = useState('relevance');
  const [dishCoveryViewMode, setDishCoveryViewMode] = useState('grid'); 
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [dishCoveryHoverStates, setDishCoveryHoverStates] = useState({
    logo: false,
    avatar: false,
    signIn: false,
    scanNav: false,
  });

  // Recipe State
  const [filters, setFilters] = useState({
    mealType: [],
    dietaryTags: []
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAlternatives, setShowAlternatives] = useState({});
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const modalBodyRef = useRef(null);

  // API-related state
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(15);
  
  const [hoverStates, setHoverStates] = useState({
    logo: false,
    avatar: false,
  });

  const [favoritedRecipes, setFavoritedRecipes] = useState(new Set());

  const avatarRef = useRef(null);

  // DishCovery Navigation Handlers
  const dishCoveryHandleHover = (element, isHover) => {
    setDishCoveryHoverStates((prev) => ({ ...prev, [element]: isHover }));
  };

  const dishCoveryScrollToTop = useCallback(() => {
    dishCoveryTopRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const dishCoveryNavLinks = [
    { name: "Home", href: "/user/home" },
    { name: "My Pantry", href: "/user/pantry" },
    { name: "Favorites", href: "/user/favorites" },
  ];

  const dishCoveryToggleMobileMenu = () => {
    setDishCoveryShowMobileMenu((prev) => !prev);
  };

  const dishCoveryHandleLogout = () => {
    setDishCoveryIsLoggedIn(false);
    setDishCoveryUser(null);
    setDishCoveryShowAvatarDropdown(false);
    setDishCoveryShowMobileMenu(false);
    window.location.href = '/';
  };

  const dishCoveryHandleScanClick = () => {
    if (!dishCoveryIsLoggedIn) {
      // Handle sign in
    } else {
      window.location.href = '/user/scanning';
    }
    setDishCoveryShowMobileMenu(false);
  };

  const dishCoveryHandleSignInClick = () => {
    // Handle sign in modal
  };

  const handleHover = (element, isHover) => {
    setHoverStates((prev) => ({ ...prev, [element]: isHover }));
  };

  // Load favorites from localStorage on mount
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const response = await favoritesAPI.getFavorites();
        if (response && response.success && response.data) {
          const favoriteIds = new Set(response.data.map(recipe => recipe.id));
          setFavoritedRecipes(favoriteIds);
        }
      } catch (error) {
        console.error('Error loading favorites:', error);
      }
    };
    
    loadFavorites();
  }, []);

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const dishCoveryHandleClickOutside = (event) => {
      if (dishCoveryAvatarRef.current && !dishCoveryAvatarRef.current.contains(event.target)) {
        setDishCoveryShowAvatarDropdown(false);
      }
    };
    const handleClickOutside = (event) => {
      if (avatarRef.current && !avatarRef.current.contains(event.target)) {
        setDishCoveryShowAvatarDropdown(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        if (isModalOpen) closeModal();
        if (showFilterModal) closeFilterModal();
      }
    };
    document.addEventListener('mousedown', dishCoveryHandleClickOutside);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', dishCoveryHandleClickOutside);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isModalOpen]);

  // Fetch recipes from API
  const fetchRecipes = async (isLoadMore = false) => {
    try {
      setLoading(true);
      setError(null);

      // Prepare filters - keep arrays as-is, backend will handle conversion
      const activeFilters = {};

      // Meal type filter
      if (Array.isArray(filters.mealType) && filters.mealType.length > 0) {
        activeFilters.mealType = filters.mealType;
      }

      // Dietary tags filter - always send as array
      if (Array.isArray(filters.dietaryTags) && filters.dietaryTags.length > 0) {
        activeFilters.dietaryTags = filters.dietaryTags;
      }

      // Search filter
      const searchTerm = dishCoverySearchQuery.trim();
      if (searchTerm) {
        activeFilters.search = searchTerm;
      }

      // Pagination
      activeFilters.limit = limit;
      activeFilters.offset = isLoadMore ? offset : 0;

      console.log('Fetching with filters:', activeFilters);

      const response = await recipeAPI.getAllRecipes(activeFilters);

      // Backend always returns {success, data, pagination}
      if (!response || !response.success) {
        throw new Error(response?.message || 'Failed to fetch recipes');
      }

      const payload = response.data || [];
      const pagination = response.pagination || {};

      // Transform to consistent format
      const newRecipes = payload.map(recipe => ({
        id: recipe.id || recipe.recipe_id,
        title: recipe.title || recipe.name || recipe.recipe_name,
        description: recipe.description || '',
        images: Array.isArray(recipe.images) && recipe.images.length > 0 
          ? recipe.images 
          : (recipe.image ? [recipe.image] : (recipe.image_url ? [recipe.image_url] : ['https://via.placeholder.com/400x300?text=No+Image'])),
        mealType: recipe.mealType || recipe.meal_type || '',
        ingredients: recipe.ingredients || { main: [], condiments: [], optional: [] },
        instructions: recipe.instructions || [],
        dietaryTags: recipe.dietaryTags || recipe.dietary_restrictions || [],
        healthTags: recipe.healthTags || [],
        verificationStatus: recipe.verificationStatus || 'AI-generated',
        verifierName: recipe.verifierName || '',
        verifierCredentials: recipe.verifierCredentials || '',
        engagement: {
          tried: recipe.tried || recipe.engagement?.tried || recipe.tried_count || 0,
          saved: recipe.saved || recipe.engagement?.saved || recipe.save_count || 0
        },
        rating: recipe.rating || recipe.average_rating || 4.5,
        cookTime: recipe.cookTime || recipe.cookingTime || recipe.prepTime || recipe.cook_time || '30 min',
        servings: recipe.servings || 4
      }));

      if (isLoadMore) {
        setRecipes(prev => [...prev, ...newRecipes]);
        setOffset(prev => prev + newRecipes.length);
      } else {
        setRecipes(newRecipes);
        setOffset(limit);
      }

      // Determine hasMore
      setHasMore(pagination.hasMore !== undefined ? pagination.hasMore : newRecipes.length === limit);

    } catch (err) {
      console.error('Error fetching recipes:', err);
      const errorMessage = err.message || 'Failed to load recipes. Please try again.';
      setError(errorMessage);
      alert(`Error: ${errorMessage}`); // Simple alert as requested
      
      // Clear recipes on error
      if (!isLoadMore) {
        setRecipes([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRecipeDetails = async (recipeId) => {
    try {
      const response = await recipeAPI.getRecipeDetails(recipeId);
      if (response && response.data) {
        return {
          ...response.data,
          images: response.data.images || [response.data.image || response.data.imageUrl || 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop'],
          ingredients: response.data.ingredients || { main: [], condiments: [], optional: [] },
          instructions: response.data.instructions || []
        };
      }
      return null;
    } catch (err) {
      console.error('Error fetching recipe details:', err);
      return null;
    }
  };

  // Initial fetch on component mount
  useEffect(() => {
    fetchRecipes();
  }, []);

  // Fetch when filters change with debouncing
  useEffect(() => {
    const delayedFetch = setTimeout(() => {
      fetchRecipes();
    }, 300);

    return () => clearTimeout(delayedFetch);
  }, [filters, dishCoverySearchQuery]);

  // Load more recipes
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchRecipes(true);
    }
  };

  // Filter options
  const filterOptions = {
    mealType: ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Light Meal', 'Heavy Meal'],
    dietaryTags: ['Vegan', 'Vegetarian', 'Gluten-free', 'Dairy-free', 'Mediterranean', 'High-protein', 'Keto', 'Paleo']
  };

  // Event handlers
  const handleFilterChange = (category, value) => {
    setFilters(prev => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter(item => item !== value)
        : [...prev[category], value]
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      mealType: [],
      dietaryTags: []
    });
  };

  const getActiveFilterCount = () => {
    return filters.mealType.length + filters.dietaryTags.length;
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<FontAwesomeIcon key={i} icon={faStar} className="star filled" />);
    }
    
    if (hasHalfStar) {
      stars.push(<FontAwesomeIcon key="half" icon={faStarHalfStroke} className="star half" />);
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<FontAwesomeIcon key={`empty-${i}`} icon={faStarRegular} className="star empty" />);
    }
    
    return stars;
  };

  const getVerificationIcon = (status) => {
    if (status === 'AI-generated') return faRobot;
    if (status.includes('Doctor')) return faUserMd;
    return faShieldAlt;
  };

  const openModal = async (recipe) => {
    const recipeWithFavoriteStatus = {
      ...recipe,
      isFavorited: favoritedRecipes.has(recipe.id)
    };
    setSelectedRecipe(recipeWithFavoriteStatus);
    setIsModalOpen(true);
    setCurrentImageIndex(0);
    setShowAlternatives({});
    setShowScrollIndicator(true);
    document.body.style.overflow = 'hidden';
    
    // Fetch detailed recipe data if needed
    if (recipe.id && (!recipe.instructions || recipe.instructions.length === 0)) {
      const detailedRecipe = await fetchRecipeDetails(recipe.id);
      if (detailedRecipe) {
        setSelectedRecipe({
          ...detailedRecipe,
          isFavorited: favoritedRecipes.has(recipe.id)
        });
      }
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRecipe(null);
    setCurrentImageIndex(0);
    setShowAlternatives({});
    document.body.style.overflow = 'unset';
  };

  const handleModalScroll = (e) => {
    const element = e.target;
    const scrolledToBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;
    setShowScrollIndicator(!scrolledToBottom);
  };

  const nextImage = () => {
    if (selectedRecipe && selectedRecipe.images.length > 1) {
      setCurrentImageIndex((prev) => 
        prev === selectedRecipe.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (selectedRecipe && selectedRecipe.images.length > 1) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? selectedRecipe.images.length - 1 : prev - 1
      );
    }
  };

  const toggleAlternative = (categoryIndex, itemIndex) => {
    const key = `${categoryIndex}-${itemIndex}`;
    setShowAlternatives(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleLogout = () => {
    setDishCoveryShowAvatarDropdown(false);
    console.log("User logged out");
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleFavorite = async (recipeId) => {
    const isFavorited = favoritedRecipes.has(recipeId);
    
    try {
      if (isFavorited) {
        // Remove from favorites
        await favoritesAPI.removeFromFavorites(recipeId);
        setFavoritedRecipes(prev => {
          const newSet = new Set(prev);
          newSet.delete(recipeId);
          return newSet;
        });
      } else {
        // Add to favorites - find the recipe from current recipes list or selected recipe
        let recipeToAdd = recipes.find(r => r.id === recipeId);
        
        // If not found in recipes list, use selectedRecipe (from modal)
        if (!recipeToAdd && selectedRecipe && selectedRecipe.id === recipeId) {
          recipeToAdd = selectedRecipe;
        }
        
        if (recipeToAdd) {
          console.log('Adding recipe to favorites:', recipeToAdd);
          await favoritesAPI.addToFavorites(recipeToAdd);
          setFavoritedRecipes(prev => new Set([...prev, recipeId]));
          console.log('Recipe added successfully!');
        } else {
          console.error('Recipe not found:', recipeId);
        }
      }
      
      // Update selected recipe if modal is open
      if (selectedRecipe && selectedRecipe.id === recipeId) {
        setSelectedRecipe(prev => ({
          ...prev,
          isFavorited: !isFavorited
        }));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert('Failed to update favorites. Please try again.');
    }
  };

  // Filter modal handlers
  const openFilterModal = () => {
    setShowFilterModal(true);
    document.body.style.overflow = 'hidden';
  };

  const closeFilterModal = () => {
    setShowFilterModal(false);
    document.body.style.overflow = 'unset';
  };

  const applyFilters = () => {
    closeFilterModal();
  };

  return (
    <UserLayout 
      isLoggedIn={dishCoveryIsLoggedIn}
      user={dishCoveryUser}
      onSignInClick={dishCoveryHandleSignInClick}
      onLogout={dishCoveryHandleLogout}
    >
      <div ref={dishCoveryTopRef} className="available-recipes-container">

        {/* Page Header */}
        <div className="page-header">
          <div className="page-title-section">
            <h1 className="page-title">Available Recipes</h1>
            <p className="page-subtitle">
              Explore our collection of professionally verified recipes with detailed ingredients and alternatives
            </p>
          </div>
        </div>

        <div className="content-wrapper">
          {/* Sidebar Filters */}
          <aside className={`filters-sidebar ${showMobileFilters ? 'mobile-visible' : ''}`}>
            <div className="mobile-filter-header">
              <h3>Filters</h3>
              <button 
                className="mobile-filter-close"
                onClick={() => setShowMobileFilters(false)}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="filters-title">
              <FontAwesomeIcon icon={faFilter} />
              Filters
            </div>

            <select
              value={dishCoverySortBy}
              onChange={(e) => setDishCoverySortBy(e.target.value)}
              className="sort-dropdown"
            >
              <option value="popularity">Most Popular</option>
              <option value="rating">Highest Rated</option>
              <option value="cookTime">Cook Time</option>
              <option value="alphabetical">A-Z</option>
            </select>

            {Object.entries(filterOptions).map(([category, options]) => (
              <div key={category} className="filter-category">
                <h3 className="filter-category-title">
                  {category === 'mealType' ? 'Meal Type' : 
                   category === 'dietaryTags' ? 'Dietary Tags' : 'Health Tags'}
                </h3>
                <div className="filter-options">
                  {options.map(option => (
                    <label key={option} className="filter-option">
                      <input
                        type="checkbox"
                        className="filter-checkbox"
                        checked={filters[category].includes(option)}
                        onChange={() => handleFilterChange(category, option)}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {getActiveFilterCount() > 0 && (
              <div className="active-filters">
                <div className="active-filters-title">Active Filters</div>
                <div className="active-filter-tags">
                  {Object.entries(filters).map(([category, values]) =>
                    values.map(value => (
                      <span key={`${category}-${value}`} className="active-filter-tag">
                        {value}
                        <button onClick={() => handleFilterChange(category, value)}>×</button>
                      </span>
                    ))
                  )}
                </div>
                <button className="clear-all-filters" onClick={clearAllFilters}>
                  Clear All
                </button>
              </div>
            )}
          </aside>

          {/* Main Content */}
          <main className="main-content">
            {/* Enhanced Controls with DishCovery Search */}
            <div className="controls-container">
              {/* DishCovery Search Section */}
              <div className="search-section">
                <div className="search-container">
                  <svg className="search-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search recipes..."
                    value={dishCoverySearchQuery}
                    onChange={(e) => setDishCoverySearchQuery(e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>

              <div className="filter-section">
                {/* Mobile Filter Toggle Button */}
                <button 
                  className="mobile-filter-toggle"
                  onClick={() => {
                    const isMobile = window.innerWidth <= 768;
                    if (isMobile) {
                      openFilterModal();
                    } else {
                      setShowMobileFilters(!showMobileFilters);
                    }
                  }}
                >
                  <FontAwesomeIcon icon={faFilter} />
                  Filters
                  {getActiveFilterCount() > 0 && (
                    <span className="filter-count-badge">{getActiveFilterCount()}</span>
                  )}
                </button>

                {/* DishCovery View Toggle */}
                <div className="view-toggle">
                  <button
                    className={`view-btn ${dishCoveryViewMode === 'grid' ? 'view-btn-active' : ''}`}
                    onClick={() => setDishCoveryViewMode('grid')}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 3v8h8V3H3zm6 6H5V5h4v4zm-6 4v8h8v-8H3zm6 6H5v-4h4v4zm4-16v8h8V3h-8zm6 6h-4V5h4v4zm-6 4v8h8v-8h-8zm6 6h-4v-4h4v4z"/>
                    </svg>
                  </button>
                  <button
                    className={`view-btn ${dishCoveryViewMode === 'list' ? 'view-btn-active' : ''}`}
                    onClick={() => setDishCoveryViewMode('list')}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading && recipes.length === 0 && (
              <div className="loading-container">
                Loading delicious recipes...
              </div>
            )}

            {/* Error State */}
            {error && recipes.length === 0 && (
              <div className="error-container">
                {error}
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && recipes.length === 0 && (
              <div className="empty-container">
                No recipes found matching your criteria. Try adjusting your filters.
              </div>
            )}

            {/* Recipes Display */}
            {!loading && recipes.length > 0 && (
              <div className={`recipes-container ${dishCoveryViewMode === 'grid' ? 'recipes-grid' : 'recipes-list'}`}>
                {recipes.map(recipe => (
                  <div
                    key={recipe.id}
                    className={`recipe-card ${dishCoveryViewMode === 'list' ? 'list-view' : ''}`}
                    onClick={() => openModal(recipe)}
                  >
                    {/* Recipe Image */}
                    <div className="recipe-image-container">
                      <img
                        src={Array.isArray(recipe.images) ? recipe.images[0] : recipe.images}
                        alt={recipe.title}
                        className="recipe-image"
                        onError={(e) => { 
                          e.target.src = 'https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=No+Image';
                        }}
                      />
                      
                      {/* Verification Badge */}
                      <div className={`verification-badge ${recipe.verificationStatus === 'AI-generated' ? 'ai-generated' : 'verified'}`}>
                        <FontAwesomeIcon icon={getVerificationIcon(recipe.verificationStatus)} />
                      </div>

                      {/* Health Badge */}
                      {recipe.healthTags.length > 0 && (
                        <div className="health-badge">
                          <FontAwesomeIcon icon={faAward} />
                        </div>
                      )}
                    </div>

                    {/* Recipe Content */}
                    <div className="recipe-content">
                      {/* Rating */}
                      <div className="recipe-rating">
                        {renderStars(recipe.rating)}
                        <span className="rating-value">({recipe.rating})</span>
                      </div>

                      {/* Title */}
                      <h3 className="recipe-title">{recipe.title}</h3>

                      {/* Description */}
                      <p className="recipe-description">{recipe.description}</p>

                      {/* Meta Info */}
                      <div className="recipe-meta">
                        <div className="recipe-meta-info">
                          <div className="meta-item">
                            <FontAwesomeIcon icon={faClock} />
                            {recipe.cookTime}
                          </div>
                          <div className="meta-item">
                            <FontAwesomeIcon icon={faUsers} />
                            {recipe.servings} servings
                          </div>
                        </div>
                        
                        <span className="meal-type-badge">
                          {recipe.mealType}
                        </span>
                      </div>

                      {/* Tags */}
                      <div className="recipe-tags">
                        <div className="tags-container">
                          {recipe.dietaryTags.slice(0, 3).map(tag => (
                            <span key={tag} className="recipe-tag dietary">
                              {tag}
                            </span>
                          ))}
                          {recipe.dietaryTags.length > 3 && (
                            <span className="tags-more">
                              +{recipe.dietaryTags.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Engagement */}
                      <div className="recipe-engagement">
                        <div className="engagement-item">
                          <FontAwesomeIcon icon={faEye} />
                          {recipe.engagement.tried} tried
                        </div>
                        <div className="engagement-item">
                          <FontAwesomeIcon icon={faHeartRegular} />
                          {recipe.engagement.saved} saved
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Load More Button */}
            {hasMore && !loading && recipes.length > 0 && (
              <div className="load-more-container" style={{ textAlign: 'center', marginTop: '32px' }}>
                <button 
                  className="load-more-btn" 
                  onClick={handleLoadMore}
                  disabled={loading}
                  style={{
                    background: '#2E7D32',
                    color: 'white',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontFamily: 'Poppins, sans-serif'
                  }}
                >
                  {loading ? 'Loading...' : 'Load More Recipes'}
                </button>
              </div>
            )}
          </main>
        </div>

        {/* Mobile Filter Overlay */}
        {showMobileFilters && (
          <div 
            className="mobile-filter-overlay"
            onClick={() => setShowMobileFilters(false)}
          />
        )}

        {/* Filter Modal */}
        {showFilterModal && (
          <div className="modal-overlay" onClick={closeFilterModal}>
            <div className="filter-modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={closeFilterModal}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
              
              {/* Filter Modal Header */}
              <div className="filter-modal-header">
                <h2 className="filter-modal-title">Filter Recipes</h2>
                {getActiveFilterCount() > 0 && (
                  <span className="filter-modal-count">
                    {getActiveFilterCount()} active filter{getActiveFilterCount() !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              
              {/* Filter Modal Body */}
              <div className="filter-modal-body">
                {/* Sort Section */}
                <div className="filter-modal-section">
                  <h3 className="filter-modal-section-title">Sort By</h3>
                  <select
                    value={dishCoverySortBy}
                    onChange={(e) => setDishCoverySortBy(e.target.value)}
                    className="filter-modal-dropdown"
                  >
                    <option value="popularity">Most Popular</option>
                    <option value="rating">Highest Rated</option>
                    <option value="cookTime">Cook Time</option>
                    <option value="alphabetical">A-Z</option>
                  </select>
                </div>

                {/* Filter Categories */}
                {Object.entries(filterOptions).map(([category, options]) => (
                  <div key={category} className="filter-modal-section">
                    <h3 className="filter-modal-section-title">
                      {category === 'mealType' ? 'Meal Type' : 
                       category === 'dietaryTags' ? 'Dietary Tags' : 'Health Tags'}
                    </h3>
                    <div className="filter-modal-options">
                      {options.map(option => (
                        <label key={option} className="filter-modal-option">
                          <input
                            type="checkbox"
                            className="filter-modal-checkbox"
                            checked={filters[category].includes(option)}
                            onChange={() => handleFilterChange(category, option)}
                          />
                          <span className="filter-modal-option-text">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Active Filters */}
                {getActiveFilterCount() > 0 && (
                  <div className="filter-modal-section">
                    <h3 className="filter-modal-section-title">Active Filters</h3>
                    <div className="filter-modal-active-tags">
                      {Object.entries(filters).map(([category, values]) =>
                        values.map(value => (
                          <span key={`${category}-${value}`} className="filter-modal-active-tag">
                            {value}
                            <button onClick={() => handleFilterChange(category, value)}>×</button>
                          </span>
                        ))
                      )}
                    </div>
                    <button className="filter-modal-clear-all" onClick={clearAllFilters}>
                      Clear All Filters
                    </button>
                  </div>
                )}
              </div>
              
              {/* Filter Modal Footer */}
              <div className="filter-modal-footer">
                <button className="filter-modal-btn-secondary" onClick={closeFilterModal}>
                  Cancel
                </button>
                <button className="filter-modal-btn-primary" onClick={applyFilters}>
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal */}
        {isModalOpen && selectedRecipe && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={closeModal}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
              
              {/* Modal Header */}
              <div className="modal-header">
                <h1 className="modal-title">{selectedRecipe.title}</h1>
                <p className="modal-subtitle">{selectedRecipe.description}</p>
              </div>
              
              {/* Modal Body */}
              <div className="modal-body" ref={modalBodyRef} onScroll={handleModalScroll}>
                {/* Left Column - Image and Verification */}
                <div className="modal-left">
                  {/* Image Gallery */}
                  <div className="modal-image-container">
                    <img 
                      src={Array.isArray(selectedRecipe.images) ? selectedRecipe.images[currentImageIndex] : selectedRecipe.images} 
                      alt={selectedRecipe.title} 
                      className="modal-image" 
                      onError={(e) => { 
                        e.target.src = 'https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=No+Image';
                      }}
                    />
                    {Array.isArray(selectedRecipe.images) && selectedRecipe.images.length > 1 && (
                      <>
                        <button className="image-nav prev" onClick={prevImage}>
                          <FontAwesomeIcon icon={faChevronLeft} />
                        </button>
                        <button className="image-nav next" onClick={nextImage}>
                          <FontAwesomeIcon icon={faChevronRight} />
                        </button>
                        <div className="image-indicators">
                          {selectedRecipe.images.map((_, index) => (
                            <button
                              key={index}
                              className={`indicator ${index === currentImageIndex ? 'active' : ''}`}
                              onClick={() => setCurrentImageIndex(index)}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Verification Section */}
                  <div className="verification-section">
                    <div className="verification-main">
                      <FontAwesomeIcon 
                        className="verification-icon"
                        icon={getVerificationIcon(selectedRecipe.verificationStatus)}
                      />
                      <span className="verification-status">
                        {selectedRecipe.verificationStatus === 'AI-generated' 
                          ? 'AI Generated Recipe' 
                          : 'Professionally Verified'
                        }
                      </span>
                    </div>
                    {selectedRecipe.verificationStatus !== 'AI-generated' && selectedRecipe.verifierName && (
                      <div className="verifier-details">
                        <span className="verifier-name">
                          Verified by: {selectedRecipe.verifierName}
                        </span>
                        {selectedRecipe.verifierCredentials && (
                          <span className="verifier-credentials">
                            {selectedRecipe.verifierCredentials}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Recipe Statistics */}
                  <div className="modal-stats">
                    <div className="stat-item-display">
                      <FontAwesomeIcon icon={faEye} className="stat-icon" />
                      <div className="stat-text">
                        <div className="stat-number">{selectedRecipe.engagement.tried} people tried this</div>
                      </div>
                    </div>
                    <button 
                      className={`stat-item-button favorite-button-compact stat-button-ripple ${selectedRecipe.isFavorited ? 'favorited' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(selectedRecipe.id);
                      }}
                      aria-label={selectedRecipe.isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                      aria-pressed={selectedRecipe.isFavorited}
                    >
                      <FontAwesomeIcon 
                        icon={selectedRecipe.isFavorited ? faHeart : faHeartRegular} 
                        className="stat-icon" 
                      />
                      <div className="stat-text">
                        <span className="stat-number">
                          {selectedRecipe.isFavorited ? (
                            <>
                              <span>Remove from</span>
                              <span>Favorites</span>
                            </>
                          ) : (
                            <>
                              <span>Add to</span>
                              <span>Favorites</span>
                            </>
                          )}
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Center Column - Instructions */}
                <div className="modal-center">
                  <div className="instructions-section">
                    <h3 className="section-title">Step-by-Step Instructions</h3>
                    <div className="instructions-list">
                      {selectedRecipe.instructions && selectedRecipe.instructions.map((step, index) => (
                        <div key={index} className="instruction-step">
                          <span className="step-number">{index + 1}</span>
                          <span className="step-text">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Right Column - Tags and Ingredients */}
                <div className="modal-right">
                  {/* Dietary Information */}
                  {selectedRecipe.dietaryTags && selectedRecipe.dietaryTags.length > 0 && (
                    <div className="modal-section">
                      <h3 className="section-title">Dietary Tags</h3>
                      <div className="modal-tags">
                        {selectedRecipe.dietaryTags.map((tag, index) => (
                          <span key={index} className="modal-tag dietary">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Meal Type */}
                  {selectedRecipe.mealType && (
                    <div className="modal-section">
                      <h3 className="section-title">Meal Type</h3>
                      <div className="modal-tags">
                        <span className="modal-tag meal-type">
                          <FontAwesomeIcon icon={faUtensils} />
                          {selectedRecipe.mealType}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Ingredients Section */}
                  <div className="modal-section">
                    <h3 className="section-title">Ingredients</h3>
                    <div className="ingredients-grid">
                      {['main', 'condiments', 'optional'].map((category, categoryIndex) => {
                        const ingredients = selectedRecipe.ingredients[category];
                        if (!ingredients || ingredients.length === 0) return null;
                        
                        return (
                          <div key={category} className="ingredient-category">
                            <h4 className="ingredient-category-title">
                              {category === 'main' ? 'Main Ingredients' : 
                               category === 'condiments' ? 'Condiments & Seasonings' : 'Optional Ingredients'}
                            </h4>
                            <div className="ingredient-list">
                              {ingredients.map((item, index) => {
                                const ingredient = typeof item === 'string' ? item : item.ingredient;
                                const alternative = typeof item === 'object' ? item.alternative : '';
                                const showAltKey = `${categoryIndex}-${index}`;
                                
                                return (
                                  <div key={index} className="ingredient-item">
                                    <div className="ingredient-main">
                                      <span>{ingredient}</span>
                                      {alternative && (
                                        <button 
                                          className="alternative-button"
                                          onClick={() => toggleAlternative(categoryIndex, index)}
                                          title="Show alternative ingredient"
                                        >
                                          <FontAwesomeIcon icon={faExchangeAlt} />
                                        </button>
                                      )}
                                    </div>
                                    {alternative && showAlternatives[showAltKey] && (
                                      <div className="alternative-content">
                                        <span className="alternative-label">Alternative:</span>
                                        <span className="alternative-text">{alternative}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              {showScrollIndicator && (
                <div className="scroll-indicator">
                  <FontAwesomeIcon icon={faChevronDown} className="scroll-indicator-icon" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Bottom Navigation */}
        <nav className="mobile-bottom-nav">
          <a href="/user/home" className="bottom-nav-link">
            <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
            Home
          </a>
          
          <a href="/user/pantry" className="bottom-nav-link">
            <svg 
              ref={iconRef}
              className="nav-icon" 
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24" 
              fill="currentColor"
            >
              <rect x="6" y="2" width="12" height="20" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/>
              <line x1="6" y1="10" x2="18" y2="10" stroke="currentColor" strokeWidth="2"/>
              <line x1="8" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="2"/>
              <line x1="8" y1="14" x2="10" y2="14" stroke="currentColor" strokeWidth="2"/>
            </svg>
            My Pantry
          </a>

          <button className="bottom-nav-scan" onClick={dishCoveryHandleScanClick}>
            <svg className="scan-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </button>
          
          <a href="/user/favorites" className="bottom-nav-link">
            <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            Favorites
          </a>
          
          <a href="/user/user-profile" className="bottom-nav-link">
            <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
            </svg>
            User
          </a>
        </nav>
      </div>
    </UserLayout>
  );
};

export default RecipePage;