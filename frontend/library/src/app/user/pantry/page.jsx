'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import './styles.css';

export default function DishCoveryPantry() {
  const dishCoveryTopRef = useRef(null);
  const dishCoveryAvatarRef = useRef(null);
  
  // Navigation states
  const [dishCoveryShowSignInModal, setDishCoveryShowSignInModal] = useState(false);
  const [dishCoveryShowSignUpModal, setDishCoveryShowSignUpModal] = useState(false);
  const [dishCoveryShowOneMoreStepModal, setDishCoveryShowOneMoreStepModal] = useState(false);
  const [dishCoveryIsLoggedIn, setDishCoveryIsLoggedIn] = useState(true); // Set to true for pantry page
  const [dishCoveryShowMobileMenu, setDishCoveryShowMobileMenu] = useState(false);
  const [dishCoveryShowAvatarDropdown, setDishCoveryShowAvatarDropdown] = useState(false);
  
  // Pantry states
  const [dishCoverySelectedIngredients, setDishCoverySelectedIngredients] = useState([]);
  const [dishCoverySearchTerm, setDishCoverySearchTerm] = useState('');
  const [dishCoverySelectedCategory, setDishCoverySelectedCategory] = useState('All');
  const [dishCoverySortBy, setDishCoverySortBy] = useState('name');
  const [dishCoveryShowSortMenu, setDishCoveryShowSortMenu] = useState(false);
  
  const [dishCoveryUser] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    photo: null
  });

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

  useEffect(() => {
    const dishCoveryHandleClickOutside = (event) => {
      if (dishCoveryAvatarRef.current && !dishCoveryAvatarRef.current.contains(event.target)) {
        setDishCoveryShowAvatarDropdown(false);
      }
      
      // Close sort menu when clicking outside
      if (!event.target.closest('.sort-dropdown')) {
        setDishCoveryShowSortMenu(false);
      }
    };
    document.addEventListener('mousedown', dishCoveryHandleClickOutside);
    return () => document.removeEventListener('mousedown', dishCoveryHandleClickOutside);
  }, []);

  const dishCoveryIngredients = [
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

  const dishCoveryCategories = [
  { id: 'All', name: 'All Items' },
  { id: 'Protein', name: 'Proteins' },
  { id: 'Vegetable', name: 'Vegetables' },
  { id: 'Grain', name: 'Grains' },
  { id: 'Dairy', name: 'Dairy' },
  { id: 'Pantry', name: 'Pantry' }, // Added missing comma here
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

  const dishCoveryToggleIngredient = (ingredientId) => {
    setDishCoverySelectedIngredients(prev => {
      if (prev.includes(ingredientId)) {
        return prev.filter(id => id !== ingredientId);
      } else {
        return [...prev, ingredientId];
      }
    });
  };

  const dishCoveryHandleGenerateRecipe = () => {
    if (dishCoverySelectedIngredients.length > 0) {
      const selectedNames = dishCoverySelectedIngredients.map(id => 
        dishCoveryIngredients.find(ing => ing.id === id)?.name
      ).join(', ');
      console.log('Generating recipe with ingredients:', selectedNames);
      // Here you would navigate to recipe generation page or call API
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
    // Add your logout logic here
    setDishCoveryIsLoggedIn(false);
    setDishCoveryUser(null);
    setDishCoveryShowAvatarDropdown(false);
    setDishCoveryShowMobileMenu(false);
    console.log("User logged out");
    // Redirect to landing page
    window.location.href = '/';
  };

  return (
    <div ref={dishCoveryTopRef} className="pantry-container">
      <div className="decorative-circle circle1"></div>
      <div className="decorative-circle circle2"></div>
      <div className="decorative-circle circle3"></div>

      {/* Updated Header Navigation */}
      <header className="header">
        <button
          className={`logo ${dishCoveryHoverStates.logo ? 'logo-hover' : ''}`}
          onClick={dishCoveryScrollToTop}
          onMouseEnter={() => dishCoveryHandleHover('logo', true)}
          onMouseLeave={() => dishCoveryHandleHover('logo', false)}
        >
          <span className="logo-text">DishCovery</span>
        </button>

        <nav className="nav-links">
          {dishCoveryNavLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={`nav-link ${link.name === 'My Pantry' ? 'nav-link-active' : ''}`}
              onClick={() => setDishCoveryShowMobileMenu(false)}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="nav-actions">
          {!dishCoveryIsLoggedIn ? (
            <>
              <button
                className={`scan-nav-btn ${dishCoveryHoverStates.scanNav ? 'scan-nav-btn-hover' : ''}`}
                onClick={dishCoveryHandleScanClick}
                onMouseEnter={() => dishCoveryHandleHover('scanNav', true)}
                onMouseLeave={() => dishCoveryHandleHover('scanNav', false)}
              >
                <svg className="scan-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
                Scan Now
              </button>
              <button
                className={`sign-in-btn ${dishCoveryHoverStates.signIn ? 'sign-in-btn-hover' : ''}`}
                onClick={dishCoveryHandleSignInClick}
                onMouseEnter={() => dishCoveryHandleHover('signIn', true)}
                onMouseLeave={() => dishCoveryHandleHover('signIn', false)}
              >
                Sign In
              </button>
            </>
          ) : (
            <div className="avatar-container" ref={dishCoveryAvatarRef}>
              <button
                className={`avatar-btn ${dishCoveryHoverStates.avatar ? 'avatar-btn-hover' : ''}`}
                onClick={() => setDishCoveryShowAvatarDropdown((prev) => !prev)}
                onMouseEnter={() => dishCoveryHandleHover('avatar', true)}
                onMouseLeave={() => dishCoveryHandleHover('avatar', false)}
              >
                {dishCoveryUser?.photo ? (
                  <img 
                    src={dishCoveryUser.photo} 
                    alt="User profile" 
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: '12px', fontWeight: '700' }}>
                    {dishCoveryUser?.firstName?.[0]}{dishCoveryUser?.lastName?.[0]}
                  </span>
                )}
              </button>
              {dishCoveryShowAvatarDropdown && (
                <div className="avatar-dropdown">
                  <a href="/user-profile" className="dropdown-item">User Profile</a>
                  <a href="/settings" className="dropdown-item">Settings</a>
                  <button className="dropdown-item logout-btn" onClick={dishCoveryHandleLogout}>Sign Out</button>
                </div>
              )}
            </div>
          )}
          <button className="hamburger-btn" onClick={dishCoveryToggleMobileMenu}>
            <svg className="hamburger-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Updated Mobile Menu */}
      {dishCoveryShowMobileMenu && (
        <div className="mobile-menu">
          <div className="mobile-menu-header">
            <span className="mobile-menu-logo">DishCovery</span>
            <button className="close-mobile-menu" onClick={dishCoveryToggleMobileMenu}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="close-icon">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
          <div className="mobile-menu-content">
            {dishCoveryNavLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="mobile-nav-link"
                onClick={(e) => {
                  e.preventDefault();
                  setDishCoveryShowMobileMenu(false);
                  if (link.onClick) link.onClick();
                  else document.querySelector(link.href)?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {link.name}
              </a>
            ))}
            {!dishCoveryIsLoggedIn ? (
              <>
                <button className="mobile-nav-link mobile-scan-btn" onClick={dishCoveryHandleScanClick}>
                  <svg className="scan-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                  </svg>
                  Scan Ingredients
                </button>
                <button className="mobile-nav-link mobile-sign-in-btn" onClick={dishCoveryHandleSignInClick}>
                  Sign In
                </button>
              </>
            ) : (
              <>
                <a href="user/favorites" className="mobile-nav-link" onClick={() => setDishCoveryShowMobileMenu(false)}>Favorites</a>
                <a href="/user-profile" className="mobile-nav-link" onClick={() => setDishCoveryShowMobileMenu(false)}>Profile</a>
                <button className="mobile-nav-link logout-btn" onClick={dishCoveryHandleLogout}>Logout</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Updated Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <Link href="/user/home" className="bottom-nav-link">
          <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          </svg>
          Home
        </Link>
        
        <Link href="/user/pantry" className="bottom-nav-link bottom-nav-active">
          <svg 
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
        </Link>

        <button className="bottom-nav-scan" onClick={dishCoveryHandleScanClick}>
          <svg className="scan-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
        </button>
        
        <Link href="/user/favorites" className="bottom-nav-link">
          <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          Favorites
        </Link>
        
        <Link href="/user/user-profile" className="bottom-nav-link">
          <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
          </svg>
          User
        </Link>
      </nav>

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
                <button 
                  className="clear-search" 
                  onClick={() => setDishCoverySearchTerm('')}
                >
                  ×
                </button>
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
                <button
                  className="clear-filters-btn"
                  onClick={() => setDishCoverySelectedCategory('All')}
                >
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
            </div>
          </div>
        )}
      </main>

      {dishCoverySelectedIngredients.length > 0 && (
        <div className="generate-recipe-container">
          <button
            className={`generate-recipe-btn ${dishCoveryHoverStates.generateBtn ? 'generate-recipe-btn-hover' : ''}`}
            onClick={dishCoveryHandleGenerateRecipe}
            onMouseEnter={() => dishCoveryHandleHover('generateBtn', true)}
            onMouseLeave={() => dishCoveryHandleHover('generateBtn', false)}
          >
            Generate Recipe
            <span className="generate-count">({dishCoverySelectedIngredients.length})</span>
          </button>
        </div>
      )}
    </div>
  );
}