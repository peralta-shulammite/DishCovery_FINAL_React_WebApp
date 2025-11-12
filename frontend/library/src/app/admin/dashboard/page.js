'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../components/adminlayout';
import './styles.css';
import api from '../../user/home/api';
import { adminFeedbackAPI } from '../feedback/api'; 

const DashboardContent = () => {
  console.log('🔵 [DASHBOARD] Component rendered/rerendered');
  
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
  
  // 🆕 Dietary Restrictions Overview States (same as analytics)
  const [filterDistributionData, setFilterDistributionData] = useState([]);
  const [totalUses, setTotalUses] = useState(0);
  
  // 🆕 Recent Notifications States (real feedbacks from database)
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  // ROYGBIV color scheme: Red, Orange, Yellow, Green, Blue, Indigo, Violet (same as analytics)
  const COLORS = ['#f44336', '#ff9800', '#ffeb3b', '#4caf50', '#2196f3', '#3f51b5', '#9c27b0'];

  // API Base URL - Use same pattern as analytics page
  const getApiBaseUrl = () => {
    if (typeof window !== 'undefined') {
      // Client-side: check if we're on Vercel
      if (window.location.hostname.includes('vercel.app')) {
        return 'https://dishcovery-backend-wvhn.onrender.com/api';
      }
      // For localhost testing, always use localhost
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:5000/api';
      }
    }
    // Fallback to environment variable or localhost
    return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';
  };

  const API_BASE_URL = getApiBaseUrl();
  
  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  // 🆕 Fetch Real Dashboard Data
  useEffect(() => {
    console.log('🔵 [DASHBOARD] useEffect triggered - starting data fetch');
    
    const fetchDashboardData = async () => {
      console.log('🔵 [DASHBOARD] fetchDashboardData function called');
      setLoading(true);
      try {
        const token = getAuthToken();
        console.log('🔵 [DASHBOARD] Token exists:', !!token);
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

        // 🆕 Fetch Dietary Restrictions Overview from analytics endpoint (same as analytics page)
        const analyticsUrl = `${API_BASE_URL}/admin/analytics?dateRange=Last 30 Days`;
        console.log('📊 [DASHBOARD] Fetching analytics data from:', analyticsUrl);
        
        const analyticsResponse = await fetch(analyticsUrl, { headers });
        
        if (!analyticsResponse.ok) {
          let errorMessage = `HTTP error! status: ${analyticsResponse.status}`;
          try {
            const errorData = await analyticsResponse.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
            console.error('❌ [DASHBOARD] Analytics error response:', errorData);
          } catch (parseError) {
            errorMessage = analyticsResponse.statusText || errorMessage;
          }
          console.warn('⚠️ [DASHBOARD] Failed to fetch analytics data:', errorMessage);
          console.warn('⚠️ [DASHBOARD] Falling back to dietary restrictions endpoint');
          
          // Fallback to old endpoint if analytics fails
          const dietaryResponse = await fetch(`${API_BASE_URL}/dietary-restrictions/admin`, { headers });
          if (dietaryResponse.ok) {
            const dietaryData = await dietaryResponse.json();
            if (dietaryData.success && dietaryData.data) {
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
        } else {
          const analyticsData = await analyticsResponse.json();
          
          if (analyticsData.success && analyticsData.data) {
            // Set filter distribution data (same as analytics page)
            const filterDist = analyticsData.data.filterDistribution || [];
            const total = analyticsData.data.totalUses || 0;
            
            console.log('✅ [DASHBOARD] Analytics data fetched successfully');
            console.log('✅ [DASHBOARD] Filter distribution:', {
              count: filterDist.length,
              totalUses: total,
              sample: filterDist.slice(0, 3),
              fullData: filterDist
            });
            
            // Validate data structure
            if (filterDist.length > 0) {
              const firstItem = filterDist[0];
              console.log('✅ [DASHBOARD] First item structure:', {
                hasName: !!firstItem.name,
                hasValue: typeof firstItem.value !== 'undefined',
                hasPercentage: typeof firstItem.percentage !== 'undefined',
                name: firstItem.name,
                value: firstItem.value,
                percentage: firstItem.percentage
              });
            }
            
            setFilterDistributionData(filterDist);
            setTotalUses(total);
            
            // Verify state was set
            setTimeout(() => {
              console.log('✅ [DASHBOARD] State after setting:', {
                filterDistributionDataLength: filterDist.length,
                totalUses: total
              });
            }, 100);
            
            // Also set popularFilters for backward compatibility (top 5)
            const top5Filters = filterDist
              .slice(0, 5)
              .map(filter => ({
                filter: filter.name,
                usage: filter.value
              }));
            setPopularFilters(top5Filters);
          } else {
            console.error('❌ [DASHBOARD] Analytics data structure invalid:', analyticsData);
            throw new Error(analyticsData.message || 'Failed to fetch analytics data');
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

  // 🆕 Format time ago helper function
  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Unknown';
    
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
    
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  };

  // 🆕 Fetch Recent Notifications (Feedbacks) from Database
  useEffect(() => {
    const fetchRecentNotifications = async () => {
      try {
        setNotificationsLoading(true);
        console.log('📬 [DASHBOARD] Fetching recent feedbacks from database...');
        
        // Check if token exists
        const token = getAuthToken();
        if (!token) {
          console.warn('⚠️ [DASHBOARD] No auth token found, skipping notifications fetch');
          setNotifications([]);
          setNotificationsLoading(false);
          return;
        }
        
        // Fetch latest 4 feedbacks
        let response;
        try {
          response = await adminFeedbackAPI.getAllFeedback({
            sortBy: 'newest',
            limit: 4,
            offset: 0
          });
        } catch (apiError) {
          console.error('❌ [DASHBOARD] API call failed:', apiError);
          throw new Error(`API call failed: ${apiError.message || 'Unknown error'}`);
        }
        
        console.log('📬 [DASHBOARD] API Response:', {
          success: response?.success,
          hasData: !!response?.data,
          hasFeedbacks: !!(response?.data && response?.data?.feedbacks),
          feedbackCount: response?.data?.feedbacks?.length || 0,
          responseType: typeof response,
          responseKeys: response ? Object.keys(response) : [],
          fullResponse: JSON.stringify(response, null, 2)
        });
        
        // Check if response is valid
        if (!response) {
          throw new Error('No response received from API');
        }
        
        if (!response.success) {
          throw new Error(response.message || 'API returned unsuccessful response');
        }
        
        if (!response.data) {
          console.warn('⚠️ [DASHBOARD] Response has no data field');
          setNotifications([]);
          return;
        }
        
        if (!response.data.feedbacks) {
          console.warn('⚠️ [DASHBOARD] Response data has no feedbacks array');
          setNotifications([]);
          return;
        }
        
        if (response && response.success && response.data && response.data.feedbacks) {
          // Format feedbacks to match notification structure
          const formattedNotifications = response.data.feedbacks.map((feedback) => {
            // Determine notification type based on message content
            let type = 'user';
            let message = `User feedback: ${feedback.message || 'No message'}`;
            
            // Check if message contains keywords to determine type
            const msgLower = (feedback.message || '').toLowerCase();
            if (msgLower.includes('dietary') || msgLower.includes('restriction') || msgLower.includes('allergy')) {
              type = 'restriction';
              message = `New dietary restriction request: "${(feedback.message || '').substring(0, 50)}${(feedback.message || '').length > 50 ? '...' : ''}"`;
            } else if (msgLower.includes('ingredient') || msgLower.includes('missing')) {
              type = 'ingredient';
              message = `Missing ingredient reported: "${(feedback.message || '').substring(0, 50)}${(feedback.message || '').length > 50 ? '...' : ''}"`;
            } else if (msgLower.includes('recipe') || msgLower.includes('flag')) {
              type = 'recipe';
              message = `Recipe flagged for review: "${(feedback.message || '').substring(0, 50)}${(feedback.message || '').length > 50 ? '...' : ''}"`;
            } else {
              // Default to user feedback
              const msg = feedback.message || 'No message';
              const truncatedMessage = msg.length > 60 
                ? msg.substring(0, 60) + '...' 
                : msg;
              message = `User feedback: ${truncatedMessage}`;
            }
            
            return {
              id: feedback.feedbackId || `feedback-${Math.random()}`,
              type: type,
              message: message,
              time: formatTimeAgo(feedback.createdAt),
              feedbackId: feedback.feedbackId,
              isRead: feedback.isRead,
              status: feedback.status
            };
          });
          
          setNotifications(formattedNotifications);
          console.log('✅ [DASHBOARD] Notifications loaded successfully:', {
            count: formattedNotifications.length,
            notifications: formattedNotifications
          });
        } else {
          console.warn('⚠️ [DASHBOARD] No feedbacks found or invalid response structure:', {
            response: response,
            hasSuccess: !!response?.success,
            hasData: !!response?.data,
            hasFeedbacks: !!(response?.data?.feedbacks)
          });
          setNotifications([]);
        }
      } catch (error) {
        console.error('❌ [DASHBOARD] Error fetching notifications:', {
          error: error,
          errorType: typeof error,
          errorConstructor: error?.constructor?.name,
          message: error?.message || 'No error message',
          stack: error?.stack || 'No stack trace',
          toString: error?.toString?.() || 'Cannot convert to string'
        });
        
        // Log the full error object
        try {
          console.error('❌ [DASHBOARD] Full error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        } catch (stringifyError) {
          console.error('❌ [DASHBOARD] Could not stringify error:', stringifyError);
        }
        
        // Fallback to empty array on error
        setNotifications([]);
      } finally {
        setNotificationsLoading(false);
      }
    };

    fetchRecentNotifications();
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
      'Filter Percentage',
      'Total Uses',
      'Generated By (Admin)',
      'Generated Date'
    ];

    // Format filter distribution data (same structure as analytics)
    const filterRows = filterDistributionData.map(filter => ({
      name: filter.name,
      count: filter.value || 0,
      percentage: totalUses > 0 ? ((filter.value || 0) / totalUses * 100).toFixed(1) : '0.0'
    }));

    const csvRows = [headers.map(escapeCSV).join(',')];
    
    // Add filter distribution rows
    filterRows.forEach((filter, index) => {
      const isFirstRow = index === 0;
      csvRows.push([
        isFirstRow ? selectedPeriod : '',
        isFirstRow ? dashboardStats.newUsers : '',
        isFirstRow ? dashboardStats.activeUsers : '',
        isFirstRow ? dashboardStats.pendingRequests : '',
        filter.name,
        filter.count,
        `${filter.percentage}%`,
        isFirstRow ? totalUses : '',
        isFirstRow ? adminName : '',
        isFirstRow ? exportDate : ''
      ].map(escapeCSV).join(','));
    });

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

  console.log('🔵 [DASHBOARD] About to render JSX. Loading:', loading, 'FilterData:', filterDistributionData.length, 'TotalUses:', totalUses);
  
  return (
    <div className="dashboard-content">
      {/* TEST: Visible indicator that code is running */}
      <div style={{ 
        background: '#ff0000', 
        color: 'white', 
        padding: '10px', 
        marginBottom: '10px',
        textAlign: 'center',
        fontWeight: 'bold'
      }}>
        🔴 TEST: Code Updated - If you see this, the new code is running! 
        Data: {filterDistributionData.length} items, Total: {totalUses}
      </div>
      
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
        {/* Dietary Restrictions Overview - Same as Analytics Page */}
        <div className="content-section">
          <button className="section-view-btn" onClick={() => handleViewClick('dietary-filters')}>
            View
          </button>
          <div className="chart-header">
            <h3>Dietary Restrictions Overview</h3>
            <p className="chart-subtitle">Percentage breakdown by restriction type</p>
          </div>
          <div className="donut-chart-container">
            {(() => {
              // Debug: Log rendering state
              if (filterDistributionData.length > 0) {
                console.log('📊 [DASHBOARD] Rendering donut chart with data:', {
                  dataCount: filterDistributionData.length,
                  totalUses: totalUses,
                  firstThree: filterDistributionData.slice(0, 3).map(item => ({
                    name: item.name,
                    value: item.value,
                    percentage: item.percentage
                  }))
                });
              } else {
                console.warn('⚠️ [DASHBOARD] No filter distribution data available for donut chart');
              }
              
              // Calculate gradient exactly like analytics
              const gradientString = filterDistributionData.length > 0 && totalUses > 0 
                ? `conic-gradient(${filterDistributionData.map((item, index) => {
                    const startPercent = filterDistributionData.slice(0, index).reduce((sum, i) => sum + (i.percentage || 0), 0);
                    const endPercent = startPercent + (item.percentage || 0);
                    return `${COLORS[index % COLORS.length]} ${startPercent}% ${endPercent}%`;
                  }).join(', ')})`
                : 'conic-gradient(#e5e7eb 0% 100%)';
              
              return (
                <div className="donut-chart" style={{ background: gradientString }}>
                  <div className="donut-hole">
                    <div className="donut-total">{totalUses.toLocaleString()}</div>
                    <div className="donut-label">Total Uses</div>
                  </div>
                </div>
              );
            })()}
          </div>
          <div className="pie-legend">
            {filterDistributionData.length > 0 ? (
              filterDistributionData.map((item, index) => (
                <div key={index} className="pie-legend-item">
                  <span className="legend-color" style={{ background: COLORS[index % COLORS.length] }}></span>
                  <span className="legend-name">{item.name || 'Unknown'}</span>
                  <span className="legend-percentage">{(item.percentage || 0).toFixed(1)}%</span>
                  <span className="legend-value">{(item.value || 0).toLocaleString()}</span>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                No filter data available
              </div>
            )}
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
          {notificationsLoading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
              ⏳ Loading notifications...
            </div>
          ) : notifications.length > 0 ? (
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
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
              No recent notifications
            </div>
          )}
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