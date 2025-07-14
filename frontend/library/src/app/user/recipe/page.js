'use client';
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBars, 
  faSearch, 
  faStar,
  faStarHalfStroke,
  faChevronDown,
  faFilter,
  faHome,
  faInfoCircle,
  faUtensils,
  faBook,
  faQuestion,
  faHeadset,
  faHandshakeAngle,
  faCheck,
  faHeart,
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import { 
  faComment,
  faStar as faStarRegular
} from '@fortawesome/free-regular-svg-icons';
import {
  faInstagram,
  faFacebook,
  faTwitter,
  faLinkedin
} from '@fortawesome/free-brands-svg-icons';
import { recipeAPI } from './api'; // Import your API
import './style.css';

const RecipePage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [filters, setFilters] = useState({
    mealType: {
      breakfast: true,
      dinner: false,
      lightMeal: false,
      lunch: false,
      snack: false,
      dessert: false
    },
    dishType: {
      bread: true,
      grilled: false,
      pasta: false,
      salad: false,
      sandwich: false,
      soup: false,
      stewStir: false,
      smoothie: false,
      drinks: false,
      noodles: false,
      rice: false
    }
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  
  // New state for API data
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(15);

  // Fetch recipes from API
  const fetchRecipes = async (isLoadMore = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // Prepare filters for API call
      const activeFilters = {};
      
      // Get active meal types
      const activeMealTypes = Object.entries(filters.mealType)
        .filter(([key, value]) => value)
        .map(([key]) => key);
      
      if (activeMealTypes.length > 0) {
        activeFilters.mealType = activeMealTypes.join(',');
      }
      
      // Get active dish types
      const activeDishTypes = Object.entries(filters.dishType)
        .filter(([key, value]) => value)
        .map(([key]) => key);
      
      if (activeDishTypes.length > 0) {
        activeFilters.dishType = activeDishTypes.join(',');
      }
      
      // Add search query if exists
      if (searchQuery.trim()) {
        activeFilters.search = searchQuery.trim();
      }
      
      // Add pagination
      activeFilters.limit = limit;
      activeFilters.offset = isLoadMore ? offset : 0;
      
      const response = await recipeAPI.getAllRecipes(activeFilters);
      
      if (response && response.data) {
        const newRecipes = response.data.map(recipe => ({
          id: recipe.id,
          title: recipe.title || recipe.name,
          time: recipe.cookingTime || recipe.prepTime || '30 min',
          likes: recipe.likes || 0,
          comments: recipe.comments || 0,
          image: recipe.image || recipe.imageUrl || 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=200&fit=crop',
          rating: recipe.rating || 4.5,
          description: recipe.description,
          tried: recipe.tried || 0,
          dietaryTags: recipe.dietaryTags || recipe.dietary_restrictions || [],
          healthTags: recipe.healthTags || [],
          ingredients: recipe.ingredients || {
            main: [],
            condiments: [],
            optional: []
          },
          instructions: recipe.instructions || []
        }));
        
        if (isLoadMore) {
          setRecipes(prev => [...prev, ...newRecipes]);
          setOffset(prev => prev + limit);
        } else {
          setRecipes(newRecipes);
          setOffset(limit);
        }
        
        // Check if there are more recipes
        setHasMore(newRecipes.length === limit);
      } else {
        if (!isLoadMore) {
          setRecipes([]);
        }
        setHasMore(false);
      }
      
    } catch (err) {
      console.error('Error fetching recipes:', err);
      setError('Failed to load recipes. Please try again.');
      
      // If it's the first load and there's an error, show fallback data
      if (!isLoadMore && recipes.length === 0) {
        const fallbackRecipes = Array(15).fill(null).map((_, index) => ({
          id: index + 1,
          title: 'Russian Salad',
          time: '40 min',
          likes: 0,
          comments: 0,
          image: index % 3 === 0 ? 
            'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=200&fit=crop' :
            index % 3 === 1 ?
            'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=300&h=200&fit=crop' :
            'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300&h=200&fit=crop',
          rating: 4.5
        }));
        
        fallbackRecipes.unshift({
          id: 0,
          title: 'Quinoa Buddha Bowl',
          time: '25 min',
          likes: 189,
          comments: 0,
          image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
          rating: 4.5,
          description: 'Nutritious bowl with quinoa, roasted vegetables, and tahini dressing',
          tried: 245,
          dietaryTags: ['Vegan', 'Gluten-free', 'High-Protein'],
          healthTags: ['Diabetic-safe', 'Heart-safe'],
          ingredients: {
            main: ['Quinoa', 'Sweet potato', 'Broccoli', 'Chickpeas'],
            condiments: ['Tahini', 'Lemon Juice', 'Olive oil'],
            optional: ['Avocado', 'Pumpkin Seeds', 'Fresh Herbs']
          },
          instructions: [
            'Cook quinoa according to package directions',
            'Roast vegetables at 400°F for 25 minutes',
            'Prepare tahini dressing by whisking tahini, lemon juice, and water',
            'Assemble bowl with quinoa, vegetables, and dressing'
          ]
        });
        
        setRecipes(fallbackRecipes);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch recipe details when opening modal
  const fetchRecipeDetails = async (recipeId) => {
    try {
      const response = await recipeAPI.getRecipeDetails(recipeId);
      if (response && response.data) {
        return {
          ...response.data,
          ingredients: response.data.ingredients || {
            main: [],
            condiments: [],
            optional: []
          },
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

  // Fetch when filters change
  useEffect(() => {
    const delayedFetch = setTimeout(() => {
      fetchRecipes();
    }, 300); // Debounce the API call

    return () => clearTimeout(delayedFetch);
  }, [filters, searchQuery]);

  // Load more recipes
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchRecipes(true);
    }
  };

  const handleFilterChange = (category, filterKey) => {
    setFilters(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [filterKey]: !prev[category][filterKey]
      }
    }));
  };

  const getActiveFilterCount = () => {
    const mealTypeCount = Object.values(filters.mealType).filter(Boolean).length;
    const dishTypeCount = Object.values(filters.dishType).filter(Boolean).length;
    return mealTypeCount + dishTypeCount;
  };

  const toggleFilterDropdown = () => {
    setIsFilterDropdownOpen(!isFilterDropdownOpen);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleNavLinkClick = (href, onClick) => {
    setIsMobileMenuOpen(false);
    if (onClick) {
      onClick();
    } else {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScanClick = () => {
    console.log("Initiate ingredient scan");
    setIsMobileMenuOpen(false);
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <FontAwesomeIcon 
          key={i} 
          icon={faStar} 
          className="star filled" 
        />
      );
    }
    
    if (hasHalfStar) {
      stars.push(
        <FontAwesomeIcon 
          key="half" 
          icon={faStarHalfStroke} 
          className="star half" 
        />
      );
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <FontAwesomeIcon 
          key={`empty-${i}`} 
          icon={faStarRegular} 
          className="star empty" 
        />
      );
    }
    
    return stars;
  };

  const filterOptions = {
    mealType: {
      title: 'Meal Type',
      options: [
        { key: 'breakfast', label: 'Breakfast' },
        { key: 'dinner', label: 'Dinner' },
        { key: 'lightMeal', label: 'Light Meal' },
        { key: 'lunch', label: 'Lunch' },
        { key: 'snack', label: 'Snack' },
        { key: 'dessert', label: 'Dessert' }
      ]
    },
    dishType: {
      title: 'Dish Type',
      options: [
        { key: 'bread', label: 'Bread' },
        { key: 'grilled', label: 'Grilled' },
        { key: 'pasta', label: 'Pasta' },
        { key: 'salad', label: 'Salad' },
        { key: 'sandwich', label: 'Sandwich' },
        { key: 'soup', label: 'Soup' },
        { key: 'stewStir', label: 'Stew/Stir' },
        { key: 'smoothie', label: 'Smoothie' },
        { key: 'drinks', label: 'Drinks' },
        { key: 'noodles', label: 'Noodles' },
        { key: 'rice', label: 'Rice' }
      ]
    }
  };

  const quickLinkIcons = {
    home: faHome,
    about: faInfoCircle,
    create: faUtensils,
    myrecipes: faBook
  };

  const supportLinkIcons = {
    help: faHandshakeAngle,
    faqs: faQuestion,
    contact: faHeadset
  };

  const navLinks = [
    { name: "Home", href: "/ph", onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
    { name: "My Pantry", href: "/pantry" },
    { name: "Favorites", href: "/favorites" },
    { name: "User", href: "/user-profile" },
  ];

  const openModal = async (recipe) => {
    setSelectedRecipe(recipe);
    setIsModalOpen(true);
    
    // Fetch detailed recipe data if needed
    if (recipe.id && (!recipe.instructions || recipe.instructions.length === 0)) {
      const detailedRecipe = await fetchRecipeDetails(recipe.id);
      if (detailedRecipe) {
        setSelectedRecipe(detailedRecipe);
      }
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRecipe(null);
  };

  return (
    <div className="recipe-page">
      <header className="header">
        <div className="header-container">
          <div className="header-left">
            <button 
              className="menu-btn"
              onClick={toggleMobileMenu}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-nav-menu"
              aria-label="Toggle navigation menu"
            >
              <FontAwesomeIcon icon={faBars} />
            </button>
            <div className="logo">
              <div className="logo-container" aria-label="DishCovery Logo"></div>
            </div>
          </div>
          
          <div className="header-center">
            <div className="search-container">
              <FontAwesomeIcon icon={faSearch} className="search-icon" />
              <input
                type="text"
                placeholder="Search meals (e.g. Full Meal, Dessert, Snack, Drink)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          <div className="header-right">
            <nav className="nav-links">
              <a href="#home" className="nav-link">Home</a>
              <a href="#recipes" className="nav-link active">Recipes</a>
              <a href="#scan" className="nav-link">Scan</a>
            </nav>
            <div className="user-profile">
              <img 
                src="https://via.placeholder.com/32x32?text=U" 
                alt="User Profile" 
                className="profile-img"
              />
            </div>
          </div>
        </div>

        <div 
          id="mobile-nav-menu"
          className={`mobile-nav-menu ${isMobileMenuOpen ? 'open' : ''}`}
        >
          <nav className="mobile-nav-links">
            <a 
              href="#home" 
              className="mobile-nav-link"
              onClick={() => handleNavLinkClick('#home')}
            >
              Home
            </a>
            <a 
              href="#recipes" 
              className="mobile-nav-link active"
              onClick={() => handleNavLinkClick('#recipes')}
            >
              Recipes
            </a>
            <a 
              href="#scan" 
              className="mobile-nav-link"
              onClick={() => handleNavLinkClick('#scan')}
            >
              Scan
            </a>
          </nav>
        </div>
      </header>

      <div className="main-container">
        <aside className="sidebar">
          <div className="mobile-filter-dropdown">
            <button 
              className={`filter-dropdown-button ${isFilterDropdownOpen ? 'open' : ''}`}
              onClick={toggleFilterDropdown}
              aria-expanded={isFilterDropdownOpen}
              aria-controls="filter-dropdown-content"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FontAwesomeIcon icon={faFilter} />
                <span>Filters</span>
                {getActiveFilterCount() > 0 && (
                  <span className={`filter-count-badge ${getActiveFilterCount() > 0 ? 'show' : ''}`}>
                    {getActiveFilterCount()}
                  </span>
                )}
              </div>
              <FontAwesomeIcon 
                icon={faChevronDown} 
                className="filter-dropdown-icon"
              />
            </button>
            
            <div 
              id="filter-dropdown-content"
              className={`filter-dropdown-content ${isFilterDropdownOpen ? 'open' : ''}`}
            >
              {Object.entries(filterOptions).map(([categoryKey, category]) => (
                <div key={categoryKey} className="mobile-filter-group">
                  <div className="mobile-filter-category">{category.title}</div>
                  {category.options.map((option) => (
                    <label key={option.key} className="mobile-filter-item">
                      <input 
                        type="checkbox" 
                        checked={filters[categoryKey][option.key]}
                        onChange={() => handleFilterChange(categoryKey, option.key)}
                      />
                      <span className="mobile-filter-text">{option.label}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="filters-section">
            <h3 className="filters-title">Filters</h3>
            
            <div className="filter-group">
              <h4 className="filter-category">Meal Type</h4>
              {filterOptions.mealType.options.map((option) => (
                <label key={option.key} className="filter-item">
                  <input 
                    type="checkbox" 
                    checked={filters.mealType[option.key]}
                    onChange={() => handleFilterChange('mealType', option.key)}
                  />
                  <span className="filter-text">{option.label}</span>
                </label>
              ))}
            </div>

            <div className="filter-group">
              <h4 className="filter-category">Dish Type</h4>
              {filterOptions.dishType.options.map((option) => (
                <label key={option.key} className="filter-item">
                  <input 
                    type="checkbox" 
                    checked={filters.dishType[option.key]}
                    onChange={() => handleFilterChange('dishType', option.key)}
                  />
                  <span className="filter-text">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        <main className="main-content">
          <div className="content-header">
            <h2 className="page-title">Recommended Recipes</h2>
          </div>
          
          {error && (
            <div className="error-message" style={{ 
              color: 'red', 
              textAlign: 'center', 
              padding: '20px',
              backgroundColor: '#ffebee',
              borderRadius: '4px',
              margin: '20px 0'
            }}>
              {error}
            </div>
          )}
          
          {loading && recipes.length === 0 ? (
            <div className="loading-spinner" style={{ 
              textAlign: 'center', 
              padding: '40px',
              fontSize: '18px'
            }}>
              Loading recipes...
            </div>
          ) : (
            <div className="recipes-grid">
              {recipes.map((recipe) => (
                <div key={recipe.id} className="recipe-card" onClick={() => openModal(recipe)}>
                  <div className="recipe-image-container">
                    <img 
                      src={recipe.image} 
                      alt={recipe.title}
                      className="recipe-image"
                    />
                  </div>
                  <div className="recipe-content">
                    <div className="recipe-rating">
                      {renderStars(recipe.rating)}
                    </div>
                    <h3 className="recipe-title">{recipe.title}</h3>
                    <div className="recipe-meta">
                      <span className="recipe-time">{recipe.time}</span>
                      <div className="recipe-actions">
                        <button className="action-btn like-btn">
                          <FontAwesomeIcon icon={faHeart} />
                          <span>{recipe.likes}</span>
                        </button>
                        <button className="action-btn comment-btn">
                          <FontAwesomeIcon icon={faComment} />
                          <span>{recipe.comments}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {hasMore && (
            <div className="load-more-container">
              <button 
                className="load-more-btn" 
                onClick={handleLoadMore}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </main>

        <nav className="mobile-bottom-nav">
          <a 
            href="/ph" 
            className="bottom-nav-link" 
            onClick={(e) => { 
              e.preventDefault(); 
              handleNavLinkClick('/ph', navLinks[0].onClick); 
            }}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
            Home
          </a>
          <a 
            href="/pantry" 
            className="bottom-nav-link" 
            onClick={(e) => { 
              e.preventDefault(); 
              handleNavLinkClick('/pantry'); 
            }}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 7H5c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm0 8H5V9h14v6z"/>
              <path d="M12 15c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3z"/>
            </svg>
            My Pantry
          </a>
          <button 
            className="bottom-nav-scan" 
            onClick={handleScanClick}
          >
            <svg className="scan-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </button>
          <a 
            href="/favorites" 
            className="bottom-nav-link" 
            onClick={(e) => { 
              e.preventDefault(); 
              handleNavLinkClick('/favorites'); 
            }}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            Favorites
          </a>
          <a 
            href="/user-profile" 
            className="bottom-nav-link" 
            onClick={(e) => { 
              e.preventDefault(); 
              handleNavLinkClick('/user-profile'); 
            }}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
            </svg>
            User
          </a>
        </nav>
      </div>

      <footer className="footer">
        <div className="footer-left">
          <div className="footer-logo">
            <div className="footer-logo-container" aria-label="DishCovery Logo"></div>
          </div>
          <p className="footer-description">
            Creating delicious meals with AI-powered personalized recipes tailored to your ingredients and preferences.
          </p>
        </div>
        <div className="footer-middle">
          <div className="quick-links">
            <h3 className="footer-title">Quick Links</h3>
            <ul className="footer-links">
              <li>
                <a href="#home">
                  <FontAwesomeIcon icon={quickLinkIcons.home} className="footer-link-icon" />
                  Home
                </a>
              </li>
              <li>
                <a href="#about">
                  <FontAwesomeIcon icon={quickLinkIcons.about} className="footer-link-icon" />
                  About Us
                </a>
              </li>
              <li>
                <a href="#create">
                  <FontAwesomeIcon icon={quickLinkIcons.create} className="footer-link-icon" />
                  Create Recipe
                </a>
              </li>
              <li>
                <a href="#myrecipes">
                  <FontAwesomeIcon icon={quickLinkIcons.myrecipes} className="footer-link-icon" />
                  My Recipes
                </a>
              </li>
            </ul>
          </div>
          <div className="support-links">
            <h3 className="footer-title">Support</h3>
            <ul className="footer-links">
              <li>
                <a href="#help">
                  <FontAwesomeIcon icon={supportLinkIcons.help} className="footer-link-icon" />
                  Help Center
                </a>
              </li>
              <li>
                <a href="#faqs">
                  <FontAwesomeIcon icon={supportLinkIcons.faqs} className="footer-link-icon" />
                  FAQs
                </a>
              </li>
              <li>
                <a href="#contact">
                  <FontAwesomeIcon icon={supportLinkIcons.contact} className="footer-link-icon" />
                  Contact Us
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-right">
          <h3 className="footer-title">Contact Us</h3>
          <div className="contact-form">
            <input type="email" placeholder="Your Email" className="contact-input" />
            <button type="submit" className="subscribe-btn">Subscribe</button>
          </div>
        </div>
        <div className="footer-social">
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
            <FontAwesomeIcon icon={faInstagram} />
          </a>
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
            <FontAwesomeIcon icon={faFacebook} />
          </a>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
            <FontAwesomeIcon icon={faTwitter} />
          </a>
          <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">
            <FontAwesomeIcon icon={faLinkedin} />
          </a>
        </div>
        <div className="footer-bottom">
          <p>© 2025 DishCovery. All rights reserved.</p>
        </div>
      </footer>

      {isModalOpen && selectedRecipe && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
            
            <h1 className="modal-title">{selectedRecipe.title}</h1>
            
            <div className="modal-body">
              <div className="modal-left">
                <div className="modal-image-container">
                  <img src={selectedRecipe.image} alt={selectedRecipe.title} className="modal-image" />
                </div>
                
                <p className="modal-description">{selectedRecipe.description}</p>
                
                <div className="modal-health-check">
                  <span className="modal-health-tag">Healthy Meal</span>
                  <span className="modal-checked">Checked by Dr. Sarah Johnson, Nutritionist</span>
                </div>
                
                <div className="modal-stats">
                  <span><FontAwesomeIcon icon={faCheck} /> {selectedRecipe.tried || 0} people tried this</span>
                  <span><FontAwesomeIcon icon={faHeart} /> {selectedRecipe.likes || 0} people saved this</span>
                </div>
              </div>
              
              <div className="modal-right">
                <div className="modal-section">
                  <div className="section-title">Dietary Tags:</div>
                  <div className="tag-container">
                    {selectedRecipe.dietaryTags && selectedRecipe.dietaryTags.map((tag, index) => (
                      <span key={index} className="modal-tag dietary-tag">{tag}</span>
                    ))}
                  </div>
                </div>
                
                <div className="modal-section">
                  <div className="section-title">Health Tags:</div>
                  <div className="tag-container">
                    {selectedRecipe.healthTags && selectedRecipe.healthTags.map((tag, index) => (
                      <span key={index} className="modal-tag health-tag">{tag}</span>
                    ))}
                  </div>
                </div>
                
                <div className="ingredients-grid">
                  <div className="ingredient-column">
                    <div className="section-title">Main ingredients:</div>
                    <div className="ingredients-list">
                      {selectedRecipe.ingredients?.main?.map((ingredient, index) => (
                        <div key={index} className="ingredient-item">{ingredient}</div>
                      ))}
                    </div>
                  </div>

                  <div className="ingredient-column">
                    <div className="section-title">Condiments:</div>
                    <div className="ingredients-list">
                      {selectedRecipe.ingredients?.condiments?.map((ingredient, index) => (
                        <div key={index} className="ingredient-item">{ingredient}</div>
                      ))}
                    </div>
                  </div>

                  <div className="ingredient-column">
                    <div className="section-title">Optional:</div>
                    <div className="ingredients-list">
                      {selectedRecipe.ingredients?.optional?.map((ingredient, index) => (
                        <div key={index} className="ingredient-item">{ingredient}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Instructions section moved outside the modal-right div to span full width */}
              <div className="modal-section instructions-section">
                <div className="section-title">Instructions:</div>
                <div className="instructions-list">
                  {selectedRecipe.instructions && selectedRecipe.instructions.map((step, index) => (
                    <div key={index} className="instruction-step">
                      <span className="step-number">{index + 1}.</span>
                      <span className="step-text">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipePage;