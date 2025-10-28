'use client';
import React, { useState } from 'react';
import AdminLayout from '../../components/adminlayout';
import './styles.css';

const UserManagementContent = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('This Week');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('lastActive');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showBulkActionModal, setShowBulkActionModal] = useState(false);

  const userStats = {
    totalUsers: 2847,
    activeUsers: 1876,
    newUsers: 324,
    inactiveUsers: 623
  };

  const users = [
    {
      id: 1,
      profilePicture: 'https://images.unsplash.com/photo-1494790108755-2616b612b64c?w=150&h=150&fit=crop&crop=face',
      username: 'fitmeals',
      email: 'fitmeals@email.com',
      status: 'Active',
      lastActive: '3 hours ago',
      joinedDate: 'July 1, 2025',
      restrictions: ['Gluten-Free', 'Dairy-Free'],
      excludedIngredients: ['Nuts', 'Shellfish'],
      diets: ['Keto', 'High-Protein'],
      medicalConditions: ['Diabetes'],
      recipesViewed: 124,
      recipesSaved: 45,
      ingredientsScanned: 28,
      lastRecipe: 'Cauliflower Rice Bowl',
      feedbackSubmitted: true,
      notes: 'Premium user - very active in community'
    },
    {
      id: 2,
      profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      username: 'lazychef',
      email: '— (Google login)',
      status: 'Inactive',
      lastActive: '2 months ago',
      joinedDate: 'May 12, 2025',
      restrictions: ['Vegetarian'],
      excludedIngredients: ['Garlic', 'Onions'],
      diets: ['Mediterranean'],
      medicalConditions: [],
      recipesViewed: 89,
      recipesSaved: 23,
      ingredientsScanned: 12,
      lastRecipe: 'Veggie Pasta',
      feedbackSubmitted: false,
      notes: 'Has not logged in for 2 months - potential churn risk'
    },
    {
      id: 3,
      profilePicture: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      username: 'vegansoul',
      email: 'vegan@email.com',
      status: 'Active',
      lastActive: '1 day ago',
      joinedDate: 'June 15, 2025',
      restrictions: ['Vegan', 'Halal'],
      excludedIngredients: ['Honey'],
      diets: ['Vegan', 'Low-Sodium'],
      medicalConditions: ['Hypertension'],
      recipesViewed: 256,
      recipesSaved: 78,
      ingredientsScanned: 45,
      lastRecipe: 'Quinoa Buddha Bowl',
      feedbackSubmitted: true,
      notes: 'Reported bug - June 15, 2025. Very engaged user.'
    },
    {
      id: 4,
      profilePicture: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=150&h=150&fit=crop&crop=face',
      username: 'runnerlife',
      email: 'runner@fitness.com',
      status: 'Active',
      lastActive: '30 minutes ago',
      joinedDate: 'June 28, 2025',
      restrictions: ['Lactose Intolerant'],
      excludedIngredients: ['Dairy', 'Artificial Sweeteners'],
      diets: ['High-Carb', 'High-Protein'],
      medicalConditions: [],
      recipesViewed: 67,
      recipesSaved: 34,
      ingredientsScanned: 19,
      lastRecipe: 'Energy Overnight Oats',
      feedbackSubmitted: true,
      notes: 'New user showing high engagement'
    },
    {
      id: 5,
      profilePicture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      username: 'grandpacooks',
      email: 'grandpa@family.com',
      status: 'Inactive',
      lastActive: '3 weeks ago',
      joinedDate: 'April 20, 2025',
      restrictions: ['Diabetic-Safe', 'Low-Sodium'],
      excludedIngredients: ['Sugar', 'Salt'],
      diets: ['Heart-Healthy'],
      medicalConditions: ['Diabetes', 'Hypertension'],
      recipesViewed: 145,
      recipesSaved: 56,
      ingredientsScanned: 23,
      lastRecipe: 'Herb Crusted Salmon',
      feedbackSubmitted: false,
      notes: 'Senior user - may need simplified interface'
    }
  ];

  const inactiveUsers = [
    { username: 'inactivejoe', lastActive: 'April 1, 2025', joinedDate: 'Jan 10, 2025', status: 'Inactive' },
    { username: 'forgottenuser', lastActive: 'March 15, 2025', joinedDate: 'Dec 5, 2024', status: 'Inactive' },
    { username: 'oldaccount', lastActive: 'February 28, 2025', joinedDate: 'Nov 20, 2024', status: 'Inactive' }
  ];

  const filteredUsers = users.filter(user => {
    const matchesStatus = statusFilter === 'All' || user.status === statusFilter;
    const matchesSearch = searchTerm === '' || 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.restrictions.some(r => r.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aValue, bValue;
    
    switch(sortBy) {
      case 'username':
        aValue = a.username.toLowerCase();
        bValue = b.username.toLowerCase();
        break;
      case 'joinedDate':
        aValue = new Date(a.joinedDate);
        bValue = new Date(b.joinedDate);
        break;
      case 'lastActive':
        // Convert to sortable format (this is simplified)
        const timeToHours = (time) => {
          if (time.includes('minutes')) return 0;
          if (time.includes('hours')) return parseInt(time);
          if (time.includes('day')) return parseInt(time) * 24;
          if (time.includes('week')) return parseInt(time) * 168;
          if (time.includes('month')) return parseInt(time) * 720;
          return 0;
        };
        aValue = timeToHours(a.lastActive);
        bValue = timeToHours(b.lastActive);
        break;
      default:
        aValue = a[sortBy];
        bValue = b[sortBy];
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const getStatusColor = (status) => {
    switch(status) {
      case 'Active': return 'status-completed';
      case 'Inactive': return 'status-pending';
      default: return 'status-pending';
    }
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
  };

  const handleMessageUser = (user) => {
    setSelectedUser(user);
    setShowMessageModal(true);
  };

  const handleSendMessage = () => {
    console.log(`Sending message to ${selectedUser.username}: ${messageText}`);
    setShowMessageModal(false);
    setMessageText('');
    setSelectedUser(null);
  };

  const handleUserAction = (userId, action) => {
    console.log(`${action} user with ID: ${userId}`);
  };

  const handleSendReminder = (username) => {
    console.log(`Sending reminder to ${username}`);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleBulkActionConfirm = () => {
    console.log('Performing bulk actions on selected users');
    setShowBulkActionModal(false);
  };

  // SVG Icon Components
  const CloseIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>
  );

  const SendIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
    </svg>
  );

  const ExportIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
      <path d="M8 15.01l1.41 1.41L11 14.84V19h2v-4.16l1.59 1.59L16 15.01 12.01 11 8 15.01z"/>
    </svg>
  );

  return (
    <div className="users-content">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">User Management</h1>
          <p className="page-description">Manage user accounts, monitor activity, and maintain a healthy app environment</p>
        </div>
        <div className="page-actions">
          <button className="secondary-action-btn" onClick={() => setShowBulkActionModal(true)}>
            <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            Bulk Actions
          </button>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="stats-container">
        <div className="stat-card total-users">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 7c0-2.21-1.79-4-4-4S8 4.79 8 7s1.79 4 4 4 4-1.79 4-4zm-4 6c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-number">{userStats.totalUsers.toLocaleString()}</div>
            <div className="stat-label">Total Users</div>
            <div className="stat-trend positive">+12% from last month</div>
          </div>
        </div>
        <div className="stat-card active-users">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-number">{userStats.activeUsers.toLocaleString()}</div>
            <div className="stat-label">Active Users</div>
            <div className="stat-trend positive">+8% from last week</div>
          </div>
        </div>
        <div className="stat-card new-users">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-number">{userStats.newUsers}</div>
            <div className="stat-label">New Users</div>
            <div className="stat-trend positive">+24% from last week</div>
          </div>
        </div>
        <div className="stat-card inactive-users">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-number">{userStats.inactiveUsers}</div>
            <div className="stat-label">Inactive Users</div>
            <div className="stat-trend negative">+5% from last month</div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters and Controls */}
      <div className="controls-section">
        <div className="controls-header">
          <h3>Filter & Search Users</h3>
          <div className="quick-stats">
            <span className="quick-stat">
              <span className="count">{sortedUsers.length}</span>
              <span className="label">Showing</span>
            </span>
            <span className="quick-stat">
              <span className="count">{users.filter(u => u.status === 'Active').length}</span>
              <span className="label">Active</span>
            </span>
            <span className="quick-stat">
              <span className="count">{users.filter(u => u.status === 'Inactive').length}</span>
              <span className="label">Inactive</span>
            </span>
          </div>
        </div>
        
        <div className="controls-container">
          <div className="filter-section">
            <div className="filter-group">
              <label className="filter-label">Status Filter</label>
              <div className="status-filters">
                <button className={`filter-btn ${statusFilter === 'All' ? 'active' : ''}`} onClick={() => setStatusFilter('All')}>
                  All Users
                </button>
                <button className={`filter-btn ${statusFilter === 'Active' ? 'active' : ''}`} onClick={() => setStatusFilter('Active')}>
                  <span className="status-dot active"></span>
                  Active
                </button>
                <button className={`filter-btn ${statusFilter === 'Inactive' ? 'active' : ''}`} onClick={() => setStatusFilter('Inactive')}>
                  <span className="status-dot inactive"></span>
                  Inactive
                </button>
              </div>
            </div>
            
            <div className="filter-group">
              <label className="filter-label">Sort By</label>
              <div className="sort-controls">
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
                  <option value="lastActive">Last Active</option>
                  <option value="joinedDate">Join Date</option>
                  <option value="username">Username</option>
                </select>
                <button 
                  className="sort-order-btn"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>
          
          <div className="action-section">
            <button className="export-btn" onClick={() => console.log('Export user data')}>
              <ExportIcon />
              Export Data
            </button>
            <button className="import-btn">
              <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
                <path d="M8 15.01l1.41-1.41L11 15.17V11h2v4.17l1.59-1.59L16 15.01 12.01 19 8 15.01z"/>
              </svg>
              Import Users
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Content Layout */}
      <div className="main-content-grid">
        {/* Enhanced User List Table */}
        <div className="primary-section">
          <div className="section-header">
            <div className="section-title">
              <h3>User Directory</h3>
              <span className="user-count">{sortedUsers.length} users found</span>
            </div>
            <div className="table-actions">
              <button className="table-action-btn" title="Refresh">
                <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                </svg>
              </button>
              <button className="table-action-btn" title="Filter">
                <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
                </svg>
              </button>
              <button className="table-action-btn" title="Settings">
                <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
                </svg>
              </button>
            </div>
          </div>
          
          <div className="enhanced-table-container">
            <table className="enhanced-table">
              <thead>
                <tr>
                  <th className="checkbox-col">
                    <input type="checkbox" className="table-checkbox" />
                  </th>
                  <th>User</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th style={{cursor: 'pointer'}} onClick={() => handleSort('lastActive')}>
                    <div className="sortable-header">
                      Last Active 
                      {sortBy === 'lastActive' && <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                    </div>
                  </th>
                  <th style={{cursor: 'pointer'}} onClick={() => handleSort('joinedDate')}>
                    <div className="sortable-header">
                      Joined 
                      {sortBy === 'joinedDate' && <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                    </div>
                  </th>
                  <th>Activity</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((user) => (
                  <tr key={user.id} className="table-row">
                    <td>
                      <input type="checkbox" className="table-checkbox" />
                    </td>
                    <td>
                      <div className="user-cell">
                        <img 
                          src={user.profilePicture} 
                          alt={`${user.username} profile`}
                          className="user-avatar"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/40x40/2E7D32/ffffff?text=' + user.username.charAt(0).toUpperCase();
                          }}
                        />
                        <div className="user-info">
                          <div className="username">@{user.username}</div>
                          <div className="user-meta">{user.restrictions.slice(0, 2).join(', ')}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="contact-info">
                        <div className="email">{user.email}</div>
                      </div>
                    </td>
                    <td>
                      <span className={`enhanced-status-badge ${user.status.toLowerCase()}`}>
                        <span className="status-dot"></span>
                        {user.status}
                      </span>
                    </td>
                    <td>
                      <div className="time-info">
                        <div className="time-primary">{user.lastActive}</div>
                      </div>
                    </td>
                    <td>
                      <div className="time-info">
                        <div className="time-primary">{user.joinedDate}</div>
                      </div>
                    </td>
                    <td>
                      <div className="activity-summary">
                        <div className="activity-stat">
                          <span className="stat-value">{user.recipesViewed}</span>
                          <span className="stat-label">recipes</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="action-btn-small view" onClick={() => handleViewUser(user)} title="View Profile">
                          <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                          </svg>
                        </button>
                        <button className="action-btn-small message" onClick={() => handleMessageUser(user)} title="Send Message">
                          <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                          </svg>
                        </button>
                        <button 
                          className={`action-btn-small ${user.status === 'Active' ? 'warning' : 'danger'}`}
                          onClick={() => handleUserAction(user.id, user.status === 'Active' ? 'deactivate' : 'delete')}
                          title={user.status === 'Active' ? 'Deactivate' : 'Delete'}
                        >
                          {user.status === 'Active' ? 
                            <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg> :
                            <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                            </svg>
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Enhanced Sidebar Content */}
        <div className="sidebar-content">
          {/* Inactive User Tracker */}
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <h4>Inactive Users Alert</h4>
              <span className="alert-badge">{inactiveUsers.length}</span>
            </div>
            <div className="inactive-users-list">
              {inactiveUsers.map((user, index) => (
                <div key={index} className="inactive-user-item">
                  <div className="inactive-user-info">
                    <div className="inactive-username">@{user.username}</div>
                    <div className="inactive-time">Last seen: {user.lastActive}</div>
                  </div>
                  <button 
                    className="remind-btn"
                    onClick={() => handleSendReminder(user.username)}
                  >
                    Remind
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <h4>Quick Actions</h4>
            </div>
            <div className="quick-actions">
              <button className="quick-action-btn">
                <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <span>Send Weekly Report</span>
              </button>
              <button className="quick-action-btn">
                <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                <span>Mass Email Users</span>
              </button>
              <button className="quick-action-btn">
                <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 11H7v9a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2H9a2 2 0 00-2 2v5zm5-7a1 1 0 011 1v1h-4V5a1 1 0 011-1h2z"/>
                </svg>
                <span>Backup User Data</span>
              </button>
            </div>
          </div>

          {/* Activity Overview */}
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <h4>Activity Overview</h4>
            </div>
            <div className="activity-metrics">
              <div className="metric-item">
                <div className="metric-value">89%</div>
                <div className="metric-label">User Satisfaction</div>
                <div className="metric-trend positive">+3%</div>
              </div>
              <div className="metric-item">
                <div className="metric-value">2.4m</div>
                <div className="metric-label">Recipe Views</div>
                <div className="metric-trend positive">+15%</div>
              </div>
              <div className="metric-item">
                <div className="metric-value">12.3k</div>
                <div className="metric-label">Active Sessions</div>
                <div className="metric-trend negative">-2%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

        {selectedUser && !showMessageModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button 
              className="modal-close-btn"
              onClick={() => setSelectedUser(null)}
            >
              <CloseIcon />
            </button>
            
            <div className="profile-modal-header">
              <img 
                src={selectedUser.profilePicture}
                alt={selectedUser.username}
                className="modal-profile-pic"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/80x80/2E7D32/ffffff?text=' + selectedUser.username.charAt(0).toUpperCase();
                }}
              />
              <div className="modal-user-details">
                <h2 className="user-username">@{selectedUser.username}</h2>
                <div className="user-meta">
                  <span className="user-email">{selectedUser.email}</span>
                  <span className={`user-status-badge ${selectedUser.status === 'Active' ? 'active' : 'inactive'}`}>
                    {selectedUser.status}
                  </span>
                </div>
                <div className="user-timestamps">
                  <span className="timestamp-item">
                    <span className="label">Joined</span>
                    <span className="value">{selectedUser.joinedDate}</span>
                  </span>
                  <span className="timestamp-divider">•</span>
                  <span className="timestamp-item">
                    <span className="label">Last Active</span>
                    <span className="value">{selectedUser.lastActive}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="profile-sections-grid">
              <div className="profile-card">
                <h3 className="card-title">Dietary & Preferences</h3>
                <div className="card-content">
                  <div className="info-row">
                    <span className="info-label">Restrictions</span>
                    <span className="info-value">{selectedUser.restrictions.join(', ')}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Excluded Ingredients</span>
                    <span className="info-value">{selectedUser.excludedIngredients.join(', ')}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Diets</span>
                    <span className="info-value">{selectedUser.diets.join(', ')}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Medical Conditions</span>
                    <span className="info-value">{selectedUser.medicalConditions.length > 0 ? selectedUser.medicalConditions.join(', ') : 'None'}</span>
                  </div>
                </div>
              </div>

              <div className="profile-card">
                <h3 className="card-title">Activity Summary</h3>
                <div className="card-content">
                  <div className="stats-grid">
                    <div className="stat-item">
                      <span className="stat-number">{selectedUser.recipesViewed}</span>
                      <span className="stat-label">Recipes Viewed</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-number">{selectedUser.recipesSaved}</span>
                      <span className="stat-label">Recipes Saved</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-number">{selectedUser.ingredientsScanned}</span>
                      <span className="stat-label">Ingredients Scanned</span>
                    </div>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Last Recipe</span>
                    <span className="info-value">"{selectedUser.lastRecipe}"</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Feedback Submitted</span>
                    <span className="info-value">{selectedUser.feedbackSubmitted ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>

              <div className="profile-card full-width">
                <h3 className="card-title">Admin Notes</h3>
                <div className="card-content">
                  <p className="notes-text">{selectedUser.notes}</p>
                </div>
              </div>
            </div>

            <div className="modal-actions-improved">
              <button className="action-btn-improved primary" onClick={() => handleMessageUser(selectedUser)}>
                Send Notification
              </button>
              <button 
                className="action-btn-improved warning"
                onClick={() => handleUserAction(selectedUser.id, 'deactivate')}
              >
                Deactivate User
              </button>
              <button 
                className="action-btn-improved danger"
                onClick={() => handleUserAction(selectedUser.id, 'delete')}
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && selectedUser && (
        <div className="modal-overlay">
          <div className="message-modal-improved">
            <button 
              className="modal-close-btn"
              onClick={() => {
                setShowMessageModal(false);
                setSelectedUser(null);
                setMessageText('');
              }}
            >
              <CloseIcon />
            </button>
            
            <div className="message-modal-header">
              <h3 className="message-modal-title">Send Notification</h3>
              <p className="message-modal-subtitle">Send a message to this user</p>
            </div>

            <div className="message-recipient-info">
              <div className="recipient-label">To:</div>
              <div className="recipient-details">
                <img 
                  src={selectedUser.profilePicture}
                  alt={selectedUser.username}
                  className="recipient-avatar"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/40x40/2E7D32/ffffff?text=' + selectedUser.username.charAt(0).toUpperCase();
                  }}
                />
                <div className="recipient-info">
                  <span className="recipient-username">@{selectedUser.username}</span>
                  <span className="recipient-email">{selectedUser.email}</span>
                </div>
              </div>
            </div>
            
            <div className="message-input-container-improved">
              <label htmlFor="message-text" className="message-label">Message</label>
              <textarea
                id="message-text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type your message here..."
                rows={6}
                className="message-textarea-improved"
              />
              <div className="character-count">
                {messageText.length} characters
              </div>
            </div>

            <div className="message-modal-actions-improved">
              <button 
                className="message-btn cancel"
                onClick={() => {
                  setShowMessageModal(false);
                  setSelectedUser(null);
                  setMessageText('');
                }}
              >
                Cancel
              </button>
              <button 
                className="message-btn send" 
                onClick={handleSendMessage}
                disabled={!messageText.trim()}
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Action Confirmation Modal */}
      {showBulkActionModal && (
        <div className="modal-overlay">
          <div className="bulk-action-modal">
            <button 
              className="modal-close-btn"
              onClick={() => setShowBulkActionModal(false)}
            >
              <CloseIcon />
            </button>
            
            <div className="bulk-modal-header">
              <div className="bulk-modal-icon">
                <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <h3>Bulk Actions</h3>
              <p>Select an action to perform on multiple users at once</p>
            </div>

            <div className="bulk-action-options">
              <div className="bulk-option-group">
                <h4>Communication</h4>
                <button className="bulk-option-btn">
                  <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                  </svg>
                  <span>Send Message</span>
                  <span className="option-description">Send notification to selected users</span>
                </button>
                <button className="bulk-option-btn">
                  <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  <span>Send Reminder</span>
                  <span className="option-description">Send activity reminder to inactive users</span>
                </button>
              </div>

              <div className="bulk-option-group">
                <h4>Account Management</h4>
                <button className="bulk-option-btn warning">
                  <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17h2v-2h-2v2zm1-4c.55 0 1-.45 1-1V8c0-.55-.45-1-1-1s-1 .45-1 1v6c0 .55.45 1 1 1z"/>
                  </svg>
                  <span>Deactivate Users</span>
                  <span className="option-description">Temporarily disable selected accounts</span>
                </button>
                <button className="bulk-option-btn danger">
                  <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                  <span>Delete Users</span>
                  <span className="option-description">Permanently remove selected accounts</span>
                </button>
              </div>

              <div className="bulk-option-group">
                <h4>Data Export</h4>
                <button className="bulk-option-btn">
                  <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
                  </svg>
                  <span>Export Data</span>
                  <span className="option-description">Download selected user data</span>
                </button>
              </div>
            </div>

            <div className="bulk-modal-footer">
              <div className="selected-count">
                <span>0 users selected</span>
              </div>
              <button 
                className="cancel-btn"
                onClick={() => setShowBulkActionModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const UserManagement = () => {
  return (
    <AdminLayout currentPage="Users">
      <UserManagementContent />
    </AdminLayout>
  );
};

export default UserManagement;
