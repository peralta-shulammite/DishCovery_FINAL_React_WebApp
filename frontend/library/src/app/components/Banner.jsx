// Banner.jsx
import React, { useEffect, useState } from 'react';
import './Banner.css';

const Banner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(true); // always visible like your design

  useEffect(() => {
    // If event already saved by SWRegister, use it
    if (window.deferredBeforeInstallPrompt) {
      setDeferredPrompt(window.deferredBeforeInstallPrompt);
    }

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // also stash to window
      window.deferredBeforeInstallPrompt = e;
    };
    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setVisible(false);
      window.deferredBeforeInstallPrompt = null;
    };

    // Listen both to native and custom notification (in case event fired earlier)
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('pwaBeforeInstallPrompt', () => {
      if (window.deferredBeforeInstallPrompt) {
        setDeferredPrompt(window.deferredBeforeInstallPrompt);
      }
    });
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('pwaBeforeInstallPrompt', () => {});
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try {
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          console.log('PWA: user accepted install');
        } else {
          console.log('PWA: user dismissed install');
        }
      } catch (err) {
        console.warn('PWA prompt error', err);
      } finally {
        setDeferredPrompt(null);
        setVisible(false);
      }
      return;
    }

    // Better mobile-specific instructions
    const isAndroid = /android/i.test(window.navigator.userAgent);
    const isiOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    
    if (isAndroid) {
      alert('To install DishCovery:\n\n1. Open Chrome menu (⋮)\n2. Tap "Install app" or "Add to Home screen"\n\nMake sure you\'re using Chrome browser!');
    } else if (isiOS) {
      alert('To install DishCovery on iOS:\n\n1. Open this site in Safari\n2. Tap the Share button (rectangle with arrow)\n3. Scroll down and tap "Add to Home Screen"');
    } else {
      alert('Please open DishCovery in Chrome on your mobile device to install the app.');
    }
  };

  if (!visible) return null;

  return (
    <div className="pwa-banner">
      <div className="pwa-icon">
        <svg viewBox="0 0 24 24" className="heart-svg" aria-hidden="true">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      </div>

      <div className="pwa-body">
        <h3 className="pwa-title">DishCovery Mobile App</h3>
        <p className="pwa-desc">Get your app now</p>
      </div>

      <div className="pwa-actions">
        <button
          className={`install-btn ${deferredPrompt ? 'ready' : 'fallback'}`}
          onClick={handleInstallClick}
          aria-disabled={deferredPrompt ? 'false' : 'false'} // still clickable for fallback
        >
          Install App
        </button>
      </div>
    </div>
  );
};

export default Banner;