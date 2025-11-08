'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import './userlayout.css';
import { notificationsAPI } from '../../user/utils/notificationsAPI';

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

export default function UserLayout({ children, isLoggedIn, user, onSignInClick, onLogout }) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showAvatarDropdown, setShowAvatarDropdown] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const avatarRef = useRef(null);
  const [hoverStates, setHoverStates] = useState({
    logo: false,
    scanNav: false,
    signIn: false,
    avatar: false,
  });

  // 🆕 Real notifications from API
  const [messages, setMessages] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleHover = (element, isHover) => {
    setHoverStates((prev) => ({ ...prev, [element]: isHover }));
  };

  // 🆕 Load notifications from API
  useEffect(() => {
    const loadNotifications = async () => {
      if (!isLoggedIn) return;
      
      try {
        setLoadingNotifications(true);
        console.log('📥 Loading notifications from API...');
        
        const response = await notificationsAPI.getNotifications(20);
        
        if (response && response.success && response.data) {
          // Transform API data to match UI format
          const formattedNotifications = response.data.map(notification => {
            const createdDate = new Date(notification.created_at);
            const now = new Date();
            const diffMs = now - createdDate;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffHours / 24);
            
            let timestamp;
            if (diffHours < 1) {
              timestamp = 'Just now';
            } else if (diffHours < 24) {
              timestamp = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            } else {
              timestamp = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            }
            
            return {
              id: notification.id,
              from: notification.from_name || 'Admin',
              fromRole: notification.from_role || 'ADMIN',
              subject: notification.subject,
              text: notification.body,
              timestamp: timestamp,
              isRead: notification.is_read === 1,
              type: notification.type
            };
          });
          
          setMessages(formattedNotifications);
          console.log('✅ Notifications loaded:', formattedNotifications.length);
        }
        
        // Load unread count
        const count = await notificationsAPI.getUnreadCount();
        setUnreadCount(count);
        
      } catch (error) {
        console.error('❌ Error loading notifications:', error);
        setMessages([]);
        setUnreadCount(0);
      } finally {
        setLoadingNotifications(false);
      }
    };
    
    loadNotifications();
  }, [isLoggedIn]);

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

  const handleDeleteMessage = async (messageId) => {
    try {
      // Optimistically remove from UI
      setMessages(messages.filter(msg => msg.id !== messageId));
      setUnreadCount(prev => {
        const message = messages.find(msg => msg.id === messageId);
        return message && !message.isRead ? Math.max(0, prev - 1) : prev;
      });
      
      // Call API
      await notificationsAPI.deleteNotification(messageId);
      console.log('✅ Notification deleted');
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
      // Reload notifications on error
      const response = await notificationsAPI.getNotifications(20);
      if (response && response.success) {
        const formatted = response.data.map(n => ({
          id: n.id,
          from: n.from_name || 'Admin',
          fromRole: n.from_role || 'ADMIN',
          subject: n.subject,
          text: n.body,
          timestamp: 'Recently',
          isRead: n.is_read === 1
        }));
        setMessages(formatted);
      }
    }
  };

  // 🆕 Handle Reply Button Click
  const handleReplyClick = (messageId) => {
    setReplyingTo(messageId);
    setReplyText('');
  };

  // 🆕 Handle Cancel Reply
  const handleCancelReply = () => {
    setReplyingTo(null);
    setReplyText('');
  };

  // 🆕 Handle Send Reply - Creates feedback entry
  const handleSendReply = async (messageId) => {
    if (!replyText.trim()) {
      alert('⚠️ Please enter a reply message');
      return;
    }

    if (replyText.trim().length < 10) {
      alert('⚠️ Reply must be at least 10 characters long');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('❌ Authentication required');
        return;
      }

      console.log('📤 Sending reply as feedback...');

      // Get the original notification to include context
      const originalMessage = messages.find(msg => msg.id === messageId);
      const contextMessage = `[In reply to: "${originalMessage?.subject || 'notification'}"]\n\n${replyText.trim()}`;

      // Submit as feedback to admin
      const response = await fetch(`${API_BASE_URL}/feedback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          feedbackMessage: contextMessage,
          priority: 'medium'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send reply');
      }

      const result = await response.json();
      console.log('✅ Reply sent as feedback:', result);

      // Mark original notification as read
      await notificationsAPI.markAsRead(messageId);

      // Update UI
      setMessages(messages.map(msg => 
        msg.id === messageId ? { ...msg, isRead: true } : msg
      ));

      // Clear reply state
      setReplyingTo(null);
      setReplyText('');

      alert('✅ Your reply has been sent to the admin!');

    } catch (error) {
      console.error('❌ Error sending reply:', error);
      alert(`❌ Failed to send reply: ${error.message}`);
    }
  };

  const handleToggleRead = async (messageId) => {
    const message = messages.find(msg => msg.id === messageId);
    if (!message) return;
    
    try {
      // Optimistically update UI
      setMessages(messages.map(msg => 
        msg.id === messageId ? { ...msg, isRead: !msg.isRead } : msg
      ));
      setUnreadCount(prev => message.isRead ? prev + 1 : Math.max(0, prev - 1));
      
      // Call API
      if (message.isRead) {
        await notificationsAPI.markAsUnread(messageId);
        console.log('✅ Marked as unread');
      } else {
        await notificationsAPI.markAsRead(messageId);
        console.log('✅ Marked as read');
      }
    } catch (error) {
      console.error('❌ Error toggling read status:', error);
      // Revert on error
      setMessages(messages.map(msg => 
        msg.id === messageId ? { ...msg, isRead: message.isRead } : msg
      ));
      setUnreadCount(prev => message.isRead ? Math.max(0, prev - 1) : prev + 1);
    }
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
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              <button 
                className="notification-btn" 
                onClick={() => setShowNotificationModal(true)}
                title="Notifications"
              >
                <svg className="notification-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                </svg>
                {unreadCount > 0 && (
                  <span className="notification-badge">{unreadCount}</span>
                )}
              </button>
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
            </>
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

      {showNotificationModal && isLoggedIn && (
        <div className="notification-modal-overlay" onClick={() => setShowNotificationModal(false)}>
          <div className="notification-modal" onClick={(e) => e.stopPropagation()}>
            <div className="notification-modal-header">
              <h2 className="notification-modal-title">Notifications</h2>
              <button 
                className="close-modal-btn" 
                onClick={() => setShowNotificationModal(false)}
              >
                <svg className="close-modal-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>
            
            <div className="notification-modal-content">
              {messages.length === 0 ? (
                <div className="empty-messages">
                  <svg className="empty-messages-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                  </svg>
                  <p className="empty-messages-text">No notifications yet</p>
                </div>
              ) : (
                <div className="message-list">
                  {messages.map((message) => (
                    <div 
                      key={message.id} 
                      className={`message-item ${!message.isRead ? 'unread' : ''}`}
                    >
                      <div className="message-header">
                        <div className="message-sender">
                          <span>{message.from}</span>
                          <span className="admin-badge">ADMIN</span>
                        </div>
                        <span className="message-time">{message.timestamp}</span>
                      </div>
                      
                      <div className="message-subject">{message.subject}</div>
                      <div className="message-text">{message.text}</div>
                      
                      <div className="message-actions">
                        <button 
                          className="message-action-btn reply-btn"
                          onClick={() => handleReplyClick(message.id)}
                        >
                          <svg className="message-action-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/>
                          </svg>
                          Reply
                        </button>
                        
                        <button 
                          className="message-action-btn"
                          onClick={() => handleToggleRead(message.id)}
                        >
                          <svg className="message-action-icon" viewBox="0 0 24 24" fill="currentColor">
                            {message.isRead ? (
                              <path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            ) : (
                              <path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            )}
                          </svg>
                          {message.isRead ? 'Mark Unread' : 'Mark Read'}
                        </button>
                        
                        <button 
                          className="message-action-btn delete-btn"
                          onClick={() => handleDeleteMessage(message.id)}
                        >
                          <svg className="message-action-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                          </svg>
                          Delete
                        </button>
                      </div>
                      
                      {replyingTo === message.id && (
                        <div className="reply-section">
                          <textarea
                            className="reply-input"
                            placeholder="Type your reply... (Ctrl+Enter to send)"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && e.ctrlKey) {
                                e.preventDefault();
                                handleSendReply(message.id);
                              }
                            }}
                          />
                          <div className="reply-actions">
                            <button 
                              className="reply-cancel-btn"
                              onClick={handleCancelReply}
                            >
                              Cancel
                            </button>
                            <button 
                              className="reply-send-btn"
                              onClick={() => handleSendReply(message.id)}
                            >
                              Send Reply
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}