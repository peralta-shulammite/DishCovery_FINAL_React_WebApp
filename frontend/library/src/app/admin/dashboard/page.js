'use client';
import React, { useState } from 'react';
// IMPORTANT: Import with capital A, use with capital A
import AdminLayout from '../../components/adminlayout';
import './styles.css';

const DashboardContent = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('This Week');
  const [statusFilter, setStatusFilter] = useState('All');

  const dashboardStats = {
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
  };

  const handleExportData = () => {
    console.log('Export data functionality');
  };

  const ExportIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
      <path d="M8 15.01l1.41 1.41L11 14.84V19h2v-4.16l1.59 1.59L16 15.01 12.01 11 8 15.01z"/>
    </svg>
  );

  return (
    <div className="dashboard-content">
      {/* Stats Cards - 3 cards */}
      <div className="stats-container">
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
  );
};

// FIXED: Use AdminLayout (capital A) not adminlayout (lowercase)
const Dashboard = () => {
  return (
    <AdminLayout currentPage="Dashboard">
      <DashboardContent />
    </AdminLayout>
  );
};

export default Dashboard;