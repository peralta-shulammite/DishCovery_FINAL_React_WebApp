'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import './adminlayout.css';

const AdminLayout = ({ children, currentPage = 'Dashboard', onLogout }) => {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const router = useRouter();

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const handleNavigation = (path) => {
    console.log(`Attempting to navigate to: ${path}`);
    try {
      router.push(path);
      console.log(`Navigation successful to: ${path}`);
    } catch (error) {
      console.error('Navigation error:', error);
      window.location.href = path;
    }
  };

  const handleLogout = async () => {
    console.log('🔴 AdminLayout: Logout clicked');
    
    // ✅ FIXED: Use the onLogout prop if provided (from Dashboard)
    if (onLogout && typeof onLogout === 'function') {
      console.log('✅ Using onLogout prop from parent component');
      await onLogout();
      return; // The onLogout function will handle the redirect
    }
    
    // ✅ Fallback logout logic if no onLogout prop provided
    console.log('⚠️ No onLogout prop - using fallback logout');
    try {
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
      }
      
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        if (token) {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
        }
      } catch (apiError) {
        console.log('API logout call failed, but continuing:', apiError);
      }
      
      console.log('✅ Logout successful - redirecting to /user/home');
      
      // ✅ FIXED: Redirect to /user/home instead of /login
      window.location.replace('/user/home');
      
    } catch (error) {
      console.error('❌ Logout error:', error);
      // ✅ FIXED: Still redirect to /user/home even on error
      window.location.replace('/user/home');
    }
  };

  // Clean, Reliable SVG Icons
  const DashboardIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
    </svg>
  );

<<<<<<< HEAD
  const AnalyticsIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
    </svg>
  );

=======
>>>>>>> ba8278bf5470655a6d74991d7ae177ba36724de3
  const RecipeIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/>
    </svg>
  );

  const UsersIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 7c0-2.21-1.79-4-4-4S8 4.79 8 7s1.79 4 4 4 4-1.79 4-4zm-4 6c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z"/>
    </svg>
  );

  const DietaryIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/>
    </svg>
  );

  const IngredientsIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4l2-4z"/>
      <path d="M8 10c-2 0-4 2-4 4s2 4 4 4h8c2 0 4-2 4-4s-2-4-4-4H8z"/>
    </svg>
  );

  const FeedbackIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 13.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1-4.5h-2V6h2v5z"/>
    </svg>
  );

  const LogoutIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
    </svg>
  );

  const SearchIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
    </svg>
  );

  const MenuIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
    </svg>
  );

  const AdminsIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      <path d="M20 10V7h-2v3h-3v2h3v3h2v-3h3v-2z"/>
    </svg>
  );

  return (
    <div className={`admin-layout-container ${!sidebarVisible ? 'sidebar-hidden' : ''}`}>
      {/* Header */}
      <div className="admin-header">
        <div className="header-left">
          <button className="hamburger-menu" onClick={toggleSidebar}>
            <MenuIcon />
          </button>
          <h2 className="app-name header-app-name">DishCovery</h2>
          <div className="search-container">
            <input type="text" placeholder="Search..." className="search-input" />
            <button className="search-btn">
              <SearchIcon />
            </button>
          </div>
        </div>
        <div className="header-right">
          <div className="admin-profile">
            <span className="admin-name">Admin</span>
            <span className="admin-role">Administrator</span>
            <div className="admin-avatar">AD</div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`admin-sidebar ${!sidebarVisible ? 'hidden' : ''}`}>
        <nav className="sidebar-nav">
          <div className="nav-section-header">Main</div>
          <div 
            className={`nav-item ${currentPage === 'Dashboard' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              console.log('Dashboard clicked');
              handleNavigation('/admin/dashboard');
            }}
            style={{ cursor: 'pointer' }}
          >
            <span className="nav-icon"><DashboardIcon /></span>
            <span className="nav-text">Dashboard</span>
          </div>
<<<<<<< HEAD

          <div 
            className={`nav-item ${currentPage === 'Analytics' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              console.log('Analytics clicked');
              handleNavigation('/admin/analytics');
            }}
            style={{ cursor: 'pointer' }}
          >
            <span className="nav-icon"><AnalyticsIcon /></span>
            <span className="nav-text">Analytics</span>
          </div>
=======
>>>>>>> ba8278bf5470655a6d74991d7ae177ba36724de3
          
          <div className="nav-section-header">Account Management</div>
          <div 
            className={`nav-item ${currentPage === 'Users' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              console.log('Users clicked');
              handleNavigation('/admin/users');
            }}
            style={{ cursor: 'pointer' }}
          >
            <span className="nav-icon"><UsersIcon /></span>
            <span className="nav-text">Users</span>
          </div>

          <div 
            className={`nav-item ${currentPage === 'Admins' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              console.log('Admins clicked');
              handleNavigation('/admin/admins');
            }}
            style={{ cursor: 'pointer' }}
          >
            <span className="nav-icon"><AdminsIcon /></span>
            <span className="nav-text">Admins</span>
          </div>
          
          <div className="nav-section-header">Content Management</div>
          <div 
            className={`nav-item ${currentPage === 'Recipes' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              console.log('Recipes clicked');
              handleNavigation('/admin/recipes');
            }}
            style={{ cursor: 'pointer' }}
          >
            <span className="nav-icon"><RecipeIcon /></span>
            <span className="nav-text">Recipes</span>
          </div>
          <div 
            className={`nav-item ${currentPage === 'Dietary Restrictions' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              console.log('Dietary Restrictions clicked');
              handleNavigation('/admin/dietary-restrictions');
            }}
            style={{ cursor: 'pointer' }}
          >
            <span className="nav-icon"><DietaryIcon /></span>
            <span className="nav-text">Dietary Restrictions</span>
          </div>
          <div 
            className={`nav-item ${currentPage === 'Ingredients' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              console.log('Ingredients clicked');
              handleNavigation('/admin/ingredients');
            }}
            style={{ cursor: 'pointer' }}
          >
            <span className="nav-icon"><IngredientsIcon /></span>
            <span className="nav-text">Ingredients</span>
          </div>
          
          <div className="nav-section-header">Support</div>
          <div 
            className={`nav-item ${currentPage === 'Feedback' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              console.log('Feedback clicked');
              handleNavigation('/admin/feedback');
            }}
            style={{ cursor: 'pointer' }}
          >
            <span className="nav-icon"><FeedbackIcon /></span>
            <span className="nav-text">Feedback</span>
          </div>
          
          <div className="nav-section-header">Account</div>
          <div 
            className="nav-item"
            onClick={(e) => {
              e.preventDefault();
              handleLogout();
            }}
            style={{ cursor: 'pointer' }}
          >
            <span className="nav-icon"><LogoutIcon /></span>
            <span className="nav-text">Logout</span>
          </div>
        </nav>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {sidebarVisible && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}

      {/* Main Content */}
      <div className="admin-main-content">
        {children}
      </div>
    </div>
  );
};

export default AdminLayout;