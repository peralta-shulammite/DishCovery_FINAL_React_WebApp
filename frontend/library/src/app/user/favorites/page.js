'use client';
import { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faStar,
  faStarHalfStroke,
  faClock,
  faUsers,
  faEye,
  faShieldAlt,
  faUserMd,
  faRobot,
  faExchangeAlt,
  faChevronLeft,
  faChevronRight,
  faChevronDown,
  faTimes,
  faUtensils,
  faHeart,
  faSearch,
  faExclamationCircle,
  faAward
} from '@fortawesome/free-solid-svg-icons';
import { 
  faStar as faStarRegular,
  faHeart as faHeartRegular
} from '@fortawesome/free-regular-svg-icons';
import './styles.css';
import UserLayout from '../../components/user/userlayout';
import { favoritesAPI } from '../recipe/api';

export default function FavoritesPage() {
  const dishCoveryTopRef = useRef(null);
  const modalBodyRef = useRef(null);
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

  // Search and filter states
  const [dishCoverySearchQuery, setDishCoverySearchQuery] = useState('');
  const [dishCoverySortBy, setDishCoverySortBy] = useState('dateSaved');
  const [dishCoveryViewMode, setDishCoveryViewMode] = useState('grid');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAlternatives, setShowAlternatives] = useState({});
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);
  const [recipeToRemove, setRecipeToRemove] = useState(null);

  // Favorites state
  const [dishCoveryFavoriteRecipes, setDishCoveryFavoriteRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load favorites from localStorage on mount
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await favoritesAPI.getFavorites();
        
        if (response && response.success) {
          // Handle both response.data (array) and response.favorites (array) formats
          const favorites = response.data || response.favorites || [];
          setDishCoveryFavoriteRecipes(favorites);
        } else {
          setDishCoveryFavoriteRecipes([]);
        }
      } catch (err) {
        console.error('Error loading favorites:', err);
        setError('Failed to load favorites. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadFavorites();
  }, []);

  useEffect(() => {
    const dishCoveryHandleClickOutside = (event) => {
      if (dishCoveryAvatarRef.current && !dishCoveryAvatarRef.current.contains(event.target)) {
        setDishCoveryShowAvatarDropdown(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        if (isModalOpen) closeModal();
        if (showRemoveConfirmation) cancelRemove();
      }
    };
    document.addEventListener('mousedown', dishCoveryHandleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', dishCoveryHandleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isModalOpen, showRemoveConfirmation]);

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

  const dishCoveryHandleRemoveFromFavorites = async (recipeId) => {
    try {
      await favoritesAPI.removeFromFavorites(recipeId);
      
      // Update state
      setDishCoveryFavoriteRecipes(prev => prev.filter(recipe => recipe.id !== recipeId));
    } catch (error) {
      console.error('Error removing from favorites:', error);
      alert('Failed to remove from favorites. Please try again.');
    }
  };

  // Filter and sort recipes
  const dishCoveryFilteredAndSortedRecipes = dishCoveryFavoriteRecipes
    .filter(recipe => 
      recipe.title.toLowerCase().includes(dishCoverySearchQuery.toLowerCase()) ||
      recipe.description.toLowerCase().includes(dishCoverySearchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (dishCoverySortBy) {
        case 'dateSaved':
          return b.id - a.id;
        case 'prepTime':
          return parseInt(a.cookTime) - parseInt(b.cookTime);
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

  // Helper functions from recipe page
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

  // Modal functions
  const openModal = (recipe) => {
    setSelectedRecipe(recipe);
    setIsModalOpen(true);
    setCurrentImageIndex(0);
    setShowAlternatives({});
    setShowScrollIndicator(true);
    document.body.style.overflow = 'hidden';
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

  const handleRemoveConfirmation = (recipeId) => {
    setRecipeToRemove(recipeId);
    setShowRemoveConfirmation(true);
  };

  const confirmRemove = () => {
    if (recipeToRemove) {
      dishCoveryHandleRemoveFromFavorites(recipeToRemove);
      setShowRemoveConfirmation(false);
      setRecipeToRemove(null);
      if (isModalOpen) closeModal();
    }
  };

  const cancelRemove = () => {
    setShowRemoveConfirmation(false);
    setRecipeToRemove(null);
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
            <h1 className="page-title">Your Favorite Recipes</h1>
            <p className="page-subtitle">
              Discover and manage your saved healthy meals
            </p>
          </div>
        </div>

        <div className="content-wrapper-favorites">
          {/* Main Content */}
          <main className="main-content">
            {/* Controls Container */}
            <div className="controls-container">
              {/* Search Section */}
              <div className="search-section">
                <div className="search-container">
                  <svg className="search-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search favorites..."
                    value={dishCoverySearchQuery}
                    onChange={(e) => setDishCoverySearchQuery(e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>

              <div className="filter-section">
                <select
                  value={dishCoverySortBy}
                  onChange={(e) => setDishCoverySortBy(e.target.value)}
                  className="sort-dropdown"
                >
                  <option value="dateSaved">Recently Saved</option>
                  <option value="prepTime">Prep Time</option>
                  <option value="alphabetical">A-Z</option>
                </select>

                {/* View Toggle */}
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
            {loading && (
              <div className="loading-container">
                Loading your favorites...
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="error-container">
                {error}
              </div>
            )}

            {/* Empty State or Recipes */}
            {!loading && !error && dishCoveryFilteredAndSortedRecipes.length === 0 && (
              <div className="empty-container">
                {dishCoveryFavoriteRecipes.length === 0 ? 
                  "You haven't saved any recipes yet. Start exploring meals that match your dietary needs!" :
                  "No recipes match your search. Try adjusting your search terms."
                }
              </div>
            )}

            {!loading && !error && dishCoveryFilteredAndSortedRecipes.length > 0 && (
              <div className={`recipes-container ${dishCoveryViewMode === 'grid' ? 'recipes-grid' : 'recipes-list'}`}>
                {dishCoveryFilteredAndSortedRecipes.map((recipe) => (
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
                    </div>

                    {/* Recipe Content */}
                    <div className="recipe-content">
                      {/* Title */}
                      <h3 className="recipe-title">{recipe.title}</h3>

                      {/* Description */}
                      <p className="recipe-description">{recipe.description}</p>

                      {/* Meta Info */}
                      <div className="recipe-meta">
                        <div className="recipe-meta-info">
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
                          {recipe.dietaryTags && recipe.dietaryTags.slice(0, 3).map(tag => (
                            <span key={tag} className="recipe-tag dietary">
                              {tag}
                            </span>
                          ))}
                          {recipe.dietaryTags && recipe.dietaryTags.length > 3 && (
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
          </main>
        </div>

        {/* Recipe Modal */}
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
                {/* Left Column */}
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
                    className="stat-item-button favorite-button-compact"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveConfirmation(selectedRecipe.id);
                    }}
                    aria-label="Remove from favorites"
                    aria-pressed="false"
                  >
                    <FontAwesomeIcon icon={faHeart} className="stat-icon" />
                    <div className="stat-text">
                      <div className="stat-number">
                        <span>Remove from</span>
                        <span>Favorites</span>
                      </div>
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
                        const ingredients = selectedRecipe.ingredients?.[category];
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

        {/* Remove Confirmation Modal */}
        {showRemoveConfirmation && (
          <div className="modal-overlay" onClick={cancelRemove}>
            <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
              <div className="confirmation-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
              </div>
              <h3 className="confirmation-title">Remove from Favorites?</h3>
              <p className="confirmation-message">
                Are you sure you want to remove this recipe from your favorites? You can always add it back later.
              </p>
              <div className="confirmation-actions">
                <button className="confirmation-btn cancel-btn" onClick={cancelRemove}>
                  Cancel
                </button>
                <button className="confirmation-btn confirm-btn" onClick={confirmRemove}>
                  Remove
                </button>
              </div>
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
          
          <a href="/user/favorites" className="bottom-nav-link bottom-nav-active">
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
}