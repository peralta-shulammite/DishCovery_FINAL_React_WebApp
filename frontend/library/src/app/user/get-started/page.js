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
        if (hasCompleted && !isNewSignup && !onboardingComplete && step !== 3) {
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
            // If response is empty but status is ok, assume success
            console.warn('⚠️ Empty response body, but status is OK. Assuming success.');
            setStep(2);
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
            // Response says success but no memberId - might be OK if member already exists
            console.log('✅ Member profile operation completed (no memberId returned)');
            setStep(2); // Move to next step
          } else {
            // If we get here, response was OK but format is unexpected
            console.warn('⚠️ Unexpected response format, but status was OK:', data);
            // Still proceed since the database operation likely succeeded
            setStep(2);
          }
        } catch (error) {
          console.error('❌ Unexpected error creating member profile:', error);
          // Only show error if it's a network error or similar
          if (error.name === 'TypeError' && error.message.includes('fetch')) {
            setError('Network error. Please check your connection and try again.');
          } else {
            // For other errors, log but don't block - member might have been created
            console.warn('⚠️ Error occurred but proceeding - member may have been created:', error.message);
            setStep(2); // Proceed to next step
          }
        } finally {
          setLoading(false);
        }
      } else {
        // If cooking for "Myself", just proceed to next step
        setStep(2);
      }
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handlePrev = () => {
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
      <h1 className="step-title">
        {cookingFor === 'Myself' ? 'What are your dietary needs?' : `What are ${personName || 'their'} dietary needs?`}
      </h1>
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <div className="form-sections">
        {/* Medical Conditions */}
        {renderDietarySection(
          'Medical Conditions (Allergies & Intolerances)',
          'medicalConditions',
          'Select all allergies and intolerances that apply',
          'Can\'t find your condition? Send it to us'
        )}

        {/* Excluded Ingredients */}
        <div className="dietary-section">
          <h3 className="section-title">Excluded Ingredients</h3>
          <p className="section-subtitle">Select ingredients you want to avoid</p>
          <div className="checkbox-grid">
            {availableIngredients.length > 0 ? (
              availableIngredients.map((ingredient) => (
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
              <p style={{ color: '#666', fontSize: '14px' }}>Loading ingredients...</p>
            )}
          </div>
        </div>
      </div>

      <div className="nav-buttons">
        <button className="btn btn-secondary" onClick={handlePrev}>
          <span className="btn-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5m7 7-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          Previous
        </button>
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
    </div>
  );

  const renderStep3 = () => (
    <div className="step-content">
      {isSaved ? (
        <div className="success-message">
          <div className="success-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="#059669"/>
              <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
            <button className="btn btn-secondary" onClick={handlePrev}>
              <span className="btn-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 12H5m7 7-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              Back
            </button>
            <button className="btn btn-outline" onClick={() => setStep(2)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Edit
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Profile'}
              <span className="btn-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="7,3 7,8 15,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
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
            <circle cx="12" cy="12" r="10" fill="white"/>
            <path d="M9 12l2 2 4-4" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Welcome to DishCovery! 🎉</div>
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
          </div>
          {renderStep()}
        </div>
      </div>
    </>
  );
}