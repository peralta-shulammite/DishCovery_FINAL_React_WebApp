// PWAInstallModal.js
// Create this file: frontend/components/PWAInstallModal.js

'use client';
import { useState, useEffect } from 'react';
import './PWAInstallBanner.css';

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isInStandaloneMode = () => 
      (window.matchMedia('(display-mode: standalone)').matches) || 
      (window.navigator.standalone) || 
      document.referrer.includes('android-app://');

    setIsStandalone(isInStandaloneMode());

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Check if user dismissed the prompt before
    const dismissed = localStorage.getItem('pwaInstallDismissed');
    const dismissedDate = localStorage.getItem('pwaInstallDismissedDate');
    
    // Show modal again after 7 days
    if (dismissed && dismissedDate) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedDate)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed > 7) {
        localStorage.removeItem('pwaInstallDismissed');
        localStorage.removeItem('pwaInstallDismissedDate');
      }
    }

    // Listen for the beforeinstallprompt event (Android/Desktop)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show modal if not dismissed and not already installed
      if (!dismissed && !isInStandaloneMode()) {
        setTimeout(() => setShowModal(true), 3000); // Show after 3 seconds
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show modal if not dismissed and not installed
    if (iOS && !dismissed && !isInStandaloneMode()) {
      setTimeout(() => setShowModal(true), 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt && !isIOS) return;

    if (isIOS) {
      // iOS users need manual instructions
      return; // Modal already shows instructions
    }

    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setShowModal(false);
    }
    
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowModal(false);
    localStorage.setItem('pwaInstallDismissed', 'true');
    localStorage.setItem('pwaInstallDismissedDate', Date.now().toString());
  };

  const handleRemindLater = () => {
    setShowModal(false);
    // Will show again in 7 days
    localStorage.setItem('pwaInstallDismissed', 'true');
    localStorage.setItem('pwaInstallDismissedDate', Date.now().toString());
  };

  // Don't show if already installed
  if (isStandalone) return null;

  if (!showModal) return null;

  return (
    <div className="pwa-install-overlay" onClick={handleDismiss}>
      <div className="pwa-install-modal" onClick={(e) => e.stopPropagation()}>
        <button className="pwa-close-btn" onClick={handleDismiss}>×</button>
        
        <div className="pwa-icon-container">
          <img src="/logo.png" alt="DishCovery" className="pwa-app-icon" />
        </div>

        <h2 className="pwa-title">Install DishCovery</h2>
        
        {isIOS ? (
          <>
            <p className="pwa-description">
              Install this app on your iPhone: tap 
              <svg className="pwa-ios-share-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z"/>
              </svg>
              and then "Add to Home Screen"
            </p>
            <div className="pwa-ios-instructions">
              <div className="pwa-step">
                <span className="pwa-step-number">1</span>
                <span>Tap the Share button at the bottom</span>
              </div>
              <div className="pwa-step">
                <span className="pwa-step-number">2</span>
                <span>Scroll and tap "Add to Home Screen"</span>
              </div>
              <div className="pwa-step">
                <span className="pwa-step-number">3</span>
                <span>Tap "Add" to confirm</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="pwa-description">
              Get quick access to recipes, scan ingredients offline, and enjoy a native app experience!
            </p>
            <div className="pwa-features">
              <div className="pwa-feature">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span>Works offline</span>
              </div>
              <div className="pwa-feature">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span>Fast & reliable</span>
              </div>
              <div className="pwa-feature">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span>One-tap access</span>
              </div>
            </div>
          </>
        )}

        <div className="pwa-button-group">
          {!isIOS && (
            <button className="pwa-install-btn" onClick={handleInstallClick}>
              Install App
            </button>
          )}
          <button className="pwa-remind-btn" onClick={handleRemindLater}>
            {isIOS ? 'Got it!' : 'Remind Me Later'}
          </button>
        </div>

        <button className="pwa-dismiss-link" onClick={handleDismiss}>
          Don't show this again
        </button>
      </div>
    </div>
  );
}