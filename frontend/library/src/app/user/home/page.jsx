'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import './styles.css';

export default function DishCoveryLanding() {
  const topRef = useRef(null);
  const [animatedTextIndex, setAnimatedTextIndex] = useState(0);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showOneMoreStepModal, setShowOneMoreStepModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isOneMoreStepChecked, setIsOneMoreStepChecked] = useState(false);

  const animatedWords = ['discover', 'explore', 'uncover'];

  const scrollToTop = useCallback(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const [hoverStates, setHoverStates] = useState({
    logo: false,
    signIn: false,
    scan: false,
    howToUse: false,
    plate: false
  });

  const handleHover = (element, isHover) => {
    setHoverStates(prev => ({ ...prev, [element]: isHover }));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedTextIndex((prev) => (prev + 1) % animatedWords.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSignInClick = () => {
    setShowSignInModal(true);
  };

  const handleSignUpClick = () => {
    setShowSignInModal(false);
    setShowSignUpModal(true);
  };

  const handleSocialLogin = () => {
    setShowSignInModal(false);
    setShowSignUpModal(false);
    setShowOneMoreStepModal(true);
  };

  const closeModal = () => {
    setShowSignInModal(false);
    setShowSignUpModal(false);
    setShowOneMoreStepModal(false);
    setShowVideoModal(false);
  };

  const handleRecipeClick = () => {
    if (!isLoggedIn) {
      setShowSignInModal(true);
    } else {
      console.log("Navigate to recipe detail page");
    }
  };

  const handleVideoClick = () => {
    setShowVideoModal(true);
  };

  const handleScanClick = () => {
    setShowSignInModal(true);
  };

  const handleStartJourneyClick = () => {
    setShowSignInModal(true);
  };

  const topRecipes = [
    { name: "Mediterranean Salad", time: "20 min", difficulty: "Easy", img: "https://s.yimg.com/ny/api/res/1.2/wwBOwqvEwbEhZQnLAO3lXg--/YXBwaWQ9aGlnaGxhbmRlcjt3PTk2MDtoPTk2MA--/https://media.zenfs.com/en/eating_well_articles_946/d059d7758b1b90f3c8ce6b1ad99fdf31" },
    { name: "Classic Burger", time: "35 min", difficulty: "Easy", img: "https://s.yimg.com/ny/api/res/1.2/wwBOwqvEwbEhZQnLAO3lXg--/YXBwaWQ9aGlnaGxhbmRlcjt3PTk2MDtoPTk2MA--/https://media.zenfs.com/en/eating_well_articles_946/d059d7758b1b90f3c8ce6b1ad99fdf31" },
    { name: "Japanese Ramen", time: "50 min", difficulty: "Medium", img: "https://s.yimg.com/ny/api/res/1.2/wwBOwqvEwbEhZQnLAO3lXg--/YXBwaWQ9aGlnaGxhbmRlcjt3PTk2MDtoPTk2MA--/https://media.zenfs.com/en/eating_well_articles_946/d059d7758b1b90f3c8ce6b1ad99fdf31" },
    { name: "Pasta Primavera", time: "20 min", difficulty: "Easy", img: "https://s.yimg.com/ny/api/res/1.2/wwBOwqvEwbEhZQnLAO3lXg--/YXBwaWQ9aGlnaGxhbmRlcjt3PTk2MDtoPTk2MA--/https://media.zenfs.com/en/eating_well_articles_946/d059d7758b1b90f3c8ce6b1ad99fdf31" },
    { name: "Mediterranean Salad", time: "20 min", difficulty: "Easy", img: "https://s.yimg.com/ny/api/res/1.2/wwBOwqvEwbEhZQnLAO3lXg--/YXBwaWQ9aGlnaGxhbmRlcjt3PTk2MDtoPTk2MA--/https://media.zenfs.com/en/eating_well_articles_946/d059d7758b1b90f3c8ce6b1ad99fdf31" },
    { name: "Classic Burger", time: "35 min", difficulty: "Easy", img: "https://s.yimg.com/ny/api/res/1.2/wwBOwqvEwbEhZQnLAO3lXg--/YXBwaWQ9aGlnaGxhbmRlcjt3PTk2MDtoPTk2MA--/https://media.zenfs.com/en/eating_well_articles_946/d059d7758b1b90f3c8ce6b1ad99fdf31" },
  ];

  const bottomRecipes = [
    { name: "American BBQ Ribs", time: "90 min", difficulty: "Medium", img: "https://s.yimg.com/ny/api/res/1.2/wwBOwqvEwbEhZQnLAO3lXg--/YXBwaWQ9aGlnaGxhbmRlcjt3PTk2MDtoPTk2MA--/https://media.zenfs.com/en/eating_well_articles_946/d059d7758b1b90f3c8ce6b1ad99fdf31" },
    { name: "Greek Moussaka", time: "60 min", difficulty: "Hard", img: "https://s.yimg.com/ny/api/res/1.2/wwBOwqvEwbEhZQnLAO3lXg--/YXBwaWQ9aGlnaGxhbmRlcjt3PTk2MDtoPTk2MA--/https://media.zenfs.com/en/eating_well_articles_946/d059d7758b1b90f3c8ce6b1ad99fdf31" },
    { name: "Spicy Thai Curry", time: "45 min", difficulty: "Medium", img: "https://s.yimg.com/ny/api/res/1.2/wwBOwqvEwbEhZQnLAO3lXg--/YXBwaWQ9aGlnaGxhbmRlcjt3PTk2MDtoPTk2MA--/https://media.zenfs.com/en/eating_well_articles_946/d059d7758b1b90f3c8ce6b1ad99fdf31" },
    { name: "Mexican Tacos", time: "25 min", difficulty: "Easy", img: "https://s.yimg.com/ny/api/res/1.2/wwBOwqvEwbEhZQnLAO3lXg--/YXBwaWQ9aGlnaGxhbmRlcjt3PTk2MDtoPTk2MA--/https://media.zenfs.com/en/eating_well_articles_946/d059d7758b1b90f3c8ce6b1ad99fdf31" },
    { name: "American BBQ Ribs", time: "90 min", difficulty: "Medium", img: "https://s.yimg.com/ny/api/res/1.2/wwBOwqvEwbEhZQnLAO3lXg--/YXBwaWQ9aGlnaGxhbmRlcjt3PTk2MDtoPTk2MA--/https://media.zenfs.com/en/eating_well_articles_946/d059d7758b1b90f3c8ce6b1ad99fdf31" },
    { name: "Greek Moussaka", time: "60 min", difficulty: "Hard", img: "https://s.yimg.com/ny/api/res/1.2/wwBOwqvEwbEhZQnLAO3lXg--/YXBwaWQ9aGlnaGxhbmRlcjt3PTk2MDtoPTk2MA--/https://media.zenfs.com/en/eating_well_articles_946/d059d7758b1b90f3c8ce6b1ad99fdf31" },
  ];

  return (
    <div ref={topRef} className="container">
      <div className="decorative-circle circle1"></div>
      <div className="decorative-circle circle2"></div>
      <div className="decorative-circle circle3"></div>
      
      <header className="header">
        <button 
          className={`logo ${hoverStates.logo ? 'logo-hover' : ''}`}
          onClick={scrollToTop}
          onMouseEnter={() => handleHover('logo', true)}
          onMouseLeave={() => handleHover('logo', false)}
        >
          <span className="logo-text">DishCovery</span>
        </button>
        <button 
          className={`sign-in-btn ${hoverStates.signIn ? 'sign-in-btn-hover' : ''}`}
          onClick={handleSignInClick}
          onMouseEnter={() => handleHover('signIn', true)}
          onMouseLeave={() => handleHover('signIn', false)}
        >
          Sign In
        </button>
      </header>

      <main className="main-content">
        <div className="left-section">
          <div className="trust-badge">
            <svg className="trust-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9,21.35L10.91,20.54C15.23,21.59 19,18.96 19,14.5V9C19,8.65 18.76,8.35 18.44,8.27L12,6.3L5.56,8.27C5.24,8.35 5,8.65 5,9V14.5C5,18.96 8.77,21.59 13.09,20.54L15,21.35V19H9V21.35M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17Z"/>
            </svg>
            <span className="badge-text">
              <span className="animated-word">{animatedWords[animatedTextIndex]}</span>
              <span className="static-text"> medically verified recipes</span>
            </span>
          </div>
          
          <h1 className="title">
            Eat smarter.<br />
            Live healthier.
          </h1>
          
          <p className="subtitle">
            Generate personalized recipes from your ingredients, tailored to your lifestyle and health with expert guidance.
          </p>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
                </svg>
              </div>
              <div className="feature-title">Doctor Approved</div>
              <div className="feature-desc">Every recipe reviewed by medical professionals</div>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17Z"/>
                </svg>
              </div>
              <div className="feature-title">Smart Scanning</div>
              <div className="feature-desc">AI-powered ingredient detection from your pantry</div>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M17.5,12A1.5,1.5 0 0,1 16,10.5A1.5,1.5 0 0,1 17.5,9A1.5,1.5 0 0,1 19,10.5A1.5,1.5 0 0,1 17.5,12M14.5,8A1.5,1.5 0 0,1 13,6.5A1.5,1.5 0 0,1 14.5,5A1.5,1.5 0 0,1 16,6.5A1.5,1.5 0 0,1 14.5,8M9.5,8A1.5,1.5 0 0,1 8,6.5A1.5,1.5 0 0,1 9.5,5A1.5,1.5 0 0,1 11,6.5A1.5,1.5 0 0,1 9.5,8M6.5,12A1.5,1.5 0 0,1 5,10.5A1.5,1.5 0 0,1 6.5,9A1.5,1.5 0 0,1 8,10.5A1.5,1.5 0 0,1 6.5,12M12,3A9,9 0 0,0 3,12A9,9 0 0,0 12,21A9,9 0 0,0 21,12A9,9 0 0,0 12,3M12,19A7,7 0 0,1 5,12A7,7 0 0,1 12,5A7,7 0 0,1 19,12A7,7 0 0,1 12,19Z"/>
                </svg>
              </div>
              <div className="feature-title">All Dietary Needs</div>
              <div className="feature-desc">Diabetes, allergies, heart disease, and more</div>
            </div>
          </div>
          
          <div className="button-group">
            <button 
              className={`scan-btn ${hoverStates.scan ? 'scan-btn-hover' : ''}`}
              onClick={handleScanClick}
              onMouseEnter={() => handleHover('scan', true)}
              onMouseLeave={() => handleHover('scan', false)}
            >
              <svg className="scan-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
              <span className="btn-text">Scan Ingredients</span>
            </button>
            <a 
              href="#how-to-use" 
              className={`how-to-use ${hoverStates.howToUse ? 'how-to-use-hover' : ''}`}
              onMouseEnter={() => handleHover('howToUse', true)}
              onMouseLeave={() => handleHover('howToUse', false)}
            >
              How It Works
              <svg className="arrow" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.59 16.59L13.17 12L8.59 7.41L10 6l6 6-6 6-1.41-1.41z"/>
              </svg>
            </a>
          </div>
        </div>
        
        <div className="right-section">
          <div className="plate-container">
            <div className="plate-glow"></div>
            <img 
              src="/main.png" 
              alt="Personalized healthy meal" 
              className={`plate-image ${hoverStates.plate ? 'plate-image-hover' : ''}`}
              onMouseEnter={() => handleHover('plate', true)}
              onMouseLeave={() => handleHover('plate', false)}
            />
            <div className="floating-badge badge-1">✓ Personalized</div>
            <div className="floating-badge badge-2">✓ Health-Focused</div>
          </div>
        </div>
      </main>

      <section className="carousel-section">
        <div className="carousel-header">
          <h2 className="carousel-title">Delicious Recipe Inspirations</h2>
          <p className="carousel-subtitle">
            Join thousands of satisfied users who have revolutionized their cooking, reduced food waste, and discovered amazing new recipes.
          </p>
          <button className="carousel-start-btn" onClick={handleStartJourneyClick}>
            Start Your Free Journey →
          </button>
        </div>
        <div className="carousel-container">
          <div className="carousel-row top-row">
            {[...topRecipes, ...topRecipes].map((recipe, index) => (
              <div key={index} className="recipe-card" onClick={handleRecipeClick}>
                <img src={recipe.img} alt={recipe.name} />
                <div className="recipe-info">
                  <span className="recipe-name">{recipe.name}</span>
                  <span className="recipe-details">{recipe.time} • {recipe.difficulty}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="carousel-row bottom-row">
            {[...bottomRecipes, ...bottomRecipes].map((recipe, index) => (
              <div key={index} className="recipe-card" onClick={handleRecipeClick}>
                <img src={recipe.img} alt={recipe.name} />
                <div className="recipe-info">
                  <span className="recipe-name">{recipe.name}</span>
                  <span className="recipe-details">{recipe.time} • {recipe.difficulty}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="how-to-use-section" id="how-to-use">
        <h2 className="section-title">How to Use</h2>
        <div className="how-to-content">
          <div className="how-to-steps">
            <div className="step-item">
              <div className="step-number">1</div>
              <p className="step-text">Set your dietary needs, allergies, and food preferences.</p>
            </div>
            <div className="step-item">
              <div className="step-number">2</div>
              <p className="step-text">Scan ingredients using real-time detection to scan what you have at home.</p>
            </div>
            <div className="step-item">
              <div className="step-number">3</div>
              <p className="step-text">Get suggested recipes based on your ingredients and preferences.</p>
            </div>
          </div>
          <div className="how-to-video" onClick={handleVideoClick}>
            <img src="https://via.placeholder.com/400x300.png?text=Healthy+Cooking+Demo" alt="Video Preview" className="video-preview" />
            <div className="video-placeholder">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </div>
        </div>
      </section>

      <section className="confidence-section">
        <div className="confidence-header">
          <h2 className="confidence-title">Recipes You Can Rely On</h2>
        </div>
        <div className="confidence-content">
          <div className="confidence-card">
            <div className="confidence-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <h3 className="confidence-card-title">AI Recipe Generator</h3>
            <p className="confidence-card-desc">Get smart ideas based on your ingredients and dietary needs.</p>
          </div>
          <div className="confidence-card">
            <div className="confidence-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
            </div>
            <h3 className="confidence-card-title">Ingredient Scanner</h3>
            <p className="confidence-card-desc">Scan your ingredients to get recipes that match what you have.</p>
          </div>
          <div className="confidence-card">
            <div className="confidence-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
              </svg>
            </div>
            <h3 className="confidence-card-title">Health-Approved Recipes</h3>
            <p className="confidence-card-desc">Every recipe reviewed by doctors, dietitians, and nutritionists.</p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-section">
          <div className="footer-column">
            <div className="footer-logo">
              <span className="logo-text">DishCovery</span>
            </div>
            <p className="footer-description">
              Creating delicious meals with AI-powered personalized recipes tailored to your ingredients and preferences.
            </p>
            <div className="footer-social">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#2E7D32">
                  <path d="M18.77 7.46H14.5v-1.9c0-.9.6-1.1 1-1.1h3V.5h-4.33C10.24.5 9.5 3.44 9.5 5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4z"/>
                </svg>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#2E7D32">
                  <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.36.07-2.33.1-2.89.1-.55 0-1.1-.02-1.63-.05L12 21c-2.19 0-3.8-.16-4.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L6 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.1-.22 1.9-.28.8-.07 1.49-.1 2.09-.1L12 3c2.19 0 3.8.16 4.83.44.9.25 1.48.83 1.73 1.73z"/>
                </svg>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#2E7D32">
                  <path d="M7.75 2h8.5A5.25 5.25 0 0 1 21.5 7.25v8.5A5.25 5.25 0 0 1 16.25 21h-8.5A5.25 5.25 0 0 1 2.5 15.75v-8.5A5.25 5.25 0 0 1 7.75 2zm0 1.5A3.75 3.75 0 0 0 4 7.25v8.5c0 2.07 1.68 3.75 3.75 3.75h8.5c2.07 0 3.75-1.68 3.75-3.75v-8.5C20 5.18 18.32 3.5 16.25 3.5h-8.5zm9.25 1.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm-4.75 1.75a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>
                </svg>
              </a>
            </div>
          </div>
          <div className="footer-column">
            <h3 className="footer-title">Quick Links</h3>
            <ul className="footer-links">
              <li><a href="#home">Home</a></li>
              <li><a href="#about">About Us</a></li>
              <li><a href="#create">Create Recipe</a></li>
              <li><a href="#my-recipes">My Recipes</a></li>
            </ul>
          </div>
          <div className="footer-column">
            <h3 className="footer-title">Support</h3>
            <ul className="footer-links">
              <li><a href="#help-center">Help Center</a></li>
              <li><a href="#faqs">FAQs</a></li>
              <li><a href="#contact-us">Contact Us</a></li>
            </ul>
          </div>
          <div className="footer-column">
            <h3 className="footer-title">Contact Us</h3>
            <p><a href="mailto:dishcovery.ai@gmail.com">dishcovery.ai@gmail.com</a></p>
            <p><a href="tel:+1234567890">(123) 456-7890</a></p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2025 DishCovery AI. All rights reserved.</p>
        </div>
      </footer>

      {showSignInModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={closeModal}>×</button>
            <div className="modal-logo"><img src="/logo.png" alt="DishCovery Logo" /></div>
            <h2 className="modal-title">Welcome to DishCovery!</h2>
            <p className="modal-subtitle">Sign in to continue</p>
            <input type="text" className="modal-input" placeholder="Enter your email address" />
            <input type="password" className="modal-input" placeholder="Password" />
            <a href="#" className="forgot-password">Forgot Password?</a>
            <button className="modal-signin-btn" onClick={handleSignInClick}>Sign In</button>
            <div className="modal-or">or</div>
            <div className="social-buttons">
              <button className="social-btn fb" onClick={handleSocialLogin}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.77 7.46H14.5v-1.9c0-.9.6-1.1 1-1.1h3V.5h-4.33C10.24.5 9.5 3.44 9.5 5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4z"/>
                </svg>
              </button>
              <button className="social-btn google" onClick={handleSocialLogin}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.20-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </button>
            </div>
            <p className="modal-signup-text">Don't have an account yet? <a href="#" onClick={handleSignUpClick}>Sign up</a></p>
          </div>
        </div>
      )}

      {showSignUpModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={closeModal}>×</button>
            <div className="modal-logo"><img src="/logo.png" alt="DishCovery Logo" /></div>
            <h2 className="modal-title">New to DishCovery?</h2>
            <p className="modal-subtitle">Create account to continue</p>
            <input type="text" className="modal-input" placeholder="Email" />
            <input type="password" className="modal-input" placeholder="Password" />
            <div className="modal-terms">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => setIsChecked(!isChecked)}
                className="modal-checkbox"
              />
              <span>
                By signing up, you confirm that you have read, understood, and agree to be bound by our{' '}
                <a href="https://example.com/terms" target="_blank" className="modal-link">Terms and Conditions</a>{' '}
                and{' '}
                <a href="https://example.com/privacy" target="_blank" className="modal-link">Privacy Policy</a>.
              </span>
            </div>
            <button className="modal-signup-btn" disabled={!isChecked}>Sign up</button>
            <div className="modal-or">or</div>
            <div className="social-buttons">
              <button className="social-btn fb" onClick={handleSocialLogin}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.77 7.46H14.5v-1.9c0-.9.6-1.1 1-1.1h3V.5h-4.33C10.24.5 9.5 3.44 9.5 5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4z"/>
                </svg>
              </button>
              <button className="social-btn google" onClick={handleSocialLogin}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.20-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {showOneMoreStepModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={closeModal}>×</button>
            <div className="modal-logo"><img src="/logo.png" alt="DishCovery Logo" /></div>
            <h2 className="modal-title">One More Step</h2>
            <p className="modal-subtitle">Verify your account to get started</p>
            <input type="text" className="modal-input" placeholder="Verification Code" />
            <div className="modal-terms">
              <input
                type="checkbox"
                checked={isOneMoreStepChecked}
                onChange={() => setIsOneMoreStepChecked(!isOneMoreStepChecked)}
                className="modal-checkbox"
              />
              <span>
                I confirm that I have received and entered the correct verification code sent to my email.
              </span>
            </div>
            <button className="modal-signin-btn" disabled={!isOneMoreStepChecked}>Verify</button>
            <p className="modal-signup-text">Didn't receive a code? <a href="#" onClick={() => console.log("Resend code")}>Resend</a></p>
          </div>
        </div>
      )}

      {showVideoModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content video-modal" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={closeModal}>×</button>
            <video className="modal-video" controls>
              <source src="https://via.placeholder.com/640x360.mp4?text=Healthy+Cooking+Demo" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}
    </div>
  );
}