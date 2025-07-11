'use client';
import React, { useState } from 'react';
import './styles.css';

const DishCoveryDashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('This Week');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sidebarVisible, setSidebarVisible] = useState(true);

  const dashboardStats = {
    totalVisits: 12847,
    newUsers: 324,
    activeUsers: 1876,
    pendingRequests: 23
  };

  const popularFilters = [
    { filter: 'Vegetarian', usage: 2341 },
    { filter: 'Gluten-Free', usage: 1876 },
    { filter: 'Dairy-Free', usage: 1543 },
    { filter: 'Keto', usage: 1234 },
    { filter: 'Vegan', usage: 987 }
  ];

  const topIngredients = [
    { ingredient: 'Chicken Breast', requests: 456 },
    { ingredient: 'Avocado', requests: 398 },
    { ingredient: 'Quinoa', requests: 342 },
    { ingredient: 'Salmon', requests: 289 },
    { ingredient: 'Sweet Potato', requests: 234 }
  ];

  const notifications = [
    { id: 1, type: 'restriction', message: 'New dietary restriction request: "Low FODMAP"', time: '2 hours ago' },
    { id: 2, type: 'ingredient', message: 'Missing ingredient reported: "Tempeh"', time: '4 hours ago' },
    { id: 3, type: 'recipe', message: 'Recipe flagged for review: "Spicy Thai Curry"', time: '6 hours ago' },
    { id: 4, type: 'user', message: 'User feedback: Recipe recommendations not accurate', time: '1 day ago' }
  ];

  const pendingRequests = [
    { id: 'REQ001', type: 'Dietary Restriction', request: 'Paleo + Autoimmune Protocol', user: 'Sarah Johnson', status: 'Pending', priority: 'High' },
    { id: 'REQ002', type: 'Ingredient', request: 'Monk Fruit Sweetener', user: 'Mike Chen', status: 'Processing', priority: 'Medium' },
    { id: 'REQ003', type: 'Dietary Restriction', request: 'Carnivore Diet', user: 'Alex Rodriguez', status: 'Pending', priority: 'Low' },
    { id: 'REQ004', type: 'Ingredient', request: 'Jackfruit', user: 'Emma Wilson', status: 'Processing', priority: 'Medium' },
    { id: 'REQ005', type: 'Recipe Type', request: 'Air Fryer Recipes', user: 'David Brown', status: 'Pending', priority: 'High' }
  ];

  const getStatusColor = (status) => {
    switch(status) {
      case 'Pending': return 'status-pending';
      case 'Processing': return 'status-processing';
      case 'Completed': return 'status-completed';
      default: return 'status-pending';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'High': return 'priority-high';
      case 'Medium': return 'priority-medium';
      case 'Low': return 'priority-low';
      default: return 'priority-medium';
    }
  };

  const handleViewClick = (section) => {
    console.log(`Navigate to ${section} page`);
    // Add navigation logic here
  };

  const handleExportData = () => {
    console.log('Export data functionality');
    // Add export logic here
  };

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  // Clean, Reliable SVG Icons
  const DashboardIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
    </svg>
  );

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

  const SettingsIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
    </svg>
  );

  const SearchIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
    </svg>
  );

  const ExportIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
      <path d="M8 15.01l1.41 1.41L11 14.84V19h2v-4.16l1.59 1.59L16 15.01 12.01 11 8 15.01z"/>
    </svg>
  );

  const MenuIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
    </svg>
  );

  return (
    <div className={`dashboard-container ${!sidebarVisible ? 'sidebar-hidden' : ''}`}>
      {/* Header */}
      <div className="dashboard-header">
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
      <div className={`sidebar ${!sidebarVisible ? 'hidden' : ''}`}>
        <nav className="sidebar-nav">
          <div className="nav-item active">
            <span className="nav-icon"><DashboardIcon /></span>
            <span className="nav-text">Dashboard</span>
          </div>
          
          <div className="nav-section-header">Account Management</div>
          <div className="nav-item">
            <span className="nav-icon"><UsersIcon /></span>
            <span className="nav-text">Users</span>
          </div>
          <div className="nav-item">
            <span className="nav-icon"><UsersIcon /></span>
            <span className="nav-text">Admins</span>
          </div>
          
          <div className="nav-section-header">Content Management</div>
          <div className="nav-item">
            <span className="nav-icon"><RecipeIcon /></span>
            <span className="nav-text">Recipes</span>
          </div>
          <div className="nav-item">
            <span className="nav-icon"><DietaryIcon /></span>
            <span className="nav-text">Dietary Restrictions</span>
          </div>
          <div className="nav-item">
            <span className="nav-icon"><IngredientsIcon /></span>
            <span className="nav-text">Ingredients</span>
          </div>
          
          <div className="nav-section-header">Support</div>
          <div className="nav-item">
            <span className="nav-icon"><FeedbackIcon /></span>
            <span className="nav-text">Feedback</span>
          </div>
          
          <div className="nav-section-header">System</div>
          <div className="nav-item">
            <span className="nav-icon"><SettingsIcon /></span>
            <span className="nav-text">Settings</span>
          </div>
        </nav>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {sidebarVisible && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}

      {/* Main Content */}
      <div className="main-content">
        {/* Stats Cards */}
        <div className="stats-container">
          <div className="stat-card visits">
            <div className="stat-number">{dashboardStats.totalVisits.toLocaleString()}</div>
            <div className="stat-label">Total App Visits</div>
          </div>
          <div className="stat-card new-users">
            <div className="stat-number">{dashboardStats.newUsers}</div>
            <div className="stat-label">New Users</div>
          </div>
          <div className="stat-card active-users">
            <div className="stat-number">{dashboardStats.activeUsers.toLocaleString()}</div>
            <div className="stat-label">Active Users</div>
          </div>
          <div className="stat-card pending">
            <div className="stat-number">{dashboardStats.pendingRequests}</div>
            <div className="stat-label">Pending Requests</div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="controls-container">
          <div className="status-filters">
            <span className="filter-label">Status:</span>
            <button className={`filter-btn ${statusFilter === 'All' ? 'active' : ''}`} onClick={() => setStatusFilter('All')}>All</button>
            <button className={`filter-btn ${statusFilter === 'Pending' ? 'active' : ''}`} onClick={() => setStatusFilter('Pending')}>Pending</button>
            <button className={`filter-btn ${statusFilter === 'Processing' ? 'active' : ''}`} onClick={() => setStatusFilter('Processing')}>Processing</button>
            <button className={`filter-btn ${statusFilter === 'Completed' ? 'active' : ''}`} onClick={() => setStatusFilter('Completed')}>Completed</button>
          </div>
          <div className="date-range">
            <span className="filter-label">Date Range:</span>
            <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="date-select">
              <option value="Today">Today</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
            </select>
          </div>
          <button className="export-btn" onClick={handleExportData}>
            <ExportIcon />
            Export Data
          </button>
        </div>

        {/* Content Grid */}
        <div className="content-grid">
          {/* Popular Dietary Filters */}
          <div className="content-section">
            <button className="section-view-btn" onClick={() => handleViewClick('dietary-filters')}>
              View
            </button>
            <h3>Popular Dietary Filters</h3>
            <div className="filter-list">
              {popularFilters.map((item, index) => (
                <div key={index} className="filter-item">
                  <span className="filter-name">{item.filter}</span>
                  <span className="filter-count">{item.usage.toLocaleString()} uses</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Requested Ingredients */}
          <div className="content-section">
            <button className="section-view-btn" onClick={() => handleViewClick('ingredients')}>
              View
            </button>
            <h3>Top Requested Ingredients</h3>
            <div className="ingredient-list">
              {topIngredients.map((item, index) => (
                <div key={index} className="ingredient-item">
                  <span className="ingredient-name">{item.ingredient}</span>
                  <span className="ingredient-count">{item.requests} requests</span>
                </div>
              ))}
            </div>
          </div>

          {/* Notifications Center */}
          <div className="content-section notifications">
            <button className="section-view-btn" onClick={() => handleViewClick('notifications')}>
              View
            </button>
            <h3>Recent Notifications</h3>
            <div className="notification-list">
              {notifications.map((notification) => (
                <div key={notification.id} className="notification-item">
                  <div className="notification-content">
                    <span className="notification-message">{notification.message}</span>
                    <span className="notification-time">{notification.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Requests */}
          <div className="content-section pending-requests">
            <button className="section-view-btn" onClick={() => handleViewClick('pending-requests-table')}>
              View
            </button>
            <h3>Pending User Requests</h3>
            <div className="table-container">
              <table className="requests-table">
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Type</th>
                    <th>Request</th>
                    <th>User</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.map((request) => (
                    <tr key={request.id}>
                      <td>{request.id}</td>
                      <td>{request.type}</td>
                      <td>{request.request}</td>
                      <td>{request.user}</td>
                      <td><span className={`status-badge ${getStatusColor(request.status)}`}>{request.status}</span></td>
                      <td><span className={`priority-badge ${getPriorityColor(request.priority)}`}>{request.priority}</span></td>
                      <td><button className="action-btn">Review</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DishCoveryDashboard;