'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../components/adminlayout';
import './styles.css';
import api from '../../user/home/api'; 

const DashboardContent = () => {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState('This Week');
  const [statusFilter, setStatusFilter] = useState('All');
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  
  // 🆕 Real Data States
  const [dashboardStats, setDashboardStats] = useState({
    newUsers: 0,
    activeUsers: 0,
    pendingRequests: 0
  });
  const [popularFilters, setPopularFilters] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dummy data for Dietary Restrictions Overview (not connected to backend)
const dummyFilterData = [
  { name: 'Vegetarian', value: 145, color: '#4caf50' },
  { name: 'Vegan', value: 98, color: '#2196f3' },
  { name: 'Gluten-Free', value: 87, color: '#ff9800' },
  { name: 'Dairy-Free', value: 76, color: '#f44336' },
  { name: 'Keto', value: 54, color: '#9c27b0' }
];

const dummyTotalUses = dummyFilterData.reduce((sum, item) => sum + item.value, 0);

// API Base URL
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';
  
  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  // 🆕 Fetch Real Dashboard Data
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const token = getAuthToken();
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        // Fetch User Stats
        const usersResponse = await fetch(`${API_BASE_URL}/admin/users`, { headers });
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          if (usersData.success && usersData.stats) {
            setDashboardStats({
              newUsers: usersData.stats.newUsers || 0,
              activeUsers: usersData.stats.activeUsers || 0,
              pendingRequests: 0 // TODO: Add pending requests endpoint
            });
          }
        }

        // Fetch Dietary Filters
        const dietaryResponse = await fetch(`${API_BASE_URL}/dietary-restrictions/admin`, { headers });
        if (dietaryResponse.ok) {
          const dietaryData = await dietaryResponse.json();
          if (dietaryData.success && dietaryData.data) {
            // Sort by usage and take top 5
            const sorted = dietaryData.data
              .filter(d => d.isActive)
              .sort((a, b) => b.userCount - a.userCount)
              .slice(0, 5)
              .map(d => ({
                filter: d.name,
                usage: d.userCount
              }));
            setPopularFilters(sorted);
          }
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Check if user just logged in
  useEffect(() => {
    // Only access sessionStorage in the browser
    if (typeof window !== 'undefined') {
      const justLoggedIn = sessionStorage.getItem('adminJustLoggedIn');
      if (justLoggedIn === 'true') {
        setNotification({ show: true, message: 'Welcome back, Admin!', type: 'success' });
        // Clear the flag
        sessionStorage.removeItem('adminJustLoggedIn');
        
        // Auto-hide after 4 seconds
        setTimeout(() => {
          setNotification({ show: false, message: '', type: 'success' });
        }, 4000);
      }
    }
  }, []);

  const notifications = [
    { id: 1, type: 'restriction', message: 'New dietary restriction request: "Low FODMAP"', time: '2 hours ago' },
    { id: 2, type: 'ingredient', message: 'Missing ingredient reported: "Tempeh"', time: '4 hours ago' },
    { id: 3, type: 'recipe', message: 'Recipe flagged for review: "Spicy Thai Curry"', time: '6 hours ago' },
    { id: 4, type: 'user', message: 'User feedback: Recipe recommendations not accurate', time: '1 day ago' }
  ];

  // 🆕 Handle View button clicks - Navigate to admin pages
  const handleViewClick = (section) => {
    console.log(`Navigating to ${section} page...`);
    
    switch(section) {
      case 'dietary-filters':
        router.push('/admin/dietary-restrictions');
        break;
      case 'ingredients':
        router.push('/admin/ingredients');
        break;
      case 'notifications':
        router.push('/admin/feedback');
        break;
      case 'recipes':
        router.push('/admin/recipes');
        break;
      case 'users':
        router.push('/admin/users');
        break;
      default:
        console.warn(`No route defined for section: ${section}`);
    }
  };

  // Helper function to escape CSV values
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const handleExportData = () => {
    // Export dashboard data as CSV with specified format
    const exportDate = new Date().toISOString().split('T')[0];
    const dateRangeFormatted = selectedPeriod.replace(/\s+/g, '_').toLowerCase();
    const adminName = 'Administrator'; // Get from localStorage or context if available
    
    const headers = [
      'Report Date Range',
      'New Users',
      'Active Users',
      'Pending Requests',
      'Popular Dietary Filters',
      'Filter Use Count',
      'Top Requested Ingredients',
      'Request Count',
      'Generated By (Admin)',
      'Generated Date'
    ];

    // Format popular filters
    const popularFiltersList = popularFilters.map(f => f.filter).join(', ') || 'None';
    const filterUseCounts = popularFilters.map(f => f.usage).join(', ') || '0';
    
    // Format top ingredients
    const topIngredientsList = topIngredients.map(ing => ing.ingredient).join(', ') || 'None';
    const requestCounts = topIngredients.map(ing => ing.requests).join(', ') || '0';

    const csvRows = [
      headers.map(escapeCSV).join(','),
      [
        selectedPeriod,
        dashboardStats.newUsers,
        dashboardStats.activeUsers,
        dashboardStats.pendingRequests,
        popularFiltersList,
        filterUseCounts,
        topIngredientsList,
        requestCounts,
        adminName,
        exportDate
      ].map(escapeCSV).join(',')
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dishcovery_dashboard_report_${dateRangeFormatted}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    alert('Dashboard data exported successfully as CSV.');
  };

  const ExportIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
      <path d="M8 15.01l1.41 1.41L11 14.84V19h2v-4.16l1.59 1.59L16 15.01 12.01 11 8 15.01z"/>
    </svg>
  );

 return (
    <div className="dashboard-content">
      {/* Custom Notification */}
      {notification.show && (
        <div className={`admin-notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
      
      {/* Loading Indicator */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', fontSize: '18px', color: '#666' }}>
          ⏳ Loading dashboard data from database...
        </div>
      )}
      
      {/* Stats Cards - 3 cards */}
      {!loading && (
        <>
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
      <div className="controls-section">
        <div className="controls-header">
          <h3>Dashboard Controls</h3>
        </div>
        
        <div className="controls-container">
          <div className="filter-section">
            <div className="filter-group">
              <span className="filter-label">Status Filter</span>
              <div className="status-filters">
                <button className={`filter-btn ${statusFilter === 'All' ? 'active' : ''}`} onClick={() => setStatusFilter('All')}>
                  All
                </button>
                <button className={`filter-btn ${statusFilter === 'Pending' ? 'active' : ''}`} onClick={() => setStatusFilter('Pending')}>
                  Pending
                </button>
                <button className={`filter-btn ${statusFilter === 'Processing' ? 'active' : ''}`} onClick={() => setStatusFilter('Processing')}>
                  Processing
                </button>
                <button className={`filter-btn ${statusFilter === 'Completed' ? 'active' : ''}`} onClick={() => setStatusFilter('Completed')}>
                  Completed
                </button>
              </div>
            </div>

            <div className="filter-group">
              <span className="filter-label">Date Range</span>
              <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="sort-select">
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
              </select>
            </div>
          </div>

          <div className="action-section">
            <button className="export-btn" onClick={handleExportData}>
              <ExportIcon />
              Export Data
            </button>
          </div>
        </div>
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

        {/* Dietary Restrictions Overview */}
        <div className="content-section dietary-overview">
          <h3>Dietary Restrictions Overview</h3>
          <div className="donut-chart-container">
            <div 
              className="donut-chart" 
              style={{
                background: `conic-gradient(
                  ${dummyFilterData.map((item, index) => {
                    const prevSum = dummyFilterData.slice(0, index).reduce((sum, d) => sum + d.value, 0);
                    const startPercent = (prevSum / dummyTotalUses) * 100;
                    const endPercent = ((prevSum + item.value) / dummyTotalUses) * 100;
                    return `${item.color} ${startPercent}% ${endPercent}%`;
                  }).join(', ')}
                )`
              }}
            >
              <div className="donut-hole">
                <div className="donut-total">{dummyTotalUses}</div>
                <div className="donut-label">Total Uses</div>
              </div>
            </div>
          </div>
          <div className="pie-legend">
            {dummyFilterData.map((item, index) => {
              const percentage = ((item.value / dummyTotalUses) * 100).toFixed(1);
              return (
                <div key={index} className="pie-legend-item">
                  <span className="legend-color" style={{ background: item.color }}></span>
                  <span className="legend-name">{item.name}</span>
                  <span className="legend-percentage">{percentage}%</span>
                  <span className="legend-value">{item.value} uses</span>
                </div>
              );
            })}
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
      </div>
      </>
      )}
    </div>
  );
};

// FIXED: Use AdminLayout (capital A) not adminlayout (lowercase)
const Dashboard = () => {
    const [logoutNotification, setLogoutNotification] = useState({ show: false, message: '', type: 'info' });
  // ✅ ADDED: Logout handler function
const handleLogout = async () => {
    try {
      console.log('🔴 Admin logout initiated...');
      
      // Show loading notification
      setLogoutNotification({ show: true, message: 'Logging out...', type: 'info' });

      // Call the logout API
      await api.logout();
      
      // The api.logout() will handle the redirect
    } catch (error) {
      console.error('❌ Logout error:', error);
      setLogoutNotification({ show: true, message: 'Logout failed. Redirecting...', type: 'error' });
      
      // ✅ FIXED: Force cleanup and redirect to correct route
      localStorage.clear();
      sessionStorage.clear();
      setTimeout(() => {
        window.location.href = '/user/home'; // ✅ FIXED: Changed from /user/ph to /user/home
      }, 1000);
    }
  };

  return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {/* Logout Notification */}
        {logoutNotification.show && (
          <div className={`admin-notification ${logoutNotification.type}`}>
            {logoutNotification.message}
          </div>
        )}
        
        <AdminLayout currentPage="Dashboard" onLogout={handleLogout}>
          <DashboardContent />
        </AdminLayout>
        </div>
      );
};

export default Dashboard;