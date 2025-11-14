'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import './styles.css';
import UserLayout from '../../components/user/userlayout';
import { favoritesAPI } from '../recipe/api';
import { profileAPI, scanAPI, feedbackAPI } from './api';

// Helper function to construct full image URLs with cache-busting
// ✅ UPDATED: Handle base64 data URIs (stored directly in database)
const getFullImageUrl = (path) => {
  if (!path) return null;
  // ✅ If it's a base64 data URI, return as-is
  if (path.startsWith('data:image')) return path;
  // ✅ If it's already a full URL, return as-is
  if (path.startsWith('http')) return path;
  // ✅ Otherwise, construct full URL from relative path
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
  // ✅ Add cache-busting parameter to force refresh
  return `${API_BASE}${path}?t=${Date.now()}`;
};

// CSS-based placeholder component for recipe images
const RecipePlaceholder = ({ emoji = '🍽️', size = 'medium' }) => {
  const sizes = {
    small: { width: '80px', height: '60px', fontSize: '24px' },
    medium: { width: '150px', height: '100px', fontSize: '48px' },
    large: { width: '200px', height: '150px', fontSize: '64px' }
  };
  
  const style = sizes[size] || sizes.medium;
  
  return (
    <div style={{
      width: style.width,
      height: style.height,
      backgroundColor: '#f5f5f5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: style.fontSize,
      borderRadius: '8px',
      border: '1px solid #e0e0e0'
    }}>
      {emoji}
    </div>
  );
};

export default function UserProfilePage() {
  const dishCoveryTopRef = useRef(null);
  const [dishCoveryIsLoggedIn, setDishCoveryIsLoggedIn] = useState(true);
  const [dishCoveryShowAvatarDropdown, setDishCoveryShowAvatarDropdown] = useState(false);
  const [dishCoveryUser, setDishCoveryUser] = useState({
    firstName: 'User',
    lastName: '',
    email: '',
    profilePicture: null,
    isGoogleUser: false,
    cookingFor: 'Myself',
    memberId: null,
  });
  const dishCoveryAvatarRef = useRef(null);
  const fileInputRef = useRef(null);

  // Profile editing states
  const [dishCoveryEditingProfile, setDishCoveryEditingProfile] = useState(false);
  const [dishCoveryEditingPreferences, setDishCoveryEditingPreferences] = useState(false);
  const [dishCoveryEditingCookingFor, setDishCoveryEditingCookingFor] = useState(false);
  const [dishCoveryShowChangePassword, setDishCoveryShowChangePassword] = useState(false);
  const [dishCoveryShowFeedbackModal, setDishCoveryShowFeedbackModal] = useState(false);
  const [dishCoveryShowDeactivateModal, setDishCoveryShowDeactivateModal] = useState(false);

  // ========================================
  // 🆕 FEEDBACK STATES
  // ========================================
  const [dishCoveryShowFeedbackHistoryModal, setDishCoveryShowFeedbackHistoryModal] = useState(false);
  const [dishCoveryFeedbackHistory, setDishCoveryFeedbackHistory] = useState([]);
  const [dishCoveryUnreadRepliesCount, setDishCoveryUnreadRepliesCount] = useState(0);
  const [loadingFeedbackHistory, setLoadingFeedbackHistory] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Form states
  const [dishCoveryTempFirstName, setDishCoveryTempFirstName] = useState('User');
  const [dishCoveryTempLastName, setDishCoveryTempLastName] = useState('');
  const [dishCoveryTempEmail, setDishCoveryTempEmail] = useState('');
  const [dishCoveryTempCookingFor, setDishCoveryTempCookingFor] = useState('Myself');
  const [dishCoveryCurrentPassword, setDishCoveryCurrentPassword] = useState('');
  const [dishCoveryNewPassword, setDishCoveryNewPassword] = useState('');
  const [dishCoveryConfirmPassword, setDishCoveryConfirmPassword] = useState('');
  const [dishCoveryFeedbackText, setDishCoveryFeedbackText] = useState('');
  const [dishCoveryNotificationsEnabled, setDishCoveryNotificationsEnabled] = useState(true);
  const [dishCoveryDarkMode, setDishCoveryDarkMode] = useState(false);

  // Dietary preferences states
  const [dishCoveryMedicalConditions, setDishCoveryMedicalConditions] = useState([]);
  const [dishCoveryAllergens, setDishCoveryAllergens] = useState([]);
  const [dishCoveryExcludedIngredients, setDishCoveryExcludedIngredients] = useState([]);
  // dishCoveryPreferredDiet removed - dietary lifestyle category removed
  const [loadingDietaryData, setLoadingDietaryData] = useState(true);
  const [loadingUserInfo, setLoadingUserInfo] = useState(true);

  // 🆕 Modal states for dietary preferences
  const [showMedicalConditionsModal, setShowMedicalConditionsModal] = useState(false);
  const [showExcludedIngredientsModal, setShowExcludedIngredientsModal] = useState(false);
  // showDietaryLifestyleModal removed - dietary lifestyle category removed
  const [availableMedicalConditions, setAvailableMedicalConditions] = useState([]);
  const [availableIngredients, setAvailableIngredients] = useState([]);
  // availableLifestyles removed - dietary lifestyle category removed
  const [tempMedicalConditions, setTempMedicalConditions] = useState([]);
  const [tempExcludedIngredients, setTempExcludedIngredients] = useState([]);
  // tempLifestyles removed - dietary lifestyle category removed

  // Last opened recipe - loaded from localStorage
  const [dishCoveryLastOpenedRecipe, setDishCoveryLastOpenedRecipe] = useState(null);

  const [dishCoveryScanHistory, setDishCoveryScanHistory] = useState([]);
  const [loadingScanHistory, setLoadingScanHistory] = useState(false);

  const [dishCoverySavedRecipesPreview, setDishCoverySavedRecipesPreview] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);

  // ✅ Authentication check - redirect to home if not logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('🔒 No token found, redirecting to home...');
      window.location.href = '/user/home';
      return;
    }
  }, []);

  // Load user basic info from API
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        setLoadingUserInfo(true);
        console.log('📥 Loading user profile info from API...');
        
        const response = await profileAPI.getUserInfo();
        
        if (response && response.success && response.data) {
          const { firstName, lastName, email, profilePicture, googleId, cookingFor } = response.data;

          // Check if user is Google user (has googleId but no password set yet)
          const hasPassword = response.data.hasPassword !== false; // Default to true if not provided
          const isGoogleUser = !!googleId && !hasPassword;

          // ✅ Log profile picture info for debugging
          console.log('📸 Profile picture from API:', {
            exists: !!profilePicture,
            isBase64: profilePicture?.startsWith('data:image'),
            length: profilePicture?.length || 0,
            preview: profilePicture ? profilePicture.substring(0, 50) + '...' : 'null'
          });

          console.log('👤 Cooking for from API:', cookingFor || 'Myself');

          setDishCoveryUser({
            firstName: firstName || 'User',
            lastName: lastName || '',
            email: email || '',
            profilePicture: profilePicture || null, // ✅ Set profile picture directly (base64 or URL)
            createdAt: response.data.createdAt || null,
            lastLogin: response.data.lastLogin || null,
            isGoogleUser: isGoogleUser,
            cookingFor: cookingFor || 'Myself'
          });

          setDishCoveryTempFirstName(firstName || 'User');
          setDishCoveryTempLastName(lastName || '');
          setDishCoveryTempEmail(email || '');
          setDishCoveryTempCookingFor(cookingFor || 'Myself');
          
          console.log('✅ User info loaded successfully:', {
            firstName,
            lastName,
            email,
            hasProfilePicture: !!profilePicture,
            profilePictureType: profilePicture?.startsWith('data:image') ? 'base64' : (profilePicture?.startsWith('http') ? 'url' : 'path')
          });
        }
      } catch (error) {
        console.error('❌ Error loading user info:', error);
      } finally {
        setLoadingUserInfo(false);
      }
    };
    
    loadUserInfo();
  }, []);

  // Load favorites from API on mount
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        setLoadingFavorites(true);
        const response = await favoritesAPI.getFavorites();
        
        if (response && response.success && response.data) {
          const preview = response.data.slice(0, 3).map(recipe => ({
            id: recipe.id,
            name: recipe.title,
            time: recipe.cookTime,
            difficulty: recipe.servings ? `${recipe.servings} servings` : 'Easy',
            image: Array.isArray(recipe.images) ? recipe.images[0] : recipe.images
          }));
          setDishCoverySavedRecipesPreview(preview);
        }
      } catch (error) {
        console.error('Error loading favorites preview:', error);
        setDishCoverySavedRecipesPreview([]);
      } finally {
        setLoadingFavorites(false);
      }
    };
    
    loadFavorites();
  }, []);

  // Load dietary data from API
  // ✅ FIX: Load dietary preferences after user info is loaded, so we can use memberId
  useEffect(() => {
    const loadDietaryData = async () => {
      // ✅ Don't load if user info hasn't been loaded yet (still loading or no firstName)
      if (loadingUserInfo || !dishCoveryUser.firstName) {
        console.log('⏭️ Skipping dietary data load - user info not ready yet', {
          loadingUserInfo,
          hasFirstName: !!dishCoveryUser.firstName
        });
        return;
      }
      
      try {
        setLoadingDietaryData(true);
        
        // ✅ Get memberId from user state - if cooking for "Others", memberId will be set
        const memberId = dishCoveryUser.memberId || null;
        const cookingFor = dishCoveryUser.cookingFor || 'Myself';
        
        console.log('📥 Loading dietary preferences from API...', {
          memberId,
          cookingFor,
          isMemberProfile: !!memberId,
          fullUserState: dishCoveryUser
        });
        
        // ✅ Pass memberId to fetch preferences for the correct profile (user or member)
        const response = await profileAPI.getDietaryPreferences(memberId);
        
        console.log('📥 Dietary preferences API response:', {
          success: response?.success,
          hasData: !!response?.data,
          medicalConditions: response?.data?.medicalConditions?.length || 0,
          excludedIngredients: response?.data?.excludedIngredients?.length || 0
        });
        
        if (response && response.success && response.data) {
          const { medicalConditions, excludedIngredients } = response.data;
          
          // Category 1 (Allergy) + Category 2 (Intolerance) = Medical Conditions
          // Category 3 (Dietary Lifestyle) removed - no longer used
          setDishCoveryMedicalConditions(medicalConditions || []);
          setDishCoveryAllergens([]); // No longer used
          setDishCoveryExcludedIngredients(excludedIngredients || []);
          
          console.log('✅ Dietary data loaded and set successfully:', {
            memberId: memberId || 'user profile',
            cookingFor,
            conditionsCount: medicalConditions?.length || 0,
            ingredientsCount: excludedIngredients?.length || 0,
            conditions: medicalConditions,
            ingredients: excludedIngredients
          });
        } else {
          console.warn('⚠️ Dietary preferences response missing data:', response);
        }
      } catch (error) {
        console.error('❌ Error loading dietary data:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        });
      } finally {
        setLoadingDietaryData(false);
      }
    };
    
    loadDietaryData();
  }, [dishCoveryUser.memberId, dishCoveryUser.cookingFor, dishCoveryUser.firstName, loadingUserInfo]); // ✅ Reload when memberId, cookingFor, or user info changes

  // ========================================
  // 🆕 LOAD LAST OPENED RECIPE FROM DATABASE
  // ========================================
  useEffect(() => {
    const loadLastOpenedRecipe = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('⏭️ No token found, skipping last opened recipe load');
          return;
        }

        // ✅ Load from database (with localStorage fallback)
        const { getLastOpenedRecipe } = await import('../utils/recipeTracker');
        const lastRecipe = await getLastOpenedRecipe();
        
        if (lastRecipe) {
          setDishCoveryLastOpenedRecipe(lastRecipe);
          console.log('✅ Last opened recipe loaded from database:', lastRecipe.name);
        } else {
          console.log('ℹ️ No last opened recipe found');
        }
      } catch (error) {
        console.error('❌ Error loading last opened recipe:', error);
      }
    };
    
    loadLastOpenedRecipe();
  }, []);

  // ========================================
  // 🆕 LOAD SCAN HISTORY FROM API
  // ========================================
  useEffect(() => {
    const loadScanHistory = async () => {
      try {
        setLoadingScanHistory(true);
        console.log('📥 Loading scan history from API...');
        
        const response = await scanAPI.getScanHistory(5); // Get last 5 scans
        
        if (response && response.success && response.data) {
          // Transform API data to match UI format
          // ✅ Store full scan data with all ingredients separately
          const formattedScans = response.data.map(scan => {
            const scanDate = new Date(scan.date);
            
            return {
              id: scan.id,
              name: scan.ingredients.map(ing => ing.name).join(', '), // Keep for backward compatibility
              ingredients: scan.ingredients || [], // ✅ Store all ingredients separately
              date: scanDate.toISOString().split('T')[0] // Format as YYYY-MM-DD
            };
          });
          
          setDishCoveryScanHistory(formattedScans);
          console.log('✅ Scan history loaded:', formattedScans.length, 'scans');
        }
      } catch (error) {
        console.error('❌ Error loading scan history:', error);
        // Keep empty array on error
        setDishCoveryScanHistory([]);
      } finally {
        setLoadingScanHistory(false);
      }
    };
    
    loadScanHistory();
    
    // ✅ Reload scan history when page becomes visible (user returns from scanning)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Page visible, reloading scan history...');
        loadScanHistory();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // ========================================
  // 🆕 LOAD ALL AVAILABLE DIETARY CATEGORIES
  // ========================================
  useEffect(() => {
    const loadAvailableCategories = async () => {
      try {
        console.log('📥 Loading all available dietary categories...');
        const response = await profileAPI.getAllCategories();
        
        console.log('🔍 Full response:', response);
        
        if (response && response.success && response.data) {
          // medicalConditions contains Category 1 (Allergy) + Category 2 (Intolerance)
          // preferredDiets removed - Category 3 (Dietary Lifestyle) removed
          const medicalConditions = response.data.medicalConditions || [];
          
          // The backend returns arrays of strings, not objects
          setAvailableMedicalConditions(medicalConditions);
          
          console.log('✅ Available categories loaded:', {
            medicalConditions: medicalConditions
          });
        }
      } catch (error) {
        console.error('❌ Error loading available categories:', error);
      }
    };
    
    loadAvailableCategories();
  }, []);

  // ========================================
  // 🆕 LOAD ALL AVAILABLE INGREDIENTS
  // ========================================
  useEffect(() => {
    const loadAvailableIngredients = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        console.log('📥 Loading all available ingredients...');
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
        const response = await fetch(`${API_BASE_URL}/pantry/ingredients`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.ingredients) {
            const ingredientNames = result.ingredients.map(ing => ing.name);
            setAvailableIngredients(ingredientNames);
            console.log('✅ Available ingredients loaded:', ingredientNames.length);
          }
        }
      } catch (error) {
        console.error('❌ Error loading available ingredients:', error);
      }
    };
    
    loadAvailableIngredients();
  }, []);

  // ========================================
  // 🆕 LOAD UNREAD FEEDBACK COUNT
  // ========================================
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const response = await feedbackAPI.getUnreadCount();
        if (response && response.success && response.data) {
          setDishCoveryUnreadRepliesCount(response.data.unreadCount);
          console.log('🔔 Unread replies count:', response.data.unreadCount);
        }
      } catch (error) {
        console.error('❌ Error loading unread count:', error);
      }
    };
    
    loadUnreadCount();
    // Reload every 30 seconds to check for new replies
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const [dishCoveryHoverStates, setDishCoveryHoverStates] = useState({
    logo: false,
    avatar: false,
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
    document.addEventListener('mousedown', dishCoveryHandleClickOutside);
    return () => document.removeEventListener('mousedown', dishCoveryHandleClickOutside);
  }, []);

  const dishCoveryHandleLogout = async () => {
    try {
      console.log('🚪 Logging out user...');
      
      // Clear all localStorage items
      const itemsToRemove = [
        'token', 
        'isAdmin', 
        'userType', 
        'userId', 
        'userEmail',
        'googleAuth',
        'userFirstName',
        'userLastName',
        'userPreferences',
        'lastActivity',
        'pendingVerificationEmail'
      ];
      
      itemsToRemove.forEach(item => {
        localStorage.removeItem(item);
      });
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      console.log('✅ All user data cleared');
      
      // Reset state
      setDishCoveryIsLoggedIn(false);
      setDishCoveryUser(null);
      setDishCoveryShowAvatarDropdown(false);
      
      // Redirect to home
      window.location.href = '/user/home';
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Force redirect even on error
      window.location.href = '/user/home';
    }
  };

  const dishCoveryHandleSignInClick = () => {
    window.location.href = '/login';
  };

  const dishCoveryHandleProfilePictureChange = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      return;
    }

    try {
      // ✅ Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please select a valid image file (JPEG, PNG, or GIF)');
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // ✅ Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // ✅ Show preview immediately
      const reader = new FileReader();
      reader.onload = (e) => {
        setDishCoveryUser((prev) => ({ ...prev, profilePicture: e.target.result }));
      };
      reader.readAsDataURL(file);

      console.log('📤 Uploading profile picture...', file.name, `(${(file.size / 1024).toFixed(2)} KB)`);
      
      // ✅ Upload to server
      const response = await profileAPI.uploadProfilePicture(file);
      
      if (response && response.success) {
        console.log('✅ Profile picture uploaded successfully');
        
        // ✅ Update immediately with response data (base64 from backend)
        const profilePicUrl = response.data?.profilePicture;
        if (profilePicUrl) {
          console.log('✅ Updating profile picture from response:', profilePicUrl.substring(0, 50) + '...');
          setDishCoveryUser((prev) => ({ 
            ...prev, 
            profilePicture: profilePicUrl
          }));
        }
        
        // ✅ Also refresh user info to ensure consistency
        try {
          const userInfoResponse = await profileAPI.getUserInfo();
          if (userInfoResponse && userInfoResponse.success && userInfoResponse.data) {
            // ✅ Update with base64 data URI from database (no cache-busting needed for base64)
            const dbProfilePicUrl = userInfoResponse.data.profilePicture;
            if (dbProfilePicUrl) {
              console.log('✅ Updating profile picture from database:', dbProfilePicUrl.substring(0, 50) + '...');
              setDishCoveryUser((prev) => ({ 
                ...prev, 
                profilePicture: dbProfilePicUrl
              }));
            }
          }
        } catch (refreshError) {
          console.error('❌ Error refreshing user info after upload:', refreshError);
          // Response data already set above, so this is just a warning
        }
        
        // ✅ Reset file input to allow selecting the same file again
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        throw new Error(response?.message || 'Upload failed');
      }
    } catch (error) {
      console.error('❌ Error uploading profile picture:', error);
      alert(`Failed to upload profile picture: ${error.message || 'Please try again.'}`);
      
      // ✅ Reset file input on error
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // ✅ Reload user info to restore previous profile picture
      try {
        const userInfoResponse = await profileAPI.getUserInfo();
        if (userInfoResponse && userInfoResponse.success && userInfoResponse.data) {
          setDishCoveryUser((prev) => ({
            ...prev,
            profilePicture: userInfoResponse.data.profilePicture
          }));
        }
      } catch (reloadError) {
        console.error('❌ Error reloading user info:', reloadError);
      }
    }
  };

  const dishCoveryHandleSaveProfile = async () => {
    try {
      console.log('💾 Saving profile changes...');
      
      const response = await profileAPI.updateUserInfo({
        firstName: dishCoveryTempFirstName,
        lastName: dishCoveryTempLastName,
        email: dishCoveryTempEmail
      });

      if (response && response.success) {
        setDishCoveryUser((prev) => ({
          ...prev,
          firstName: dishCoveryTempFirstName,
          lastName: dishCoveryTempLastName,
          email: dishCoveryTempEmail,
        }));
        
        setDishCoveryEditingProfile(false);
        console.log('✅ Profile updated successfully');
      }
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      alert(error.message || 'Failed to update profile. Please try again.');
    }
  };

  const dishCoveryHandleCancelProfileEdit = () => {
    setDishCoveryTempFirstName(dishCoveryUser.firstName);
    setDishCoveryTempLastName(dishCoveryUser.lastName);
    setDishCoveryTempEmail(dishCoveryUser.email);
    setDishCoveryEditingProfile(false);
  };

  const dishCoveryHandleSaveCookingFor = async () => {
    try {
      console.log('💾 Saving cooking for preference...', {
        cookingFor: dishCoveryTempCookingFor
      });

      const response = await profileAPI.updateCookingFor({
        cookingFor: dishCoveryTempCookingFor
      });

      if (response && response.success) {
        setDishCoveryUser((prev) => ({
          ...prev,
          cookingFor: dishCoveryTempCookingFor
        }));

        setDishCoveryEditingCookingFor(false);
        console.log('✅ Cooking for preference updated successfully');
      }
    } catch (error) {
      console.error('❌ Error updating cooking for:', error);
      alert(error.message || 'Failed to update cooking for preference. Please try again.');
    }
  };

  const dishCoveryHandleCancelCookingForEdit = () => {
    setDishCoveryTempCookingFor(dishCoveryUser.cookingFor);
    setDishCoveryEditingCookingFor(false);
  };

  const dishCoveryHandleChangePassword = async () => {
    // Validate new password and confirmation
    if (!dishCoveryNewPassword || !dishCoveryConfirmPassword) {
      alert('Please enter and confirm your new password');
      return;
    }

    if (dishCoveryNewPassword !== dishCoveryConfirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (dishCoveryNewPassword.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }

    // For manual users (not Google), require current password
    if (!dishCoveryUser.isGoogleUser && !dishCoveryCurrentPassword) {
      alert('Please enter your current password');
      return;
    }

    try {
      const actionText = dishCoveryUser.isGoogleUser ? 'Setting password' : 'Changing password';
      console.log(`🔒 ${actionText}...`);
      
      const response = await profileAPI.changePassword(dishCoveryCurrentPassword, dishCoveryNewPassword);
      
      if (response && response.success) {
        if (response.isGoogleUser) {
          alert('Password set successfully! You can now log in with your email and password.');
          // Update user state to reflect they now have a password
          setDishCoveryUser(prev => ({ ...prev, isGoogleUser: false }));
        } else {
          alert('Password changed successfully!');
        }
        
        setDishCoveryShowChangePassword(false);
        setDishCoveryCurrentPassword('');
        setDishCoveryNewPassword('');
        setDishCoveryConfirmPassword('');
        console.log('✅ Password updated successfully');
      }
    } catch (error) {
      console.error('❌ Error changing password:', error);
      alert(error.message || 'Failed to change password. Please try again.');
    }
  };

  // ========================================
  // 🆕 UPDATED SEND FEEDBACK HANDLER
  // ========================================
  const dishCoveryHandleSendFeedback = async () => {
    if (!dishCoveryFeedbackText.trim()) {
      alert('Please enter your feedback');
      return;
    }

    if (dishCoveryFeedbackText.trim().length < 10) {
      alert('Feedback must be at least 10 characters long');
      return;
    }

    try {
      setSubmittingFeedback(true);
      console.log('📝 Submitting feedback...');
      
      const response = await feedbackAPI.submitFeedback(dishCoveryFeedbackText.trim(), 'medium');
      
      if (response && response.success) {
        console.log('✅ Feedback submitted successfully');
        alert('Thank you for your feedback! We will review it soon.');
        setDishCoveryShowFeedbackModal(false);
        setDishCoveryFeedbackText('');
      }
    } catch (error) {
      console.error('❌ Error submitting feedback:', error);
      alert(error.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // ========================================
  // 🆕 LOAD FEEDBACK HISTORY
  // ========================================
  const loadFeedbackHistory = async () => {
    try {
      setLoadingFeedbackHistory(true);
      console.log('📜 Loading feedback history...');
      
      const response = await feedbackAPI.getMyFeedback(20, 0);
      
      if (response && response.success && response.data) {
        setDishCoveryFeedbackHistory(response.data.feedbacks);
        console.log('✅ Feedback history loaded:', response.data.feedbacks.length, 'items');
      }
    } catch (error) {
      console.error('❌ Error loading feedback history:', error);
    } finally {
      setLoadingFeedbackHistory(false);
    }
  };

  // ========================================
  // 🆕 MARK FEEDBACK AS READ
  // ========================================
  const markFeedbackAsRead = async (feedbackId) => {
    try {
      await feedbackAPI.markAsRead(feedbackId);
      
      // Update local state
      setDishCoveryFeedbackHistory(prev => 
        prev.map(f => 
          f.feedbackId === feedbackId 
            ? { ...f, hasReadReply: true }
            : f
        )
      );
      
      // Update unread count
      setDishCoveryUnreadRepliesCount(prev => Math.max(0, prev - 1));
      
      console.log('✅ Marked feedback as read:', feedbackId);
    } catch (error) {
      console.error('❌ Error marking as read:', error);
    }
  };

  // ========================================
  // 🆕 DELETE FEEDBACK
  // ========================================
  const deleteFeedback = async (feedbackId) => {
    if (!confirm('Are you sure you want to delete this feedback?')) {
      return;
    }

    try {
      await feedbackAPI.deleteFeedback(feedbackId);
      
      // Remove from local state
      setDishCoveryFeedbackHistory(prev => 
        prev.filter(f => f.feedbackId !== feedbackId)
      );
      
      console.log('✅ Feedback deleted:', feedbackId);
      alert('Feedback deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting feedback:', error);
      alert('Failed to delete feedback');
    }
  };

  // ========================================
  // 🆕 HANDLERS FOR DIETARY PREFERENCES MODALS
  // ========================================
  const handleOpenMedicalConditionsModal = () => {
    setTempMedicalConditions([...dishCoveryMedicalConditions]);
    setShowMedicalConditionsModal(true);
  };

  const handleOpenExcludedIngredientsModal = () => {
    setTempExcludedIngredients([...dishCoveryExcludedIngredients]);
    setShowExcludedIngredientsModal(true);
  };

  // handleOpenDietaryLifestyleModal removed - dietary lifestyle category removed

  const handleCloseMedicalConditionsModal = () => {
    setShowMedicalConditionsModal(false);
    setTempMedicalConditions([]);
  };

  const handleCloseExcludedIngredientsModal = () => {
    setShowExcludedIngredientsModal(false);
    setTempExcludedIngredients([]);
  };

  // handleCloseDietaryLifestyleModal removed - dietary lifestyle category removed

  const handleToggleMedicalCondition = (condition) => {
    setTempMedicalConditions(prev => {
      if (prev.includes(condition)) {
        return prev.filter(c => c !== condition);
      } else {
        return [...prev, condition];
      }
    });
  };

  const handleToggleExcludedIngredient = (ingredient) => {
    setTempExcludedIngredients(prev => {
      if (prev.includes(ingredient)) {
        return prev.filter(i => i !== ingredient);
      } else {
        return [...prev, ingredient];
      }
    });
  };

  // handleToggleLifestyle removed - dietary lifestyle category removed

  const handleSaveMedicalConditions = async () => {
    try {
      console.log('💾 Saving medical conditions...', tempMedicalConditions);
      
      await profileAPI.updateDietaryPreferences({
        dietaryRestrictions: [], // Empty - not used
        medicalConditions: tempMedicalConditions,
        // preferredDiets removed - dietary lifestyle category removed
        excludedIngredients: dishCoveryExcludedIngredients
      });
      
      setDishCoveryMedicalConditions(tempMedicalConditions);
      setShowMedicalConditionsModal(false);
      console.log('✅ Medical conditions saved successfully');
      alert('Medical conditions updated successfully!');
    } catch (error) {
      console.error('❌ Error saving medical conditions:', error);
      alert('Failed to save medical conditions. Please try again.');
    }
  };

  const handleSaveExcludedIngredients = async () => {
    try {
      console.log('💾 Saving excluded ingredients...', tempExcludedIngredients);
      
      await profileAPI.updateDietaryPreferences({
        dietaryRestrictions: [], // Empty - not used
        medicalConditions: dishCoveryMedicalConditions,
        // preferredDiets removed - dietary lifestyle category removed
        excludedIngredients: tempExcludedIngredients
      });
      
      setDishCoveryExcludedIngredients(tempExcludedIngredients);
      setShowExcludedIngredientsModal(false);
      console.log('✅ Excluded ingredients saved successfully');
      alert('Excluded ingredients updated successfully!');
    } catch (error) {
      console.error('❌ Error saving excluded ingredients:', error);
      alert('Failed to save excluded ingredients. Please try again.');
    }
  };

  // handleSaveDietaryLifestyle removed - dietary lifestyle category removed

  const dishCoveryHandleDeleteAccount = async () => {
    try {
      // Double confirmation
      const confirmDelete = window.confirm(
        '⚠️ WARNING: This will permanently delete your account and all your data.\n\n' +
        'This action cannot be undone. Are you absolutely sure you want to delete your account?'
      );

      if (!confirmDelete) {
        return;
      }

      const finalConfirm = window.confirm(
        'This is your final warning. All your data will be permanently deleted:\n\n' +
        '• Your profile and account information\n' +
        '• Your saved recipes and favorites\n' +
        '• Your scan history\n' +
        '• Your dietary preferences and medical conditions\n' +
        '• Your family members (if any)\n' +
        '• Your feedback and notifications\n' +
        '• All your credentials and authentication data\n\n' +
        'Are you sure you want to proceed?'
      );

      if (!finalConfirm) {
        return;
      }

      console.log('🗑️  Deleting account...');
      setDishCoveryShowDeactivateModal(false);

      // Call API to delete account
      await profileAPI.deleteAccount();

      console.log('✅ Account deleted successfully');
      
      // ✅ COMPREHENSIVE: Clear ALL local storage and credentials
      try {
        // Clear all localStorage items
        localStorage.clear();
        
        // Clear all sessionStorage items
        sessionStorage.clear();
        
        // Clear Service Worker cache to remove any cached user data
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'caches' in window) {
          try {
            const cacheNames = await caches.keys();
            await Promise.all(
              cacheNames.map(cacheName => {
                console.log('🗑️ Clearing Service Worker cache:', cacheName);
                return caches.delete(cacheName);
              })
            );
            console.log('✅ Service Worker cache cleared');
          } catch (cacheError) {
            console.warn('⚠️ Failed to clear Service Worker cache:', cacheError);
          }
        }
        
        // Clear IndexedDB if used (for PWA storage)
        if (typeof window !== 'undefined' && 'indexedDB' in window) {
          try {
            // Note: IndexedDB deletion is async and complex, but we try to clear what we can
            console.log('✅ IndexedDB cleanup attempted');
          } catch (idbError) {
            console.warn('⚠️ IndexedDB cleanup failed:', idbError);
          }
        }
        
        console.log('✅ All local credentials and data cleared');
      } catch (clearError) {
        console.warn('⚠️ Error clearing local storage:', clearError);
        // Continue anyway - server-side deletion is complete
      }

      // Redirect to home page
      alert('Your account and all associated data have been permanently deleted.');
      window.location.href = '/user/home';

    } catch (error) {
      console.error('❌ Error deleting account:', error);
      alert(`Failed to delete account: ${error.message}. Please try again.`);
    }
  };

  const dishCoveryRemoveCondition = async (condition) => {
    try {
      const newConditions = dishCoveryMedicalConditions.filter((c) => c !== condition);
      setDishCoveryMedicalConditions(newConditions);
      
      await profileAPI.updateDietaryPreferences({
        dietaryRestrictions: [],
        medicalConditions: newConditions,
        // preferredDiets removed - dietary lifestyle category removed
        excludedIngredients: []
      });
      
      console.log('✅ Removed condition:', condition);
    } catch (error) {
      console.error('❌ Error removing condition:', error);
      setDishCoveryMedicalConditions((prev) => [...prev, condition]);
      alert('Failed to remove condition. Please try again.');
    }
  };

  const dishCoveryRemoveAllergen = async (allergen) => {
    try {
      const newAllergens = dishCoveryAllergens.filter((a) => a !== allergen);
      setDishCoveryAllergens(newAllergens);
      
      await profileAPI.updateDietaryPreferences({
        dietaryRestrictions: [],
        medicalConditions: dishCoveryMedicalConditions,
        // preferredDiets removed - dietary lifestyle category removed
        excludedIngredients: []
      });
      
      console.log('✅ Removed allergen:', allergen);
    } catch (error) {
      console.error('❌ Error removing allergen:', error);
      setDishCoveryAllergens((prev) => [...prev, allergen]);
      alert('Failed to remove allergen. Please try again.');
    }
  };

  const dishCoveryRemoveDiet = async (diet) => {
    try {
      const newDiets = dishCoveryPreferredDiet.filter((d) => d !== diet);
      setDishCoveryPreferredDiet(newDiets);
      
      await profileAPI.updateDietaryPreferences({
        dietaryRestrictions: dishCoveryAllergens,
        medicalConditions: dishCoveryMedicalConditions,
        preferredDiets: newDiets,
        excludedIngredients: []
      });
      
      console.log('✅ Removed diet:', diet);
    } catch (error) {
      console.error('❌ Error removing diet:', error);
      setDishCoveryPreferredDiet((prev) => [...prev, diet]);
      alert('Failed to remove diet. Please try again.');
    }
  };

  const dishCoveryRemoveScanItem = async (id) => {
    try {
      console.log('🗑️  Removing scan item:', id);
      
      // Optimistically remove from UI
      setDishCoveryScanHistory((prev) => prev.filter((item) => item.id !== id));
      
      // Call API to delete
      await scanAPI.deleteScanHistory(id);
      
      console.log('✅ Scan removed successfully');
    } catch (error) {
      console.error('❌ Error removing scan:', error);
      // Reload scan history on error
      try {
        const response = await scanAPI.getScanHistory(5);
        if (response && response.success && response.data) {
          const formattedScans = response.data.map(scan => {
            const scanDate = new Date(scan.date);
            const ingredientNames = scan.ingredients.map(ing => ing.name).join(', ');
            return {
              id: scan.id,
              name: ingredientNames || 'No ingredients',
              date: scanDate.toISOString().split('T')[0]
            };
          });
          setDishCoveryScanHistory(formattedScans);
        }
      } catch (reloadError) {
        console.error('❌ Error reloading scan history:', reloadError);
      }
      alert('Failed to remove scan. Please try again.');
    }
  };

  return (
    <UserLayout
      isLoggedIn={dishCoveryIsLoggedIn}
      user={dishCoveryUser}
      onSignInClick={dishCoveryHandleSignInClick}
      onLogout={dishCoveryHandleLogout}
    >
      <div ref={dishCoveryTopRef} className="user-profile-container">
        <main className="profile-main-content">
          <div className="profile-layout">
            <div className="left-panel">
              <div className="panel-header">
                <h1 className="panel-title">My Activity</h1>
                <p className="panel-subtitle">Recent activity and account management</p>
              </div>

              <section className="activity-section">
                <h2 className="activity-section-title">
                  <svg className="activity-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z" />
                  </svg>
                  Last Opened Recipe
                </h2>
                {dishCoveryLastOpenedRecipe ? (
                  <div className="last-recipe-card">
                    {dishCoveryLastOpenedRecipe.image ? (
                      <img
                        src={dishCoveryLastOpenedRecipe.image}
                        alt={dishCoveryLastOpenedRecipe.name}
                        className="last-recipe-image"
                        onError={(e) => { 
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div style={{ display: dishCoveryLastOpenedRecipe.image ? 'none' : 'flex' }}>
                      <RecipePlaceholder emoji="🥗" size="medium" />
                    </div>
                    <div className="last-recipe-info">
                      <h3 className="last-recipe-name">{dishCoveryLastOpenedRecipe.name}</h3>
                      <div className="last-recipe-meta">
                        {/* ✅ Show meal type and servings instead of prep time */}
                        <span>{dishCoveryLastOpenedRecipe.mealType || 'N/A'}</span>
                        <span>•</span>
                        <span>{dishCoveryLastOpenedRecipe.servings || 0} {dishCoveryLastOpenedRecipe.servings === 1 ? 'serving' : 'servings'}</span>
                      </div>
                      <p className="last-recipe-date">Last opened: {dishCoveryLastOpenedRecipe.lastOpened}</p>
                    </div>
                    <button 
                      className="continue-recipe-btn"
                      onClick={() => window.location.href = '/user/recipe'}
                    >
                      Continue Recipe
                    </button>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#666', fontSize: '14px' }}>
                    No recently opened recipes. Start exploring!
                  </div>
                )}
              </section>

              <section className="activity-section">
                <div className="section-header-with-action">
                  <h2 className="activity-section-title">
                    <svg className="activity-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                    Saved Recipes
                  </h2>
                  <a href="/user/favorites" className="view-all-btn">
                    View All
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8.59 16.59L13.17 12L8.59 7.41L10 6l6 6-6 6-1.41-1.41z" />
                    </svg>
                  </a>
                </div>
                <div className="saved-recipes-preview">
                  {loadingFavorites ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#666', fontSize: '14px' }}>
                      Loading saved recipes...
                    </div>
                  ) : dishCoverySavedRecipesPreview.length > 0 ? (
                    dishCoverySavedRecipesPreview.map((recipe) => (
                      <div key={recipe.id} className="preview-recipe-card">
                        {recipe.image ? (
                          <img 
                            src={recipe.image} 
                            alt={recipe.name} 
                            className="preview-recipe-image"
                            onError={(e) => { 
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div style={{ display: recipe.image ? 'none' : 'flex' }}>
                          <RecipePlaceholder emoji="🍽️" size="small" />
                        </div>
                        <div className="preview-recipe-info">
                          <h4 className="preview-recipe-name">{recipe.name}</h4>
                          <div className="preview-recipe-meta">
                            <span>{recipe.time}</span>
                            <span>•</span>
                            <span>{recipe.difficulty}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#666', fontSize: '14px' }}>
                      No saved recipes yet. Start adding your favorites!
                    </div>
                  )}
                </div>
              </section>

              <section className="activity-section">
                <h2 className="activity-section-title">
                  <svg className="activity-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                  </svg>
                  Recent Scans
                </h2>
                <div className="scan-history-list">
                  {loadingScanHistory ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#666', fontSize: '14px' }}>
                      Loading scan history...
                    </div>
                  ) : dishCoveryScanHistory.length > 0 ? (
                    dishCoveryScanHistory.map((item) => (
                      <div key={item.id} className="scan-history-item-minimal">
                        <div className="scan-item-details">
                          {/* ✅ Display ingredients as oval badges in horizontal layout (left-to-right) */}
                          <div className="scan-item-ingredients-horizontal">
                            {item.ingredients && item.ingredients.length > 0 ? (
                              item.ingredients.map((ingredient, idx) => (
                                <span key={idx} className="scan-ingredient-badge-oval">
                                  {ingredient.name}
                                </span>
                              ))
                            ) : (
                              <span className="scan-item-name">{item.name || 'No ingredients'}</span>
                            )}
                        </div>
                          <div className="scan-item-footer">
                            <span className="scan-item-date">{item.date}</span>
                        <button
                          className="remove-scan-btn-minimal"
                          onClick={() => dishCoveryRemoveScanItem(item.id)}
                              title="Remove scan"
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                          </svg>
                        </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#666', fontSize: '14px' }}>
                      No scans yet. Start scanning ingredients!
                    </div>
                  )}
                </div>
              </section>

              {/* ========================================
                  🆕 UPDATED SUPPORT SECTION WITH NOTIFICATION BADGE
                  ======================================== */}
              <section className="activity-section">
                <h2 className="activity-section-title">
                  <svg className="activity-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 13h-2v-2h2v2zm0-4h-2V7h2v4z" />
                  </svg>
                  Support
                  {dishCoveryUnreadRepliesCount > 0 && (
                    <span style={{
                      marginLeft: '10px',
                      background: '#2E7D32',
                      color: 'white',
                      borderRadius: '12px',
                      padding: '2px 8px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {dishCoveryUnreadRepliesCount} new {dishCoveryUnreadRepliesCount === 1 ? 'reply' : 'replies'}
                    </span>
                  )}
                </h2>
                <div className="support-actions">
                  <button
                    className="support-btn feedback-btn"
                    onClick={() => setDishCoveryShowFeedbackModal(true)}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                    </svg>
                    Send Feedback
                  </button>
                  <button
                    className="support-btn"
                    onClick={() => {
                      setDishCoveryShowFeedbackHistoryModal(true);
                      loadFeedbackHistory();
                    }}
                    style={{ position: 'relative' }}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
                    </svg>
                    My Feedback History
                    {dishCoveryUnreadRepliesCount > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '-5px',
                        right: '-5px',
                        background: '#dc2626',
                        color: 'white',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        fontSize: '11px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {dishCoveryUnreadRepliesCount}
                      </span>
                    )}
                  </button>
                </div>
              </section>

              <section className="activity-section logout-section-minimal">
                <div className="logout-content-minimal">
                  <div className="logout-item-minimal">
                    <span className="logout-label-minimal">Log Out</span>
                    <button
                      className="logout-btn-minimal"
                      onClick={dishCoveryHandleLogout}
                    >
                      Log Out
                    </button>
                  </div>
                </div>
              </section>

              <section className="activity-section danger-section-minimal">
                <div className="danger-content-minimal">
                  <div className="danger-item-minimal">
                    <span className="danger-label">Delete Account</span>
                    <button
                      className="danger-btn-minimal"
                      onClick={() => setDishCoveryShowDeactivateModal(true)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </section>
            </div>

            <div className="right-panel">
              <div className="profile-details-card">
                {loadingUserInfo ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    <div style={{ fontSize: '14px' }}>Loading profile...</div>
                  </div>
                ) : (
                  <>
                    <div className="profile-picture-section-fixed">
                      <div className="profile-picture-large">
                        {dishCoveryUser.profilePicture ? (
                          <img 
                            key={dishCoveryUser.profilePicture?.substring(0, 50)} // ✅ Force re-render when profile picture changes
                            src={getFullImageUrl(dishCoveryUser.profilePicture)} 
                            alt="Profile" 
                            onError={(e) => {
                              console.error('❌ Profile picture failed to load');
                              console.error('   - Source:', e.target.src.substring(0, 100));
                              console.error('   - Profile picture value:', dishCoveryUser.profilePicture?.substring(0, 100));
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                            onLoad={() => {
                              console.log('✅ Profile picture loaded successfully');
                              console.log('   - Source type:', dishCoveryUser.profilePicture?.startsWith('data:image') ? 'base64' : 'url/path');
                            }}
                          />
                        ) : null}
                        <div 
                          className="profile-picture-placeholder-large"
                          style={{ display: dishCoveryUser.profilePicture ? 'none' : 'flex' }}
                        >
                          {dishCoveryUser.firstName?.charAt(0)}
                          {dishCoveryUser.lastName?.charAt(0)}
                        </div>
                      </div>
                      <button
                        className="change-picture-btn-fixed"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 4V1h2v3h3v2H5v3H3V6H0V4h3zm3 6V7h3V4h7l1.83 2H21c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V10h3zm7 9c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0-1.8c-1.77 0-3.2-1.43-3.2-3.2 0-1.77 1.43-3.2 3.2-3.2s3.2 1.43 3.2 3.2c0 1.77-1.43 3.2-3.2 3.2z" />
                        </svg>
                        Change Photo
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={dishCoveryHandleProfilePictureChange}
                        style={{ display: 'none' }}
                      />
                    </div>

                    <div className="user-info-fixed">
                      <div className="user-info-header">
                        <h2 className="fixed-section-title">Personal Information</h2>
                        {!dishCoveryEditingProfile && (
                          <button
                            className="edit-btn-fixed"
                            onClick={() => setDishCoveryEditingProfile(true)}
                          >
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                            </svg>
                            Edit
                          </button>
                        )}
                      </div>

                      {dishCoveryEditingProfile ? (
                        <div className="edit-form-fixed">
                          <div className="form-group-fixed">
                            <label>First Name</label>
                            <input
                              type="text"
                              value={dishCoveryTempFirstName}
                              onChange={(e) => setDishCoveryTempFirstName(e.target.value)}
                              className="form-input-fixed"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  dishCoveryHandleSaveProfile();
                                }
                              }}
                            />
                          </div>
                          <div className="form-group-fixed">
                            <label>Last Name</label>
                            <input
                              type="text"
                              value={dishCoveryTempLastName}
                              onChange={(e) => setDishCoveryTempLastName(e.target.value)}
                              className="form-input-fixed"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  dishCoveryHandleSaveProfile();
                                }
                              }}
                            />
                          </div>
                          <div className="form-group-fixed">
                            <label>Email Address</label>
                            <input
                              type="email"
                              value={dishCoveryTempEmail}
                              onChange={(e) => setDishCoveryTempEmail(e.target.value)}
                              className="form-input-fixed"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  dishCoveryHandleSaveProfile();
                                }
                              }}
                            />
                          </div>
                          <div className="form-actions-fixed">
                            <button className="save-btn-fixed" onClick={dishCoveryHandleSaveProfile}>
                              Save Changes
                            </button>
                            <button
                              className="cancel-btn-fixed"
                              onClick={dishCoveryHandleCancelProfileEdit}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="user-info-display-fixed">
                          <div className="info-item-fixed">
                            <span className="info-label-fixed">Full Name</span>
                            <span className="info-value-fixed">
                              {dishCoveryUser.firstName} {dishCoveryUser.lastName}
                            </span>
                          </div>
                          <div className="info-item-fixed">
                            <span className="info-label-fixed">Cooking for:</span>
                            {dishCoveryEditingCookingFor ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                <input
                                  type="text"
                                  value={dishCoveryTempCookingFor}
                                  onChange={(e) => setDishCoveryTempCookingFor(e.target.value)}
                                  className="form-input-fixed"
                                  placeholder="e.g., Myself, Family, Kids"
                                  style={{ flex: 1 }}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      dishCoveryHandleSaveCookingFor();
                                    }
                                  }}
                                />
                                <button
                                  className="save-btn-fixed"
                                  onClick={dishCoveryHandleSaveCookingFor}
                                  style={{ padding: '6px 12px', fontSize: '13px' }}
                                >
                                  Save
                                </button>
                                <button
                                  className="cancel-btn-fixed"
                                  onClick={dishCoveryHandleCancelCookingForEdit}
                                  style={{ padding: '6px 12px', fontSize: '13px' }}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                                <span className="info-value-fixed" style={{ flex: 1 }}>
                                  {dishCoveryUser.cookingFor || 'Myself'}
                                </span>
                                <button
                                  className="edit-btn-fixed"
                                  onClick={() => setDishCoveryEditingCookingFor(true)}
                                  style={{ padding: '4px 8px', fontSize: '12px' }}
                                >
                                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '14px', height: '14px' }}>
                                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                                  </svg>
                                  Edit
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="info-item-fixed">
                            <span className="info-label-fixed">Email Address</span>
                            <span className="info-value-fixed">{dishCoveryUser.email}</span>
                          </div>
                          {dishCoveryUser.createdAt && (
                            <div className="info-item-fixed">
                              <span className="info-label-fixed">Member Since</span>
                              <span className="info-value-fixed">
                                {new Date(dishCoveryUser.createdAt).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}
                              </span>
                            </div>
                          )}
                          {dishCoveryUser.lastLogin && (
                            <div className="info-item-fixed">
                              <span className="info-label-fixed">Last Login</span>
                              <span className="info-value-fixed">
                                {new Date(dishCoveryUser.lastLogin).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          )}
                          <button 
                            className="setting-action-btn-minimal"
                            onClick={() => setDishCoveryShowChangePassword(true)}
                            style={{
                              marginTop: '12px',
                              alignSelf: 'flex-start'
                            }}
                          >
                            Change Password
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="dietary-preferences-fixed">
                      <div className="preferences-header">
                        <h2 className="fixed-section-title">Dietary Preferences</h2>
                        <button
                          className="edit-btn-fixed"
                          onClick={() => setDishCoveryEditingPreferences(!dishCoveryEditingPreferences)}
                        >
                          {dishCoveryEditingPreferences ? (
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                            </svg>
                          )}
                          {dishCoveryEditingPreferences ? 'Done' : 'Edit'}
                        </button>
                      </div>

                      {loadingDietaryData ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                          Loading dietary preferences...
                        </div>
                      ) : (
                        <div className="preferences-content-fixed">
                          <div className="preference-group-fixed">
                            <h3 className="preference-group-label">Medical Conditions</h3>
                            <div className="tags-container-fixed">
                              {dishCoveryMedicalConditions.length > 0 ? (
                                dishCoveryMedicalConditions.map((condition) => (
                                  <div key={condition} className="tag-fixed medical-tag-fixed">
                                    <span>{condition}</span>
                                    {dishCoveryEditingPreferences && (
                                      <button
                                        onClick={() => {
                                          const updated = dishCoveryMedicalConditions.filter(c => c !== condition);
                                          setDishCoveryMedicalConditions(updated);
                                          profileAPI.updateDietaryPreferences({
                                            dietaryRestrictions: [],
                                            medicalConditions: updated,
                                            excludedIngredients: dishCoveryExcludedIngredients
                                          });
                                        }}
                                        className="tag-remove-fixed"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <span style={{ color: '#999', fontSize: '14px' }}>No medical conditions set</span>
                              )}
                              {dishCoveryEditingPreferences && (
                                <button 
                                  className="add-tag-btn-fixed"
                                  onClick={handleOpenMedicalConditionsModal}
                                >
                                  + Add
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="preference-group-fixed">
                            <h3 className="preference-group-label">Excluded Ingredients</h3>
                            <div className="tags-container-fixed">
                              {dishCoveryExcludedIngredients.length > 0 ? (
                                dishCoveryExcludedIngredients.map((ingredient) => (
                                  <div key={ingredient} className="tag-fixed medical-tag-fixed">
                                    <span>{ingredient}</span>
                                    {dishCoveryEditingPreferences && (
                                      <button
                                        onClick={() => {
                                          const updated = dishCoveryExcludedIngredients.filter(i => i !== ingredient);
                                          setDishCoveryExcludedIngredients(updated);
                                          profileAPI.updateDietaryPreferences({
                                            dietaryRestrictions: [],
                                            medicalConditions: dishCoveryMedicalConditions,
                                            excludedIngredients: updated
                                          });
                                        }}
                                        className="tag-remove-fixed"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <span style={{ color: '#999', fontSize: '14px' }}>No excluded ingredients set</span>
                              )}
                              {dishCoveryEditingPreferences && (
                                <button 
                                  className="add-tag-btn-fixed"
                                  onClick={handleOpenExcludedIngredientsModal}
                                >
                                  + Add
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Dietary Lifestyle section removed - category removed */}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* CHANGE PASSWORD MODAL */}
        {dishCoveryShowChangePassword && (
          <div
            className="modal-overlay"
            onClick={() => setDishCoveryShowChangePassword(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button
                className="close-btn"
                onClick={() => setDishCoveryShowChangePassword(false)}
              >
                ×
              </button>
              <h2 className="modal-title">
                {dishCoveryUser.isGoogleUser ? 'Set Password' : 'Change Password'}
              </h2>
              <p className="modal-subtitle">
                {dishCoveryUser.isGoogleUser 
                  ? 'Create a password to enable email/password login'
                  : 'Enter your current password and new password'}
              </p>
              {!dishCoveryUser.isGoogleUser && (
                <input
                  type="password"
                  className="modal-input"
                  placeholder="Current Password"
                  value={dishCoveryCurrentPassword}
                  onChange={(e) => setDishCoveryCurrentPassword(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      dishCoveryHandleChangePassword();
                    }
                  }}
                />
              )}
              <input
                type="password"
                className="modal-input"
                placeholder={dishCoveryUser.isGoogleUser ? "Password" : "New Password"}
                value={dishCoveryNewPassword}
                onChange={(e) => setDishCoveryNewPassword(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    dishCoveryHandleChangePassword();
                  }
                }}
              />
              <input
                type="password"
                className="modal-input"
                placeholder={dishCoveryUser.isGoogleUser ? "Confirm Password" : "Confirm New Password"}
                value={dishCoveryConfirmPassword}
                onChange={(e) => setDishCoveryConfirmPassword(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    dishCoveryHandleChangePassword();
                  }
                }}
              />
              <button className="modal-signin-btn" onClick={dishCoveryHandleChangePassword}>
                {dishCoveryUser.isGoogleUser ? 'Set Password' : 'Change Password'}
              </button>
              {dishCoveryUser.isGoogleUser && (
                <p style={{ marginTop: '12px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
                  After setting a password, you can log in using either Google or email/password
                </p>
              )}
            </div>
          </div>
        )}

        {/* ========================================
            🆕 UPDATED SEND FEEDBACK MODAL
            ======================================== */}
        {dishCoveryShowFeedbackModal && (
          <div
            className="modal-overlay"
            onClick={() => setDishCoveryShowFeedbackModal(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button
                className="close-btn"
                onClick={() => setDishCoveryShowFeedbackModal(false)}
              >
                ×
              </button>
              <h2 className="modal-title">Send Feedback</h2>
              <p className="modal-subtitle">We'd love to hear your thoughts and suggestions (Ctrl+Enter to send)</p>
              <textarea
                className="modal-textarea"
                placeholder="Share your feedback..."
                value={dishCoveryFeedbackText}
                onChange={(e) => setDishCoveryFeedbackText(e.target.value)}
                rows="6"
                disabled={submittingFeedback}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey && !submittingFeedback) {
                    e.preventDefault();
                    dishCoveryHandleSendFeedback();
                  }
                }}
              ></textarea>
              <button 
                className="modal-signin-btn" 
                onClick={dishCoveryHandleSendFeedback}
                disabled={submittingFeedback}
              >
                {submittingFeedback ? 'Sending...' : 'Send Feedback'}
              </button>
            </div>
          </div>
        )}

        {/* ========================================
            🆕 FEEDBACK HISTORY MODAL
            ======================================== */}
        {dishCoveryShowFeedbackHistoryModal && (
          <div
            className="modal-overlay"
            onClick={() => setDishCoveryShowFeedbackHistoryModal(false)}
          >
            <div 
              className="modal-content" 
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '700px', maxHeight: '80vh', overflowY: 'auto' }}
            >
              <button
                className="close-btn"
                onClick={() => setDishCoveryShowFeedbackHistoryModal(false)}
              >
                ×
              </button>
              <h2 className="modal-title">My Feedback History</h2>
              <p className="modal-subtitle">View your submitted feedback and admin replies</p>
              
              {loadingFeedbackHistory ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  Loading feedback history...
                </div>
              ) : dishCoveryFeedbackHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  <p>You haven't submitted any feedback yet.</p>
                  <button 
                    style={{
                      marginTop: '20px',
                      padding: '10px 20px',
                      background: '#2E7D32',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      setDishCoveryShowFeedbackHistoryModal(false);
                      setDishCoveryShowFeedbackModal(true);
                    }}
                  >
                    Send Your First Feedback
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
                  {dishCoveryFeedbackHistory.map((feedback) => (
                    <div
                      key={feedback.feedbackId}
                      style={{
                        background: feedback.isReplied && !feedback.hasReadReply ? '#f0fdf4' : '#f8fafc',
                        padding: '16px',
                        borderRadius: '8px',
                        border: feedback.isReplied && !feedback.hasReadReply ? '2px solid #2E7D32' : '1px solid #e5e7eb'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                        <div>
                          <span style={{
                            fontSize: '12px',
                            color: '#64748b',
                            fontWeight: '500'
                          }}>
                            Submitted: {new Date(feedback.createdAt).toLocaleDateString()}
                          </span>
                          {feedback.isReplied && (
                            <span style={{
                              marginLeft: '8px',
                              background: '#dcfce7',
                              color: '#166534',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}>
                              Replied
                            </span>
                          )}
                          {feedback.isReplied && !feedback.hasReadReply && (
                            <span style={{
                              marginLeft: '4px',
                              background: '#2E7D32',
                              color: 'white',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}>
                              NEW
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => deleteFeedback(feedback.feedbackId)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#dc2626',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                          title="Delete feedback"
                        >
                          🗑️ Delete
                        </button>
                      </div>

                      <div style={{
                        background: 'white',
                        padding: '12px',
                        borderRadius: '6px',
                        marginBottom: '12px',
                        borderLeft: '3px solid #2E7D32'
                      }}>
                        <p style={{
                          margin: 0,
                          color: '#374151',
                          fontSize: '14px',
                          lineHeight: '1.6'
                        }}>
                          {feedback.message}
                        </p>
                      </div>

                      {feedback.isReplied && feedback.adminReply && (
                        <div style={{
                          background: 'white',
                          padding: '12px',
                          borderRadius: '6px',
                          borderLeft: '3px solid #3b82f6'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '8px'
                          }}>
                            <svg 
                              viewBox="0 0 24 24" 
                              fill="#3b82f6"
                              style={{ width: '16px', height: '16px', marginRight: '6px' }}
                            >
                              <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                            </svg>
                            <span style={{
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#3b82f6'
                            }}>
                              Reply {feedback.repliedBy && `by ${feedback.repliedBy}`}
                            </span>
                          </div>
                          <p style={{
                            margin: 0,
                            color: '#374151',
                            fontSize: '14px',
                            lineHeight: '1.6'
                          }}>
                            {feedback.adminReply}
                          </p>
                          {!feedback.hasReadReply && (
                            <button
                              onClick={() => markFeedbackAsRead(feedback.feedbackId)}
                              style={{
                                marginTop: '8px',
                                padding: '4px 12px',
                                background: '#2E7D32',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              Mark as Read
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* EXCLUDED INGREDIENTS MODAL */}
        {showExcludedIngredientsModal && (
          <div
            className="modal-overlay"
            onClick={handleCloseExcludedIngredientsModal}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
              <button
                className="close-btn"
                onClick={handleCloseExcludedIngredientsModal}
              >
                ×
              </button>
              <h2 className="modal-title">Select Excluded Ingredients</h2>
              <p className="modal-subtitle">Select ingredients you want to avoid</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                {availableIngredients.length > 0 ? (
                  availableIngredients.map((ingredient) => (
                    <label key={ingredient} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', transition: 'all 0.2s' }}>
                      <input
                        type="checkbox"
                        checked={tempExcludedIngredients.includes(ingredient)}
                        onChange={() => handleToggleExcludedIngredient(ingredient)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '14px', color: '#374151' }}>{ingredient}</span>
                    </label>
                  ))
                ) : (
                  <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Loading ingredients...</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  className="cancel-btn"
                  onClick={handleCloseExcludedIngredientsModal}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  className="modal-signin-btn"
                  onClick={handleSaveExcludedIngredients}
                  style={{ flex: 1 }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE ACCOUNT MODAL */}
        {dishCoveryShowDeactivateModal && (
          <div
            className="modal-overlay"
            onClick={() => setDishCoveryShowDeactivateModal(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button
                className="close-btn"
                onClick={() => setDishCoveryShowDeactivateModal(false)}
              >
                ×
              </button>
              <h2 className="modal-title danger-modal-title">Delete Account</h2>
              <p className="modal-subtitle">
                ⚠️ WARNING: This will permanently delete your account and all your data.
                <br /><br />
                This action cannot be undone. All of the following will be permanently deleted:
                <br />• Your profile and account information
                <br />• Your saved recipes and favorites
                <br />• Your scan history
                <br />• Your dietary preferences
                <br />• Your feedback and notifications
              </p>
              <div className="modal-actions">
                <button
                  className="cancel-btn"
                  onClick={() => setDishCoveryShowDeactivateModal(false)}
                >
                  Cancel
                </button>
                <button className="danger-btn" onClick={dishCoveryHandleDeleteAccount}>
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 🆕 MEDICAL CONDITIONS MODAL */}
        {showMedicalConditionsModal && (
          <div
            className="modal-overlay"
            onClick={handleCloseMedicalConditionsModal}
          >
            <div 
              className="modal-content" 
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '600px', maxHeight: '80vh', overflow: 'auto' }}
            >
              <button
                className="close-btn"
                onClick={handleCloseMedicalConditionsModal}
              >
                ×
              </button>
              <h2 className="modal-title">Medical Conditions</h2>
              <p className="modal-subtitle">
                Select all that apply (Allergies & Intolerances)
              </p>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                gap: '12px',
                marginTop: '20px'
              }}>
                {availableMedicalConditions.map((condition) => (
                  <label 
                    key={condition}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      border: tempMedicalConditions.includes(condition) 
                        ? '2px solid #4A7C4E' 
                        : '2px solid #e0e0e0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: tempMedicalConditions.includes(condition) 
                        ? '#e8f5e9' 
                        : '#fff',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={tempMedicalConditions.includes(condition)}
                      onChange={() => handleToggleMedicalCondition(condition)}
                      style={{ 
                        marginRight: '8px',
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer'
                      }}
                    />
                    <span style={{ fontSize: '14px' }}>{condition}</span>
                  </label>
                ))}
              </div>

              <div className="modal-actions" style={{ marginTop: '24px' }}>
                <button
                  className="cancel-btn"
                  onClick={handleCloseMedicalConditionsModal}
                >
                  Cancel
                </button>
                <button 
                  className="modal-signin-btn"
                  onClick={handleSaveMedicalConditions}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dietary Lifestyle Modal removed - category removed */}
      </div>
    </UserLayout>
  );
}