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
import { recipeAPI, favoritesAPI, triedAPI } from './api';
import './styles.css';
import UserLayout from '../../components/user/userlayout';
import { saveLastOpenedRecipe } from '../utils/recipeTracker';

const RecipePage = () => {
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

  const [filters, setFilters] = useState({
    mealType: [],
    dietaryTags: [],
    healthTags: []
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAlternatives, setShowAlternatives] = useState({});
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const modalBodyRef = useRef(null);

  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(15);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [recipesPerPage] = useState(6);
  
  const [hoverStates, setHoverStates] = useState({
    logo: false,
    avatar: false,
  });

  const [favoritedRecipes, setFavoritedRecipes] = useState(new Set());
  const [triedRecipes, setTriedRecipes] = useState(new Set());

  const avatarRef = useRef(null);

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

  // ✅ Authentication check - redirect to home if not logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('🔒 No token found, redirecting to home...');
      window.location.href = '/user/home';
      return;
    }
  }, []);

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

  // ✅ Fetch filtered recipes based on ingredient IDs
  const fetchFilteredRecipes = async (ingredientIds) => {
    try {
      setLoading(true);
      setError(null);
      
      const { recipesAPI } = await import('../utils/recipesAPI');
      const result = await recipesAPI.getFilteredRecipes({
        scannedIngredients: ingredientIds,
        limit: 50
      });
      
      if (result && result.success && result.recipes) {
        const newRecipes = result.recipes.map(recipe => {
          // Parse meal types - handle array, comma-separated string, or single value
          let mealTypes = [];
          if (Array.isArray(recipe.mealType)) {
            mealTypes = recipe.mealType.filter(m => m && m.trim());
          } else if (Array.isArray(recipe.meal_type)) {
            mealTypes = recipe.meal_type.filter(m => m && m.trim());
          } else if (typeof recipe.mealType === 'string' && recipe.mealType.includes(',')) {
            mealTypes = recipe.mealType.split(',').map(m => m.trim()).filter(m => m);
          } else if (typeof recipe.meal_type === 'string' && recipe.meal_type.includes(',')) {
            mealTypes = recipe.meal_type.split(',').map(m => m.trim()).filter(m => m);
          } else if (recipe.mealType) {
            mealTypes = [recipe.mealType];
          } else if (recipe.meal_type) {
            mealTypes = [recipe.meal_type];
          }
          
          return {
            id: recipe.id || recipe.recipe_id,
            title: recipe.title || recipe.name || recipe.recipe_name,
            description: recipe.description || '',
            images: Array.isArray(recipe.images) && recipe.images.length > 0 
              ? recipe.images 
              : (recipe.image ? [recipe.image] : (recipe.image_url ? [recipe.image_url] : ['https://via.placeholder.com/400x300?text=No+Image'])),
            mealType: mealTypes.length > 0 ? mealTypes : [],
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
          };
        });
        
        setRecipes(newRecipes);
        setOffset(newRecipes.length);
        setHasMore(false);
        console.log(`✅ Loaded ${newRecipes.length} filtered recipes`);
      } else {
        setRecipes([]);
        setError('No recipes found matching your ingredients.');
      }
    } catch (err) {
      console.error('Error fetching filtered recipes:', err);
      setError(err.message || 'Failed to load filtered recipes.');
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const response = await favoritesAPI.getFavorites();
        if (response && response.success) {
          // Handle both response.data (array) and response.favorites (array) formats
          const favorites = response.data || response.favorites || [];
          const favoriteIds = new Set(favorites.map(recipe => recipe.id || recipe.recipe_id));
          setFavoritedRecipes(favoriteIds);
        }
      } catch (error) {
        console.error('Error loading favorites:', error);
      }
    };
    
    const loadTriedRecipes = async () => {
      try {
        const response = await triedAPI.getTriedRecipes();
        if (response && response.success && response.data) {
          const triedIds = new Set(response.data.map(recipe => recipe.id || recipe.recipe_id));
          setTriedRecipes(triedIds);
        }
      } catch (error) {
        console.error('Error loading tried recipes:', error);
      }
    };
    
    loadFavorites();
    loadTriedRecipes();
    
    // ✅ Check for ingredients query parameter from scanning page
    const urlParams = new URLSearchParams(window.location.search);
    const ingredientsParam = urlParams.get('ingredients');
    if (ingredientsParam) {
      const ingredientIds = ingredientsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (ingredientIds.length > 0) {
        console.log('🍳 Loading recipes filtered by ingredients:', ingredientIds);
        // Fetch filtered recipes using the filter endpoint
        fetchFilteredRecipes(ingredientIds);
      } else {
        // No valid ingredients, load all recipes
        fetchRecipes();
      }
    } else {
      // No ingredients parameter, load all recipes normally
      fetchRecipes();
    }
  }, []);

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

  const fetchRecipes = async (isLoadMore = false) => {
    // ✅ Don't fetch if we're in filtered mode (ingredients parameter present)
    const urlParams = new URLSearchParams(window.location.search);
    const ingredientsParam = urlParams.get('ingredients');
    if (ingredientsParam) {
      console.log('⏭️ Skipping fetchRecipes - filtered mode active');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);

      const activeFilters = {};

      if (Array.isArray(filters.mealType) && filters.mealType.length > 0) {
        activeFilters.mealType = filters.mealType;
      }

      const searchTerm = dishCoverySearchQuery.trim();
      if (searchTerm) {
        activeFilters.search = searchTerm;
      }

      activeFilters.limit = limit;
      activeFilters.offset = isLoadMore ? offset : 0;

      console.log('Fetching with filters:', activeFilters);

      const response = await recipeAPI.getAllRecipes(activeFilters);

      if (!response || !response.success) {
        throw new Error(response?.message || 'Failed to fetch recipes');
      }

      const payload = response.data || [];
      const pagination = response.pagination || {};

      const newRecipes = payload.map(recipe => {
        // Parse meal types - handle array, comma-separated string, or single value
        let mealTypes = [];
        if (Array.isArray(recipe.mealType)) {
          mealTypes = recipe.mealType.filter(m => m && m.trim());
        } else if (Array.isArray(recipe.meal_type)) {
          mealTypes = recipe.meal_type.filter(m => m && m.trim());
        } else if (typeof recipe.mealType === 'string' && recipe.mealType.includes(',')) {
          mealTypes = recipe.mealType.split(',').map(m => m.trim()).filter(m => m);
        } else if (typeof recipe.meal_type === 'string' && recipe.meal_type.includes(',')) {
          mealTypes = recipe.meal_type.split(',').map(m => m.trim()).filter(m => m);
        } else if (recipe.mealType) {
          mealTypes = [recipe.mealType];
        } else if (recipe.meal_type) {
          mealTypes = [recipe.meal_type];
        }
        
        return {
        id: recipe.id || recipe.recipe_id,
        title: recipe.title || recipe.name || recipe.recipe_name,
        description: recipe.description || '',
        images: Array.isArray(recipe.images) && recipe.images.length > 0 
          ? recipe.images 
          : (recipe.image ? [recipe.image] : (recipe.image_url ? [recipe.image_url] : ['https://via.placeholder.com/400x300?text=No+Image'])),
          mealType: mealTypes.length > 0 ? mealTypes : [],
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
        };
      });

      if (isLoadMore) {
        setRecipes(prev => [...prev, ...newRecipes]);
        setOffset(prev => prev + newRecipes.length);
      } else {
        setRecipes(newRecipes);
        setOffset(limit);
      }

      setHasMore(pagination.hasMore !== undefined ? pagination.hasMore : newRecipes.length === limit);

    } catch (err) {
      console.error('Error fetching recipes:', err);
      const errorMessage = err.message || 'Failed to load recipes. Please try again.';
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
      
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
        // ✅ Use uploaded images from database, no fallback Unsplash image
        const images = response.data.images || [];
        return {
          ...response.data,
          images: images.length > 0 ? images : (response.data.image ? [response.data.image] : (response.data.imageUrl ? [response.data.imageUrl] : [])),
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

  // ✅ REMOVED: This useEffect was calling fetchRecipes() on mount, overriding filtered results
  // The main useEffect at line 195 already handles both filtered and regular recipe fetching

  useEffect(() => {
    // ✅ Don't fetch if we're in filtered mode (ingredients parameter present)
    const urlParams = new URLSearchParams(window.location.search);
    const ingredientsParam = urlParams.get('ingredients');
    if (ingredientsParam) {
      console.log('⏭️ Skipping filter-based fetch - filtered mode active');
      return;
    }
    
    // Reset to first page when filters or search changes
    setCurrentPage(1);
    
    const delayedFetch = setTimeout(() => {
      fetchRecipes();
    }, 300);

    return () => clearTimeout(delayedFetch);
  }, [filters, dishCoverySearchQuery]);

  // Listen for recipe changes from admin (same-tab custom events)
  useEffect(() => {
    const handleRecipeChange = (event) => {
      const { action, data } = event.detail;
      
      console.log('Recipe change detected:', action, data);
      
      setRecipes(prevRecipes => {
        let updatedRecipes = [...prevRecipes];
        
        if (action === 'create') {
          updatedRecipes.unshift(data);
        } else if (action === 'update') {
          const index = updatedRecipes.findIndex(r => r.id === data.id);
          if (index !== -1) {
            updatedRecipes[index] = { ...updatedRecipes[index], ...data };
          }
        } else if (action === 'delete') {
          updatedRecipes = updatedRecipes.filter(r => r.id !== data.id);
        }
        
        return updatedRecipes;
      });
      
      if (selectedRecipe && data && selectedRecipe.id === data.id) {
        if (action === 'delete') {
          closeModal();
        } else if (action === 'update') {
          setSelectedRecipe(prev => ({ 
            ...prev, 
            ...data,
            isFavorited: favoritedRecipes.has(data.id)
          }));
        }
      }
    };
    
    window.addEventListener('recipeChange', handleRecipeChange);
    
    return () => {
      window.removeEventListener('recipeChange', handleRecipeChange);
    };
  }, [selectedRecipe, favoritedRecipes]);

  // Listen for recipe changes from localStorage (cross-tab sync)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'lastRecipeChange' && e.newValue) {
        try {
          const change = JSON.parse(e.newValue);
          console.log('Storage change detected:', change);
          
          const { action, data } = change;
          
          setRecipes(prevRecipes => {
            let updatedRecipes = [...prevRecipes];
            
            if (action === 'create') {
              updatedRecipes.unshift(data);
            } else if (action === 'update') {
              const index = updatedRecipes.findIndex(r => r.id === data.id);
              if (index !== -1) {
                updatedRecipes[index] = { ...updatedRecipes[index], ...data };
              }
            } else if (action === 'delete') {
              updatedRecipes = updatedRecipes.filter(r => r.id !== data.id);
            }
            
            return updatedRecipes;
          });
          
          if (selectedRecipe && data && selectedRecipe.id === data.id) {
            if (action === 'delete') {
              closeModal();
            } else if (action === 'update') {
              setSelectedRecipe(prev => ({ 
                ...prev, 
                ...data,
                isFavorited: favoritedRecipes.has(data.id)
              }));
            }
          }
        } catch (error) {
          console.error('Error handling storage change:', error);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [selectedRecipe, favoritedRecipes]);

  // Auto-sync check every 30 seconds
  useEffect(() => {
    // ✅ Don't auto-sync if we're in filtered mode (ingredients parameter present)
    const urlParams = new URLSearchParams(window.location.search);
    const ingredientsParam = urlParams.get('ingredients');
    if (ingredientsParam) {
      console.log('⏭️ Skipping auto-sync - filtered mode active');
      return;
    }
    
    const syncInterval = setInterval(async () => {
      try {
        const { needsUpdate } = await recipeAPI.checkForUpdates();
        if (needsUpdate) {
          console.log('Updates detected, refreshing recipes...');
          fetchRecipes();
        }
      } catch (error) {
        console.error('Error checking for updates:', error);
      }
    }, 30000);
    
    return () => clearInterval(syncInterval);
  }, []);

  // Auto-refresh when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // ✅ Don't refresh if we're in filtered mode (ingredients parameter present)
        const urlParams = new URLSearchParams(window.location.search);
        const ingredientsParam = urlParams.get('ingredients');
        if (ingredientsParam) {
          console.log('⏭️ Skipping refresh - filtered mode active');
          return;
        }
        
        console.log('Tab became visible, checking for updates...');
        recipeAPI.checkForUpdates().then(({ needsUpdate }) => {
          if (needsUpdate) {
            fetchRecipes();
          }
        }).catch(error => {
          console.error('Error checking updates on visibility change:', error);
        });
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchRecipes(true);
    }
  };

  const filterOptions = {
    mealType: ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Light Meal', 'Heavy Meal']
  };

  const handleFilterChange = (category, value) => {
    setFilters(prev => ({
      ...prev,
      [category]: (prev[category] || []).includes(value)
        ? (prev[category] || []).filter(item => item !== value)
        : [...(prev[category] || []), value]
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
    return (filters.mealType?.length || 0) + 
           (filters.dietaryTags?.length || 0) + 
           (filters.healthTags?.length || 0);
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
    // ✅ Preserve original images from card to ensure consistency
    const originalImages = recipe.images || [];
    
    const recipeWithStatus = {
      ...recipe,
      isFavorited: favoritedRecipes.has(recipe.id),
      isTried: triedRecipes.has(recipe.id)
    };
    setSelectedRecipe(recipeWithStatus);
    setIsModalOpen(true);
    setCurrentImageIndex(0); // ✅ Always start with first image (same as card)
    setShowAlternatives({});
    setShowScrollIndicator(true);
    document.body.style.overflow = 'hidden';
    
    // 🆕 Track as last opened recipe for profile (save to database)
    const { saveLastOpenedRecipe } = await import('../utils/recipeTracker');
    await saveLastOpenedRecipe(recipe);
    
    if (recipe.id && (!recipe.instructions || recipe.instructions.length === 0)) {
      const detailedRecipe = await fetchRecipeDetails(recipe.id);
      if (detailedRecipe) {
        // ✅ Preserve original images from card if they exist, otherwise use detailed recipe images
        const imagesToUse = (originalImages && originalImages.length > 0) 
          ? originalImages 
          : (detailedRecipe.images || []);
        
        setSelectedRecipe({
          ...detailedRecipe,
          images: imagesToUse, // ✅ Use same images as card
          isFavorited: favoritedRecipes.has(recipe.id),
          isTried: triedRecipes.has(recipe.id)
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
        await favoritesAPI.removeFromFavorites(recipeId);
        setFavoritedRecipes(prev => {
          const newSet = new Set(prev);
          newSet.delete(recipeId);
          return newSet;
        });
      } else {
        await favoritesAPI.addToFavorites(recipeId);
        setFavoritedRecipes(prev => new Set([...prev, recipeId]));
        console.log('Recipe added to favorites successfully!');
      }
      
      // Update selected recipe if it's the same one
      if (selectedRecipe && selectedRecipe.id === recipeId) {
        setSelectedRecipe(prev => ({
          ...prev,
          isFavorited: !isFavorited,
          engagement: {
            ...prev.engagement,
            saved: isFavorited ? prev.engagement.saved - 1 : prev.engagement.saved + 1
          }
        }));
        }
        
      // Update recipe in list
      setRecipes(prev => prev.map(recipe => {
        if (recipe.id === recipeId) {
          return {
            ...recipe,
            engagement: {
              ...recipe.engagement,
              saved: isFavorited ? recipe.engagement.saved - 1 : recipe.engagement.saved + 1
            }
          };
        }
        return recipe;
      }));
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert('Failed to update favorites. Please try again.');
    }
  };

  const handleToggleTried = async (recipeId) => {
    const isTried = triedRecipes.has(recipeId);
    
    try {
      if (!isTried) {
        await triedAPI.markAsTried(recipeId);
        setTriedRecipes(prev => new Set([...prev, recipeId]));
        
        // Update recipe in list
        setRecipes(prev => prev.map(recipe => {
          if (recipe.id === recipeId) {
            return {
              ...recipe,
              engagement: {
                ...recipe.engagement,
                tried: recipe.engagement.tried + 1
              }
            };
          }
          return recipe;
        }));
        
        // Update selected recipe if it's the same one
      if (selectedRecipe && selectedRecipe.id === recipeId) {
        setSelectedRecipe(prev => ({
          ...prev,
            engagement: {
              ...prev.engagement,
              tried: prev.engagement.tried + 1
            }
        }));
        }
        
        console.log('Recipe marked as tried successfully!');
      }
    } catch (error) {
      console.error('Error marking recipe as tried:', error);
      alert('Failed to mark recipe as tried. Please try again.');
    }
  };

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

        <div className="page-header">
          <div className="page-title-section">
            <h1 className="page-title">Available Recipes</h1>
            <p className="page-subtitle">
              Explore our collection of professionally verified recipes with detailed ingredients and alternatives
            </p>
          </div>
        </div>

        <div className="content-wrapper-new">
          <aside className={`filters-sidebar-new ${showMobileFilters ? 'mobile-visible' : ''}`}>
            <div className="mobile-filter-header">
              <h3>Filters</h3>
              <button 
                className="mobile-filter-close"
                onClick={() => setShowMobileFilters(false)}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="filters-title-new">
              <FontAwesomeIcon icon={faFilter} />
              Filters
            </div>

            {Object.entries(filterOptions).map(([category, options]) => (
              <div key={category} className="filter-category-new">
                <h3 className="filter-category-title-new">
                  {category === 'mealType' ? 'Meal Type' : 
                   category === 'dietaryTags' ? 'Dietary Tags' : 'Health Tags'}
                </h3>
                <div className="filter-options-new">
                  {options.map(option => (
                    <label key={option} className="filter-option-new">
                      <input
                        type="checkbox"
                        className="filter-checkbox-new"
                        checked={filters[category]?.includes(option) || false}
                        onChange={() => handleFilterChange(category, option)}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {getActiveFilterCount() > 0 && (
              <div className="active-filters-new">
                <div className="active-filters-title-new">Active Filters</div>
                <div className="active-filter-tags-new">
                  {Object.entries(filters).map(([category, values]) =>
                    values.map(value => (
                      <span key={`${category}-${value}`} className="active-filter-tag-new">
                        {value}
                        <button onClick={() => handleFilterChange(category, value)}>×</button>
                      </span>
                    ))
                  )}
                </div>
                <button className="clear-all-filters-new" onClick={clearAllFilters}>
                  Clear All
                </button>
              </div>
            )}
          </aside>

          <main className="main-content-new">
            <div className="controls-container-new">
              <div className="search-section-new">
                <div className="search-container-new">
                  <svg className="search-icon-new" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search recipes..."
                    value={dishCoverySearchQuery}
                    onChange={(e) => setDishCoverySearchQuery(e.target.value)}
                    className="search-input-new"
                  />
                </div>
              </div>

              <div className="filter-section-new">
                <div className="view-toggle-new">
                <button 
                    className={`view-btn-new ${dishCoveryViewMode === 'grid' ? 'view-btn-active-new' : ''}`}
                    onClick={() => setDishCoveryViewMode('grid')}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 3v8h8V3H3zm6 6H5V5h4v4zm-6 4v8h8v-8H3zm6 6H5v-4h4v4zm4-16v8h8V3h-8zm6 6h-4V5h4v4zm-6 4v8h8v-8h-8zm6 6h-4v-4h4v4z"/>
                    </svg>
                  </button>
                  <button
                    className={`view-btn-new ${dishCoveryViewMode === 'list' ? 'view-btn-active-new' : ''}`}
                    onClick={() => setDishCoveryViewMode('list')}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {loading && recipes.length === 0 && (
              <div className="loading-container">
                Loading delicious recipes...
              </div>
            )}

            {error && recipes.length === 0 && (
              <div className="error-container">
                {error}
              </div>
            )}

            {!loading && !error && recipes.length === 0 && (
              <div className="empty-container">
                No recipes found matching your criteria. Try adjusting your filters.
              </div>
            )}

            {!loading && recipes.length > 0 && (() => {
              // Calculate pagination
              const indexOfLastRecipe = currentPage * recipesPerPage;
              const indexOfFirstRecipe = indexOfLastRecipe - recipesPerPage;
              const currentRecipes = recipes.slice(indexOfFirstRecipe, indexOfLastRecipe);
              const totalPages = Math.ceil(recipes.length / recipesPerPage);
              
              // ✅ Check if recipes are coming from scanning page (ingredients parameter)
              const urlParams = new URLSearchParams(window.location.search);
              const ingredientsParam = urlParams.get('ingredients');
              const isFromScanningPage = !!ingredientsParam;
              
              return (
                <>
                  <div className={`recipes-container-new ${dishCoveryViewMode === 'grid' ? 'recipes-grid-new' : 'recipes-list'}`}>
                    {currentRecipes.map(recipe => {
                      // ✅ Filter out "Good For Everyone" badge when coming from scanning page
                      const dietaryTagsToShow = isFromScanningPage 
                        ? (recipe.dietaryTags || []).filter(tag => tag !== 'Good For Everyone')
                        : (recipe.dietaryTags || []);
                      
                      return (
                  <div
                    key={recipe.id}
                    className={`recipe-card ${dishCoveryViewMode === 'list' ? 'list-view' : ''}`}
                    onClick={() => openModal(recipe)}
                  >
                    <div className="recipe-image-container">
                      <img
                        src={(() => {
                          // ✅ CRITICAL FIX: Ensure we get the correct image for each recipe
                          let imageSrc = null;
                          
                          if (Array.isArray(recipe.images) && recipe.images.length > 0) {
                            // If images is an array, get the first image
                            imageSrc = recipe.images[0];
                          } else if (typeof recipe.images === 'string' && recipe.images.trim()) {
                            // If images is a string, use it directly
                            imageSrc = recipe.images;
                          } else if (recipe.image) {
                            // Fallback to image property
                            imageSrc = recipe.image;
                          } else if (recipe.image_url) {
                            // Fallback to image_url property
                            imageSrc = recipe.image_url;
                          }
                          
                          // ✅ Debug: Log image source for all recipes to identify issues
                          console.log(`🔍 [FRONTEND] Recipe ID: ${recipe.id}, Title: ${recipe.title}`);
                          console.log(`   Images array:`, recipe.images);
                          console.log(`   Image source:`, imageSrc);
                          
                          return imageSrc || 'https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=No+Image';
                        })()}
                        alt={recipe.title}
                        className="recipe-image"
                        onError={(e) => { 
                          console.error(`❌ Image failed to load for recipe ${recipe.title} (ID: ${recipe.id}):`, e.target.src);
                          e.target.src = 'https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=No+Image';
                        }}
                      />
                      
                    </div>
                    {/* Recipe Content */}
                    <div className="recipe-content">
                      <h3 className="recipe-title">{recipe.title}</h3>

                      <p className="recipe-description">{recipe.description}</p>

                      <div className="recipe-meta">
                        <div className="recipe-meta-info">
                          <div className="meta-item">
                            <FontAwesomeIcon icon={faUsers} />
                            {recipe.servings} servings
                          </div>
                        </div>
                        
                        <div className="meal-type-container">
                          {(() => {
                            // Parse meal types - handle array, comma-separated string, or single value
                            let mealTypes = [];
                            if (Array.isArray(recipe.mealType)) {
                              mealTypes = recipe.mealType.filter(m => m && m.trim());
                            } else if (typeof recipe.mealType === 'string' && recipe.mealType.includes(',')) {
                              mealTypes = recipe.mealType.split(',').map(m => m.trim()).filter(m => m);
                            } else if (recipe.mealType) {
                              mealTypes = [recipe.mealType];
                            }
                            
                            return mealTypes.map((mealType, index) => (
                              <span key={index} className="meal-type-badge">
                                {mealType}
                        </span>
                            ));
                          })()}
                        </div>
                      </div>

                      <div className="recipe-tags">
                        <div className="tags-container">
                          {dietaryTagsToShow.slice(0, 3).map(tag => {
                            const isGoodForEveryone = tag === 'Good For Everyone';
                            return (
                              <span 
                                key={tag} 
                                className={`recipe-tag dietary ${isGoodForEveryone ? 'good-for-everyone' : ''}`}
                              >
                              {tag}
                            </span>
                            );
                          })}
                          {dietaryTagsToShow.length > 3 && (
                            <span className="tags-more">
                              +{dietaryTagsToShow.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="recipe-engagement">
                        <button 
                          className={`engagement-item engagement-button ${triedRecipes.has(recipe.id) ? 'tried' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleTried(recipe.id);
                          }}
                          title={triedRecipes.has(recipe.id) ? 'You tried this recipe' : 'Mark as tried'}
                        >
                          <FontAwesomeIcon icon={faEye} />
                          {recipe.engagement?.tried || 0} tried
                        </button>
                        <button 
                          className={`engagement-item engagement-button ${favoritedRecipes.has(recipe.id) ? 'favorited' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(recipe.id);
                          }}
                          title={favoritedRecipes.has(recipe.id) ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <FontAwesomeIcon icon={favoritedRecipes.has(recipe.id) ? faHeart : faHeartRegular} />
                          {recipe.engagement?.saved || 0} saved
                        </button>
                        </div>
                        </div>
                      </div>
                      );
                    })}
                    </div>
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="pagination-container" style={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      gap: '12px', 
                      marginTop: '32px',
                      flexWrap: 'wrap'
                    }}>
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        style={{
                          padding: '8px 16px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          background: currentPage === 1 ? '#F3F4F6' : 'white',
                          color: currentPage === 1 ? '#9CA3AF' : '#374151',
                          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          fontWeight: '500',
                          fontFamily: 'Poppins, sans-serif',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        Previous
                      </button>
                      
                      <div style={{ 
                        display: 'flex', 
                        gap: '8px', 
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        justifyContent: 'center'
                      }}>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            style={{
                              padding: '8px 12px',
                              border: '1px solid #D1D5DB',
                              borderRadius: '8px',
                              background: currentPage === page ? '#2E7D32' : 'white',
                              color: currentPage === page ? 'white' : '#374151',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: currentPage === page ? '600' : '500',
                              fontFamily: 'Poppins, sans-serif',
                              transition: 'all 0.2s ease',
                              minWidth: '40px'
                            }}
                          >
                            {page}
                          </button>
                ))}
              </div>
            
                <button 
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                  style={{
                          padding: '8px 16px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          background: currentPage === totalPages ? '#F3F4F6' : 'white',
                          color: currentPage === totalPages ? '#9CA3AF' : '#374151',
                          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                          fontWeight: '500',
                          fontFamily: 'Poppins, sans-serif',
                          transition: 'all 0.2s ease'
                  }}
                >
                        Next
                </button>
              </div>
            )}
                  
                </>
              );
            })()}
            
          </main>
        </div>

        {showMobileFilters && (
          <div 
            className="mobile-filter-overlay"
            onClick={() => setShowMobileFilters(false)}
          />
        )}

        {showFilterModal && (
          <div className="modal-overlay" onClick={closeFilterModal}>
            <div className="filter-modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={closeFilterModal}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
              
              <div className="filter-modal-header">
                <h2 className="filter-modal-title">Filter Recipes</h2>
                {getActiveFilterCount() > 0 && (
                  <span className="filter-modal-count">
                    {getActiveFilterCount()} active filter{getActiveFilterCount() !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              
              <div className="filter-modal-body">
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
                            checked={filters[category]?.includes(option) || false}
                            onChange={() => handleFilterChange(category, option)}
                          />
                          <span className="filter-modal-option-text">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

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

        {isModalOpen && selectedRecipe && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={closeModal}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
              
              <div className="modal-header">
                <h1 className="modal-title">{selectedRecipe.title}</h1>
                <p className="modal-subtitle">{selectedRecipe.description}</p>
              </div>
              
              <div className="modal-body" ref={modalBodyRef} onScroll={handleModalScroll}>
                <div className="modal-left">
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
                  
                  <div className="modal-stats">
                    <button 
                      className={`stat-item-button tried-button-compact stat-button-ripple ${triedRecipes.has(selectedRecipe.id) ? 'tried' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleTried(selectedRecipe.id);
                      }}
                      aria-label={triedRecipes.has(selectedRecipe.id) ? 'You tried this recipe' : 'Mark as tried'}
                      aria-pressed={triedRecipes.has(selectedRecipe.id)}
                      disabled={triedRecipes.has(selectedRecipe.id)}
                    >
                      <FontAwesomeIcon icon={faEye} className="stat-icon" />
                      <div className="stat-text">
                        <div className="stat-number">{selectedRecipe.engagement?.tried || 0} people tried this</div>
                      </div>
                    </button>
                    <button 
                      className={`stat-item-button favorite-button-compact stat-button-ripple ${favoritedRecipes.has(selectedRecipe.id) ? 'favorited' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(selectedRecipe.id);
                      }}
                      aria-label={favoritedRecipes.has(selectedRecipe.id) ? 'Remove from favorites' : 'Add to favorites'}
                      aria-pressed={favoritedRecipes.has(selectedRecipe.id)}
                    >
                      <FontAwesomeIcon 
                        icon={favoritedRecipes.has(selectedRecipe.id) ? faHeart : faHeartRegular} 
                        className="stat-icon" 
                      />
                      <div className="stat-text">
                        <span className="stat-number">
                          {favoritedRecipes.has(selectedRecipe.id) ? (
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
                
                <div className="modal-right">
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
                  
                  {selectedRecipe.mealType && (() => {
                    // Split meal types if it's a string with commas, or use array if already an array
                    const mealTypes = Array.isArray(selectedRecipe.mealType) 
                      ? selectedRecipe.mealType 
                      : typeof selectedRecipe.mealType === 'string' && selectedRecipe.mealType.includes(',')
                        ? selectedRecipe.mealType.split(',').map(m => m.trim()).filter(m => m)
                        : [selectedRecipe.mealType];
                    
                    return (
                    <div className="modal-section">
                      <h3 className="section-title">Meal Type</h3>
                      <div className="modal-tags">
                          {mealTypes.map((mealType, index) => (
                            <span key={index} className="modal-tag meal-type">
                          <FontAwesomeIcon icon={faUtensils} />
                              {mealType}
                        </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  
                  {(selectedRecipe.medicalConditions || []).length > 0 && (
                    <div className="modal-section">
                      <h3 className="section-title">Medical Conditions (Allergies & Intolerances)</h3>
                      <div className="modal-tags">
                        {selectedRecipe.medicalConditions.map((condition, index) => (
                          <span key={index} className="modal-tag medical-condition">
                            {condition}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedRecipe.servings && (
                    <div className="modal-section">
                      <h3 className="section-title">Servings</h3>
                      <div className="modal-tags">
                        <span className="modal-tag servings">
                          {selectedRecipe.servings} {selectedRecipe.servings === '8+' ? 'servings' : selectedRecipe.servings === '1' ? 'serving' : 'servings'}
                        </span>
                      </div>
                    </div>
                  )}
                  
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