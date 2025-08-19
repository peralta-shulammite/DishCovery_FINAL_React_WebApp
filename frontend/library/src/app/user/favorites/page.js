'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import './styles.css';

export default function FavoritesPage() {
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

  // Search and filter states
  const [dishCoverySearchQuery, setDishCoverySearchQuery] = useState('');
  const [dishCoverySortBy, setDishCoverySortBy] = useState('dateSaved');
  const [dishCoveryViewMode, setDishCoveryViewMode] = useState('grid'); // 'grid' or 'list'

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAlternatives, setShowAlternatives] = useState({});

  // Enhanced mock favorites data with full recipe details
  const [dishCoveryFavoriteRecipes, setDishCoveryFavoriteRecipes] = useState([
    {
      id: 1,
      title: 'Mediterranean Quinoa Bowl',
      name: 'Mediterranean Quinoa Bowl', // Keep for backward compatibility
      description: 'Nutritious bowl packed with quinoa, roasted vegetables, and creamy tahini dressing. Perfect for a healthy lunch or dinner.',
      images: [
        'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop'
      ],
      mealType: 'Lunch',
      ingredients: {
        main: [
          { ingredient: 'Quinoa (1 cup)', alternative: 'Brown rice or bulgur wheat' },
          { ingredient: 'Sweet potato, cubed', alternative: 'Butternut squash or regular potato' },
          { ingredient: 'Broccoli florets', alternative: 'Cauliflower or Brussels sprouts' },
          { ingredient: 'Chickpeas (1 can)', alternative: 'Black beans or lentils' }
        ],
        condiments: [
          { ingredient: 'Tahini (3 tbsp)', alternative: 'Almond butter or cashew cream' },
          { ingredient: 'Lemon juice', alternative: 'Lime juice or apple cider vinegar' },
          { ingredient: 'Olive oil', alternative: 'Avocado oil' },
          { ingredient: 'Garlic, minced', alternative: 'Garlic powder' }
        ],
        optional: [
          { ingredient: 'Avocado slices', alternative: 'Cucumber slices' },
          { ingredient: 'Pumpkin seeds', alternative: 'Sunflower seeds or chopped nuts' },
          { ingredient: 'Fresh herbs (parsley, cilantro)', alternative: 'Dried herbs' }
        ]
      },
      instructions: [
        'Cook quinoa according to package directions. Fluff with a fork and set aside.',
        'Preheat oven to 400°F (200°C). Toss sweet potato and broccoli with olive oil, salt, and pepper.',
        'Roast vegetables for 25 minutes until tender and slightly caramelized.',
        'Prepare tahini dressing by whisking tahini, lemon juice, water, and minced garlic until smooth.',
        'Drain and rinse chickpeas. Season with salt, pepper, and a drizzle of olive oil.',
        'Assemble bowls with quinoa as the base, top with roasted vegetables and chickpeas.',
        'Drizzle with tahini dressing and garnish with avocado, pumpkin seeds, and fresh herbs.'
      ],
      dietaryTags: ['Vegan', 'Gluten-free', 'Mediterranean'],
      healthTags: ['Heart-healthy', 'High-protein', 'Diabetic-safe'],
      verificationStatus: 'Checked by: Nutritionist',
      verifierName: 'Dr. Sarah Johnson',
      verifierCredentials: 'RD, PhD in Nutritional Science',
      engagement: { tried: 245, saved: 189 },
      rating: 4.8,
      cookTime: '25 min',
      servings: 4,
      prepTime: '25 mins',
      savedOn: 'July 28, 2025',
      difficulty: 'Easy',
      tags: ['Vegan', 'Low-Sodium', 'High-Protein'],
      image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop'
    },
    {
      id: 2,
      title: 'Grilled Salmon with Herbs',
      name: 'Grilled Salmon with Herbs',
      description: 'Heart-healthy grilled salmon with fresh herbs and a side of roasted vegetables.',
      images: [
        'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&h=300&fit=crop'
      ],
      mealType: 'Dinner',
      ingredients: {
        main: [
          { ingredient: 'Salmon fillets (4 pieces)', alternative: 'Arctic char or trout' },
          { ingredient: 'Fresh dill', alternative: 'Dried dill or parsley' },
          { ingredient: 'Lemon', alternative: 'Lime' },
          { ingredient: 'Asparagus', alternative: 'Green beans or broccoli' }
        ],
        condiments: [
          { ingredient: 'Olive oil', alternative: 'Avocado oil' },
          { ingredient: 'Salt and pepper', alternative: 'Herb seasoning' },
          { ingredient: 'Garlic powder', alternative: 'Fresh garlic' }
        ],
        optional: [
          { ingredient: 'Capers', alternative: 'Olives' },
          { ingredient: 'Cherry tomatoes', alternative: 'Sun-dried tomatoes' }
        ]
      },
      instructions: [
        'Preheat grill to medium-high heat.',
        'Season salmon fillets with salt, pepper, and garlic powder.',
        'Brush salmon and asparagus with olive oil.',
        'Grill salmon for 4-5 minutes per side until cooked through.',
        'Grill asparagus for 3-4 minutes until tender-crisp.',
        'Garnish with fresh dill and lemon wedges.',
        'Serve immediately while hot.'
      ],
      dietaryTags: ['High-protein', 'Gluten-free'],
      healthTags: ['Heart-healthy', 'Omega-3 rich'],
      verificationStatus: 'Checked by: Dietitian',
      verifierName: 'Maria Rodriguez',
      verifierCredentials: 'RD, MS in Clinical Nutrition',
      engagement: { tried: 156, saved: 98 },
      rating: 4.6,
      cookTime: '30 min',
      servings: 4,
      prepTime: '30 mins',
      savedOn: 'July 27, 2025',
      difficulty: 'Medium',
      tags: ['Heart-Healthy', 'High-Protein', 'Gluten-Free'],
      image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop'
    },
    {
      id: 3,
      title: 'Vegetable Stir Fry',
      name: 'Vegetable Stir Fry',
      description: 'Colorful and nutritious vegetable stir fry with a savory sauce.',
      images: [
        'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=300&fit=crop'
      ],
      mealType: 'Lunch',
      ingredients: {
        main: [
          { ingredient: 'Mixed vegetables (2 cups)', alternative: 'Any seasonal vegetables' },
          { ingredient: 'Bell peppers', alternative: 'Snow peas' },
          { ingredient: 'Broccoli', alternative: 'Cauliflower' },
          { ingredient: 'Carrots', alternative: 'Snap peas' }
        ],
        condiments: [
          { ingredient: 'Soy sauce', alternative: 'Tamari or coconut aminos' },
          { ingredient: 'Sesame oil', alternative: 'Vegetable oil' },
          { ingredient: 'Ginger', alternative: 'Ground ginger' },
          { ingredient: 'Garlic', alternative: 'Garlic powder' }
        ],
        optional: [
          { ingredient: 'Sesame seeds', alternative: 'Crushed peanuts' },
          { ingredient: 'Green onions', alternative: 'Chives' }
        ]
      },
      instructions: [
        'Heat oil in a large wok or skillet over high heat.',
        'Add garlic and ginger, stir-fry for 30 seconds.',
        'Add harder vegetables first (carrots, broccoli) and cook for 2-3 minutes.',
        'Add softer vegetables (bell peppers) and cook for another 2 minutes.',
        'Mix soy sauce and sesame oil, pour over vegetables.',
        'Stir-fry for 1-2 minutes until vegetables are crisp-tender.',
        'Garnish with sesame seeds and green onions.'
      ],
      dietaryTags: ['Vegan', 'Gluten-free'],
      healthTags: ['Low-carb', 'Diabetic-safe'],
      verificationStatus: 'AI-generated',
      verifierName: '',
      verifierCredentials: '',
      engagement: { tried: 89, saved: 67 },
      rating: 4.4,
      cookTime: '20 min',
      servings: 3,
      prepTime: '20 mins',
      savedOn: 'July 26, 2025',
      difficulty: 'Easy',
      tags: ['Diabetic-Friendly', 'Low-Carb', 'Vegetarian'],
      image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=300&fit=crop'
    }
  ]);

  const [dishCoveryHoverStates, setDishCoveryHoverStates] = useState({
    logo: false,
    avatar: false,
    signIn: false,
    scanNav: false,
  });

  const dishCoveryHandleHover = (element, isHover) => {
    setDishCoveryHoverStates((prev) => ({ ...prev, [element]: isHover }));
  };

  const dishCoveryScrollToTop = useCallback(() => {
    dishCoveryTopRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const dishCoveryHandleClickOutside = (event) => {
      if (dishCoveryAvatarRef.current && !dishCoveryAvatarRef.current.contains(event.target)) {
        setDishCoveryShowAvatarDropdown(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isModalOpen) closeModal();
    };
    document.addEventListener('mousedown', dishCoveryHandleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', dishCoveryHandleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isModalOpen]);

  const dishCoveryNavLinks = [
    { name: "Home", href: "/user/home" },
    { name: "My Pantry", href: "/user/pantry" },
    { name: "Favorites", href: "/user/favorites", active: true },
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

  const dishCoveryHandleRemoveFromFavorites = (recipeId) => {
    setDishCoveryFavoriteRecipes(prev => prev.filter(recipe => recipe.id !== recipeId));
  };

  const dishCoveryHandleViewRecipe = (recipeId) => {
    // Navigate to recipe detail page
    window.location.href = `/recipe/${recipeId}`;
  };

  // Filter and sort recipes
  const dishCoveryFilteredAndSortedRecipes = dishCoveryFavoriteRecipes
    .filter(recipe => 
      recipe.name.toLowerCase().includes(dishCoverySearchQuery.toLowerCase()) ||
      recipe.description.toLowerCase().includes(dishCoverySearchQuery.toLowerCase()) ||
      recipe.tags.some(tag => tag.toLowerCase().includes(dishCoverySearchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      switch (dishCoverySortBy) {
        case 'dateSaved':
          return new Date(b.savedOn) - new Date(a.savedOn);
        case 'prepTime':
          return parseInt(a.prepTime) - parseInt(b.prepTime);
        case 'alphabetical':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

  // Helper functions for enhanced recipe cards
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <svg key={i} className="star filled" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      );
    }
    
    if (hasHalfStar) {
      stars.push(
        <svg key="half" className="star half" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4V6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/>
        </svg>
      );
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <svg key={`empty-${i}`} className="star empty" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/>
        </svg>
      );
    }
    
    return stars;
  };

  const getVerificationIcon = (status) => {
    if (status === 'AI-generated') {
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4C22,2.89 21.1,2 20,2Z"/>
        </svg>
      );
    }
    if (status.includes('Doctor')) {
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/>
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/>
      </svg>
    );
  };

  // Modal functions
  const openModal = (recipe) => {
    setSelectedRecipe(recipe);
    setIsModalOpen(true);
    setCurrentImageIndex(0);
    setShowAlternatives({});
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRecipe(null);
    setCurrentImageIndex(0);
    setShowAlternatives({});
    document.body.style.overflow = 'unset';
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

  return (
    <div ref={dishCoveryTopRef} className="favorites-container">
      <div className="decorative-circle circle1"></div>
      <div className="decorative-circle circle2"></div>
      <div className="decorative-circle circle3"></div>

      {/* Header Navigation */}
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
            <a
              key={link.name}
              href={link.href}
              className={`nav-link ${link.active ? 'nav-link-active' : ''}`}
              onClick={() => setDishCoveryShowMobileMenu(false)}
            >
              {link.name}
            </a>
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
                  <svg className="user-icon" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                  </svg>
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

      {/* Mobile Menu */}
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
                className={`mobile-nav-link ${link.active ? 'mobile-nav-link-active' : ''}`}
                onClick={() => setDishCoveryShowMobileMenu(false)}
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
                <a href="/user/favorites" className="mobile-nav-link" onClick={() => setDishCoveryShowMobileMenu(false)}>Favorites</a>
                <a href="/user-profile" className="mobile-nav-link" onClick={() => setDishCoveryShowMobileMenu(false)}>Profile</a>
                <button className="mobile-nav-link logout-btn" onClick={dishCoveryHandleLogout}>Logout</button>
              </>
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

      <main className="favorites-main-content">
        <div className="favorites-header">
          <div className="page-title-section">
            <h1 className="page-title">My Favorite Recipes</h1>
            <p className="page-subtitle">Your personalized collection of saved meals</p>
          </div>

          {dishCoveryFavoriteRecipes.length > 0 && (
            <div className="favorites-controls">
              <div className="search-section">
                <div className="search-container">
                  <svg className="search-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search your favorite recipes..."
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
          )}
        </div>

        {dishCoveryFilteredAndSortedRecipes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            <h2 className="empty-state-title">
              {dishCoveryFavoriteRecipes.length === 0 ? 
                "You haven't saved any recipes yet" : 
                "No recipes match your search"
              }
            </h2>
            <p className="empty-state-description">
              {dishCoveryFavoriteRecipes.length === 0 ? 
                "Start exploring meals that match your dietary needs and save your favorites here!" :
                "Try adjusting your search terms or filters to find what you're looking for."
              }
            </p>
            {dishCoveryFavoriteRecipes.length === 0 && (
              <button className="explore-recipes-btn">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
                Explore Recipes
              </button>
            )}
          </div>
        ) : (
          <div className={`recipes-container ${dishCoveryViewMode === 'list' ? 'list-view' : 'grid-view'}`}>
            {dishCoveryFilteredAndSortedRecipes.map((recipe) => (
              <div
                key={recipe.id}
                className={`recipe-card ${dishCoveryViewMode === 'list' ? 'list-view' : ''}`}
                onClick={() => openModal(recipe)}
              >
                {/* Recipe Image */}
                <div className="recipe-image-container">
                  <img
                    src={Array.isArray(recipe.images) ? recipe.images[0] : recipe.image || recipe.images}
                    alt={recipe.title || recipe.name}
                    className="recipe-image"
                    onError={(e) => { 
                      e.target.src = 'https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=No+Image';
                    }}
                  />
                  
                  {/* Verification Badge */}
                  <div className={`verification-badge ${recipe.verificationStatus === 'AI-generated' ? 'ai-generated' : 'verified'}`}>
                    {getVerificationIcon(recipe.verificationStatus)}
                  </div>

                  {/* Health Badge */}
                  {recipe.healthTags && recipe.healthTags.length > 0 && (
                    <div className="health-badge">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M5 16L3 14l5.5-5.5L12 12l8.5-8.5L22 5l-10 10L5 16z"/>
                      </svg>
                    </div>
                  )}
                </div>

                {/* Recipe Content */}
                <div className="recipe-content">
                  {/* Rating */}
                  <div className="recipe-rating">
                    {renderStars(recipe.rating || 4.5)}
                    <span className="rating-value">({recipe.rating || 4.5})</span>
                  </div>

                  {/* Title */}
                  <h3 className="recipe-title">{recipe.title || recipe.name}</h3>

                  {/* Description */}
                  <p className="recipe-description">{recipe.description}</p>

                  {/* Meta Info */}
                  <div className="recipe-meta">
                    <div className="recipe-meta-info">
                      <div className="meta-item">
                        <svg className="meta-icon" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M15,1H9V3H15M11,14H13V8H11M19.03,7.39L20.45,5.97C20,5.46 19.55,5 19.04,4.56L17.62,6C16.07,4.74 14.12,4 12,4A9,9 0 0,0 3,13A9,9 0 0,0 12,22C17,22 21,17.97 21,13C21,10.88 20.26,8.93 19.03,7.39M12,20A7,7 0 0,1 5,13A7,7 0 0,1 12,6A7,7 0 0,1 19,13A7,7 0 0,1 12,20Z"/>
                        </svg>
                        {recipe.cookTime || recipe.prepTime}
                      </div>
                      <div className="meta-item">
                        <svg className="meta-icon" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2c0 .5-.2.95-.5 1.31L17 7.5V13h-2V7.5L12.5 5.31C12.2 4.95 12 4.5 12 4c0-1.11.89-2 2-2s2 .89 2 2zM10.5 4C11.33 4 12 4.67 12 5.5v7c0 .83-.67 1.5-1.5 1.5S9 13.33 9 12.5v-7C9 4.67 9.67 4 10.5 4z"/>
                        </svg>
                        {recipe.servings || 4} servings
                      </div>
                    </div>
                    
                    <span className="meal-type-badge">
                      {recipe.mealType || 'Main Dish'}
                    </span>
                  </div>

                  {/* Tags */}
                  <div className="recipe-tags">
                    <div className="tags-container">
                      {recipe.dietaryTags && recipe.dietaryTags.slice(0, 2).map(tag => (
                        <span key={tag} className="recipe-tag dietary">
                          {tag}
                        </span>
                      ))}
                      {recipe.healthTags && recipe.healthTags.slice(0, 1).map(tag => (
                        <span key={tag} className="recipe-tag health">
                          {tag}
                        </span>
                      ))}
                      {((recipe.dietaryTags?.length || 0) + (recipe.healthTags?.length || 0)) > 3 && (
                        <span className="tags-more">
                          +{((recipe.dietaryTags?.length || 0) + (recipe.healthTags?.length || 0)) - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Engagement */}
                  <div className="recipe-engagement">
                    <div className="engagement-item">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </svg>
                      {recipe.engagement?.tried || 0} tried
                    </div>
                    <div className="engagement-item">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                      {recipe.engagement?.saved || 0} saved
                    </div>
                  </div>

                  {/* Actions (only show remove button in favorites) */}
                  <div className="recipe-actions">
                    <button
                      className="view-recipe-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        openModal(recipe);
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </svg>
                      View Recipe
                    </button>
                    <button
                      className="remove-favorite-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        dishCoveryHandleRemoveFromFavorites(recipe.id);
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {dishCoveryFilteredAndSortedRecipes.length > 0 && (
          <div className="favorites-footer">
            <p className="favorites-count">
              Showing {dishCoveryFilteredAndSortedRecipes.length} of {dishCoveryFavoriteRecipes.length} favorite recipes
            </p>
          </div>
        )}
      </main>

      {/* Enhanced Recipe Modal */}
      {isModalOpen && selectedRecipe && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
            
            {/* Modal Header */}
            <div className="modal-header">
              <h1 className="modal-title">{selectedRecipe.title || selectedRecipe.name}</h1>
              <p className="modal-subtitle">{selectedRecipe.description}</p>
            </div>
            
            {/* Modal Body */}
            <div className="modal-body">
              {/* Left Column - Image and Verification */}
              <div className="modal-left">
                {/* Image Gallery */}
                <div className="modal-image-container">
                  <img 
                    src={Array.isArray(selectedRecipe.images) ? selectedRecipe.images[currentImageIndex] : selectedRecipe.image || selectedRecipe.images} 
                    alt={selectedRecipe.title || selectedRecipe.name} 
                    className="modal-image" 
                    onError={(e) => { 
                      e.target.src = 'https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=No+Image';
                    }}
                  />
                  {Array.isArray(selectedRecipe.images) && selectedRecipe.images.length > 1 && (
                    <>
                      <button className="image-nav prev" onClick={prevImage}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                        </svg>
                      </button>
                      <button className="image-nav next" onClick={nextImage}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                        </svg>
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
                    {getVerificationIcon(selectedRecipe.verificationStatus)}
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
                  <div className="stat-item">
                    <svg className="stat-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                    <span className="stat-value">{selectedRecipe.engagement?.tried || 0} people tried this</span>
                  </div>
                  <div className="stat-item">
                    <svg className="stat-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                    </svg>
                    <span className="stat-value">{selectedRecipe.engagement?.saved || 0} people saved this</span>
                  </div>
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
                
                {/* Health Benefits */}
                {selectedRecipe.healthTags && selectedRecipe.healthTags.length > 0 && (
                  <div className="modal-section">
                    <h3 className="section-title">Health Benefits</h3>
                    <div className="modal-tags">
                      {selectedRecipe.healthTags.map((tag, index) => (
                        <span key={index} className="modal-tag health">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M5 16L3 14l5.5-5.5L12 12l8.5-8.5L22 5l-10 10L5 16z"/>
                          </svg>
                          {tag}
                        </span>
                      ))}
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
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"/>
                                        </svg>
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
          </div>
        </div>
      )}
    </div>
  );
}