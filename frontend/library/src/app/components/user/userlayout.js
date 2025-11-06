'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import './userlayout.css';

export default function UserLayout({ children, isLoggedIn, user, onSignInClick, onLogout, onInstallClick, onDismissInstall, showInstallButton }) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showAvatarDropdown, setShowAvatarDropdown] = useState(false);
  const avatarRef = useRef(null);
  const [hoverStates, setHoverStates] = useState({
    logo: false,
    scanNav: false,
    signIn: false,
    avatar: false,
    installApp: false,
  });

  const handleHover = (element, isHover) => {
    setHoverStates((prev) => ({ ...prev, [element]: isHover }));
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (avatarRef.current && !avatarRef.current.contains(event.target)) {
        setShowAvatarDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleScanClick = () => {
    if (!isLoggedIn) {
      onSignInClick();
    } else {
      window.location.href = '/user/Scanning';
    }
    setShowMobileMenu(false);
  };

  const handleSignInClick = () => {
    onSignInClick();
    setShowMobileMenu(false);
  };

  const handleLogout = () => {
    onLogout(); // clears session or token
    setShowAvatarDropdown(false);
    setShowMobileMenu(false);
    window.location.href = '/user/home'; // redirect properly
  };
  

  const navLinks = [
    { name: 'Home', href: '/user/home' },
    { name: 'My Pantry', href: '/user/pantry' },
    { name: 'Favorites', href: '/user/favorites' },
  ];

  return (
    <>
      <header className="header">
      <Link
        href="/user/home"
        className={`logo ${hoverStates.logo ? 'logo-hover' : ''}`}
        onMouseEnter={() => handleHover('logo', true)}
        onMouseLeave={() => handleHover('logo', false)}
      >
        <span className="logo-text">DishCovery</span>
      </Link>

        <nav className="nav-links">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="nav-link"
            >
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="nav-actions">
          {!isLoggedIn ? (
            <>
              <button
                className={`scan-nav-btn ${hoverStates.scanNav ? 'scan-nav-btn-hover' : ''}`}
                onClick={handleScanClick}
                onMouseEnter={() => handleHover('scanNav', true)}
                onMouseLeave={() => handleHover('scanNav', false)}
                suppressHydrationWarning
              >
                <svg className="scan-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                </svg>
                Scan Now
              </button>
              <button
                className={`sign-in-btn ${hoverStates.signIn ? 'sign-in-btn-hover' : ''}`}
                onClick={handleSignInClick}
                onMouseEnter={() => handleHover('signIn', true)}
                onMouseLeave={() => handleHover('signIn', false)}
                suppressHydrationWarning
              >
                Sign In
              </button>
            </>
          ) : (
            <div className="avatar-container" ref={avatarRef}>
              <button
                className={`avatar-btn ${hoverStates.avatar ? 'avatar-btn-hover' : ''}`}
                onClick={() => setShowAvatarDropdown((prev) => !prev)}
                onMouseEnter={() => handleHover('avatar', true)}
                onMouseLeave={() => handleHover('avatar', false)}
              >
                {user?.photo ? (
                  <img
                    src={user.photo}
                    alt="User profile"
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <svg className="user-icon" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                  </svg>
                )}
              </button>
              {showAvatarDropdown && (
                <div className="avatar-dropdown">
                  <Link href="/user/user-profile" className="dropdown-item">
                    User Profile
                  </Link>
                  <Link href="/settings" className="dropdown-item">
                    Settings
                  </Link>
                  <button onClick={handleLogout} className="dropdown-item">
                  Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {showMobileMenu && (
        <div className="mobile-menu">
          <div className="mobile-menu-header">
            <span className="mobile-menu-logo">DishCovery</span>
            <button className="close-mobile-menu" onClick={() => setShowMobileMenu(false)}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="close-icon">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
          <div className="mobile-menu-content">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="mobile-nav-link"
                onClick={() => setShowMobileMenu(false)}
              >
                {link.name}
              </Link>
            ))}
            {!isLoggedIn ? (
              <>
                <button className="mobile-nav-link mobile-scan-btn" onClick={handleScanClick}>
                  <svg className="scan-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                  </svg>
                  Scan Ingredients
                </button>
                <button className="mobile-nav-link mobile-sign-in-btn" onClick={handleSignInClick}>
                  Sign In
                </button>
              </>
            ) : (
              <>
                <Link href="/user/favorites" className="mobile-nav-link" onClick={() => setShowMobileMenu(false)}>
                  Favorites
                </Link>
                <Link href="/user/user-profile" className="mobile-nav-link" onClick={() => setShowMobileMenu(false)}>
                  Profile
                </Link>
                <button className="mobile-nav-link logout-btn" onClick={handleLogout}>
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {children}

      {/* Floating Install Button */}
      {showInstallButton && (
        <div className="pwa-floating-container">
          <button
            className={`pwa-floating-button ${hoverStates.installApp ? 'expanded' : ''}`}
            onClick={onInstallClick}
            onMouseEnter={() => handleHover('installApp', true)}
            onMouseLeave={() => handleHover('installApp', false)}
            suppressHydrationWarning
          >
            {hoverStates.installApp ? (
              <>
                <span className="pwa-button-icon">⬇</span>
                <span className="pwa-button-text">Install App</span>
              </>
            ) : (
              <span className="pwa-button-dot">⬇</span>
            )}
          </button>
          {hoverStates.installApp && (
            <button
              className="pwa-collapse-button"
              onClick={onDismissInstall}
              aria-label="Dismiss install notification"
            >
              ×
            </button>
          )}
        </div>
      )}

      <nav className="mobile-bottom-nav">
        <Link href="/user/home" className="bottom-nav-link">
          <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
          Home
        </Link>

        <Link href="/user/pantry" className="bottom-nav-link">
          <svg
            className="nav-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <rect x="6" y="2" width="12" height="20" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none" />
            <line x1="6" y1="10" x2="18" y2="10" stroke="currentColor" strokeWidth="2" />
            <line x1="8" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="2" />
            <line x1="8" y1="14" x2="10" y2="14" stroke="currentColor" strokeWidth="2" />
          </svg>
          My Pantry
        </Link>

        <button className="bottom-nav-scan" onClick={handleScanClick}>
          <svg className="scan-icon" viewBox="0 0 24 24" fill="white">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
        </button>

        <Link href="/user/favorites" className="bottom-nav-link">
          <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          Favorites
        </Link>

        <Link href="/user/user-profile" className="bottom-nav-link">
          <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
          </svg>
          Profile
        </Link>
      </nav>
    </>
  );
}