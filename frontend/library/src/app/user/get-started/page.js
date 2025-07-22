'use client';
import { useState, useEffect } from 'react';
import './styles.css';

export default function GetStarted() {
  const [step, setStep] = useState(1);
  const [cookingFor, setCookingFor] = useState('Myself');
  const [personName, setPersonName] = useState('');
  const [dietaryData, setDietaryData] = useState({
    allergies: [],
    healthConditions: [],
    dietPreferences: [],
    excludedIngredients: [],
  });
  const [isSaved, setIsSaved] = useState(false);
  const [memberId, setMemberId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  useEffect(() => {
    if (cookingFor === 'Myself' && userProfile) {
      setPersonName(userProfile.firstName);
    } else {
      setPersonName('');
    }
  }, [cookingFor, userProfile]);

  // REPLACE THIS ENTIRE FUNCTION:
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
    setIsSaved(false); // Reset saved state when going back
  };

  // REPLACE THIS ENTIRE FUNCTION:
const handleSave = async () => {
  try {
    setLoading(true);
    
    // Save restrictions
    const restrictionsResponse = await fetch('http://localhost:5000/api/profile/restrictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        memberId: memberId,
        allergies: dietaryData.allergies,
        healthConditions: dietaryData.healthConditions,
        dietPreferences: dietaryData.dietPreferences
      })
    });

    if (!restrictionsResponse.ok) {
      throw new Error('Failed to save restrictions');
    }

    // Save excluded ingredients
    const ingredientsResponse = await fetch('http://localhost:5000/api/profile/excluded-ingredients', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        memberId: memberId,
        ingredients: dietaryData.excludedIngredients
      })
    });

    if (!ingredientsResponse.ok) {
      throw new Error('Failed to save excluded ingredients');
    }

    setIsSaved(true);
// Redirect to main page after 2 seconds
setTimeout(() => {
  window.location.href = '/user/ph';
}, 2000);
  } catch (error) {
    setError('Failed to save profile. Please try again.');
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

  const handleExcludeIngredient = (ingredient) => {
    if (!dietaryData.excludedIngredients.includes(ingredient)) {
      setDietaryData((prev) => ({
        ...prev,
        excludedIngredients: [...prev.excludedIngredients, ingredient],
      }));
    }
  };

  const handleRemoveIngredient = (ingredient) => {
    setDietaryData((prev) => ({
      ...prev,
      excludedIngredients: prev.excludedIngredients.filter((item) => item !== ingredient),
    }));
  };

  const categoryOptions = {
    allergies: [
      { name: 'Nuts', img: 'https://via.placeholder.com/30?text=N' },
      { name: 'Seafood', img: 'https://via.placeholder.com/30?text=Sf' },
      { name: 'Eggs', img: 'https://via.placeholder.com/30?text=E' },
      { name: 'Dairy', img: 'https://via.placeholder.com/30?text=D' },
      { name: 'Soy', img: 'https://via.placeholder.com/30?text=So' },
      { name: 'Gluten', img: 'https://via.placeholder.com/30?text=G' },
    ],
    healthConditions: [
      { name: 'Diabetes', img: 'https://via.placeholder.com/30?text=Di' },
      { name: 'Hypertension', img: 'https://via.placeholder.com/30?text=H' },
      { name: 'High Cholesterol', img: 'https://via.placeholder.com/30?text=HC' },
      { name: 'Lactose Intolerance', img: 'https://via.placeholder.com/30?text=LI' },
      { name: 'Gluten Intolerance', img: 'https://via.placeholder.com/30?text=GI' },
    ],
    dietPreferences: [
      { name: 'Vegetarian', img: 'https://via.placeholder.com/30?text=V' },
      { name: 'Vegan', img: 'https://via.placeholder.com/30?text=Ve' },
      { name: 'Keto', img: 'https://via.placeholder.com/30?text=K' },
      { name: 'Low-Carb', img: 'https://via.placeholder.com/30?text=LC' },
      { name: 'Low-Sodium', img: 'https://via.placeholder.com/30?text=LS' },
    ],
    excludedIngredients: [
      { name: 'Bacon', img: 'https://via.placeholder.com/30?text=B' },
      { name: 'Bell Pepper', img: 'https://via.placeholder.com/30?text=BP' },
      { name: 'Bread', img: 'https://via.placeholder.com/30?text=Br' },
      { name: 'Brown Sugar', img: 'https://via.placeholder.com/30?text=BS' },
      { name: 'Butter Salted', img: 'https://via.placeholder.com/30?text=Bu' },
      { name: 'Carrot', img: 'https://via.placeholder.com/30?text=C' },
      { name: 'Chicken Breast', img: 'https://via.placeholder.com/30?text=CB' },
      { name: 'Chocolate Mini Eggs', img: 'https://via.placeholder.com/30?text=CM' },
      { name: 'Ground Beef', img: 'https://via.placeholder.com/30?text=GB' },
      { name: 'Spaghetti', img: 'https://via.placeholder.com/30?text=S' },
      { name: 'Spinach', img: 'https://via.placeholder.com/30?text=Sp' },
      { name: 'Steak', img: 'https://via.placeholder.com/30?text=St' },
      { name: 'White Rice', img: 'https://via.placeholder.com/30?text=WR' },
      { name: 'White Sugar', img: 'https://via.placeholder.com/30?text=WS' },
    ],
  };

  const renderStep1 = () => (
    <div className="step-content">
      <h1 className="step-title">Who are you cooking for?</h1>
      <p className="step-subtitle">Create a profile for yourself or someone else.</p>
      {error && (
    <div style={{
    background: '#ffebee',
    color: '#c62828',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px'
      }}>
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
      className="nav-btn next-btn" 
       onClick={handleNext}
      disabled={loading}
>
    {loading ? 'Loading...' : 'Next Step'}
    <span className="arrow-icon">→</span>
      </button>
    </div>
  );

  const renderStep2 = () => (
    <div className="step-content">
      <h1 className="step-title">{cookingFor === 'Myself' ? 'What are your dietary needs?' : `What are ${personName || 'their'} dietary needs?`}</h1>
        {error && (
  <div style={{
    background: '#ffebee',
    color: '#c62828',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px'
          }}>
    {error}
  </div>
)}
          <div className="dietary-section">
        <div className="dietary-category ingredient-grid">
          <h3>Allergies</h3>
          <div className="ingredient-options">
            {categoryOptions.allergies.map((item) => (
              <button
                key={item.name}
                className={`ingredient-btn ${dietaryData.allergies.includes(item.name) ? 'selected' : ''}`}
                onClick={() => handleDietaryChange('allergies', item.name)}
              >
                <img src={item.img} alt={item.name} className="ingredient-img" />
                {item.name}
              </button>
            ))}
          </div>
        </div>
        <div className="dietary-category ingredient-grid">
          <h3>Health Conditions</h3>
          <div className="ingredient-options">
            {categoryOptions.healthConditions.map((item) => (
              <button
                key={item.name}
                className={`ingredient-btn ${dietaryData.healthConditions.includes(item.name) ? 'selected' : ''}`}
                onClick={() => handleDietaryChange('healthConditions', item.name)}
              >
                <img src={item.img} alt={item.name} className="ingredient-img" />
                {item.name}
              </button>
            ))}
          </div>
        </div>
        <div className="dietary-category ingredient-grid">
          <h3>Dietary Lifestyle</h3>
          <div className="ingredient-options">
            {categoryOptions.dietPreferences.map((item) => (
              <button
                key={item.name}
                className={`ingredient-btn ${dietaryData.dietPreferences.includes(item.name) ? 'selected' : ''}`}
                onClick={() => handleDietaryChange('dietPreferences', item.name)}
              >
                <img src={item.img} alt={item.name} className="ingredient-img" />
                {item.name}
              </button>
            ))}
          </div>
        </div>
        <div className="dietary-category ingredient-grid">
          <h3>Ingredients to Exclude</h3>
          <div className="ingredient-options">
            {categoryOptions.excludedIngredients.map((item) => (
              <button
                key={item.name}
                className={`ingredient-btn ${dietaryData.excludedIngredients.includes(item.name) ? 'selected' : ''}`}
                onClick={() => handleExcludeIngredient(item.name)}
              >
                <img src={item.img} alt={item.name} className="ingredient-img" />
                {item.name}
              </button>
            ))}
          </div>
          <div className="excluded-list">
            {dietaryData.excludedIngredients.map((ingredient) => (
              <span key={ingredient} className="exclude-tag">
                {ingredient}
                <button className="remove-btn" onClick={() => handleRemoveIngredient(ingredient)}>×</button>
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="nav-buttons">
        <button className="nav-btn prev-btn" onClick={handlePrev}>
          <span className="arrow-icon">←</span>
          Previous
        </button>
        <button 
  className="nav-btn next-btn" 
  onClick={handleNext}
  disabled={loading}
>
  {loading ? 'Loading...' : 'Next Step'}
  <span className="arrow-icon">→</span>
</button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="step-content">
      {isSaved ? (
        <div className="success-message">
          <h1 className="welcome-title">Welcome, {personName}!</h1>
          <p className="welcome-text">
            {cookingFor === 'Myself'
              ? 'Your profile is now set up. Explore personalized recipes tailored to your needs.'
              : 'Your profile for someone else is set up. Start discovering suitable recipes.'}
          </p>
          <button className="nav-btn continue-btn" onClick={() => setStep(1)}>Continue</button>
        </div>
      ) : (
        <>
  <h1 className="step-title">Confirm Your Profile</h1>
  {error && (
    <div style={{
      background: '#ffebee',
      color: '#c62828',
      padding: '12px',
      borderRadius: '8px',
      marginBottom: '16px',
      fontSize: '14px'
    }}>
      {error}
    </div>
  )}
  <div className="summary-section">
            <p><strong>Name:</strong> {personName}</p>
            <p><strong>Allergies:</strong> {dietaryData.allergies.join(', ') || 'None'}</p>
            <p><strong>Health Conditions:</strong> {dietaryData.healthConditions.join(', ') || 'None'}</p>
            <p><strong>Dietary Lifestyle:</strong> {dietaryData.dietPreferences.join(', ') || 'None'}</p>
            <p><strong>Excluded Ingredients:</strong> {dietaryData.excludedIngredients.join(', ') || 'None'}</p>
          </div>
          <div className="nav-buttons">
            <button className="nav-btn prev-btn" onClick={handlePrev}>
              <span className="arrow-icon">←</span>
              Back
            </button>
            <button className="nav-btn edit-btn" onClick={() => setStep(2)}>
              Edit
              <span className="arrow-icon">→</span>
            </button>
            <button 
  className="nav-btn save-btn" 
  onClick={handleSave}
  disabled={loading}
>
  {loading ? 'Saving...' : 'Save Profile'}
  <span className="arrow-icon">→</span>
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