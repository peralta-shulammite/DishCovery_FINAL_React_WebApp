'use client';
import { useState, useEffect } from 'react';
import './styles.css';

// Define the API base URL - Fix: Use correct backend URL for Vercel deployment and localhost
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // For localhost testing, always use localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
  }
  // Use environment variable for production/Vercel deployment
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

export default function GetStarted() {
  const [step, setStep] = useState(1);
  const [cookingFor, setCookingFor] = useState('Myself');
  const [personName, setPersonName] = useState('');
  const [dietaryData, setDietaryData] = useState({
    excludedIngredients: [],
    preferredDiets: [],
    medicalConditions: [],
  });
  const [customInputs, setCustomInputs] = useState({
    preferredDiets: '',
    medicalConditions: '',
  });
  const [feedbackMessages, setFeedbackMessages] = useState({
    preferredDiets: '',
    medicalConditions: '',
  });
  const [isSaved, setIsSaved] = useState(false);
  const [memberId, setMemberId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [excludedSearchTerm, setExcludedSearchTerm] = useState('');
  
  // Load restrictions from database
  const [apiRestrictions, setApiRestrictions] = useState({
    dietaryRestrictions: [],
    preferredDiets: [],
    medicalConditions: []
  });
  
  // Load available ingredients from database
  const [availableIngredients, setAvailableIngredients] = useState([]);

  const getAuthToken = () => {
    return localStorage.getItem('token');
  };
  
  const [userProfile, setUserProfile] = useState(null);
  
  // ✅ Check for new user signup
  useEffect(() => {
    const isNewUser = sessionStorage.getItem('newUserSignup');
    if (isNewUser === 'true') {
      setShowWelcome(true);
      sessionStorage.removeItem('newUserSignup');
      
      // Auto-hide welcome message after 4 seconds
      setTimeout(() => {
        setShowWelcome(false);
      }, 4000);
    }
  }, []);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    // ✅ Authentication check - redirect to home if not logged in
    if (!token) {
      console.log('🔒 No token found, redirecting to home...');
      window.location.href = '/user/home';
      return;
    }
    
    // Don't check for completed onboarding if we're in the process of saving or just saved
    if (isSaved || loading || sessionStorage.getItem('profileJustSaved') === 'true' || sessionStorage.getItem('onboardingComplete') === 'true') {
      console.log('⏭️ Skipping onboarding check - save in progress or just completed');
      return;
    }
    
    if (token) {
      // Check if user has already completed onboarding
      fetch(`${API_BASE_URL}/user-profile/dietary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch dietary preferences');
        return res.json();
      })
      .then(dietaryData => {
        // If user has medical conditions or excluded ingredients, they've completed onboarding
        const hasCompleted = (dietaryData.data?.medicalConditions?.length > 0) || 
                            (dietaryData.data?.excludedIngredients?.length > 0);
        
        // Only redirect if they're not a new signup (check sessionStorage)
        const isNewSignup = sessionStorage.getItem('newUserSignup') === 'true';
        const onboardingComplete = sessionStorage.getItem('onboardingComplete') === 'true';
        
        // Don't redirect if:
        // - We're currently on step 3 (confirmation page)
        // - Onboarding was just completed (to prevent redirect loop)
        // - User is a new signup
        if (hasCompleted && !isNewSignup && !onboardingComplete && step !== 4) {
          console.log('✅ User has completed onboarding, redirecting to home...');
          window.location.replace('/user/home');
          return;
        }
        
        // Load user profile for display
        return fetch(`${API_BASE_URL}/users/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      })
      .then(res => {
        if (res && res.ok) {
          return res.json();
        }
        return null;
      })
      .then(data => {
        if (data) setUserProfile(data);
      })
        .catch(err => {
        // If error fetching dietary preferences, assume they haven't completed onboarding
        console.log('User has not completed onboarding yet');
        
        // Still try to load profile
        fetch(`${API_BASE_URL}/users/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch profile');
          return res.json();
        })
        .then(data => setUserProfile(data))
        .catch(err => console.error('Failed to load user profile:', err));
      });
    }
  }, [isSaved, loading, step]); // Add dependencies to prevent unnecessary re-runs

  // Load restrictions from database
  useEffect(() => {
    const loadRestrictions = async () => {
      try {
        console.log('📥 Loading restrictions from database...');
        console.log('API URL:', `${API_BASE_URL}/dietary-restrictions/public`);
        const response = await fetch(`${API_BASE_URL}/dietary-restrictions/public`);
        console.log('Response status:', response.status);
        if (response.ok) {
          const result = await response.json();
          console.log('API Response:', result);
          if (result.success && result.data) {
            console.log('Setting restrictions:', result.data);
            setApiRestrictions(result.data);
            console.log('✅ Loaded restrictions from database:', {
              dietaryRestrictions: result.data.dietaryRestrictions?.length || 0,
              preferredDiets: result.data.preferredDiets?.length || 0,
              medicalConditions: result.data.medicalConditions?.length || 0
            });
          } else {
            console.warn('⚠️ API response missing success or data:', result);
          }
        } else {
          console.error('❌ API request failed:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('❌ Error loading restrictions:', error);
        console.log('Using fallback restrictions');
      }
    };

    loadRestrictions();
  }, []);

  // Load available ingredients from database
  useEffect(() => {
    const loadIngredients = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;
        
        console.log('📥 Loading ingredients from database...');
        const response = await fetch(`${API_BASE_URL}/pantry/ingredients`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.ingredients) {
            // Extract ingredient names for selection
            const ingredientNames = result.ingredients.map(ing => ing.name);
            setAvailableIngredients(ingredientNames);
            console.log('✅ Loaded ingredients from database:', ingredientNames.length);
          }
        }
      } catch (error) {
        console.error('❌ Error loading ingredients:', error);
      }
    };
    
    loadIngredients();
  }, []);

  useEffect(() => {
    // Only set personName when switching to "Myself"
    // Don't reset it when switching to "Others" - preserve user input
    if (cookingFor === 'Myself' && userProfile) {
      setPersonName(userProfile.firstName);
    }
    // Don't reset personName when cookingFor is 'Others' - let user input stay
  }, [cookingFor, userProfile]);

  const handleNext = async () => {
    setError('');
    
    if (step === 1) {
      if (cookingFor !== 'Myself' && !personName) {
        setError('Please enter the name of the person.');
        return;
      }

      // Create member profile if cooking for others
      if (cookingFor === 'Others') {
        try {
          setLoading(true);
          setError(''); // Clear any previous errors
          
          const token = getAuthToken();
          if (!token) {
            setError('Please log in to continue.');
            setLoading(false);
            return;
          }

          console.log('📤 Creating member profile:', {
            name: personName,
            relationship: 'Family Member',
            apiUrl: `${API_BASE_URL}/profile/member`,
            hasToken: !!token
          });

          const response = await fetch(`${API_BASE_URL}/profile/member`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: personName,
              relationship: 'Family Member'
            })
          });

          // Log response details for debugging
          console.log('📥 Response received:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries())
          });

          // Read response body once (can only be read once)
          let responseText = '';
          let data = {};
          try {
            responseText = await response.text();
            console.log('📄 Response text:', responseText.substring(0, 200)); // Log first 200 chars
            if (responseText) {
              data = JSON.parse(responseText);
              console.log('✅ Parsed response data:', data);
            }
          } catch (parseError) {
            console.warn('⚠️ Could not parse response:', parseError);
            console.warn('⚠️ Response text was:', responseText);
            // If parsing fails, data remains empty object
          }

          // Check response status
          if (!response.ok) {
            // Handle error response
            const errorMessage = data?.message || data?.error || response.statusText || 'Failed to create member profile. Please try again.';
            console.error('❌ Failed to create member profile:', {
              status: response.status,
              statusText: response.statusText,
              message: errorMessage,
              data: data
            });
            setError(errorMessage);
            setLoading(false);
            return;
          }

          // Handle successful response (200-299 status codes)
          if (!responseText) {
            // ❌ Empty response - cannot proceed without memberId
            console.error('❌ Empty response body - cannot create member profile');
            setError('Failed to create member profile. Please try again.');
            setLoading(false);
            return;
          }

          // Handle successful response data
          if (data.success && data.memberId) {
            console.log('✅ Member profile created successfully:', data.memberId);
            setMemberId(data.memberId);
            setStep(2); // Move to next step
          } else if (data.memberId) {
            // Fallback for older API format
            console.log('✅ Member profile created (legacy format):', data.memberId);
            setMemberId(data.memberId);
            setStep(2); // Move to next step
          } else if (data.success) {
            // ❌ Response indicates success but no memberId - cannot proceed
            console.error('❌ Member profile response missing memberId');
            setError('Failed to create member profile. Please try again.');
          } else {
            // ❌ Unexpected response format
            console.error('❌ Unexpected response format:', data);
            setError('Failed to create member profile. Please try again.');
          }
        } catch (error) {
          console.error('❌ Unexpected error creating member profile:', error);
          // Show error and do NOT proceed without memberId
          if (error.name === 'TypeError' && error.message.includes('fetch')) {
            setError('Network error. Please check your connection and try again.');
          } else {
            setError('Failed to create member profile. Please try again.');
          }
        } finally {
          setLoading(false);
        }
      } else {
        // If cooking for "Myself", just proceed to next step
        setStep(2);
      }
      } else if (step === 2) {
            // Clear search term when moving from step 2 to 3
            setSearchTerm('');
            setStep(3);
          } else if (step === 3) {
            // Clear excluded search term when moving from step 3 to 4
            setExcludedSearchTerm('');
            setStep(4);
          }
        };

      const handlePrev = () => {
          // Clear search terms when going back
          if (step === 2) {
            setSearchTerm('');
          }
          if (step === 3) {
            setExcludedSearchTerm('');
          }
          setStep(step - 1);
          setIsSaved(false);
        };

  // Save dietary profile to API
  const handleSave = async () => {
    try {
      setLoading(true);
      console.log('💾 Saving dietary profile...');

      // ✅ Validate that at least one preference is selected
      if (dietaryData.medicalConditions.length === 0 && dietaryData.excludedIngredients.length === 0) {
        setError('Please select at least one medical condition or excluded ingredient to continue.');
        setLoading(false);
        return;
      }

      // ✅ FIX: Only send memberId if cooking for "Others", otherwise send null
      // This ensures dietary preferences are saved to the correct profile (user or member)
      const finalMemberId = cookingFor === 'Others' ? memberId : null;

      console.log('📊 Save data preparation:', {
        cookingFor,
        memberId,
        finalMemberId,
        hasMedicalConditions: dietaryData.medicalConditions.length > 0,
        hasExcludedIngredients: dietaryData.excludedIngredients.length > 0,
        medicalConditions: dietaryData.medicalConditions,
        excludedIngredients: dietaryData.excludedIngredients
      });
      
      // Prepare data for API
      // Excluded ingredients are already an array
      const saveData = {
        memberId: finalMemberId,
        dietaryRestrictions: [], // No longer used - replaced by medicalConditions
        medicalConditions: dietaryData.medicalConditions,
        preferredDiets: [], // Dietary Lifestyle Tags removed
        excludedIngredients: dietaryData.excludedIngredients // Already an array
      };

      // Call the API
      const response = await fetch(`${API_BASE_URL}/dietary-restrictions/user/save`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(saveData)
      });

      console.log('📡 Save response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Save failed:', errorData);
        throw new Error(errorData.message || 'Failed to save');
      }

      const result = await response.json();

      console.log('📥 Save response:', result);

      if (result.success) {
        console.log('✅ Profile saved successfully', result.data);
        setIsSaved(true);
        
        // Clear new user signup flag since onboarding is complete
        sessionStorage.removeItem('newUserSignup');
        
        // Set flags to prevent useEffect from redirecting back
        sessionStorage.setItem('profileJustSaved', 'true');
        sessionStorage.setItem('onboardingComplete', 'true');
        
        // Redirect immediately using replace to prevent back navigation
        // Use replace instead of href to prevent going back to get-started
        // Also prevents the useEffect from running again
        console.log('🔄 Redirecting to home page...');
        window.location.replace('/user/home');
      } else {
        throw new Error(result.message || 'Failed to save profile');
      }
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      setError(`Failed to save profile: ${error.message}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleDietaryChange = (category, value) => {
    setDietaryData((prev) => {
      const updated = { ...prev };
      if (updated[category].includes(value)) {
        updated[category] = updated[category].filter((item) => item !== value);
      } else {
        updated[category] = [...updated[category], value];
      }
      return updated;
    });
  };

  const handleCustomInput = (category, value) => {
    setCustomInputs(prev => ({
      ...prev,
      [category]: value
    }));
  };

  const handleSendCustom = async (category) => {
    const value = customInputs[category].trim();
    if (!value) return;

    // Only handle medical condition requests for now
    if (category !== 'medicalConditions') {
      setFeedbackMessages(prev => ({
        ...prev,
        [category]: 'Thanks! We\'ll review your suggestion.'
      }));
      setCustomInputs(prev => ({
        ...prev,
        [category]: ''
      }));
      setTimeout(() => {
        setFeedbackMessages(prev => ({
          ...prev,
          [category]: ''
        }));
      }, 3000);
      return;
    }

    // Send medical condition request to backend
    try {
      const token = getAuthToken();
      if (!token) {
        setFeedbackMessages(prev => ({
          ...prev,
          [category]: 'Please log in to submit a request.'
        }));
        return;
      }

      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/feedback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          feedbackMessage: value,
          feedbackType: 'medical_condition'
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setFeedbackMessages(prev => ({
          ...prev,
          [category]: 'Thanks! We\'ll review your medical condition request.'
        }));
        setCustomInputs(prev => ({
          ...prev,
          [category]: ''
        }));
        // Clear feedback after 5 seconds
        setTimeout(() => {
          setFeedbackMessages(prev => ({
            ...prev,
            [category]: ''
          }));
        }, 5000);
      } else {
        throw new Error(result.message || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Error submitting medical condition request:', error);
      setFeedbackMessages(prev => ({
        ...prev,
        [category]: 'Failed to submit. Please try again.'
      }));
      setTimeout(() => {
        setFeedbackMessages(prev => ({
          ...prev,
          [category]: ''
        }));
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  // Category options with API data and fallback
  const categoryOptions = {
    preferredDiets: apiRestrictions.preferredDiets.length > 0
      ? apiRestrictions.preferredDiets
      : ['Keto', 'Vegan', 'Low-Carb', 'Low-Sodium', 'Paleo', 'Mediterranean', 'Intermittent Fasting'],

    medicalConditions: apiRestrictions.medicalConditions.length > 0
      ? apiRestrictions.medicalConditions
      : ['Allergy To Nuts', 'Allergy To Shellfishes', 'Allergy To Eggs', 'Allergy To Soy', 'Allergy To Dairy', 'Allergy To Sesame Seeds', 'Allergy To Legumes', 'Gluten Intolerance', 'Lactose Intolerance']
  };

    // Filter medical conditions based on search
  const filteredMedicalConditions = apiRestrictions.medicalConditions.filter(condition =>
    condition.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter excluded ingredients based on search
  const filteredExcludedIngredients = availableIngredients.filter(ingredient =>
    ingredient.toLowerCase().includes(excludedSearchTerm.toLowerCase())
  );

  const handleSkipExcludedIngredients = () => {
    setStep(4); // Skip to summary step
  };
  
  const renderStep1 = () => (
    
    <div className="step-content">
      <h1 className="step-title">Who are you cooking for?</h1>
      <p className="step-subtitle">Create a profile for yourself or someone else.</p>
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      <div className="selection-group">
        <label className="radio-label">
          <input
            type="radio"
            value="Myself"
            checked={cookingFor === 'Myself'}
            onChange={(e) => setCookingFor(e.target.value)}
          />
          Myself ({userProfile?.firstName || 'Loading...'})
        </label>
        <label className="radio-label">
          <input
            type="radio"
            value="Others"
            checked={cookingFor === 'Others'}
            onChange={(e) => setCookingFor(e.target.value)}
          />
          Others (e.g., family members, friends, co-workers, etc.)
        </label>
      </div>
      {cookingFor === 'Others' && (
        <input
          type="text"
          className="name-input"
          placeholder="Name of the person"
          value={personName}
          onChange={(e) => setPersonName(e.target.value)}
        />
      )}
      <button 
        className="btn btn-primary" 
        onClick={handleNext}
        disabled={loading}
      >
        {loading ? 'Loading...' : 'Next Step'}
        <span className="btn-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 12h14m-7-7l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>
    </div>
  );

  const renderDietarySection = (title, category, subtitle, fallbackText) => (
    <div className="dietary-section">
      <h3 className="section-title">{title}</h3>
      <p className="section-subtitle">{subtitle}</p>
      <div className="checkbox-grid">
        {categoryOptions[category].map((option) => (
          <label key={option} className="checkbox-item">
            <input
              type="checkbox"
              checked={dietaryData[category].includes(option)}
              onChange={() => handleDietaryChange(category, option)}
            />
            <span className="checkmark"></span>
            {option}
          </label>
        ))}
      </div>
      
      <div className="fallback-section">
        <p className="fallback-text">{fallbackText}</p>
        <div className="custom-input-group">
          <input
            type="text"
            className="custom-input"
            placeholder="Type here..."
            value={customInputs[category]}
            onChange={(e) => handleCustomInput(category, e.target.value)}
          />
          <button 
            className="btn btn-send"
            onClick={() => handleSendCustom(category)}
            disabled={!customInputs[category].trim()}
          >
            Send
          </button>
        </div>
        {feedbackMessages[category] && (
          <p className="feedback-message">{feedbackMessages[category]}</p>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="step-content">
      <h1 className="step-title">Medical Conditions</h1>
      <p className="step-subtitle">Select all allergies and intolerances that apply to you</p>
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <div className="form-sections">
        {/* Medical Conditions */}
        <div className="dietary-section">
          <h3 className="section-title">Allergies & Intolerances</h3>
          <p className="section-subtitle">Select all that apply</p>
          
          {/* Search Input */}
          <div className="search-container">
              <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search medical conditions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          

          <div className="checkbox-grid">
            {filteredMedicalConditions.length > 0 ? (
              filteredMedicalConditions.map((option) => (
                <label key={option} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={dietaryData.medicalConditions.includes(option)}
                    onChange={() => handleDietaryChange('medicalConditions', option)}
                  />
                  <span className="checkmark"></span>
                  {option}
                </label>
              ))
            ) : (
              <p style={{ color: '#424242', fontSize: '0.875rem', padding: '20px', textAlign: 'center' }}>
                No medical conditions found matching "{searchTerm}"
              </p>
            )}
          </div>
          
          <div className="fallback-section">
            <p className="fallback-text">Can't find your condition? Send it to us</p>
            <div className="custom-input-group">
              <input
                type="text"
                className="custom-input"
                placeholder="Type here..."
                value={customInputs.medicalConditions}
                onChange={(e) => handleCustomInput('medicalConditions', e.target.value)}
              />
              <button 
                className="btn btn-send"
                onClick={() => handleSendCustom('medicalConditions')}
                disabled={!customInputs.medicalConditions.trim()}
              >
                Send
              </button>
            </div>
            {feedbackMessages.medicalConditions && (
              <p className="feedback-message">{feedbackMessages.medicalConditions}</p>
            )}
          </div>
        </div>
      </div>

      <div className="nav-buttons">
        <button className="btn btn-icon-only btn-secondary" onClick={handlePrev}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5m7 7-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button 
          className="btn btn-icon-only btn-primary" 
          onClick={handleNext}
          disabled={loading}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 12h14m-7-7l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );

      const renderStep3 = () => (
        <div className="step-content">
          <h1 className="step-title">Excluded Ingredients</h1>
          <p className="step-subtitle">Select ingredients you want to avoid in your recipes</p>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
    <div className="form-sections">
            <div className="dietary-section">
              <h3 className="section-title">Ingredients to Avoid</h3>
              <p className="section-subtitle">Choose any ingredients you prefer not to use</p>
              
              {/* Search Input */}
              <div className="search-container">
                  <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search ingredients to exclude..."
                  value={excludedSearchTerm}
                  onChange={(e) => setExcludedSearchTerm(e.target.value)}
                />
              </div>

              <div className="checkbox-grid">
                {availableIngredients.length > 0 ? (
                  filteredExcludedIngredients.length > 0 ? (
                    filteredExcludedIngredients.map((ingredient) => (
                      <label key={ingredient} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={dietaryData.excludedIngredients.includes(ingredient)}
                          onChange={() => handleDietaryChange('excludedIngredients', ingredient)}
                        />
                        <span className="checkmark"></span>
                        {ingredient}
                      </label>
                    ))
                  ) : (
                    <p style={{ color: '#424242', fontSize: '0.875rem', padding: '20px', textAlign: 'center' }}>
                      No ingredients found matching "{excludedSearchTerm}"
                    </p>
                  )
                ) : (
                  <p style={{ color: '#666', fontSize: '14px' }}>Loading ingredients...</p>
                )}
              </div>
            </div>
          </div>

      <div className="nav-buttons">
        <button className="btn btn-icon-only btn-secondary" onClick={handlePrev}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5m7 7-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button 
          className="btn btn-outline" 
          onClick={handleSkipExcludedIngredients}
        >
          Skip
        </button>
        <button 
          className="btn btn-icon-only btn-primary" 
          onClick={handleNext}
          disabled={loading}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 12h14m-7-7l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="step-content">
      {isSaved ? (
        <div className="success-message">
          <div className="success-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="22,4 12,14.01 9,11.01" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          </div>
          <h1 className="welcome-title">Welcome, {personName}!</h1>
          <p className="welcome-text">
            {cookingFor === 'Myself'
              ? 'Your profile is now set up. Explore personalized recipes tailored to your needs.'
              : 'Your profile for someone else is set up. Start discovering suitable recipes.'}
          </p>
          <button className="btn btn-primary">Continue</button>
        </div>
      ) : (
        <>
          <h1 className="step-title">Confirm Your Profile</h1>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          <div className="summary-section">
            <div className="summary-item">
              <strong>Name:</strong> {userProfile ? `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() : personName || 'Loading...'}
            </div>
            <div className="summary-item">
              <strong>Cooking for:</strong> {cookingFor === 'Others' ? (personName || 'Not specified') : 'Myself'}
            </div>
            <div className="summary-item">
              <strong>Medical Conditions (Allergies & Intolerances):</strong> {dietaryData.medicalConditions.join(', ') || 'None'}
            </div>
            <div className="summary-item">
              <strong>Excluded Ingredients:</strong> {dietaryData.excludedIngredients.length > 0 ? dietaryData.excludedIngredients.join(', ') : 'None'}
            </div>
          </div>
          <div className="nav-buttons">
            <button className="btn btn-icon-only btn-secondary" onClick={handlePrev}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 12H5m7 7-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button className="btn btn-outline" onClick={() => setStep(3)}>
              Edit
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </>
      )}
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return null;
    }
  };

  return (
    <>
      {/* ✅ Welcome banner for new users */}
      {showWelcome && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: '#059669',
          color: 'white',
          padding: '16px 24px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: 'slideIn 0.3s ease-out'
        }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="22,4 12,14.01 9,11.01" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Welcome to DishCovery!</div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>Let's set up your profile to get personalized recipes</div>
          </div>
        </div>
      )}
      
      <div className="get-started-container">
        <div className="decorative-circle circle1"></div>
        <div className="decorative-circle circle2"></div>
        <div className="decorative-circle circle3"></div>
        <div className="get-started-card">
          <h2 className="get-started-title">Get Started</h2>
          <p className="get-started-subtitle">Create your DishCovery profile!</p>
          <div className="progress-bar">
            <div className={`step-circle ${step >= 1 ? 'active' : ''}`}>1</div>
            <div className={`step-circle ${step >= 2 ? 'active' : ''}`}>2</div>
            <div className={`step-circle ${step >= 3 ? 'active' : ''}`}>3</div>
            <div className={`step-circle ${step >= 4 ? 'active' : ''}`}>4</div>
          </div>
          {renderStep()}
        </div>
      </div>
    </>
  );
}