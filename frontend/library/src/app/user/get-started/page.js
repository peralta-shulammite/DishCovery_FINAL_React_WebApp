'use client';
import { useState, useEffect } from 'react';
import './styles.css';

export default function GetStarted() {
  const [step, setStep] = useState(1);
  const [cookingFor, setCookingFor] = useState('Myself');
  const [personName, setPersonName] = useState('');
  const [dietaryData, setDietaryData] = useState({
    dietaryRestrictions: [],
    excludedIngredients: '',
    preferredDiets: [],
    medicalConditions: [],
  });
  const [customInputs, setCustomInputs] = useState({
    dietaryRestrictions: '',
    preferredDiets: '',
    medicalConditions: '',
  });
  const [feedbackMessages, setFeedbackMessages] = useState({
    dietaryRestrictions: '',
    preferredDiets: '',
    medicalConditions: '',
  });
  const [isSaved, setIsSaved] = useState(false);
  const [memberId, setMemberId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // ADD THIS STATE - Load restrictions from database
  const [apiRestrictions, setApiRestrictions] = useState({
    dietaryRestrictions: [],
    preferredDiets: [],
    medicalConditions: []
  });

  const getAuthToken = () => {
    return localStorage.getItem('token');
  };
  
  const [userProfile, setUserProfile] = useState(null);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('http://localhost:5000/api/users/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => setUserProfile(data))
      .catch(err => console.error('Failed to load user profile:', err));
    }
  }, []);

  // ADD THIS useEffect - Load restrictions from database
  useEffect(() => {
    const loadRestrictions = async () => {
      try {
        console.log('📥 Loading restrictions from database...');
        const response = await fetch('http://localhost:5000/api/dietary-restrictions/public');
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setApiRestrictions(result.data);
            console.log('✅ Loaded restrictions from database');
          }
        }
      } catch (error) {
        console.log('Using fallback restrictions');
      }
    };
    
    loadRestrictions();
  }, []);

  useEffect(() => {
    if (cookingFor === 'Myself' && userProfile) {
      setPersonName(userProfile.firstName);
    } else {
      setPersonName('');
    }
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
          const response = await fetch('http://localhost:5000/api/profile/member', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${getAuthToken()}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: personName,
              relationship: 'Family Member'
            })
          });

          if (!response.ok) {
            throw new Error('Failed to create member profile');
          }

          const data = await response.json();
          setMemberId(data.memberId);
        } catch (error) {
          setError('Failed to create profile. Please try again.');
          setLoading(false);
          return;
        } finally {
          setLoading(false);
        }
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handlePrev = () => {
    setStep(step - 1);
    setIsSaved(false);
  };

  // UPDATED handleSave - Now connects to API
  const handleSave = async () => {
    try {
      setLoading(true);
      console.log('💾 Saving dietary profile...');
      
      // Prepare data for API
      const saveData = {
        memberId: memberId,
        dietaryRestrictions: dietaryData.dietaryRestrictions,
        medicalConditions: dietaryData.medicalConditions,
        preferredDiets: dietaryData.preferredDiets,
        excludedIngredients: dietaryData.excludedIngredients.split(',').map(item => item.trim()).filter(item => item)
      };

      // Call the new API
      const response = await fetch('http://localhost:5000/api/dietary-restrictions/user/save', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(saveData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save');
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Profile saved successfully');
        setIsSaved(true);
        setTimeout(() => {
          window.location.href = '/user/ph';
        }, 2000);
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

  const handleSendCustom = (category) => {
    const value = customInputs[category].trim();
    if (value) {
      setFeedbackMessages(prev => ({
        ...prev,
        [category]: 'Thanks! We\'ll review your suggestion.'
      }));
      setCustomInputs(prev => ({
        ...prev,
        [category]: ''
      }));
      // Clear feedback after 3 seconds
      setTimeout(() => {
        setFeedbackMessages(prev => ({
          ...prev,
          [category]: ''
        }));
      }, 3000);
    }
  };

  // UPDATED categoryOptions - Now uses API data with fallback
  const categoryOptions = {
    dietaryRestrictions: apiRestrictions.dietaryRestrictions.length > 0 
      ? apiRestrictions.dietaryRestrictions 
      : ['Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Shellfish-Free'],
    
    preferredDiets: apiRestrictions.preferredDiets.length > 0 
      ? apiRestrictions.preferredDiets 
      : ['Keto', 'Vegan', 'Low-Carb', 'Low-Sodium', 'Paleo', 'Mediterranean', 'Intermittent Fasting'],
    
    medicalConditions: apiRestrictions.medicalConditions.length > 0 
      ? apiRestrictions.medicalConditions 
      : ['Hypertension', 'Diabetes', 'High Cholesterol', 'Heart Disease', 'PCOS', 'Acid Reflux']
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
        {/* Dietary Restrictions */}
        {renderDietarySection(
          'Dietary Restrictions',
          'dietaryRestrictions',
          'Select all dietary restrictions that apply',
          'Can\'t find your restriction? Send it to us'
        )}

        {/* Excluded Ingredients */}
        <div className="dietary-section">
          <h3 className="section-title">Excluded Ingredients</h3>
          <p className="section-subtitle">List ingredients you want to avoid</p>
          <input
            type="text"
            className="full-width-input"
            placeholder="Example: honey, peanuts, pork, dairy"
            value={dietaryData.excludedIngredients}
            onChange={(e) => setDietaryData(prev => ({
              ...prev,
              excludedIngredients: e.target.value
            }))}
          />
        </div>

        {/* Preferred Diets */}
        {renderDietarySection(
          'Preferred Diets',
          'preferredDiets',
          'Select your preferred dietary approaches',
          'Don\'t see your diet? Let us know'
        )}

        {/* Medical Conditions */}
        {renderDietarySection(
          'Medical Conditions',
          'medicalConditions',
          'Select any relevant medical conditions',
          'Still missing something? Tell us here'
        )}
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
              <strong>Name:</strong> {personName}
            </div>
            <div className="summary-item">
              <strong>Dietary Restrictions:</strong> {dietaryData.dietaryRestrictions.join(', ') || 'None'}
            </div>
            <div className="summary-item">
              <strong>Excluded Ingredients:</strong> {dietaryData.excludedIngredients || 'None'}
            </div>
            <div className="summary-item">
              <strong>Preferred Diets:</strong> {dietaryData.preferredDiets.join(', ') || 'None'}
            </div>
            <div className="summary-item">
              <strong>Medical Conditions:</strong> {dietaryData.medicalConditions.join(', ') || 'None'}
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
  );
}