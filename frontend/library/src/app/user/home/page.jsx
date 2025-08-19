'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import api from './api'; 
import './styles.css';
import Link from 'next/link';

export default function DishCoveryLanding() {
  const dishCoveryTopRef = useRef(null);
  const [dishCoveryAnimatedTextIndex, setDishCoveryAnimatedTextIndex] = useState(0);
  const [dishCoveryShowSignInModal, setDishCoveryShowSignInModal] = useState(false);
  const [dishCoveryShowSignUpModal, setDishCoveryShowSignUpModal] = useState(false);
  const [dishCoveryShowOneMoreStepModal, setDishCoveryShowOneMoreStepModal] = useState(false);
  const [dishCoveryIsLoggedIn, setDishCoveryIsLoggedIn] = useState(false);
  const [dishCoveryShowVideoModal, setDishCoveryShowVideoModal] = useState(false);
  const [dishCoveryIsChecked, setDishCoveryIsChecked] = useState(false);
  const [dishCoveryIsOneMoreStepChecked, setDishCoveryIsOneMoreStepChecked] = useState(false);
  const [dishCoveryShowMobileMenu, setDishCoveryShowMobileMenu] = useState(false);
  const [dishCoveryShowAvatarDropdown, setDishCoveryShowAvatarDropdown] = useState(false);
  const [dishCoveryEmail, setDishCoveryEmail] = useState('');
  const [dishCoveryPassword, setDishCoveryPassword] = useState('');
  const [dishCoveryFirstName, setDishCoveryFirstName] = useState('');
  const [dishCoveryLastName, setDishCoveryLastName] = useState('');
  const [dishCoveryConfirmPassword, setDishCoveryConfirmPassword] = useState('');
  const [dishCoveryVerificationCode, setDishCoveryVerificationCode] = useState('');
  const [dishCoveryUser, setDishCoveryUser] = useState(null);
  const [dishCoveryError, setDishCoveryError] = useState('');
  const iconRef = useRef(null);

  const dishCoveryAnimatedWords = ['discover', 'explore', 'uncover'];

  const dishCoveryScrollToTop = useCallback(() => {
    dishCoveryTopRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const [dishCoveryHoverStates, setDishCoveryHoverStates] = useState({
    logo: false,
    signIn: false,
    scan: false,
    howToUse: false,
    plate: false,
    scanNav: false,
    avatar: false,
  });

  const dishCoveryHandleHover = (element, isHover) => {
    setDishCoveryHoverStates((prev) => ({ ...prev, [element]: isHover }));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setDishCoveryAnimatedTextIndex((prev) => (prev + 1) % dishCoveryAnimatedWords.length);
    }, 2000);
    return () => clearInterval(interval);
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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setDishCoveryIsLoggedIn(true);
      api.getProfile()
        .then((userData) => {
          setDishCoveryUser(userData);
        })
        .catch(() => {
          setDishCoveryIsLoggedIn(false);
          setDishCoveryUser(null);
        });
    }
  }, []);

  const dishCoveryHandleSignInClick = () => {
    setDishCoveryShowSignInModal(true);
    setDishCoveryShowMobileMenu(false);
    setDishCoveryError('');
  };

  const dishCoveryHandleSignUpClick = () => {
    setDishCoveryShowSignInModal(false);
    setDishCoveryShowSignUpModal(true);
    setDishCoveryError('');
  };

  const dishCoveryHandleSocialLogin = () => {
    setDishCoveryShowSignInModal(false);
    setDishCoveryShowSignUpModal(false);
    setDishCoveryShowOneMoreStepModal(true);
    setDishCoveryError('');
  };

  const dishCoveryCloseModal = () => {
    setDishCoveryShowSignInModal(false);
    setDishCoveryShowSignUpModal(false);
    setDishCoveryShowOneMoreStepModal(false);
    setDishCoveryShowVideoModal(false);
    setDishCoveryError('');
    setDishCoveryEmail('');
    setDishCoveryPassword('');
    setDishCoveryFirstName('');
    setDishCoveryLastName('');
    setDishCoveryConfirmPassword('');
    setDishCoveryVerificationCode('');
  };

  const dishCoveryHandleRecipeClick = () => {
    if (!dishCoveryIsLoggedIn) {
      setDishCoveryShowSignInModal(true);
    } else {
      console.log("Navigate to recipe detail page");
    }
  };

  const dishCoveryHandleVideoClick = () => {
    setDishCoveryShowVideoModal(true);
  };

  const dishCoveryHandleScanClick = () => {
    if (!dishCoveryIsLoggedIn) {
      setDishCoveryShowSignInModal(true);
    } else {
      window.location.href = '/user/scanning';
    }
    setDishCoveryShowMobileMenu(false);
  };

  const dishCoveryHandleStartJourneyClick = () => {
    if (!dishCoveryIsLoggedIn) {
      setDishCoveryShowSignInModal(true);
    } else {
      window.location.href = '/user/get-started';
    }
  };

  const dishCoveryToggleMobileMenu = () => {
    setDishCoveryShowMobileMenu((prev) => !prev);
  };

  const dishCoveryHandleLogout = () => {
    api.logout();
    setDishCoveryIsLoggedIn(false);
    setDishCoveryUser(null);
    setDishCoveryShowAvatarDropdown(false);
    setDishCoveryShowMobileMenu(false);
    console.log("User logged out");
  };

  const dishCoveryHandleSignInSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('🔐 Processing login for:', dishCoveryEmail);
      const data = await api.signIn(dishCoveryEmail, dishCoveryPassword);
      
      if (data.isAdmin) {
        console.log('👑 Admin login detected, redirecting to admin dashboard');
        setDishCoveryUser(data.user);
        setDishCoveryIsLoggedIn(true);
        dishCoveryCloseModal();
        
        // Redirect to your existing admin dashboard
        window.location.href = '/admin/dashboard';
      } else {
        console.log('👤 Regular user login, staying on main page');
        setDishCoveryUser(data.user);
        setDishCoveryIsLoggedIn(true);
        dishCoveryCloseModal();
        
        // Optional: redirect to user area or stay on current page
        // window.location.href = '/user/get-started';
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      setDishCoveryError(error.message);
    }
  };

  const dishCoveryHandleSignUpSubmit = async (e) => {
    e.preventDefault();
    if (dishCoveryPassword !== dishCoveryConfirmPassword) {
      setDishCoveryError('Passwords Robinets do not match');
      return;
    }
    try {
      await api.signUp(dishCoveryFirstName, dishCoveryLastName, dishCoveryEmail, dishCoveryPassword);
      setDishCoveryShowSignUpModal(false);
      setDishCoveryShowOneMoreStepModal(true);
      setDishCoveryError('');
    } catch (error) {
      setDishCoveryError(error.message);
    }
  };

  const dishCoveryHandleVerifySubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await api.verify(dishCoveryEmail, dishCoveryVerificationCode);
      setDishCoveryUser(data.user);
      setDishCoveryIsLoggedIn(true);
      dishCoveryCloseModal();
    } catch (error) {
      setDishCoveryError(error.message);
    }
  };

const dishCoveryNavLinks = [
  { name: "Home", href: "user/home" },
  { name: "My Pantry", href: "/user/pantry" },
  { name: "Favorites", href: "/user/favorites" },
];
  const dishCoveryTopRecipes = [
    { name: "Mediterranean Salad", time: "20 min", difficulty: "Easy", img: "https://s.yimg.com/ny/api/res/1.2/wwBOwqvEwbEhZQnLAO3lXg--/YXBwaWQ9aGlnaGxhbmRlcjt3PTk2MDtoPTk2MA--/https://media.zenfs.com/en/eating_well_articles_946/d059d7758b1b90f3c8ce6b1ad99fdf31" },
    { name: "Classic Burger", time: "35 min", difficulty: "Easy", img: "https://s.yimg.com/ny/api/res/1.2/wwBOwqvEwbEhZQnLAO3lXg--/YXBwaWQ9aGlnaGxhbmRlcjt3PTk2MDtoPTk2MA--/https://media.zenfs.com/en/eating_well_articles_946/d059d7758b1b90f3c8ce6b1ad99fdf31" },
    { name: "Japanese Ramen", time: "50 min", difficulty: "Medium", img: "https://s.yimg.com/ny/api/res/1.2/wwBOwqvEwbEhZQnLAO3lXg--/YXBwaWQ9aGlnaGxhbmRlcjt3PTk2MDtoPTk2MA--/https://media.zenfs.com/en/eating_well_articles_946/d059d7758b1b90f3c8ce6b1ad99fdf31" },
    { name: "Pasta Primavera", time: "20 min", difficulty: "Easy", img: "https://s.yimg.com/ny/api/res/1.2/wwBOwqvEwbEhZQnLAO3lXg--/YXBwaWQ9aGlnaGxhbmRlcjt3PTk2MDtoPTk2MA--/https://media.zenfs.com/en/eating_well_articles_946/d059d7758b1b90f3c8ce6b1ad99fdf31" },
    { name: "Mediterranean Salad", time: "20 min", difficulty: "Easy", img: "https://s.yimg.com/ny/api/res/1.2/wwBOwqvEwbEhZQnLAO3lXg--/YXBwaWQ9aGlnaGxhbmRlcjt3PTk2MDtoPTk2MA--/https://media.zenfs.com/en/eating_well_articles_946/d059d7758b1b90f3c8ce6b1ad99fdf31" },
    { name: "Classic Burger", time: "35 min", difficulty: "Easy", img: "https://s.yimg.com/ny/api/res/1.2/wwBOwqvEwbEhZQnLAO3lXg--/YXBwaWQ9aGlnaGxhbmRlcjt3PTk2MDtoPTk2MA--/https://media.zenfs.com/en/eating_well_articles_946/d059d7758b1b90f3c8ce6b1ad99fdf31" },
  ];

  const dishCoveryBottomRecipes = [
    { name: "American BBQ Ribs", time: "90 min", difficulty: "Medium", img: "https://s.yimg.com/ny/api/res/1.2/wwBOwqvEwbEhZQnLAO3lXg--/YXBwaWQ9aGlnaGxhbmRlcjt3PTk2MDtoPTk2MA--/https://media.zenfs.com/en/eating_well_articles_946/d059d7758b1b90f3c8ce6b1ad99fdf31" },
    { name: "Greek Moussaka", time: "60 min", difficulty: "Hard", img: "https://s.yimg.com/ny/api/highlander;w=960;h=960--/https://media.zenfs.com/en/eating_well_articles_946/d059d7758b1b90f3c8ce6b1ad99fdf31" },
    { name: "Spicy Thai Curry", time: "45 min", difficulty: "Medium", img: "https://s.yimg.com/ny/api/res/1.2/wwBOwqvEwbEhZQnLAO3lXg--/YXBwaWQ9aGlnaGxhbmRlcjt3PTk2MDtoPTk2MA--/https://media.zenfs.com/en/eating_well_articles_946/d059d7758b1b90f3c8ce6b1ad99fdf31" },
    { name: "Mexican Tacos", time: "25 min", difficulty: "Easy", img: "https://s.yimg.com/ny/api/res/1.2/wwBOwqvEwbEhZQnLAO3lXg--/YXBwaWQ9aGlnaGxhbmRlcjt3PTk2MDtoPTk2MA--/https://media.zenfs.com/en/eating_well_articles_946/d059d7758b1b90f3c8ce6b1ad99fdf31" },
    { name: "American BBQ Ribs", time: "90 min", difficulty: "Medium", img: "https://s.yimg.com/ny/api/res/1.2/wwBOwqvEwbEhZQnLAO3lXg--/YXBwaWQ9aGlnaGxhbmRlcjt3PTk2MDtoPTk2MA--/https://media.zenfs.com/en/eating_well_articles_946/d059d7758b1b90f3c8ce6b1ad99fdf31" },
    { name: "Greek Moussaka", time: "60 min", difficulty: "Hard", img: "https://s.yimg.com/ny/api/res/1.2/wwBOwqvEwbEhZQnLAO3lXg--/YXBwaWQ9aGlnaGxhbmRlcjt3PTk2MDtoPTk2MA--/https://media.zenfs.com/en/eating_well_articles_946/d059d7758b1b90f3c8ce6b1ad99fdf31" },
  ];

  return (
    <div ref={dishCoveryTopRef} className="container">
      <div className="decorative-circle circle1"></div>
      <div className="decorative-circle circle2"></div>
      <div className="decorative-circle circle3"></div>

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
            <Link
              key={link.name}
              href={link.href}
              className="nav-link"
              onClick={() => setDishCoveryShowMobileMenu(false)}
            >
              {link.name}
            </Link>
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
                className="mobile-nav-link"
                onClick={(e) => {
                  e.preventDefault();
                  setDishCoveryShowMobileMenu(false);
                  if (link.onClick) link.onClick();
                  else document.querySelector(link.href)?.scrollIntoView({ behavior: 'smooth' });
                }}
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
                <a href="user/favorites" className="mobile-nav-link" onClick={() => setDishCoveryShowMobileMenu(false)}>Favorites</a>
                <a href="/user-profile" className="mobile-nav-link" onClick={() => setDishCoveryShowMobileMenu(false)}>Profile</a>
                <button className="mobile-nav-link logout-btn" onClick={dishCoveryHandleLogout}>Logout</button>
              </>
            )}
          </div>
        </div>
      )}

          <nav className="mobile-bottom-nav">
      <Link href="/user/home" className="bottom-nav-link">
        <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
        </svg>
        Home
      </Link>
      
      <Link href="/user/pantry" className="bottom-nav-link">
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
      </Link>

      <button className="bottom-nav-scan" onClick={dishCoveryHandleScanClick}>
        <svg className="scan-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
      </button>
      
      <Link href="/user/favorites" className="bottom-nav-link">
        <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
        Favorites
      </Link>
      
      <Link href="/user/user-profile" className="bottom-nav-link">
        <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
        </svg>
        User
      </Link>
    </nav>

      <main className="main-content">
        <div className="left-section">
          <div className="trust-badge">
            <svg className="trust-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9,21.35L10.91,20.54C15.23,21.59 19,18.96 19,14.5V9C19,8.65 18.76,8.35 18.44,8.27L12,6.3L5.56,8.27C5.24,8.35 5,8.65 5,9V14.5C5,18.96 8.77,21.59 13.09,20.54L15,21.35V19H9V21.35M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17Z"/>
            </svg>
            <span className="badge-text">
              <span className="animated-word">{dishCoveryAnimatedWords[dishCoveryAnimatedTextIndex]}</span>
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
              className={`scan-btn ${dishCoveryHoverStates.scan ? 'scan-btn-hover' : ''}`}
              onClick={dishCoveryHandleScanClick}
              onMouseEnter={() => dishCoveryHandleHover('scan', true)}
              onMouseLeave={() => dishCoveryHandleHover('scan', false)}
              style={{
                backgroundColor: '#2E7D32',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '25px',
                border: 'none',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: dishCoveryHoverStates.scan ? '0 5px 12px rgba(46, 125, 50, 0.25)' : '0 3px 8px rgba(46, 125, 50, 0.15)',
                transition: 'all 0.3s ease',
              }}
            >
              <svg className="scan-icon" viewBox="0 0 24 24" fill="white" style={{ width: '18px', height: '18px' }}>
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
              <span className="btn-text">Scan Ingredients</span>
            </button>
            <a
              href="/pantry"
              className={`how-to-use ${dishCoveryHoverStates.howToUse ? 'how-to-use-hover' : ''}`}
              onMouseEnter={() => dishCoveryHandleHover('howToUse', true)}
              onMouseLeave={() => dishCoveryHandleHover('howToUse', false)}
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
              className={`plate-image ${dishCoveryHoverStates.plate ? 'plate-image-hover' : ''}`}
              onMouseEnter={() => dishCoveryHandleHover('plate', true)}
              onMouseLeave={() => dishCoveryHandleHover('plate', false)}
            />
            <div className="floating-badge badge-1">✓ Personalized</div>
            <div className="floating-badge badge-2">✓ Health-Focused</div>
          </div>
        </div>
      </main>

      <section className="carousel-section" id="/favorites">
        <div className="carousel-header">
          <h2 className="carousel-title">Delicious Recipe Inspirations</h2>
          <p className="carousel-subtitle">
            Join thousands of satisfied users who have revolutionized their cooking, reduced food waste, and discovered amazing new recipes.
          </p>
          <button className="carousel-start-btn" onClick={dishCoveryHandleStartJourneyClick}>
            Start Your Free Journey →
          </button>
        </div>
        <div className="carousel-container">
          <div className="carousel-row top-row">
            {[...dishCoveryTopRecipes, ...dishCoveryTopRecipes].map((recipe, index) => (
              <div key={index} className="recipe-card" onClick={dishCoveryHandleRecipeClick}>
                <img src={recipe.img} alt={recipe.name} />
                <div className="recipe-info">
                  <span className="recipe-name">{recipe.name}</span>
                  <span className="recipe-details">{recipe.time} • {recipe.difficulty}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="carousel-row bottom-row">
            {[...dishCoveryBottomRecipes, ...dishCoveryBottomRecipes].map((recipe, index) => (
              <div key={index} className="recipe-card" onClick={dishCoveryHandleRecipeClick}>
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

      <section className="how-to-use-section" id="/pantry">
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
          <div className="how-to-video" onClick={dishCoveryHandleVideoClick}>
            <img src="https://via.placeholder.com/400x300.png?text=Healthy+Cooking+Demo" alt="Video Preview" className="video-preview" />
            <div className="video-placeholder">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </div>
        </div>
      </section>

      <section className="confidence-section" id="/ph">
        <div className="confidence-header">
          <h2 className="confidence-title">Recipes You Can Rely On</h2>
        </div>
        <div className="confidence-content">
          <div className="confidence-card">
            <div className="confidence-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
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
      {/* 1. Dishcovery Logo & Social */}
      <div className="footer-column">
        <a className="footer-logo" onClick={dishCoveryScrollToTop}>
          <span className="logo-text">DishCovery</span>
        </a>
        <p className="footer-description">
          Creating delicious meals with personalized recipes tailored to your ingredients and preferences.
        </p>
        <div className="footer-social-section">
          <h3 className="footer-social-title">Connect With Us</h3>
          <div className="footer-social">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="footer-social-link" title="Follow us on Facebook">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="footer-social-link" title="Follow us on Instagram">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <a href="https://tiktok.com/@dishcovery" target="_blank" rel="noopener noreferrer" className="footer-social-link" title="Follow us on TikTok">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-1.032-.083 6.411 6.411 0 0 0-6.4 6.4 6.411 6.411 0 0 0 6.4 6.4 6.411 6.411 0 0 0 6.4-6.4V8.109a8.19 8.19 0 0 0 4.865 1.575V6.24a4.816 4.816 0 0 1-.999.445l-.001.001z"/>
              </svg>
            </a>
            <a href="mailto:dishcovery.ai@gmail.com" className="footer-social-link" title="Send us an email">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* 2. Product Links */}
      <div className="footer-column">
        <h3 className="footer-title">Product</h3>
        <ul className="footer-links">
          <li><a href="/Scanning">Recipe Generator</a></li>
          <li><a href="/Scanning">Smart Scanning</a></li>
          <li><a href="/pantry">Pantry Management</a></li>
          <li><a href="/how-it-works">How It Works</a></li>
        </ul>
      </div>

      {/* 3. Company Links */}
      <div className="footer-column">
        <h3 className="footer-title">Company</h3>
        <ul className="footer-links">
          <li><a href="/about">About Us</a></li>
          <li><a href="/contact">Contact Us</a></li>
          <li><a href="/help-center">Help Center</a></li>
          <li><a href="/careers">Careers</a></li>
        </ul>
      </div>

      {/* 4. Legal Links */}
      <div className="footer-column">
        <h3 className="footer-title">Legal</h3>
        <ul className="footer-links">
          <li><a href="/privacy-policy">Privacy Policy</a></li>
          <li><a href="/terms-of-service">Terms of Service</a></li>
        </ul>
      </div>

      {/* 5. Newsletter (Stay Updated) */}
      <div className="footer-newsletter">
        <h3 className="newsletter-title">Stay Updated</h3>
        <p className="newsletter-subtitle">Get weekly recipe inspiration and cooking tips delivered to your inbox.</p>
        <form className="newsletter-form" onSubmit={(e) => {e.preventDefault(); console.log("Newsletter signup");}}>
          <input 
            type="email" 
            className="newsletter-input" 
            placeholder="Enter your email address"
            required
          />
          <button type="submit" className="newsletter-btn">Subscribe</button>
        </form>
        <p className="newsletter-privacy">We respect your privacy. Unsubscribe anytime.</p>
      </div>
    </div>
  </footer>

      {dishCoveryShowSignInModal && (
        <div className="modal-overlay" onClick={dishCoveryCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={dishCoveryCloseModal}>×</button>
            <div className="modal-logo"><img src="/logo.png" alt="DishCovery Logo" /></div>
            <h2 className="modal-title">Welcome to DishCovery!</h2>
            <p className="modal-subtitle">Sign in to continue</p>
            {dishCoveryError && <p className="modal-error">{dishCoveryError}</p>}
            <input
              type="text"
              className="modal-input"
              placeholder="Enter your email address"
              value={dishCoveryEmail}
              onChange={(e) => setDishCoveryEmail(e.target.value)}
            />
            <input
              type="password"
              className="modal-input"
              placeholder="Password"
              value={dishCoveryPassword}
              onChange={(e) => setDishCoveryPassword(e.target.value)}
            />
            <a href="#" className="forgot-password">Forgot Password?</a>
            <button className="modal-signin-btn" onClick={dishCoveryHandleSignInSubmit}>Sign In</button>
            <div className="modal-or">or</div>
            <div className="social-buttons">
              <button className="social-btn fb" onClick={dishCoveryHandleSocialLogin}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.77 7.46H14.5v-1.9c0-.9.6-1.1 1-1.1h3V.5h-4.33C10.24.5 9.5 3.44 9.5 5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4z"/>
                </svg>
              </button>
              <button className="social-btn google" onClick={dishCoveryHandleSocialLogin}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.20-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </button>
            </div>
            <p className="modal-signup-text">Don't have an account yet? <a href="#" onClick={dishCoveryHandleSignUpClick}>Sign up</a></p>
          </div>
        </div>
      )}

      {dishCoveryShowSignUpModal && (
        <div className="modal-overlay" onClick={dishCoveryCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={dishCoveryCloseModal}>×</button>
            <div className="modal-logo"><img src="/logo.png" alt="DishCovery Logo" /></div>
            <h2 className="modal-title">New to DishCovery?</h2>
            <p className="modal-subtitle">Create account to continue</p>
            {dishCoveryError && <p className="modal-error">{dishCoveryError}</p>}
            <input
              type="text"
              className="modal-input"
              placeholder="First Name"
              value={dishCoveryFirstName}
              onChange={(e) => setDishCoveryFirstName(e.target.value)}
            />
            <input
              type="text"
              className="modal-input"
              placeholder="Last Name"
              value={dishCoveryLastName}
              onChange={(e) => setDishCoveryLastName(e.target.value)}
            />
            <input
              type="text"
              className="modal-input"
              placeholder="Email"
              value={dishCoveryEmail}
              onChange={(e) => setDishCoveryEmail(e.target.value)}
            />
            <input
              type="password"
              className="modal-input"
              placeholder="Password"
              value={dishCoveryPassword}
              onChange={(e) => setDishCoveryPassword(e.target.value)}
            />
            <input
              type="password"
              className="modal-input"
              placeholder="Confirm Password"
              value={dishCoveryConfirmPassword}
              onChange={(e) => setDishCoveryConfirmPassword(e.target.value)}
            />
            <div className="modal-terms">
              <input
                type="checkbox"
                checked={dishCoveryIsChecked}
                onChange={() => setDishCoveryIsChecked(!dishCoveryIsChecked)}
                className="modal-checkbox"
              />
              <span>
                By signing up, you confirm that you have read, understood, and agree to be bound by our{' '}
                <a href="https://example.com/terms" target="_blank" className="modal-link">Terms and Conditions</a>{' '}
                and{' '}
                <a href="https://example.com/privacy" target="_blank" className="modal-link">Privacy Policy</a>.
              </span>
            </div>
            <button className="modal-signup-btn" disabled={!dishCoveryIsChecked} onClick={dishCoveryHandleSignUpSubmit}>Sign up</button>
            <div className="modal-or">or</div>
            <div className="social-buttons">
              <button className="social-btn fb" onClick={dishCoveryHandleSocialLogin}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.77 7.46H14.5v-1.9c0-.9.6-1.1 1-1.1h3V.5h-4.33C10.24.5 9.5 3.44 9.5 5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4z"/>
                </svg>
              </button>
              <button className="social-btn google" onClick={dishCoveryHandleSocialLogin}>
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

      {dishCoveryShowOneMoreStepModal && (
        <div className="modal-overlay" onClick={dishCoveryCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={dishCoveryCloseModal}>×</button>
            <div className="modal-logo"><img src="/logo.png" alt="DishCovery Logo" /></div>
            <h2 className="modal-title">One More Step</h2>
            <p className="modal-subtitle">Verify your account to get started</p>
            {dishCoveryError && <p className="modal-error">{dishCoveryError}</p>}
            <input
              type="text"
              className="modal-input"
              placeholder="Verification Code"
              value={dishCoveryVerificationCode}
              onChange={(e) => setDishCoveryVerificationCode(e.target.value)}
            />
            <div className="modal-terms">
              <input
                type="checkbox"
                checked={dishCoveryIsOneMoreStepChecked}
                onChange={() => setDishCoveryIsOneMoreStepChecked(!dishCoveryIsOneMoreStepChecked)}
                className="modal-checkbox"
              />
              <span>
                By signing up, you confirm that you have read, understood, and agree to be bound by our{' '}
                <a href="https://example.com/terms" target="_blank" className="modal-link">Terms and Conditions</a>{' '}
                and{' '}
                <a href="https://example.com/privacy" target="_blank" className="modal-link">Privacy Policy</a>.
              </span>
            </div>
            <button className="modal-signin-btn" disabled={!dishCoveryIsOneMoreStepChecked} onClick={dishCoveryHandleVerifySubmit}>Verify</button>
            <p className="modal-signup-text">Didn't receive a code? <a href="#" onClick={() => console.log("Resend code")}>Resend</a></p>
          </div>
        </div>
      )}

      {dishCoveryShowVideoModal && (
        <div className="modal-overlay" onClick={dishCoveryCloseModal}>
          <div className="modal-content video-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={dishCoveryCloseModal}>×</button>
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