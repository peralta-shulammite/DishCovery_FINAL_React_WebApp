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
  faBookmark,
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
import { recipeAPI } from './api'; // Import your API
import './styles.css';

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
  const [dishCoveryViewMode, setDishCoveryViewMode] = useState('grid'); // 'grid' or 'list'

  const [dishCoveryHoverStates, setDishCoveryHoverStates] = useState({
    logo: false,
    avatar: false,
    signIn: false,
    scanNav: false,
  });

  // Original Recipe Page State management
  const [filters, setFilters] = useState({
    mealType: [],
    dietaryTags: [],
    healthTags: []
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAlternatives, setShowAlternatives] = useState({});
  
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
      if (event.key === 'Escape' && isModalOpen) closeModal();
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

  // Enhanced sample data as fallback
  const sampleRecipes = [
    {
      id: 1,
      title: 'Mediterranean Quinoa Bowl',
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
      servings: 4
    },
    {
      id: 2,
      title: 'Classic Chicken Stir Fry',
      description: 'Quick and healthy chicken stir fry with fresh vegetables and a savory sauce.',
      images: [
        'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop'
      ],
      mealType: 'Dinner',
      ingredients: {
        main: [
          { ingredient: 'Chicken breast (1 lb)', alternative: 'Chicken thighs or tofu' },
          { ingredient: 'Bell peppers', alternative: 'Snap peas or broccoli' },
          { ingredient: 'Onions', alternative: 'Shallots or green onions' },
          { ingredient: 'Carrots', alternative: 'Snow peas or celery' }
        ],
        condiments: [
          { ingredient: 'Soy sauce', alternative: 'Tamari or coconut aminos' },
          { ingredient: 'Sesame oil', alternative: 'Vegetable oil' },
          { ingredient: 'Garlic', alternative: 'Garlic powder' },
          { ingredient: 'Ginger', alternative: 'Ground ginger' }
        ],
        optional: [
          { ingredient: 'Green onions', alternative: 'Chives' },
          { ingredient: 'Sesame seeds', alternative: 'Crushed peanuts' }
        ]
      },
      instructions: [
        'Cut chicken into bite-sized pieces and season with salt and pepper.',
        'Heat oil in a large wok or skillet over high heat.',
        'Add chicken and cook until golden brown, about 5-6 minutes.',
        'Add vegetables and stir-fry for 3-4 minutes until crisp-tender.',
        'Mix sauce ingredients and pour over chicken and vegetables.',
        'Stir-fry for another 2 minutes until sauce thickens.',
        'Serve immediately over rice, garnished with green onions and sesame seeds.'
      ],
      dietaryTags: ['High-protein', 'Gluten-free'],
      healthTags: ['Low-carb', 'Heart-healthy'],
      verificationStatus: 'AI-generated',
      verifierName: '',
      verifierCredentials: '',
      engagement: { tried: 156, saved: 98 },
      rating: 4.5,
      cookTime: '20 min',
      servings: 4
    },
    {
      id: 3,
      title: 'Avocado Toast Supreme',
      description: 'Elevated avocado toast with perfectly poached egg and everything seasoning.',
      images: [
        'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop'
      ],
      mealType: 'Breakfast',
      ingredients: {
        main: [
          { ingredient: 'Sourdough bread (2 slices)', alternative: 'Whole grain or gluten-free bread' },
          { ingredient: 'Ripe avocado (1 large)', alternative: 'Hummus or mashed beans' },
          { ingredient: 'Eggs (2)', alternative: 'Tofu scramble' }
        ],
        condiments: [
          { ingredient: 'Lemon juice', alternative: 'Lime juice' },
          { ingredient: 'Everything bagel seasoning', alternative: 'Salt, pepper, and sesame seeds' },
          { ingredient: 'Olive oil', alternative: 'Avocado oil' }
        ],
        optional: [
          { ingredient: 'Cherry tomatoes', alternative: 'Sun-dried tomatoes' },
          { ingredient: 'Red pepper flakes', alternative: 'Hot sauce' },
          { ingredient: 'Microgreens', alternative: 'Fresh herbs' }
        ]
      },
      instructions: [
        'Toast bread slices until golden brown.',
        'Mash avocado with lemon juice, salt, and pepper.',
        'Bring water to a gentle simmer for poaching eggs.',
        'Crack eggs into small bowls and gently slide into simmering water.',
        'Poach eggs for 3-4 minutes until whites are set but yolks are runny.',
        'Spread mashed avocado on toast and top with poached eggs.',
        'Sprinkle with everything seasoning and add optional toppings.'
      ],
      dietaryTags: ['Vegetarian', 'High-protein'],
      healthTags: ['Heart-healthy', 'High-protein'],
      verificationStatus: 'Checked by: Dietitian',
      verifierName: 'Maria Rodriguez',
      verifierCredentials: 'RD, MS in Clinical Nutrition',
      engagement: { tried: 312, saved: 267 },
      rating: 4.9,
      cookTime: '15 min',
      servings: 2
    }
  ];

  // Fetch recipes from API
  const fetchRecipes = async (isLoadMore = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // Prepare filters for API call
      const activeFilters = {};
      
      // Get active meal types
      if (filters.mealType.length > 0) {
        activeFilters.mealType = filters.mealType.join(',');
      }
      
      // Get active dietary tags
      if (filters.dietaryTags.length > 0) {
        activeFilters.dietaryTags = filters.dietaryTags.join(',');
      }
      
      // Get active health tags
      if (filters.healthTags.length > 0) {
        activeFilters.healthTags = filters.healthTags.join(',');
      }
      
      // Add search query if exists (use DishCovery search for consistency)
      const searchTerm = dishCoverySearchQuery.trim();
      if (searchTerm) {
        activeFilters.search = searchTerm;
      }
      
      // Add pagination
      activeFilters.limit = limit;
      activeFilters.offset = isLoadMore ? offset : 0;
      
      const response = await recipeAPI.getAllRecipes(activeFilters);
      
      if (response && response.data) {
        const newRecipes = response.data.map(recipe => ({
          id: recipe.id,
          title: recipe.title || recipe.name,
          description: recipe.description,
          images: recipe.images || [recipe.image || recipe.imageUrl || 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop'],
          mealType: recipe.mealType,
          ingredients: recipe.ingredients || {
            main: [],
            condiments: [],
            optional: []
          },
          instructions: recipe.instructions || [],
          dietaryTags: recipe.dietaryTags || recipe.dietary_restrictions || [],
          healthTags: recipe.healthTags || [],
          verificationStatus: recipe.verificationStatus || 'AI-generated',
          verifierName: recipe.verifierName || '',
          verifierCredentials: recipe.verifierCredentials || '',
          engagement: {
            tried: recipe.tried || recipe.engagement?.tried || 0,
            saved: recipe.saved || recipe.engagement?.saved || 0
          },
          rating: recipe.rating || 4.5,
          cookTime: recipe.cookTime || recipe.cookingTime || recipe.prepTime || '30 min',
          servings: recipe.servings || 4
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
        setRecipes(sampleRecipes);
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
          images: response.data.images || [response.data.image || response.data.imageUrl || 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop'],
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

  // Fetch when filters change with debouncing
  useEffect(() => {
    const delayedFetch = setTimeout(() => {
      fetchRecipes();
    }, 300); // Debounce the API call

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
    dietaryTags: ['Vegan', 'Vegetarian', 'Gluten-free', 'Dairy-free', 'Mediterranean', 'High-protein', 'Keto', 'Paleo'],
    healthTags: ['Heart-healthy', 'Low-carb', 'Diabetic-safe', 'High-protein', 'Antioxidant-rich', 'Low-sodium', 'Peanut-free']
  };

  // Filter recipes based on current filters and search (for fallback data)
  const filteredRecipes = recipes.filter(recipe => {
    const searchTerm = dishCoverySearchQuery;
    const matchesSearch = recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         recipe.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMealType = filters.mealType.length === 0 || filters.mealType.includes(recipe.mealType);
    const matchesDietary = filters.dietaryTags.length === 0 || 
                          filters.dietaryTags.some(tag => recipe.dietaryTags.includes(tag));
    const matchesHealth = filters.healthTags.length === 0 || 
                         filters.healthTags.some(tag => recipe.healthTags.includes(tag));
    
    return matchesSearch && matchesMealType && matchesDietary && matchesHealth;
  });

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
      dietaryTags: [],
      healthTags: []
    });
  };

  const getActiveFilterCount = () => {
    return filters.mealType.length + filters.dietaryTags.length + filters.healthTags.length;
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
    setSelectedRecipe(recipe);
    setIsModalOpen(true);
    setCurrentImageIndex(0);
    setShowAlternatives({});
    document.body.style.overflow = 'hidden';
    
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

  const handleLogout = () => {
    setDishCoveryShowAvatarDropdown(false);
    console.log("User logged out");
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Use API data if available, otherwise use filtered sample data
  const displayRecipes = recipes.length > 0 ? recipes : filteredRecipes;

  return (
    <div ref={dishCoveryTopRef} className="available-recipes-container">
      {/* Enhanced DishCovery Header Navigation */}
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
        <aside className="filters-sidebar">
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
          {error && (
            <div className="error-container">
              {error}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && displayRecipes.length === 0 && (
            <div className="empty-container">
              No recipes found matching your criteria. Try adjusting your filters.
            </div>
          )}

          {/* Recipes Display */}
          {!loading && displayRecipes.length > 0 && (
            <div className={`recipes-container ${dishCoveryViewMode === 'grid' ? 'recipes-grid' : 'recipes-list'}`}>
              {displayRecipes.map(recipe => (
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
                        {recipe.dietaryTags.slice(0, 2).map(tag => (
                          <span key={tag} className="recipe-tag dietary">
                            {tag}
                          </span>
                        ))}
                        {recipe.healthTags.slice(0, 1).map(tag => (
                          <span key={tag} className="recipe-tag health">
                            {tag}
                          </span>
                        ))}
                        {(recipe.dietaryTags.length + recipe.healthTags.length) > 3 && (
                          <span className="tags-more">
                            +{(recipe.dietaryTags.length + recipe.healthTags.length) - 3} more
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
          
          {/* Load More Button (for API pagination) */}
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
            <div className="modal-body">
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
                  <div className="stat-item">
                    <FontAwesomeIcon icon={faEye} className="stat-icon" />
                    <span className="stat-value">{selectedRecipe.engagement.tried} people tried this</span>
                  </div>
                  <div className="stat-item">
                    <FontAwesomeIcon icon={faBookmark} className="stat-icon" />
                    <span className="stat-value">{selectedRecipe.engagement.saved} people saved this</span>
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
                          <FontAwesomeIcon icon={faAward} />
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
  );
};

export default RecipePage;