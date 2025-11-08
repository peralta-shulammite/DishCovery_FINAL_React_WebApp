'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import api from './api'; 
import './styles.css';
import Link from 'next/link';
import UserLayout from '../../components/user/userlayout';

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
  const [dishCoveryShowPassword, setDishCoveryShowPassword] = useState(false);
  const [dishCoveryShowForgotPasswordModal, setDishCoveryShowForgotPasswordModal] = useState(false);
  const [dishCoveryResetStep, setDishCoveryResetStep] = useState(1); // 1: email, 2: code+newPassword
  const [dishCoveryResetEmail, setDishCoveryResetEmail] = useState('');
  const [dishCoveryResetCode, setDishCoveryResetCode] = useState('');
  const [dishCoveryNewPassword, setDishCoveryNewPassword] = useState('');
  const [dishCoveryConfirmNewPassword, setDishCoveryConfirmNewPassword] = useState('');
  const [dishCoveryEmail, setDishCoveryEmail] = useState('');
  const [dishCoveryPassword, setDishCoveryPassword] = useState('');
  const [dishCoveryFirstName, setDishCoveryFirstName] = useState('');
  const [dishCoveryLastName, setDishCoveryLastName] = useState('');
  const [dishCoveryConfirmPassword, setDishCoveryConfirmPassword] = useState('');
  const [dishCoveryVerificationCode, setDishCoveryVerificationCode] = useState('');
  const [dishCoveryUser, setDishCoveryUser] = useState(null);
  const [dishCoveryError, setDishCoveryError] = useState('');
  const [dishCoveryNotification, setDishCoveryNotification] = useState({ show: false, message: '' });
  const [dishCoveryShowPWAPrompt, setDishCoveryShowPWAPrompt] = useState(false);
  const [dishCoveryDeferredPrompt, setDishCoveryDeferredPrompt] = useState(null);
  const [dishCoveryShowIOSInstructions, setDishCoveryShowIOSInstructions] = useState(false);
  const [dishCoveryInstallButtonExpanded, setDishCoveryInstallButtonExpanded] = useState(true);

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
    installApp: false,
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

  // Check for login notifications
  useEffect(() => {
    const userLoggedIn = sessionStorage.getItem('userJustLoggedIn');
    const adminLoggedIn = sessionStorage.getItem('adminJustLoggedIn');

    if (userLoggedIn === 'true') {
      setDishCoveryNotification({ show: true, message: 'Welcome back! Ready to cook up something delicious?' });
      sessionStorage.removeItem('userJustLoggedIn');

      setTimeout(() => {
        setDishCoveryNotification({ show: false, message: '' });
      }, 4000);
    } else if (adminLoggedIn === 'true') {
      setDishCoveryNotification({ show: true, message: 'Admin login successful!' });
      sessionStorage.removeItem('adminJustLoggedIn');

      setTimeout(() => {
        setDishCoveryNotification({ show: false, message: '' });
      }, 4000);
    }
  }, []);

  // PWA Install Prompt Handler - One Click Install
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      console.log('📱 beforeinstallprompt event fired!');
      e.preventDefault();

      // Store the event so it can be triggered later
      setDishCoveryDeferredPrompt(e);
      console.log('✅ Install prompt captured and ready for one-click install!');
      console.log('💡 Look for the "Install App" button on the page');
    };

    // Listen for the install prompt event
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    console.log('👂 Listening for beforeinstallprompt event...');

    // Check if app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
      console.log('✅ App is already installed (standalone mode)');
    }

    // Check for successful installation
    window.addEventListener('appinstalled', (evt) => {
      console.log('✅ PWA was installed successfully!');
      localStorage.setItem('pwaInstalled', 'true');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    // 🆕 FIX: Clear any stale user data on page load to prevent random user instances
    const clearStaleUserData = () => {
      // Check if there's a mismatch between token and stored user data
      const token = localStorage.getItem('token');
      const storedUserId = localStorage.getItem('userId');
      const storedUserEmail = localStorage.getItem('userEmail');
      
      // If we have a token but no user data, or if user data exists without a valid token, clear everything
      if ((token && !storedUserId && !storedUserEmail) || (!token && (storedUserId || storedUserEmail))) {
        console.log('🧹 Clearing stale user data - mismatch detected');
        localStorage.clear();
        sessionStorage.clear();
        // Force Service Worker cache clear
        if ('serviceWorker' in navigator && 'caches' in window) {
          caches.keys().then(cacheNames => {
            return Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
          });
        }
        return true; // Data was cleared
      }
      return false; // No clearing needed
    };
    
    // Clear stale data first
    const wasCleared = clearStaleUserData();
    
    const token = localStorage.getItem('token');
    
    // ✅ SECURITY FIX: Validate token format before using it
    if (token && token.length > 10 && token.split('.').length === 3 && !wasCleared) {
      setDishCoveryIsLoggedIn(true);
      
      // Fetch full profile from backend (token is verified server-side)
      // Add cache-busting timestamp to prevent stale data
      api.getProfile()
        .then((userData) => {
          console.log('✅ Profile loaded successfully');
          // 🆕 FIX: Verify user data matches token before setting state
          if (userData && userData.userId) {
            // Store current user ID to detect mismatches
            localStorage.setItem('currentUserId', userData.userId.toString());
            localStorage.setItem('currentUserEmail', userData.email || '');
            setDishCoveryUser(userData);
            setDishCoveryIsLoggedIn(true);
          } else {
            // Invalid user data - clear everything
            console.warn('⚠️ Invalid user data received - clearing auth');
            localStorage.clear();
            sessionStorage.clear();
            setDishCoveryIsLoggedIn(false);
            setDishCoveryUser(null);
          }
        })
        .catch((error) => {
          // Silently handle expired/invalid tokens (expected behavior)
          if (error.message === 'Token verification failed' || error.message === 'No token found') {
            console.log('ℹ️ No valid session found - clearing auth');
            // Only clear on explicit token failures
            localStorage.clear();
            sessionStorage.clear();
            setDishCoveryIsLoggedIn(false);
            setDishCoveryUser(null);
          } else if (error.message === 'Backend endpoint not found' || error.message === 'User not found in database') {
            // Backend endpoint not found (404) or user not found - DON'T logout user
            // This can happen after signup when user isn't synced yet, or backend is updating
            console.warn('⚠️ Backend issue (keeping session):', error.message);
            // Keep user logged in, just don't fetch profile
            setDishCoveryIsLoggedIn(true);
          } else {
            // Network error or backend unavailable - DON'T logout user
            console.warn('⚠️ Failed to load profile (keeping session):', error.message);
            // Keep user logged in, just don't fetch profile
            setDishCoveryIsLoggedIn(true);
          }
        });
    } else {
      if (token || wasCleared) {
        // Silently clear malformed tokens or if we cleared stale data
        localStorage.clear();
        sessionStorage.clear();
      }
      setDishCoveryIsLoggedIn(false);
      setDishCoveryUser(null);
    }
    
    // Load Google OAuth script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Handle Google OAuth verification modal
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const needsVerification = urlParams.get('verify');
    const pendingEmail = sessionStorage.getItem('pendingVerificationEmail');
    const isGoogleAuth = sessionStorage.getItem('pendingGoogleAuth');
    
    if (needsVerification === 'true' && pendingEmail && isGoogleAuth === 'true') {
      setDishCoveryEmail(pendingEmail);
      setDishCoveryShowOneMoreStepModal(true);
      window.history.replaceState({}, document.title, '/user/home');
    }
  }, []);

  const dishCoveryHandleSignInClick = () => {
    setDishCoveryShowSignInModal(true);
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
      window.location.href = '/user/recipe';
    }
  };

  const dishCoveryHandleVideoClick = () => {
    setDishCoveryShowVideoModal(true);
  };

  const dishCoveryHandleScanClick = () => {
    if (!dishCoveryIsLoggedIn) {
      setDishCoveryShowSignInModal(true);
    } else {
      window.location.href = '/user/Scanning';
    }
  };

  const dishCoveryHandleStartJourneyClick = () => {
    if (!dishCoveryIsLoggedIn) {
      setDishCoveryShowSignInModal(true);
    } else {
      window.location.href = '/user/get-started';
    }
  };

  const dishCoveryHandleLogout = () => {
    api.logout();
    setDishCoveryIsLoggedIn(false);
    setDishCoveryUser(null);
    setDishCoveryShowAvatarDropdown(false);
    console.log("User logged out");
  };

const dishCoveryHandleSignInSubmit = async (e) => {
    e.preventDefault();
    
    // Clear any previous errors
    setDishCoveryError('');
    
    try {
      console.log('🔐 Processing login for:', dishCoveryEmail);
      const data = await api.signIn(dishCoveryEmail, dishCoveryPassword);

      if (data.isAdmin) {
        console.log('👑 Admin login detected, redirecting to admin dashboard');
        setDishCoveryUser(data.user);
        setDishCoveryIsLoggedIn(true);
        dishCoveryCloseModal();

        // Set flag for admin notification
        sessionStorage.setItem('adminJustLoggedIn', 'true');

        // Redirect to your existing admin dashboard
        window.location.href = '/admin/dashboard';
      } else {
        console.log('👤 Regular user login, staying on main page');
        setDishCoveryUser(data.user);
        setDishCoveryIsLoggedIn(true);
        dishCoveryCloseModal();

        sessionStorage.setItem('userJustLoggedIn', 'true');

        // Reload page to trigger toast
        window.location.reload();
      }
    } catch (error) {
      // Special handling for Google OAuth accounts - don't log error to console
      if (error.isGoogleAuthError || error.message.includes('Google')) {
        setDishCoveryPassword('');
        setDishCoveryError('This account uses Google Sign-In. Please click "Continue with Google" below.');
        return; // Don't log or show generic error
      }
      
      // Handle login errors gracefully
      console.log('⚠️ Login failed:', error.message); // Changed from console.error to console.log
      
      // Set user-friendly error message
      if (error.message.includes('Invalid email or password')) {
        setDishCoveryError('Invalid email or password. If you haven\'t registered yet, please sign up first. If you registered with Google, use "Continue with Google" to log in.');
        setDishCoveryPassword(''); // Clear password field
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        setDishCoveryError('Network error. Please check your connection and try again.');
      } else {
        setDishCoveryError(error.message || 'Login failed. Please try again.');
      }
    }
  };

  const dishCoveryHandleSignUpSubmit = async (e) => {
    e.preventDefault();
    if (dishCoveryPassword !== dishCoveryConfirmPassword) {
      setDishCoveryError('Passwords do not match');
      return;
    }
    try {
      await api.signUp(dishCoveryFirstName, dishCoveryLastName, dishCoveryEmail, dishCoveryPassword);
      
      // CRITICAL FIX: Store the email in localStorage for verification
      localStorage.setItem('pendingVerificationEmail', dishCoveryEmail.trim());
      console.log(`💾 Saved pending email for verification: ${dishCoveryEmail.trim()}`);
      
      setDishCoveryShowSignUpModal(false);
      setDishCoveryShowOneMoreStepModal(true);
      setDishCoveryError('');
    } catch (error) {
      setDishCoveryError(error.message);
    }
  };

  // ✅ UPDATED: Redirect to get-started after verification
  const dishCoveryHandleVerifySubmit = async (e) => {
    e.preventDefault();

    const pendingEmail = localStorage.getItem('pendingVerificationEmail');
    if (!pendingEmail) {
      setDishCoveryError('Email not found. Please sign up again.');
      return;
    }

    // CRITICAL FIX: Trim whitespace from verification code (copy-paste from email can add spaces)
    const trimmedCode = dishCoveryVerificationCode.trim();
    console.log(`📋 Verifying with email: "${pendingEmail}", code: "${trimmedCode}" (length: ${trimmedCode.length})`);

    try {
      const data = await api.verify(pendingEmail, trimmedCode);
      setDishCoveryUser(data.user);
      setDishCoveryIsLoggedIn(true);
      dishCoveryCloseModal();
      
      // Check if Google OAuth user
      const isGoogleAuth = sessionStorage.getItem('pendingGoogleAuth') === 'true';
      
      if (isGoogleAuth) {
        localStorage.setItem('googleAuth', 'true');
        sessionStorage.removeItem('pendingGoogleAuth');
        sessionStorage.removeItem('pendingVerificationEmail');
      }
      
      sessionStorage.setItem('newUserSignup', 'true');
      console.log('🎉 New user verified, redirecting to get-started...');
      window.location.href = '/user/get-started';
    } catch (error) {
      setDishCoveryError(error.message);
    }
  };

  // ✅ UPDATED: Separate handlers for Google Login vs Signup
  const dishCoveryHandleGoogleLogin = () => {
    console.log('🔵 Clicking LOGIN with Google');
    api.signInWithGoogle('login');
  };
  
  const dishCoveryHandleGoogleSignup = () => {
    console.log('🟢 Clicking SIGNUP with Google');
    api.signUpWithGoogle();
  };

  const dishCoveryHandleForgotPasswordClick = () => {
    setDishCoveryShowSignInModal(false); // close sign in modal
    setDishCoveryShowForgotPasswordModal(true); // open forgot password modal
    setDishCoveryResetStep(1); // start at email step
    setDishCoveryError('');
    setDishCoveryResetEmail('');
    setDishCoveryResetCode('');
    setDishCoveryNewPassword('');
    setDishCoveryConfirmNewPassword('');
  };

  const dishCoveryHandleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setDishCoveryError('');
    
    try {
      if (dishCoveryResetStep === 1) {
        // Step 1: Request reset code
        if (!dishCoveryResetEmail) {
          setDishCoveryError('Please enter your email address');
          return;
        }
        
        console.log("Password reset requested for:", dishCoveryResetEmail);
        await api.forgotPassword(dishCoveryResetEmail);
        
        // Move to step 2
        setDishCoveryResetStep(2);
        setDishCoveryError('');
      } else if (dishCoveryResetStep === 2) {
        // Step 2: Verify code and reset password
        if (!dishCoveryResetCode) {
          setDishCoveryError('Please enter the verification code');
          return;
        }
        
        if (!dishCoveryNewPassword) {
          setDishCoveryError('Please enter a new password');
          return;
        }
        
        if (dishCoveryNewPassword !== dishCoveryConfirmNewPassword) {
          setDishCoveryError('Passwords do not match');
          return;
        }
        
        if (dishCoveryNewPassword.length < 8) {
          setDishCoveryError('Password must be at least 8 characters');
          return;
        }
        
        console.log("Resetting password for:", dishCoveryResetEmail);
        await api.resetPassword(dishCoveryResetEmail, dishCoveryResetCode, dishCoveryNewPassword);
        
        // Success! Close modal and show sign in
        setDishCoveryShowForgotPasswordModal(false);
        setDishCoveryShowSignInModal(true);
        setDishCoveryNotification({ 
          show: true, 
          message: '✅ Password reset successful! Please log in with your new password.' 
        });
        
        setTimeout(() => {
          setDishCoveryNotification({ show: false, message: '' });
        }, 5000);
        
        // Reset all fields
        setDishCoveryResetStep(1);
        setDishCoveryResetEmail('');
        setDishCoveryResetCode('');
        setDishCoveryNewPassword('');
        setDishCoveryConfirmNewPassword('');
      }
    } catch (error) {
      console.error("Password reset error:", error);
      setDishCoveryError(error.message || 'Failed to reset password. Please try again.');
    }
  };
  
  const dishCoveryHandleResendResetCode = async () => {
    try {
      setDishCoveryError('');
      await api.forgotPassword(dishCoveryResetEmail);
      setDishCoveryNotification({ 
        show: true, 
        message: '✅ New reset code sent to your email!' 
      });
      setTimeout(() => {
        setDishCoveryNotification({ show: false, message: '' });
      }, 3000);
    } catch (error) {
      setDishCoveryError(error.message || 'Failed to resend code');
    }
  };

const dishCoveryHandlePWAInstall = async () => {
  // Check if iOS device (iPhone, iPad, iPod)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  // Check if already in standalone mode (app is installed)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone === true;

  console.log('📱 Install button clicked!');
  console.log('Platform:', isIOS ? 'iOS' : 'Android/Windows/Desktop');
  console.log('Standalone mode:', isStandalone);

  // If iOS device, always show instructions (since iOS doesn't support programmatic install)
  if (isIOS) {
    console.log('📱 iOS detected - showing manual installation instructions');
    setDishCoveryShowIOSInstructions(true);
    return;
  }

  // For Android/Windows/Desktop - check if app is already installed
  if (isStandalone) {
    console.log('✅ App is already installed in standalone mode!');
    setDishCoveryNotification({
      show: true,
      message: '✅ DishCovery is already installed on your device!'
    });
    setTimeout(() => {
      setDishCoveryNotification({ show: false, message: '' });
    }, 3000);
    return;
  }

  // For Android/Chrome/Edge - use the deferred prompt if available
  if (dishCoveryDeferredPrompt) {
    try {
      console.log('🚀 Triggering native install prompt for Android/Windows...');
      await dishCoveryDeferredPrompt.prompt();

      const { outcome } = await dishCoveryDeferredPrompt.userChoice;
      console.log(`📱 User response: ${outcome}`);

      if (outcome === 'accepted') {
        console.log('✅ PWA installed successfully!');
        localStorage.setItem('pwaInstalled', 'true');
        localStorage.setItem('pwaInstallTime', Date.now().toString());

        setDishCoveryNotification({
          show: true,
          message: '🎉 DishCovery installed successfully!'
        });

        setTimeout(() => {
          setDishCoveryNotification({ show: false, message: '' });
        }, 3000);
      } else {
        console.log('❌ User declined installation');
      }

      setDishCoveryDeferredPrompt(null);
    } catch (error) {
      console.error('❌ Error showing install prompt:', error);
    }
  } else {
    // Deferred prompt not available - show general instructions
    console.log('⚠️ Install prompt not available');
    console.log('💡 Showing general installation instructions...');

    setDishCoveryNotification({
      show: true,
      message: 'To install: Open browser menu → "Install app" or "Add to Home Screen"'
    });

    setTimeout(() => {
      setDishCoveryNotification({ show: false, message: '' });
    }, 5000);
  }
};

const dishCoveryHandlePWADismiss = () => {
  setDishCoveryShowPWAPrompt(false);
  localStorage.setItem('pwaPromptDismissed', 'true');
  localStorage.setItem('pwaPromptDismissedTime', Date.now().toString());
};

const dishCoveryHandleIOSInstall = () => {
  // For iOS, show instructions modal
  setDishCoveryShowIOSInstructions(true);
  setDishCoveryShowPWAPrompt(false);
};

const dishCoveryTopRecipes = [
    { name: "Chicken Adobo", time: "50 min", difficulty: "Easy", img: "/images/food-carousel/adobong-manok.jpg" },
    { name: "Sauteed Chayote Greens", time: "20 min", difficulty: "Easy", img: "/images/food-carousel/ginisang-talbos.jpg" },
    { name: "Vegetable Chop Suey", time: "40 min", difficulty: "Medium", img: "/images/food-carousel/chop-suey.jpg" },
    { name: "Grilled Veggie Bowl", time: "30 min", difficulty: "Easy", img: "/images/food-carousel/grilled-veggies.jpg" },
    { name: "Quinoa Mango Salad", time: "25 min", difficulty: "Easy", img: "/images/food-carousel/quinoa-mango-salad.jpg" },
    { name: "Tofu Stir-Fry", time: "25 min", difficulty: "Easy", img: "/images/food-carousel/tofu-stirfry.jpg" },
    { name: "Lentil Coconut Soup", time: "35 min", difficulty: "Easy", img: "/images/food-carousel/lentil-coconut-soup.jpg" },
    { name: "Avocado Cucumber Salad", time: "20 min", difficulty: "Easy", img: "/images/food-carousel/avocado-cucumber-salad.jpg" },
];

const dishCoveryBottomRecipes = [
    { name: "Chia Mango Pudding", time: "15 min", difficulty: "Easy", img: "/images/food-carousel/chia-mango-pudding.jpg" },
    { name: "Tropical Oatmeal", time: "20 min", difficulty: "Easy", img: "/images/food-carousel/tropical-oatmeal.jpg" },
    { name: "Coconut Yogurt Parfait", time: "10 min", difficulty: "Easy", img: "/images/food-carousel/coconut-yogurt-parfait.jpg" },
    { name: "Chickpea Avocado Salad", time: "15 min", difficulty: "Easy", img: "/images/food-carousel/chickpea-avocado-salad.jpg" },
    { name: "Roasted Sweet Potatoes", time: "35 min", difficulty: "Easy", img: "/images/food-carousel/roasted-sweetpotato.jpg" },
    { name: "Berry Smoothie Bowl", time: "10 min", difficulty: "Easy", img: "/images/food-carousel/berry-smoothie-bowl.jpg" },
    { name: "Veggie Hummus Platter", time: "15 min", difficulty: "Easy", img: "/images/food-carousel/veggie-hummus-platter.jpg" },
    { name: "Date Energy Bites", time: "20 min", difficulty: "Easy", img: "/images/food-carousel/date-energy-bites.jpg" },
];

  return (
    <UserLayout 
      isLoggedIn={dishCoveryIsLoggedIn}
      user={dishCoveryUser}
      onSignInClick={dishCoveryHandleSignInClick}
      onLogout={dishCoveryHandleLogout}
    >
    <div ref={dishCoveryTopRef} className="container">

      {/* Custom Notification */}
      {dishCoveryNotification.show && (
        <div className="custom-notification">
          {dishCoveryNotification.message}
        </div>
      )}



      {/* iOS Installation Instructions Modal */}
      {dishCoveryShowIOSInstructions && (
        <div className="modal-overlay" onClick={() => setDishCoveryShowIOSInstructions(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '400px'}}>
            <button className="close-btn" onClick={() => setDishCoveryShowIOSInstructions(false)}>×</button>
            <div className="modal-logo"><img src="/android/android-launchericon-192-192.png" alt="DishCovery Logo" /></div>
            <h2 className="modal-title">Install on iPhone</h2>
            <p className="modal-subtitle">Follow these simple steps:</p>

            <div style={{textAlign: 'left', padding: '16px 0'}}>
              <div style={{display: 'flex', alignItems: 'flex-start', marginBottom: '16px'}}>
                <div style={{
                  background: '#2E7D32',
                  color: 'white',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  marginRight: '12px',
                  flexShrink: 0
                }}>1</div>
                <div>
                  <p style={{margin: 0, fontSize: '14px', color: '#424242'}}>
                    Tap the <strong>Share button</strong>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#2E7D32" style={{display: 'inline', verticalAlign: 'middle', margin: '0 4px'}}>
                      <path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z"/>
                    </svg>
                    at the bottom of Safari
                  </p>
                </div>
              </div>

              <div style={{display: 'flex', alignItems: 'flex-start', marginBottom: '16px'}}>
                <div style={{
                  background: '#2E7D32',
                  color: 'white',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  marginRight: '12px',
                  flexShrink: 0
                }}>2</div>
                <div>
                  <p style={{margin: 0, fontSize: '14px', color: '#424242'}}>
                    Scroll down and tap <strong>"Add to Home Screen"</strong>
                  </p>
                </div>
              </div>

              <div style={{display: 'flex', alignItems: 'flex-start'}}>
                <div style={{
                  background: '#2E7D32',
                  color: 'white',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  marginRight: '12px',
                  flexShrink: 0
                }}>3</div>
                <div>
                  <p style={{margin: 0, fontSize: '14px', color: '#424242'}}>
                    Tap <strong>"Add"</strong> and DishCovery will appear on your home screen!
                  </p>
                </div>
              </div>
            </div>

            <button
              className="modal-signin-btn"
              onClick={() => setDishCoveryShowIOSInstructions(false)}
              style={{marginTop: '8px'}}
            >
              Got it!
            </button>
          </div>
        </div>
      )}

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
              <div className="feature-desc">Smart ingredient recognition from your pantry</div>
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
            {/* Green Scan Ingredients Button */}
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
           Be among the first home cooks to transform mealtime. Explore recipes tailored to you, reduce waste, and elevate every meal.
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

      <section className="confidence-section" id="/home">
        <div className="confidence-header">
          <h2 className="confidence-title">Recipes You Can Rely On</h2>
        </div>
        <div className="confidence-content">
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
          <li><a href="/Scanning">Smart Scanning</a></li>
          <li><a href="/pantry">Pantry Management</a></li>
          <li><a href="/how-it-works">How It Works</a></li>
        </ul>
      </div>

      {/* 3. Company Links */}
      <div className="footer-column">
        <h3 className="footer-title">Company</h3>
        <ul className="footer-links">
          <li><a href="/user/about-us">About Us</a></li>
          <li><a href="/user/about-support">Contact Us</a></li>
          <li><a href="/user/about-support">Help Center</a></li>
          <li><a href="/user/about-company">Careers</a></li>
        </ul>
      </div>

      {/* 4. Legal Links */}
      <div className="footer-column">
        <h3 className="footer-title">Legal</h3>
        <ul className="footer-links">
          <li><a href="/user/about-legal#privacy-policy">Privacy Policy</a></li>
          <li><a href="/user/about-legal#terms-service">Terms of Service</a></li>
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
        
        <div className="footer-bottom">
          <p className="footer-copyright">© 2025 DishCovery. All rights reserved.</p>
        </div>
      </footer>
      {dishCoveryShowSignInModal && (
        <div className="modal-overlay" onClick={dishCoveryCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={dishCoveryCloseModal}>×</button>
            <div className="modal-logo"><img src="/android/android-launchericon-192-192.png" alt="DishCovery Logo" /></div>
            <h2 className="modal-title">Welcome to DishCovery!</h2>
            <p className="modal-subtitle">Sign in to continue</p>
            {dishCoveryError && <p className="modal-error">{dishCoveryError}</p>}
            <input
              type="text"
              className="modal-input"
              placeholder="Enter your email address"
              value={dishCoveryEmail}
              autoComplete="off"
              onChange={(e) => {
                setDishCoveryEmail(e.target.value);
                setDishCoveryError(''); // Clear error when user starts typing
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  dishCoveryHandleSignInSubmit(e);
                }
              }}
            />
              <div className="password-input-container">
                <input
                  type={dishCoveryShowPassword ? "text" : "password"}
                  className="modal-input"
                  value={dishCoveryPassword}
                  autoComplete="new-password"
                  onChange={(e) => {
                    setDishCoveryPassword(e.target.value);
                    setDishCoveryError(''); // Clear error when user starts typing
                  }}
                  placeholder="Password"
                  required
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      dishCoveryHandleSignInSubmit(e);
                    }
                  }}
                />
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setDishCoveryShowPassword(!dishCoveryShowPassword)}
                >
                  {dishCoveryShowPassword ? (
                    // Open Eye - Password is visible
                    <svg viewBox="0 0 24 24" className="eye-icon">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                  ) : (
                    // Closed Eye - Password is hidden
                    <svg viewBox="0 0 24 24" className="eye-icon">
                      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                    </svg>
                  )}
                </button>
              </div>

            {/* Forgot Password link */}
            <p className="forgot-password-text">
              <button
                type="button"
                onClick={dishCoveryHandleForgotPasswordClick}
                className="forgot-password-link"
              >
                Forgot Password?
              </button>
            </p>

            <button className="modal-signin-btn" onClick={dishCoveryHandleSignInSubmit}>Sign In</button>
            <div className="modal-or">or</div>
            <div className="social-buttons">
              <button className="social-btn fb" onClick={dishCoveryHandleSocialLogin}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.77 7.46H14.5v-1.9c0-.9.6-1.1 1-1.1h3V.5h-4.33C10.24.5 9.5 3.44 9.5 5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4z"/>
                </svg>
              </button>
              <button className="social-btn google" onClick={dishCoveryHandleGoogleLogin}>
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

      {/* Forgot Password Modal */}
      {dishCoveryShowForgotPasswordModal && (
        <div className="modal-overlay" onClick={() => setDishCoveryShowForgotPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setDishCoveryShowForgotPasswordModal(false)}>×</button>
            
            {dishCoveryResetStep === 1 ? (
              <>
                <h2 className="modal-title">Reset Your Password</h2>
                <p className="modal-subtitle">Enter your email to get a reset code</p>
                <input
                  type="email"
                  className="modal-input"
                  placeholder="Enter your email"
                  value={dishCoveryResetEmail}
                  onChange={(e) => setDishCoveryResetEmail(e.target.value)}
                  required
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      dishCoveryHandleForgotPasswordSubmit(e);
                    }
                  }}
                />
                {dishCoveryError && <p className="modal-error">{dishCoveryError}</p>}
                <button className="modal-signin-btn" onClick={dishCoveryHandleForgotPasswordSubmit}>
                  Send Reset Code
                </button>
              </>
            ) : (
              <>
                <h2 className="modal-title">Enter Reset Code</h2>
                <p className="modal-subtitle">Check your email ({dishCoveryResetEmail}) for the code</p>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="Enter 6-digit code"
                  value={dishCoveryResetCode}
                  onChange={(e) => setDishCoveryResetCode(e.target.value)}
                  maxLength="6"
                  required
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      dishCoveryHandleForgotPasswordSubmit(e);
                    }
                  }}
                />
                <input
                  type="password"
                  className="modal-input"
                  placeholder="New password (min. 8 characters)"
                  value={dishCoveryNewPassword}
                  onChange={(e) => setDishCoveryNewPassword(e.target.value)}
                  required
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      dishCoveryHandleForgotPasswordSubmit(e);
                    }
                  }}
                />
                <input
                  type="password"
                  className="modal-input"
                  placeholder="Confirm new password"
                  value={dishCoveryConfirmNewPassword}
                  onChange={(e) => setDishCoveryConfirmNewPassword(e.target.value)}
                  required
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      dishCoveryHandleForgotPasswordSubmit(e);
                    }
                  }}
                />
                {dishCoveryError && <p className="modal-error">{dishCoveryError}</p>}
                <button className="modal-signin-btn" onClick={dishCoveryHandleForgotPasswordSubmit}>
                  Reset Password
                </button>
                <p className="modal-signup-text">
                  Didn't receive the code?{' '}
                  <a href="#" onClick={(e) => { e.preventDefault(); dishCoveryHandleResendResetCode(); }}>
                    Resend
                  </a>
                </p>
              </>
            )}
          </div>
        </div>
      )}


      {dishCoveryShowSignUpModal && (
        <div className="modal-overlay" onClick={dishCoveryCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={dishCoveryCloseModal}>×</button>
            <div className="modal-logo"><img src="/android/android-launchericon-192-192.png" alt="DishCovery Logo" /></div>
            <h2 className="modal-title">New to DishCovery?</h2>
            <p className="modal-subtitle">Create account to continue</p>
            {dishCoveryError && <p className="modal-error">{dishCoveryError}</p>}
            <input
              type="text"
              className="modal-input"
              placeholder="First Name"
              value={dishCoveryFirstName}
              onChange={(e) => setDishCoveryFirstName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  dishCoveryHandleSignUpSubmit(e);
                }
              }}
            />
            <input
              type="text"
              className="modal-input"
              placeholder="Last Name"
              value={dishCoveryLastName}
              onChange={(e) => setDishCoveryLastName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  dishCoveryHandleSignUpSubmit(e);
                }
              }}
            />
            <input
              type="text"
              className="modal-input"
              placeholder="Email"
              value={dishCoveryEmail}
              onChange={(e) => setDishCoveryEmail(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  dishCoveryHandleSignUpSubmit(e);
                }
              }}
            />
            <div className="password-input-container">
              <input
                type={dishCoveryShowPassword ? "text" : "password"}
                className="modal-input"
                placeholder="Password"
                value={dishCoveryPassword}
                onChange={(e) => setDishCoveryPassword(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    dishCoveryHandleSignUpSubmit(e);
                  }
                }}
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setDishCoveryShowPassword(!dishCoveryShowPassword)}
              >
                {dishCoveryShowPassword ? (
                  <svg viewBox="0 0 24 24" className="eye-icon">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="eye-icon">
                    <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                  </svg>
                )}
              </button>
            </div>
            <div className="password-input-container">
              <input
                type={dishCoveryShowPassword ? "text" : "password"}
                className="modal-input"
                placeholder="Confirm Password"
                value={dishCoveryConfirmPassword}
                onChange={(e) => setDishCoveryConfirmPassword(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    dishCoveryHandleSignUpSubmit(e);
                  }
                }}
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setDishCoveryShowPassword(!dishCoveryShowPassword)}
              >
                {dishCoveryShowPassword ? (
                  <svg viewBox="0 0 24 24" className="eye-icon">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="eye-icon">
                    <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                  </svg>
                )}
              </button>
            </div>
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
              {/* ✅ FIXED: Changed from dishCoveryHandleGoogleLogin to dishCoveryHandleGoogleSignup */}
              <button className="social-btn google" onClick={dishCoveryHandleGoogleSignup}>
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
            <div className="modal-logo"><img src="/android/android-launchericon-192-192.png" alt="DishCovery Logo" /></div>
            <h2 className="modal-title">One More Step</h2>
            <p className="modal-subtitle">Verify your account to get started</p>
            {dishCoveryError && <p className="modal-error">{dishCoveryError}</p>}
            <input
              type="text"
              className="modal-input"
              placeholder="Verification Code"
              value={dishCoveryVerificationCode}
              onChange={(e) => setDishCoveryVerificationCode(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  dishCoveryHandleVerifySubmit(e);
                }
              }}
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
            <p className="modal-signup-text">Didn't receive a code? <a href="#" onClick={async (e) => {
              e.preventDefault();
              try {
                await api.resendVerificationCode(dishCoveryEmail);
                setDishCoveryError('');
                alert('✅ New verification code sent! Check your email.');
              } catch (error) {
                setDishCoveryError(error.message);
              }
            }}>Resend</a></p>
          </div>
        </div>
      )}

      {dishCoveryShowVideoModal && (
        <div className="modal-overlay" onClick={dishCoveryCloseModal}>
          <div className="modal-content video-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={dishCoveryCloseModal}>×</button>
            <div style={{padding: '20px', textAlign: 'center'}}>
              <img src="/images/food-carousel/grilled-veggies.jpg" alt="Healthy Cooking Demo" style={{maxWidth: '100%', borderRadius: '8px', marginBottom: '16px'}} />
              <h3 style={{color: '#2E7D32', marginBottom: '12px'}}>Demo Video Coming Soon!</h3>
              <p style={{color: '#666'}}>We're preparing an exciting video tutorial showing you how to use DishCovery to create amazing, healthy meals.</p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Install App Button - Always visible on all platforms */}
      <div className="pwa-floating-install-container">
        {dishCoveryInstallButtonExpanded ? (
          <div className="pwa-install-expanded">
            <button
              className="pwa-install-button-expanded"
              onClick={dishCoveryHandlePWAInstall}
            >
              <span className="pwa-install-icon">📱</span>
              <span className="pwa-install-text">Install App</span>
            </button>
            <button
              className="pwa-install-close"
              onClick={() => setDishCoveryInstallButtonExpanded(false)}
              aria-label="Collapse install button"
            >
              ×
            </button>
          </div>
        ) : (
          <button
            className="pwa-install-button-dot"
            onClick={() => setDishCoveryInstallButtonExpanded(true)}
            aria-label="Expand install button"
          >
            <span className="pwa-install-dot">📱</span>
          </button>
        )}
      </div>
    </div>
      </UserLayout>
  );
}