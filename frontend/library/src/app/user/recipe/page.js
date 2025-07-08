'use client';
import React, { useState, useEffect } from 'react'; // Add useEffect import
import { useSearchParams } from 'next/navigation';
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
} from '@fortawesome/free-solid-svg-icons';
import { 
  faHeart, 
  faComment,
  faStar as faStarRegular
} from '@fortawesome/free-regular-svg-icons';
import {
  faInstagram,
  faFacebook,
  faTwitter,
  faLinkedin
} from '@fortawesome/free-brands-svg-icons';
import './style.css';

const RecipePage = () => {
  // Move useSearchParams and related logic here
  const searchParams = useSearchParams();
  const ingredientsFromScanner = searchParams.get('ingredients');

  // Parse ingredients if they exist
  const scannedIngredients = ingredientsFromScanner 
    ? ingredientsFromScanner.split(',').map(name => name.trim())
    : [];

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

 // Debug: Show received ingredients
 useEffect(() => {
  if (scannedIngredients.length > 0) {
    console.log('Received ingredients from scanner:', scannedIngredients);
  }
}, [scannedIngredients]);

  const recipes = Array(15).fill(null).map((_, index) => ({
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

  const handleNavLinkClick = () => {
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
              onClick={handleNavLinkClick}
            >
              Home
            </a>
            <a 
              href="#recipes" 
              className="mobile-nav-link active"
              onClick={handleNavLinkClick}
            >
              Recipes
            </a>
            <a 
              href="#scan" 
              className="mobile-nav-link"
              onClick={handleNavLinkClick}
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
          
          <div className="recipes-grid">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="recipe-card">
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
          
          <div className="load-more-container">
            <button className="load-more-btn">Load More</button>
          </div>
        </main>
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
          <form className="contact-form">
            <input type="email" placeholder="Your Email" className="contact-input" />
            <button type="submit" className="subscribe-btn">Subscribe</button>
          </form>
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
    </div>
  );
};

export default RecipePage;