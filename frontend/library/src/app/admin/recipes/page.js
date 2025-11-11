'use client';
import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/adminlayout';
import { recipeAPI, handleAPIError } from './api.js';
import './styles.css';

const RecipeManagement = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('This Week');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [mealTypeFilter, setMealTypeFilter] = useState('All');
  const [servingsFilter, setServingsFilter] = useState('All'); 
  const [dietaryFilter, setDietaryFilter] = useState('All');
  const [healthFilter, setHealthFilter] = useState('All');
  const [editingRecipeId, setEditingRecipeId] = useState(null); 
  
  // Track newly added instruction step index to show it even if empty
  const [newlyAddedStepIndex, setNewlyAddedStepIndex] = useState(null);
  
  // Database connection states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recipes, setRecipes] = useState([]);

  // Restrictions state
  const [availableMedicalConditions, setAvailableMedicalConditions] = useState([]);
  const [restrictionsLoading, setRestrictionsLoading] = useState(true);

  // Image URL input state
  const [imageUrlInput, setImageUrlInput] = useState('');

  // Form state for adding/editing recipes
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    images: [],
    mealType: ['Light Meal'], // Changed to array for multi-select
    instructions: [''],
    ingredients: {
      main: [{ ingredient: '', alternative: '' }],
      condiments: [{ ingredient: '', alternative: '' }],
      optional: [{ ingredient: '', alternative: '' }]
    },
    dietaryTags: [],
    dietaryLifestyleTags: [],
    medicalConditions: [],
    servings: '2',
    verificationStatus: 'Checked by: Nutritionist',
    verifierName: '',
    verifierCredentials: ''
  });

  const mealTypes = ['Breakfast', 'Dessert', 'Dinner', 'Heavy Meal', 'Light Meal', 'Lunch', 'Smoothie', 'Snack'].sort();
  const dietaryOptions = ['Dairy-free', 'Gluten-free', 'Halal', 'Keto', 'Mediterranean', 'Paleo', 'Vegan', 'Vegetarian'].sort();
  const servingsOptions = ['1', '2', '3', '4', '5', '6', '7', '8+'].sort();

  // Fetch dietary restrictions from database
  const fetchRestrictions = async () => {
    try {
      setRestrictionsLoading(true);
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
      const token = localStorage.getItem('authToken') || localStorage.getItem('token') || 'test-admin-token';

      const response = await fetch(`${API_BASE_URL}/dietary-restrictions/categories`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch restrictions');
      }

      const result = await response.json();
      console.log('Fetched restrictions:', result);

      if (result.success && result.data) {
        // Category ID 1, 2, and 3 = Allergy, Intolerance, and Good For Everyone (Medical Conditions)
        const allergies = result.data['Allergy'] || [];
        const intolerances = result.data['Intolerance'] || [];
        const goodForEveryone = result.data['Good For Everyone'] || [];
        const medicalConditions = [...allergies, ...intolerances, ...goodForEveryone];

        // Handle both array of objects and array of strings
        const medicalConditionNames = medicalConditions.map(r => {
          if (typeof r === 'string') {
            return r;
          } else if (r && r.name) {
            return r.name;
          } else if (r && r.restriction_name) {
            return r.restriction_name;
          }
          return r;
        }).filter(Boolean);

        // Sort medical conditions to match the standard order
        const standardOrder = [
          'Allergy To Nuts',
          'Allergy To Shellfishes',
          'Allergy To Eggs',
          'Allergy To Soy',
          'Allergy To Dairy',
          'Allergy To Sesame Seeds',
          'Allergy To Legumes',
          'Gluten Intolerance',
          'Lactose Intolerance'
        ];
        
        const sortedConditions = medicalConditionNames.sort((a, b) => {
          // Normalize for comparison (case-insensitive)
          const normalizedA = a.trim();
          const normalizedB = b.trim();
          const indexA = standardOrder.findIndex(item => item.toLowerCase() === normalizedA.toLowerCase());
          const indexB = standardOrder.findIndex(item => item.toLowerCase() === normalizedB.toLowerCase());
          if (indexA === -1 && indexB === -1) return normalizedA.localeCompare(normalizedB);
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });

        setAvailableMedicalConditions(sortedConditions);

        console.log('Medical Conditions loaded:', sortedConditions.length, 'items');
        console.log('Medical Conditions:', sortedConditions);
      }
    } catch (err) {
      console.error('Error fetching restrictions:', err);
    } finally {
      setRestrictionsLoading(false);
    }
  };

  // Fetch recipes from database
  const fetchRecipes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters = {
        search: searchTerm,
        status: statusFilter,
        mealType: mealTypeFilter
      };
      
      console.log('Fetching recipes with filters:', filters);
      
      const fetchedRecipes = await recipeAPI.getAll(filters);
      setRecipes(fetchedRecipes);
      
    } catch (err) {
      const errorMessage = handleAPIError(err);
      setError(errorMessage);
      console.error('Error fetching recipes:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load restrictions on component mount
  useEffect(() => {
    fetchRestrictions();
  }, []);

  // Load recipes on component mount and when filters change
  useEffect(() => {
    fetchRecipes();
  }, [searchTerm, statusFilter, mealTypeFilter]);

  // Auto-refresh when tab becomes visible (detects changes from other tabs)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab became visible, refreshing recipes...');
        fetchRecipes();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Listen for recipe changes from localStorage (cross-tab sync)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'lastRecipeChange' && e.newValue) {
        try {
          const change = JSON.parse(e.newValue);
          console.log('Storage change detected:', change);
          
          // Refresh recipes to get latest data
          fetchRecipes();
        } catch (error) {
          console.error('Error handling storage change:', error);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleAddRecipe = () => {
    setEditingRecipeId(null);
    resetForm();
    setShowAddModal(true);
  };

  const handleViewRecipe = async (recipe) => {
    try {
      // Fetch full recipe with ingredients
      const fullRecipe = await recipeAPI.getById(recipe.id);
      setSelectedRecipe(fullRecipe);
      setShowViewModal(true);
    } catch (error) {
      console.error('Error loading recipe details:', error);
      alert('Failed to load recipe details');
    }
  };

  // ✅ REPLACED: Fetch full recipe before editing
  const handleEditRecipe = async (recipe) => {
    setEditingRecipeId(recipe.id);
    
    try {
      // Fetch full recipe with ingredients
      const fullRecipe = await recipeAPI.getById(recipe.id);
      
      const convertIngredients = (ingredients) => {
        if (Array.isArray(ingredients)) {
          return ingredients.map(item => 
            typeof item === 'string' 
              ? { ingredient: item, alternative: '' }
              : item
          );
        }
        return ingredients || [{ ingredient: '', alternative: '' }];
      };

      // Validate and fix images when loading recipe
      const validateImages = (images) => {
        if (!images) return [];
        if (Array.isArray(images)) {
          return images.filter(img => {
            if (!img) return false;
            // Filter out invalid/truncated base64 strings
            if (typeof img === 'string') {
              if (img.startsWith('http://') || img.startsWith('https://')) {
                return true; // Valid URL
              }
              if (img.startsWith('data:image')) {
                const base64Part = img.split(',')[1];
                return base64Part && base64Part.length > 10; // Valid base64
              }
              // If it's a partial base64, try to reconstruct
              if (img.length > 10 && /^[A-Za-z0-9+/=]+$/.test(img.substring(0, 100))) {
                return true; // Looks like valid base64
              }
            }
            return false; // Invalid image
          }).map(img => {
            // Reconstruct partial base64 strings
            if (typeof img === 'string' && !img.startsWith('data:') && !img.startsWith('http')) {
              if (/^[A-Za-z0-9+/=]+$/.test(img.substring(0, 100))) {
                return `data:image/jpeg;base64,${img}`;
              }
            }
            return img;
          });
        }
        return images ? [images] : [];
      };

      setFormData({
        ...fullRecipe,
        images: validateImages(fullRecipe.images || fullRecipe.image_url ? [fullRecipe.image_url] : []),
        ingredients: {
          main: convertIngredients(fullRecipe.ingredients.main),
          condiments: convertIngredients(fullRecipe.ingredients.condiments),
          optional: convertIngredients(fullRecipe.ingredients.optional)
        },
        medicalConditions: fullRecipe.medicalConditions || [],
        mealType: Array.isArray(fullRecipe.mealType) ? fullRecipe.mealType : (fullRecipe.mealType ? (typeof fullRecipe.mealType === 'string' && fullRecipe.mealType.includes(',') ? fullRecipe.mealType.split(',').map(t => t.trim()) : [fullRecipe.mealType]) : ['Light Meal']), // Convert to array
        verificationStatus: fullRecipe.verificationStatus && fullRecipe.verificationStatus !== 'AI-generated'
          ? fullRecipe.verificationStatus
          : 'Checked by: Nutritionist',
        verifierName: fullRecipe.verifierName || '',
        verifierCredentials: fullRecipe.verifierCredentials || ''
      });
      
      // Reset newly added step index when editing
      setNewlyAddedStepIndex(null);
      
    } catch (error) {
      console.error('Error loading recipe:', error);
      alert('Failed to load recipe details');
      return;
    }
    
    setShowViewModal(false);
    setShowAddModal(true);
  };

  const handleDeleteRecipe = async (recipeId) => {
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      try {
        await recipeAPI.delete(recipeId);
        
        setRecipes(recipes.filter(recipe => recipe.id !== recipeId));
        setShowViewModal(false);
        alert('Recipe deleted successfully!');
      } catch (err) {
        const errorMessage = handleAPIError(err);
        alert(`Error deleting recipe: ${errorMessage}`);
      }
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Filter out empty instructions to prevent accidental step containers
      const cleanedFormData = {
        ...formData,
        instructions: formData.instructions.filter(inst => inst && String(inst).trim().length > 0)
      };
      
      // Ensure at least one instruction exists
      if (cleanedFormData.instructions.length === 0) {
        alert('Please add at least one instruction step.');
        setLoading(false);
        return;
      }
      
      // Only require images when creating a new recipe (not when editing)
      if (!editingRecipeId && (!cleanedFormData.images || cleanedFormData.images.length === 0)) {
        alert('Please add at least one image for the recipe.');
        setLoading(false);
        return;
      }
      
      // ✅ FIXED: Always preserve existing images when updating
      // When editing, always include images array so backend can preserve existing images
      if (editingRecipeId) {
        // Ensure images array is always included in the update request
        // If images array is undefined/null, set it to empty array so backend preserves existing
        // If images array has items, send them to replace existing
        // If images array is empty [], backend will preserve existing images
        if (cleanedFormData.images === undefined || cleanedFormData.images === null) {
          cleanedFormData.images = [];
        }
        // Always send images array - backend will:
        // - Preserve existing if array is empty []
        // - Replace existing if array has items
        await recipeAPI.update(editingRecipeId, cleanedFormData);
        alert('Recipe updated successfully!');
      } else {
        await recipeAPI.create(cleanedFormData);
        alert('Recipe added successfully!');
      }

      setShowAddModal(false);
      resetForm();
      fetchRecipes();
    } catch (err) {
      const errorMessage = handleAPIError(err);
      alert(`Error saving recipe: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      images: [],
      mealType: ['Light Meal'], // Changed to array for multi-select
      instructions: [''],
      ingredients: {
        main: [{ ingredient: '', alternative: '' }],
        condiments: [{ ingredient: '', alternative: '' }],
        optional: [{ ingredient: '', alternative: '' }]
      },
      dietaryTags: [],
      medicalConditions: [],
      servings: '2',
      verificationStatus: 'Checked by: Nutritionist',
      verifierName: '',
      verifierCredentials: ''
    });
    setEditingRecipeId(null);
    // Reset newly added step index when form is reset
    setNewlyAddedStepIndex(null);
  };

  const addInstructionStep = () => {
    setFormData({
      ...formData,
      instructions: [...formData.instructions, '']
    });
  };

  const updateInstruction = (index, value) => {
    // Filter out empty instructions first, then update
    const nonEmptyInstructions = formData.instructions.filter(inst => inst && String(inst).trim().length > 0);
    if (index < nonEmptyInstructions.length) {
      nonEmptyInstructions[index] = value;
      // If the updated instruction becomes empty, remove it
      const cleanedInstructions = nonEmptyInstructions.filter(inst => inst && String(inst).trim().length > 0);
      setFormData({
        ...formData,
        instructions: cleanedInstructions.length > 0 ? cleanedInstructions : ['']
      });
    }
  };

  const removeInstruction = (index) => {
    // Filter out empty instructions first, then remove
    const nonEmptyInstructions = formData.instructions.filter(inst => inst && String(inst).trim().length > 0);
    if (nonEmptyInstructions.length > 1) {
      const newInstructions = nonEmptyInstructions.filter((_, i) => i !== index);
      setFormData({
        ...formData,
        instructions: newInstructions.length > 0 ? newInstructions : ['']
      });
    }
  };

  const addIngredient = (category) => {
    setFormData({
      ...formData,
      ingredients: {
        ...formData.ingredients,
        [category]: [...formData.ingredients[category], { ingredient: '', alternative: '' }]
      }
    });
  };

  const updateIngredient = (category, index, field, value) => {
    const newIngredients = { ...formData.ingredients };
    newIngredients[category][index][field] = value;
    setFormData({
      ...formData,
      ingredients: newIngredients
    });
  };

  const removeIngredient = (category, index) => {
    if (formData.ingredients[category].length > 1) {
      const newIngredients = { ...formData.ingredients };
      newIngredients[category] = newIngredients[category].filter((_, i) => i !== index);
      setFormData({
        ...formData,
        ingredients: newIngredients
      });
    }
  };

  const toggleTag = (tagType, tag) => {
    const currentTags = formData[tagType] || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];

    setFormData({
      ...formData,
      [tagType]: newTags
    });
  };

  const filteredRecipes = recipes.filter(recipe => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === '' || 
      (recipe?.title || '').toLowerCase().includes(searchLower) ||
      (recipe?.description || '').toLowerCase().includes(searchLower) ||
      // Search in ingredients
      (recipe?.ingredients?.main && recipe.ingredients.main.some(item => {
        const ingredient = typeof item === 'string' ? item : item.ingredient;
        return ingredient.toLowerCase().includes(searchLower);
      })) ||
      (recipe?.ingredients?.condiments && recipe.ingredients.condiments.some(item => {
        const ingredient = typeof item === 'string' ? item : item.ingredient;
        return ingredient.toLowerCase().includes(searchLower);
      })) ||
      (recipe?.ingredients?.optional && recipe.ingredients.optional.some(item => {
        const ingredient = typeof item === 'string' ? item : item.ingredient;
        return ingredient.toLowerCase().includes(searchLower);
      })) ||
      // Search in dietary tags
      (recipe?.dietaryTags && recipe.dietaryTags.some(tag => tag.toLowerCase().includes(searchLower))) ||
      (recipe?.dietaryLifestyleTags && recipe.dietaryLifestyleTags.some(tag => tag.toLowerCase().includes(searchLower))) ||
      // Search in meal type (handle both array and string)
      (Array.isArray(recipe?.mealType) ? recipe.mealType.join(', ') : (recipe?.mealType || '')).toLowerCase().includes(searchLower);
    
    // Handle meal type filter for both array and string formats
    const recipeMealTypes = Array.isArray(recipe?.mealType) ? recipe.mealType : (recipe?.mealType ? [recipe.mealType] : []);
    const matchesMealType = mealTypeFilter === 'All' || recipeMealTypes.includes(mealTypeFilter) || recipeMealTypes.some(type => type.toLowerCase().includes(mealTypeFilter.toLowerCase()));
    const matchesStatus = statusFilter === 'All' || 
                         (statusFilter === 'Verified' && (recipe?.verificationStatus || '').includes('Checked by'));
    const matchesHealth = healthFilter === 'All' || (recipe?.healthTags || []).includes(healthFilter);
    
    return matchesSearch && matchesMealType && matchesStatus && matchesHealth;
  });

  const compressImage = (file, maxWidth = 600, maxHeight = 450, quality = 0.5) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
          // Create canvas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Calculate new dimensions while maintaining aspect ratio
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }

          // Set canvas size
          canvas.width = width;
          canvas.height = height;

          // Draw and compress image
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64 with compression
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);

          // Check size (warn if still too large)
          const sizeInKB = Math.round((compressedBase64.length * 3) / 4 / 1024);
          console.log(`Image compressed: ${img.width}x${img.height} → ${width}x${height}, Size: ${sizeInKB}KB`);

          if (sizeInKB > 500) {
            console.warn(`⚠️ Image still large (${sizeInKB}KB). Consider using a smaller image.`);
          }

          resolve(compressedBase64);
        };

        img.onerror = reject;
        img.src = e.target.result;
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files).slice(0, 4 - formData.images.length);

    try {
      // Compress and convert images to base64
      const compressedImages = await Promise.all(
        files.map(file => compressImage(file))
      );

      setFormData({
        ...formData,
        images: [...formData.images, ...compressedImages].slice(0, 4)
      });

      // Show success message
      if (files.length > 0) {
        console.log(`✅ ${files.length} image(s) compressed and added successfully`);
      }
    } catch (error) {
      console.error('Error compressing images:', error);
      alert('Failed to process images. Please try again.');
    }
  };

  const handleAddImageUrl = () => {
    const trimmedUrl = imageUrlInput.trim();

    // Validate URL format
    if (!trimmedUrl) {
      alert('Please enter an image URL');
      return;
    }

    // Basic URL validation
    try {
      const url = new URL(trimmedUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        alert('URL must start with http:// or https://');
        return;
      }

      // Validate it's a direct image URL (not a search result or webpage)
      const invalidPatterns = [
        'google.com/search',
        'google.com/imgres',
        'bing.com/images',
        'yahoo.com/search',
        'pinterest.com'
      ];

      if (invalidPatterns.some(pattern => url.href.includes(pattern))) {
        alert('Please use a direct image URL, not a search result page.\n\nRight-click the image and select "Copy Image Address" or upload a file instead.');
        return;
      }

      // Validate it has an image extension (optional but recommended)
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
      const hasImageExtension = imageExtensions.some(ext => url.pathname.toLowerCase().includes(ext));

      if (!hasImageExtension && !url.href.includes('cloudinary') && !url.href.includes('imgur') && !url.href.includes('unsplash')) {
        const proceed = confirm(
          'This URL does not appear to be a direct image link.\n\n' +
          'Direct image URLs usually end with .jpg, .png, etc.\n\n' +
          'Continue anyway?'
        );
        if (!proceed) return;
      }
    } catch (e) {
      alert('Invalid URL format');
      return;
    }

    // Check if we already have 4 images
    if (formData.images.length >= 4) {
      alert('Maximum 4 images allowed');
      return;
    }

    // Add URL to images array
    setFormData({
      ...formData,
      images: [...formData.images, trimmedUrl]
    });

    // Clear input
    setImageUrlInput('');
  };

  const handleRemoveImage = (index) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      images: newImages
    });
  };

  if (loading && recipes.length === 0) {
    return (
      <AdminLayout currentPage="Recipes">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div style={{ textAlign: 'center' }}>
            <h3>Loading recipes...</h3>
            <p>Please wait while we fetch your recipes from the database.</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error && recipes.length === 0) {
    return (
      <AdminLayout currentPage="Recipes">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div style={{ textAlign: 'center', color: '#dc2626' }}>
            <h3>Error loading recipes</h3>
            <p>{error}</p>
            <button 
              onClick={fetchRecipes} 
              style={{ 
                marginTop: '10px', 
                padding: '10px 20px', 
                background: '#2E7D32', 
                color: 'white', 
                border: 'none', 
                borderRadius: '5px', 
                cursor: 'pointer' 
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const PlusIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
    </svg>
  );

  const GridIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 3v8h8V3H3zm6 6H5V5h4v4zm-6 4v8h8v-8H3zm6 6H5v-4h4v4zm4-16v8h8V3h-8zm6 6h-4V5h4v4zm-6 4v8h8v-8h-8zm6 6h-4v-4h4v4z"/>
    </svg>
  );

  const ListIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
    </svg>
  );

  const EditIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
    </svg>
  );

  const DeleteIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
    </svg>
  );

  const HeartIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  );

  const TryIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  );

  const CloseIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>
  );

  const ExportIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
      <path d="M8 15.01l1.41 1.41L11 14.84V19h2v-4.16l1.59 1.59L16 15.01 12.01 11 8 15.01z"/>
    </svg>
  );

  // Helper function to escape CSV values
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const handleExportData = () => {
    // Export recipes as CSV with recommended columns
    const headers = [
      'Recipe ID',
      'Recipe Name',
      'Category',
      'Cuisine',
      'Ingredients',
      'Dietary Tags',
      'Preparation Time',
      'Number of Favorites',
      'Date Added',
      'Created By',
      'Status',
      'Servings',
      'Meal Type'
    ];

    const csvRows = [
      headers.map(escapeCSV).join(','),
      ...filteredRecipes.map(recipe => {
        // Combine all ingredients
        const allIngredients = [];
        if (recipe.ingredients) {
          ['main', 'condiments', 'optional'].forEach(category => {
            if (recipe.ingredients[category]) {
              recipe.ingredients[category].forEach(item => {
                const ingredient = typeof item === 'string' ? item : item.ingredient;
                if (ingredient) allIngredients.push(ingredient);
              });
            }
          });
        }
        const ingredientsStr = allIngredients.join('; ') || 'N/A';

        // Combine dietary tags
        const dietaryTags = (recipe.dietaryTags || []).join('; ') || 'None';

        const prepTime = recipe.prep_time ? `${recipe.prep_time} minutes` : 'N/A';
        const favorites = recipe.engagement?.saved || 0;
        const dateAdded = recipe.created_at || recipe.dateAdded || 'N/A';
        const createdBy = recipe.verifierName || 'Admin' || 'System';
        const category = recipe.mealType || 'N/A';
        const cuisine = recipe.dish_type || 'N/A';
        const status = recipe.verificationStatus || 'AI-generated';
        const servings = recipe.servings || 'N/A';

        return [
          recipe.id,
          recipe.title,
          category,
          cuisine,
          ingredientsStr,
          dietaryTags,
          prepTime,
          favorites,
          dateAdded,
          createdBy,
          status,
          servings,
          recipe.mealType || 'N/A'
        ].map(escapeCSV).join(',');
      })
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `recipes-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    alert(`Exported ${filteredRecipes.length} recipe(s) successfully as CSV.`);
  };

  return (
    <AdminLayout currentPage="Recipes">
      <div className="dashboard-content">
        <div className="controls-container">
          {/* Row 1: Search + Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
            <div style={{ flex: 1, maxWidth: '400px', position: 'relative' }}>
              <input
                type="text"
                placeholder="Search recipes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 15px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontFamily: 'Poppins, sans-serif',
                  transition: 'all 0.3s ease'
                }}
              />
              <svg 
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '20px',
                  height: '20px',
                  color: '#64748b',
                  pointerEvents: 'none'
                }}
                viewBox="0 0 24 24" 
                fill="currentColor"
              >
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="export-btn" 
                onClick={handleExportData}
                style={{
                  padding: '10px 16px',
                  background: '#2E7D32',
                  color: 'white',
                  border: 'none',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: 'Poppins, sans-serif',
                  boxShadow: '0 4px 12px rgba(46, 125, 50, 0.3)',
                  transition: 'all 0.3s ease'
                }}
              >
                <ExportIcon />
                Export Data
              </button>
              <button 
                className="export-btn" 
                onClick={handleAddRecipe}
                style={{
                  padding: '10px 16px',
                  background: '#2E7D32',
                  color: 'white',
                  border: 'none',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: 'Poppins, sans-serif',
                  boxShadow: '0 4px 12px rgba(46, 125, 50, 0.3)',
                  transition: 'all 0.3s ease'
                }}
              >
                <PlusIcon />
                Add Recipe
              </button>
            </div>
          </div>

          {/* Row 2: All Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Status Filters */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className={`filter-btn ${statusFilter === 'All' ? 'active' : ''}`} 
                onClick={() => setStatusFilter('All')}
                style={{
                  padding: '10px 16px',
                  border: statusFilter === 'All' ? 'none' : '2px solid #e5e7eb',
                  background: statusFilter === 'All' ? '#2E7D32' : 'white',
                  color: statusFilter === 'All' ? 'white' : '#374151',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  fontFamily: 'Poppins, sans-serif',
                  transition: 'all 0.3s ease'
                }}
              >
                All
              </button>
              <button 
                className={`filter-btn ${statusFilter === 'AI-generated' ? 'active' : ''}`} 
                onClick={() => setStatusFilter('AI-generated')}
                style={{
                  padding: '10px 16px',
                  border: statusFilter === 'AI-generated' ? 'none' : '2px solid #e5e7eb',
                  background: statusFilter === 'AI-generated' ? '#2E7D32' : 'white',
                  color: statusFilter === 'AI-generated' ? 'white' : '#374151',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  fontFamily: 'Poppins, sans-serif',
                  transition: 'all 0.3s ease'
                }}
              >
                AI-generated
              </button>
              <button 
                className={`filter-btn ${statusFilter === 'Verified' ? 'active' : ''}`} 
                onClick={() => setStatusFilter('Verified')}
                style={{
                  padding: '10px 16px',
                  border: statusFilter === 'Verified' ? 'none' : '2px solid #e5e7eb',
                  background: statusFilter === 'Verified' ? '#2E7D32' : 'white',
                  color: statusFilter === 'Verified' ? 'white' : '#374151',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  fontFamily: 'Poppins, sans-serif',
                  transition: 'all 0.3s ease'
                }}
              >
                Verified
              </button>
            </div>

            {/* Meal Type Dropdown */}
            <select 
              value={mealTypeFilter} 
              onChange={(e) => setMealTypeFilter(e.target.value)} 
              style={{
                padding: '10px 14px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                background: 'white',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                fontFamily: 'Poppins, sans-serif',
                minWidth: '160px',
                color: '#374151'
              }}
            >
              <option value="All">All Meal Types</option>
              {mealTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            {/* Servings Dropdown */}
            <select 
              value={servingsFilter} 
              onChange={(e) => setServingsFilter(e.target.value)} 
              style={{
                padding: '10px 14px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                background: 'white',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                fontFamily: 'Poppins, sans-serif',
                minWidth: '160px',
                color: '#374151'
              }}
            >
              <option value="All">All Servings</option>
              {servingsOptions.map(serving => (
                <option key={serving} value={serving}>{serving} {serving === '8+' ? 'servings' : serving === '1' ? 'serving' : 'servings'}</option>
              ))}
            </select>

            {/* Dietary Dropdown */}
            <select 
              value={dietaryFilter} 
              onChange={(e) => setDietaryFilter(e.target.value)} 
              style={{
                padding: '10px 14px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                background: 'white',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                fontFamily: 'Poppins, sans-serif',
                minWidth: '160px',
                color: '#374151'
              }}
            >
              <option value="All">All Dietary</option>
              {dietaryOptions.map((diet) => (
                <option key={diet} value={diet}>{diet}</option>
              ))}
            </select>

            {/* View Toggle */}
            <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
              <button 
                className={`filter-btn ${viewMode === 'grid' ? 'active' : ''}`} 
                onClick={() => setViewMode('grid')}
                style={{
                  width: '40px',
                  height: '40px',
                  border: '2px solid #e5e7eb',
                  background: viewMode === 'grid' ? '#2E7D32' : 'white',
                  color: viewMode === 'grid' ? 'white' : '#6b7280',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}
              >
                <GridIcon />
              </button>
              <button 
                className={`filter-btn ${viewMode === 'list' ? 'active' : ''}`} 
                onClick={() => setViewMode('list')}
                style={{
                  width: '40px',
                  height: '40px',
                  border: '2px solid #e5e7eb',
                  background: viewMode === 'list' ? '#2E7D32' : 'white',
                  color: viewMode === 'list' ? 'white' : '#6b7280',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}
              >
                <ListIcon />
              </button>
            </div>
          </div>
        </div>

        <div className={`recipe-display ${viewMode}`}>
          {filteredRecipes.length === 0 ? (
            <div className="no-recipes">
              <p>No recipes found matching your criteria.</p>
              {!loading && recipes.length === 0 && (
                <p>Start by adding your first recipe!</p>
              )}
            </div>
          ) : (
            filteredRecipes.map(recipe => (
              <div key={recipe.id} className="recipe-card" onClick={() => handleViewRecipe(recipe)}>
                <div className="recipe-image">
                  <img
                    src={(() => {
                      // Get first image from array or single image_url
                      let imgUrl = null;
                      
                      if (Array.isArray(recipe.images) && recipe.images.length > 0) {
                        imgUrl = recipe.images[0];
                      } else if (recipe.images && typeof recipe.images === 'string') {
                        imgUrl = recipe.images;
                      } else if (recipe.image_url) {
                        imgUrl = recipe.image_url;
                      }
                      
                      if (!imgUrl || typeof imgUrl !== 'string') {
                        return 'https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=No+Image';
                      }
                      
                      // Handle HTTP/HTTPS URLs
                      if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://')) {
                        return imgUrl;
                      }
                      
                      // Handle data:image URLs
                      if (imgUrl.startsWith('data:image')) {
                        return imgUrl;
                      }
                      
                      // Handle partial base64 strings (no data: prefix)
                      // Try to reconstruct as data URL
                      if (imgUrl.length > 20 && !imgUrl.includes('://')) {
                        // Check if it looks like base64
                        const base64Pattern = /^[A-Za-z0-9+/=]+$/;
                        if (base64Pattern.test(imgUrl.substring(0, 100))) {
                          return `data:image/jpeg;base64,${imgUrl}`;
                        }
                      }
                      
                      // Fallback to placeholder
                      return 'https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=No+Image';
                    })()}
                    alt={recipe.title}
                    onError={(e) => { 
                      e.target.src = 'https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=No+Image';
                    }}
                  />
                  <div className="recipe-actions">
                    <button className="recipe-action-btn edit" onClick={(e) => { 
                      e.stopPropagation(); 
                      handleEditRecipe(recipe);
                    }}>
                      <EditIcon />
                    </button>
                    <button className="recipe-action-btn delete" onClick={(e) => { 
                      e.stopPropagation(); 
                      handleDeleteRecipe(recipe.id); 
                    }}>
                      <DeleteIcon />
                    </button>
                  </div>
                </div>
                <div className="recipe-info">
                  <h3 className="recipe-title">{recipe.title}</h3>
                  <p className="recipe-description">{recipe.description}</p>
                  <div className="recipe-meta">
                    <div className="meal-type-container">
                      {Array.isArray(recipe.mealType) ? recipe.mealType.map((meal, index) => (
                        <span key={index} className="meal-type-badge">{meal}</span>
                      )) : recipe.mealType ? (
                        <span className="meal-type-badge">{recipe.mealType}</span>
                      ) : null}
                      {(recipe.medicalConditions || []).length > 0 && (
                        <>
                          {recipe.medicalConditions.map((condition, index) => {
                            const isGoodForEveryone = condition === 'Good For Everyone';
                            return (
                              <span 
                                key={`medical-${index}`} 
                                className={`medical-condition-badge ${isGoodForEveryone ? 'good-for-everyone' : ''}`}
                              >
                                {condition}
                              </span>
                            );
                          })}
                        </>
                      )}
                    </div>
                    <div className="recipe-tags">
                      {(recipe.dietaryTags || []).slice(0, 2).map(tag => (
                        <span key={tag} className="tag dietary">{tag}</span>
                      ))}
                      {(recipe.dietaryTags || []).length > 2 && <span className="tag-more">+{recipe.dietaryTags.length - 2}</span>}
                    </div>
                  </div>
                  <div className="recipe-engagement">
                    <div className="engagement-badge tried-badge">
                      <TryIcon />
                      <span>{recipe.engagement?.tried || recipe.tried_count || 0} tried</span>
                    </div>
                    <div className={`engagement-badge saved-badge ${(recipe.engagement?.saved || recipe.save_count || 0) > 0 ? 'has-count' : 'no-count'}`}>
                      <HeartIcon />
                      <span>{recipe.engagement?.saved || recipe.save_count || 0} saved</span>
                    </div>
                  </div>
                  <div className="recipe-verification">
                    <span className={`verification-badge ${recipe.verificationStatus === 'AI-generated' ? 'ai' : 'verified'}`}>
                      {recipe.verificationStatus && recipe.verifierName 
                        ? `${recipe.verificationStatus} (${recipe.verifierName}${recipe.verifierCredentials ? `, ${recipe.verifierCredentials}` : ''})`
                        : recipe.verificationStatus || 'AI-generated'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {showAddModal && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingRecipeId ? 'Edit Recipe' : 'Add New Recipe'}</h2>
                <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
              </div>
              <form onSubmit={handleFormSubmit} className="recipe-form">
                <div className="form-section">
                  <label className="form-label">Recipe Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                  />
                </div>

                <div className="form-section">
                  <label className="form-label">Short Description *</label>
                  <textarea
                    className="form-textarea"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows="3"
                    required
                  />
                </div>

                <div className="form-section">
                  <label className="form-label">
                    Photos {editingRecipeId && formData.images.length > 0 ? '(Optional)' : '(1-4 required)'} *
                  </label>

                  {/* File Upload */}
                  <div style={{ marginBottom: '10px' }}>
                    <input
                      type="file"
                      className="form-input"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      disabled={formData.images.length >= 4}
                      required={!editingRecipeId && !formData.images.length}
                    />
                    <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
                      Upload from computer (auto-compressed to 600x450, 60% quality for smaller file size)
                    </small>
                  </div>

                  {/* URL Input */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="Or paste image URL (https://...)"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      disabled={formData.images.length >= 4}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={handleAddImageUrl}
                      disabled={formData.images.length >= 4 || !imageUrlInput.trim()}
                      style={{
                        padding: '8px 16px',
                        background: formData.images.length >= 4 || !imageUrlInput.trim() ? '#ccc' : '#2E7D32',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: formData.images.length >= 4 || !imageUrlInput.trim() ? 'not-allowed' : 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      Add URL
                    </button>
                  </div>

                  {/* Image Preview with Remove Button */}
                  {formData.images.length > 0 && (
                    <div className="image-preview" style={{ marginTop: '15px' }}>
                      {formData.images.map((image, index) => {
                        // ✅ FIXED: Thorough validation for truncated base64 image strings
                        const getImageSrc = (img) => {
                          if (!img || typeof img !== 'string') return null;
                          
                          // Check if it's a valid HTTP/HTTPS URL
                          if (img.startsWith('http://') || img.startsWith('https://')) {
                            try {
                              new URL(img); // Validate URL format
                              return img;
                            } catch {
                              return null; // Invalid URL format
                            }
                          }
                          
                          // Check if it's a valid data URL (base64 image)
                          if (img.startsWith('data:image')) {
                            const base64Part = img.split(',')[1];
                            if (base64Part && base64Part.length > 10) {
                              // Validate base64 string (must be multiple of 4, ends with valid chars)
                              const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
                              if (base64Regex.test(base64Part) && base64Part.length % 4 === 0) {
                                return img;
                              }
                            }
                            return null; // Truncated or invalid base64
                          }
                          
                          // Check if it's a partial base64 string (no data: prefix)
                          if (img.length > 0 && !img.includes('://')) {
                            // Try to reconstruct as data URL if it looks like base64
                            const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
                            if (base64Regex.test(img) && img.length % 4 === 0 && img.length > 20) {
                              // Assume JPEG format for partial base64 strings
                              return `data:image/jpeg;base64,${img}`;
                            }
                          }
                          
                          return null; // Invalid or truncated
                        };
                        
                        const imageSrc = getImageSrc(image);
                        const placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="150"%3E%3Crect fill="%23f3f4f6" width="200" height="150"/%3E%3Ctext fill="%239ca3af" font-family="Arial" font-size="14" text-anchor="middle" x="100" y="75"%3EInvalid Image%3C/text%3E%3C/svg%3E';
                        
                        return (
                          <div key={index} style={{ position: 'relative', display: 'inline-block', margin: '5px' }}>
                            <img
                              src={imageSrc || placeholder}
                              alt={`Preview ${index + 1}`}
                              className="preview-image"
                              style={{ 
                                width: '150px', 
                                height: '150px', 
                                objectFit: 'cover',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px'
                              }}
                              onError={(e) => {
                                e.target.src = placeholder;
                                e.target.style.border = '2px solid red';
                                e.target.alt = 'Failed to load';
                              }}
                            />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            style={{
                              position: 'absolute',
                              top: '5px',
                              right: '5px',
                              background: 'rgba(255, 0, 0, 0.8)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '50%',
                              width: '24px',
                              height: '24px',
                              cursor: 'pointer',
                              fontSize: '16px',
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0
                            }}
                          >
                            ×
                          </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <small style={{ color: '#666', display: 'block', marginTop: '8px' }}>
                    {formData.images.length}/4 images added
                  </small>
                </div>

                <div className="form-section">
                  <label className="form-label">Meal Type *</label>
                  <p className="section-subtitle" style={{ marginBottom: '10px', color: '#666', fontSize: '14px' }}>
                    Select all meal types that apply (can select multiple)
                  </p>
                  <div className="tag-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', marginTop: '10px' }}>
                    {mealTypes.map(type => {
                      const isSelected = Array.isArray(formData.mealType) ? formData.mealType.includes(type) : formData.mealType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            const currentMealTypes = Array.isArray(formData.mealType) ? formData.mealType : [formData.mealType];
                            const newMealTypes = isSelected
                              ? currentMealTypes.filter(t => t !== type)
                              : [...currentMealTypes, type];
                            setFormData({...formData, mealType: newMealTypes.length > 0 ? newMealTypes : ['Light Meal']});
                          }}
                          className={`tag-button ${isSelected ? 'selected' : ''}`}
                          style={{
                            padding: '10px 16px',
                            border: `2px solid ${isSelected ? '#2E7D32' : '#e5e7eb'}`,
                            borderRadius: '8px',
                            background: isSelected ? '#2E7D32' : 'white',
                            color: isSelected ? 'white' : '#333',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: isSelected ? '600' : '500',
                            transition: 'all 0.2s',
                            textAlign: 'center'
                          }}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>
                  {Array.isArray(formData.mealType) && formData.mealType.length === 0 && (
                    <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '5px' }}>
                      Please select at least one meal type
                    </p>
                  )}
                </div>

                <div className="form-section">
                  <label className="form-label">Instructions *</label>
                  {(() => {
                    // Filter out empty instructions for display, but keep original indices
                    // Also show newly added step even if empty
                    const instructionsWithIndices = formData.instructions
                      .map((instruction, originalIndex) => ({ instruction, originalIndex }));
                    
                    // Show instructions that are either:
                    // 1. Not empty (have content)
                    // 2. OR are the newly added step (even if empty)
                    const visibleInstructions = instructionsWithIndices.filter(({ instruction, originalIndex }) => {
                      const hasContent = instruction && String(instruction).trim().length > 0;
                      const isNewlyAdded = newlyAddedStepIndex === originalIndex;
                      return hasContent || isNewlyAdded;
                    });
                    
                    if (visibleInstructions.length === 0) {
                      // Show one empty instruction field if all are empty
                      return (
                        <div className="instruction-item">
                          <span className="step-number">1.</span>
                          <textarea
                            className="form-textarea"
                            value=""
                            onChange={(e) => {
                              setFormData({...formData, instructions: [e.target.value]});
                              setNewlyAddedStepIndex(null); // Clear newly added flag when user types
                            }}
                            placeholder="Enter instruction step..."
                            rows="2"
                            required
                          />
                        </div>
                      );
                    }
                    
                    return visibleInstructions.map(({ instruction, originalIndex }, displayIndex) => {
                      const isEmpty = !instruction || String(instruction).trim().length === 0;
                      const isNewlyAdded = newlyAddedStepIndex === originalIndex;
                      
                      return (
                        <div key={originalIndex} className="instruction-item">
                          <span className="step-number">{displayIndex + 1}.</span>
                          <textarea
                            className="form-textarea"
                            value={instruction || ''}
                            onChange={(e) => {
                              const newInstructions = [...formData.instructions];
                              newInstructions[originalIndex] = e.target.value;
                              
                              // If user types in the newly added step, clear the flag
                              if (isNewlyAdded && e.target.value.trim().length > 0) {
                                setNewlyAddedStepIndex(null);
                              }
                              
                              // Auto-remove empty steps (but keep at least one empty if all become empty)
                              // Don't remove the newly added step if it's still empty
                              const cleaned = newInstructions.filter((inst, idx) => {
                                if (inst && String(inst).trim().length > 0) return true;
                                // Keep if it's the newly added step
                                if (newlyAddedStepIndex === idx) return true;
                                return false;
                              });
                              
                              setFormData({
                                ...formData,
                                instructions: cleaned.length > 0 ? cleaned : ['']
                              });
                            }}
                            onBlur={() => {
                              // When user leaves the field, if it's still empty and was newly added, remove it
                              if (isNewlyAdded && isEmpty) {
                                const newInstructions = formData.instructions.filter((_, i) => i !== originalIndex);
                                const cleaned = newInstructions.filter(inst => inst && String(inst).trim().length > 0);
                                setFormData({
                                  ...formData,
                                  instructions: cleaned.length > 0 ? cleaned : ['']
                                });
                                setNewlyAddedStepIndex(null);
                              }
                            }}
                            placeholder="Enter instruction step..."
                            rows="2"
                            required
                            autoFocus={isNewlyAdded && isEmpty} // Auto-focus newly added empty step
                          />
                          {visibleInstructions.length > 1 && (
                            <button type="button" className="remove-btn" onClick={() => {
                              const newInstructions = formData.instructions.filter((_, i) => i !== originalIndex);
                              const cleaned = newInstructions.filter(inst => inst && String(inst).trim().length > 0);
                              setFormData({
                                ...formData,
                                instructions: cleaned.length > 0 ? cleaned : ['']
                              });
                              // Clear newly added flag if we're removing that step
                              if (newlyAddedStepIndex === originalIndex) {
                                setNewlyAddedStepIndex(null);
                              }
                            }}>
                              <CloseIcon />
                            </button>
                          )}
                        </div>
                      );
                    });
                  })()}
                  <button type="button" className="add-btn" onClick={() => {
                    const nonEmptyInstructions = formData.instructions.filter(inst => inst && String(inst).trim().length > 0);
                    const newInstructions = [...nonEmptyInstructions, ''];
                    const newStepIndex = newInstructions.length - 1;
                    
                    setFormData({
                      ...formData,
                      instructions: newInstructions
                    });
                    
                    // Track the newly added step index so it shows even if empty
                    setNewlyAddedStepIndex(newStepIndex);
                  }}>
                    + Add Step
                  </button>
                </div>

                <div className="form-section">
                  <label className="form-label">Ingredients</label>
                  {['main', 'condiments', 'optional'].map(category => (
                    <div key={category} className="ingredient-category">
                      <h4 className="category-title">{category.charAt(0).toUpperCase() + category.slice(1)} Ingredients</h4>
                      {formData.ingredients[category].map((item, index) => (
                        <div key={index} className="ingredient-item-group">
                          <div className="ingredient-input-row">
                            <div className="ingredient-input-container">
                              <label className="ingredient-label">Ingredient {index + 1}</label>
                              <input
                                type="text"
                                className="form-input"
                                value={item.ingredient}
                                onChange={(e) => updateIngredient(category, index, 'ingredient', e.target.value)}
                                placeholder={`Enter ${category} ingredient...`}
                                required={category === 'main' && index === 0}
                              />
                            </div>
                            <div className="ingredient-input-container">
                              <label className="ingredient-label">Alternative (Optional)</label>
                              <input
                                type="text"
                                className="form-input alternative-input"
                                value={item.alternative}
                                onChange={(e) => updateIngredient(category, index, 'alternative', e.target.value)}
                                placeholder={`Alternative for ${item.ingredient || 'ingredient'}...`}
                              />
                            </div>
                          </div>
                          {formData.ingredients[category].length > 1 && (
                            <button type="button" className="remove-btn ingredient-remove" onClick={() => removeIngredient(category, index)}>
                              <CloseIcon />
                            </button>
                          )}
                        </div>
                      ))}
                      <button type="button" className="add-btn" onClick={() => addIngredient(category)}>
                        + Add {category.charAt(0).toUpperCase() + category.slice(1)}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="form-section">
                  <label className="form-label">Medical Conditions (Allergies & Intolerances)</label>
                  {restrictionsLoading ? (
                    <p style={{ fontSize: '14px', color: '#64748b' }}>Loading medical conditions...</p>
                  ) : availableMedicalConditions.length === 0 ? (
                    <p style={{ fontSize: '14px', color: '#dc2626' }}>No medical conditions available. Please add them in the dietary restrictions management page.</p>
                  ) : (
                    <div className="tag-grid">
                      {availableMedicalConditions.map(tag => (
                        <button
                          key={tag}
                          type="button"
                          className={`tag-btn medical ${formData.medicalConditions.includes(tag) ? 'active' : ''}`}
                          onClick={() => toggleTag('medicalConditions', tag)}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="form-section">
                  <label className="form-label">Number of Servings *</label>
                  <select
                    className="form-select"
                    value={formData.servings}
                    onChange={(e) => setFormData({...formData, servings: e.target.value})}
                    required
                  >
                    {servingsOptions.map(serving => (
                      <option key={serving} value={serving}>{serving} {serving === '8+' ? 'servings' : serving === '1' ? 'serving' : 'servings'}</option>
                    ))}
                  </select>
                </div>

                <div className="form-section">
                  <label className="form-label">Verification Status *</label>
                  <select
                    className="form-select"
                    value={formData.verificationStatus}
                    onChange={(e) => setFormData({...formData, verificationStatus: e.target.value})}
                    required
                  >
                    <option value="Checked by: Nutritionist">Checked by: Nutritionist</option>
                    <option value="Checked by: Dietitian">Checked by: Dietitian</option>
                    <option value="Checked by: Doctor">Checked by: Doctor</option>
                  </select>
                </div>

                <div className="form-section">
                  <label className="form-label">Verifier Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.verifierName}
                    onChange={(e) => setFormData({...formData, verifierName: e.target.value})}
                    placeholder="Enter verifier's name (e.g., Dr. Jane Smith)"
                  />
                  <p className="section-subtitle" style={{ marginTop: '5px', color: '#666', fontSize: '12px' }}>
                    Optional: Name of the nutritionist/dietitian/doctor who verified this recipe
                  </p>
                </div>

                <div className="form-section">
                  <label className="form-label">Verifier Credentials</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.verifierCredentials}
                    onChange={(e) => setFormData({...formData, verifierCredentials: e.target.value})}
                    placeholder="Enter credentials (e.g., RD, RDN, MD)"
                  />
                  <p className="section-subtitle" style={{ marginTop: '5px', color: '#666', fontSize: '12px' }}>
                    Optional: Professional credentials or certifications
                  </p>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit" disabled={loading}>
                    {loading ? 'Saving...' : (editingRecipeId ? 'Update Recipe' : 'Add Recipe')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showViewModal && selectedRecipe && (
          <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
            <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{selectedRecipe.title}</h2>
                <button className="modal-close" onClick={() => setShowViewModal(false)}>×</button>
              </div>
              <div className="recipe-details">
                <div className="recipe-images">
                  {/* ✅ FIXED: Handle both images array and image_url string with proper base64 validation */}
                  <img
                    src={(() => {
                      const imgUrl = selectedRecipe.images?.[0] || selectedRecipe.image_url;
                      
                      // Helper function to validate image URL
                      const validateImageUrl = (url) => {
                        if (!url || typeof url !== 'string') return null;
                        
                        // Check if it's a valid HTTP/HTTPS URL
                        if (url.startsWith('http://') || url.startsWith('https://')) {
                          try {
                            new URL(url); // Validate URL format
                            return url;
                          } catch {
                            return null; // Invalid URL format
                          }
                        }
                        
                        // Check if it's a valid data URL (base64 image)
                        if (url.startsWith('data:image')) {
                          const base64Part = url.split(',')[1];
                          if (base64Part && base64Part.length > 10) {
                            // Validate base64 string (must be multiple of 4, ends with valid chars)
                            const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
                            if (base64Regex.test(base64Part) && base64Part.length % 4 === 0) {
                              return url;
                            }
                          }
                          return null; // Truncated or invalid base64
                        }
                        
                        // Check if it's a partial base64 string (no data: prefix)
                        if (url.length > 0 && !url.includes('://')) {
                          // Try to reconstruct as data URL if it looks like base64
                          const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
                          if (base64Regex.test(url) && url.length % 4 === 0 && url.length > 20) {
                            // Assume JPEG format for partial base64 strings
                            return `data:image/jpeg;base64,${url}`;
                          }
                        }
                        
                        return null; // Invalid or truncated
                      };
                      
                      const validUrl = validateImageUrl(imgUrl);
                      return validUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext fill="%239ca3af" font-family="Arial" font-size="20" text-anchor="middle" x="200" y="150"%3ENo Image%3C/text%3E%3C/svg%3E';
                    })()}
                    alt={selectedRecipe.title}
                    className="main-image"
                    onError={(e) => { e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext fill="%239ca3af" font-family="Arial" font-size="20" text-anchor="middle" x="200" y="150"%3ENo Image%3C/text%3E%3C/svg%3E'; }}
                  />
                </div>
                
                {/* New Layout Order: Meal Type → Medical Conditions → Serving → Checked by → Description → Ingredients */}
                
                {/* 1. Meal Type Section */}
                <div className="recipe-section meal-type-section">
                  <h3 className="section-title">Meal Type</h3>
                  <div className="meal-type-container">
                    {Array.isArray(selectedRecipe.mealType) ? selectedRecipe.mealType.map((meal, index) => (
                      <span key={index} className="meal-type-badge">{meal}</span>
                    )) : selectedRecipe.mealType ? (
                      <span className="meal-type-badge">{selectedRecipe.mealType}</span>
                    ) : null}
                  </div>
                </div>

                {/* 2. Medical Conditions Section */}
                {(selectedRecipe.medicalConditions || []).length > 0 && (
                  <div className="recipe-section medical-conditions-section">
                    <h3 className="section-title">Medical Conditions (Allergies & Intolerances)</h3>
                    <div className="medical-conditions-container">
                      {selectedRecipe.medicalConditions.map((condition, index) => {
                        const isGoodForEveryone = condition === 'Good For Everyone';
                        return (
                          <span 
                            key={index} 
                            className={`medical-condition-badge ${isGoodForEveryone ? 'good-for-everyone' : ''}`}
                          >
                            {condition}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Serving & Checked by Section */}
                <div className="recipe-section recipe-metadata">
                  {/* Serving Info */}
                  {selectedRecipe.servings && (
                    <div className="serving-info">
                      <span className="label">Serving:</span>
                      <span className="value">{selectedRecipe.servings} {selectedRecipe.servings === '8+' ? 'servings' : selectedRecipe.servings === '1' ? 'serving' : 'servings'}</span>
                    </div>
                  )}

{/* Dietitian Verification - Card Style */}
                  <div className="verification-card">
                    <div className="verified-badge">
                      <svg className="check-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Checked by: {selectedRecipe.verificationStatus === 'AI-generated' ? 'AI-generated' : 'Dietitian'}</span>
                    </div>
                    {selectedRecipe.verifierName && (
                      <div className="dietitian-details">
                        <p className="dietitian-name">
                          <strong>Name:</strong> {selectedRecipe.verifierName}
                        </p>
                        {selectedRecipe.verifierCredentials && (
                          <p className="dietitian-credentials">
                            <strong>Credentials:</strong> {selectedRecipe.verifierCredentials}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              
                {/* 4. Description Section */}
                <div className="recipe-section description-section">
                  <p className="recipe-desc">{selectedRecipe.description}</p>
                </div>

                {/* 5. Ingredients Section */}
                <div className="recipe-section ingredients-section">
                  <h3 className="section-title">Ingredients</h3>
                  <div className="ingredients-grid">
                    <div className="ingredient-group">
                      <h4 className="ingredient-group-title">Main Ingredients</h4>
                      <ul className="ingredient-list">
                        {(selectedRecipe.ingredients?.main || []).map((item, index) => (
                          <li key={index} className="ingredient-item">
                            <span className="main-ingredient">{typeof item === 'string' ? item : item.ingredient}</span>
                            {typeof item === 'object' && item.alternative && (
                              <span className="alternative-ingredient">
                                <em>Alternative: {item.alternative}</em>
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="ingredient-group">
                      <h4 className="ingredient-group-title">Condiments</h4>
                      <ul className="ingredient-list">
                        {(selectedRecipe.ingredients?.condiments || []).map((item, index) => (
                          <li key={index} className="ingredient-item">
                            <span className="main-ingredient">{typeof item === 'string' ? item : item.ingredient}</span>
                            {typeof item === 'object' && item.alternative && (
                              <span className="alternative-ingredient">
                                <em>Alternative: {item.alternative}</em>
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="ingredient-group">
                      <h4 className="ingredient-group-title">Optional Ingredients</h4>
                      <ul className="ingredient-list">
                        {(selectedRecipe.ingredients?.optional || []).map((item, index) => (
                          <li key={index} className="ingredient-item">
                            <span className="main-ingredient">{typeof item === 'string' ? item : item.ingredient}</span>
                            {typeof item === 'object' && item.alternative && (
                              <span className="alternative-ingredient">
                                <em>Alternative: {item.alternative}</em>
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Engagement Stats */}
                <div className="recipe-engagement-stats">
                  <div className={`engagement-badge tried-badge ${(selectedRecipe.engagement?.tried || selectedRecipe.tried_count || 0) > 0 ? 'has-count' : ''}`}>
                    <TryIcon />
                    <span>{selectedRecipe.engagement?.tried || selectedRecipe.tried_count || 0} people tried this</span>
                  </div>
                  <div className={`engagement-badge saved-badge ${(selectedRecipe.engagement?.saved || selectedRecipe.save_count || 0) > 0 ? 'has-count' : 'no-count'}`}>
                    <HeartIcon />
                    <span>{selectedRecipe.engagement?.saved || selectedRecipe.save_count || 0} people saved this</span>
                  </div>
                </div>

                <div className="recipe-instructions-display">
                  <h4>Instructions:</h4>
                  <ol className="instructions-list">
                    {(selectedRecipe.instructions || []).map((instruction, index) => (
                      <li key={index}>{instruction}</li>
                    ))}
                  </ol>
                </div>

                <div className="recipe-actions-modal">
                  <button className="btn-edit" onClick={() => handleEditRecipe(selectedRecipe)}>
                    <EditIcon />
                    Edit Recipe
                  </button>
                  <button className="btn-delete" onClick={() => {
                    setShowViewModal(false);
                    handleDeleteRecipe(selectedRecipe.id);
                  }}>
                    <DeleteIcon />
                    Delete Recipe
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default RecipeManagement;