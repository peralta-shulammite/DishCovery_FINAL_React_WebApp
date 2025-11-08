'use client';
import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/adminlayout';
import './styles.css';

const AnalyticsContent = () => {
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [selectedMetric, setSelectedMetric] = useState('all');
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
  const [loading, setLoading] = useState(true);
  
  // Real data states
  const [filterDistributionData, setFilterDistributionData] = useState([]);
  const [requestStatusData, setRequestStatusData] = useState([]);
  const [userGrowthData, setUserGrowthData] = useState([]);
  const [ingredientTrendsData, setIngredientTrendsData] = useState([]);
  const [userActivityByHour, setUserActivityByHour] = useState([]);
  const [totalUses, setTotalUses] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);
  const [completionRate, setCompletionRate] = useState(0);
  
  // API Base URL - Use same pattern as other API files for consistency
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
  
  // Fetch analytics data from backend
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setLoading(true);
      try {
        const token = getAuthToken();
        if (!token) {
          throw new Error('No authentication token found. Please log in again.');
        }
        
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };
        
        const url = `${API_BASE_URL}/admin/analytics?dateRange=${encodeURIComponent(dateRange)}`;
        console.log('📊 [ANALYTICS] Fetching from:', url);
        console.log('📊 [ANALYTICS] Date range:', dateRange);
        
        const response = await fetch(url, { headers });
        
        if (!response.ok) {
          // Try to get error message from response
          let errorMessage = `HTTP error! status: ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
            console.error('❌ [ANALYTICS] Error response:', errorData);
          } catch (parseError) {
            errorMessage = response.statusText || errorMessage;
          }
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        
        if (data.success && data.data) {
          // Set filter distribution data
          setFilterDistributionData(data.data.filterDistribution || []);
          setTotalUses(data.data.totalUses || 0);
          
          // Set request status data
          setRequestStatusData(data.data.requestStatus || []);
          setTotalRequests(data.data.totalRequests || 0);
          setCompletionRate(data.data.completionRate || 0);
          
          // Set user growth data
          setUserGrowthData(data.data.userGrowth || []);
          
          // Set ingredient trends data
          setIngredientTrendsData(data.data.ingredientTrends || []);
          
          // Set user activity by hour
          setUserActivityByHour(data.data.userActivityByHour || []);
          
          console.log('✅ [ANALYTICS] Analytics data fetched successfully');
          console.log('✅ [ANALYTICS] Data received:', {
            filterDistribution: data.data.filterDistribution?.length || 0,
            requestStatus: data.data.requestStatus?.length || 0,
            userGrowth: data.data.userGrowth?.length || 0,
            ingredientTrends: data.data.ingredientTrends?.length || 0,
            userActivity: data.data.userActivityByHour?.length || 0
          });
        } else {
          throw new Error(data.message || 'Failed to fetch analytics data');
        }
      } catch (error) {
        console.error('❌ [ANALYTICS] Error fetching analytics:', error);
        console.error('❌ [ANALYTICS] Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
        
        // Show user-friendly error message
        let errorMessage = error.message || 'Failed to load analytics data';
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorMessage = 'Cannot connect to backend server. Make sure the backend is running on http://localhost:5000';
        } else if (error.message.includes('401') || error.message.includes('403')) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (error.message.includes('500')) {
          errorMessage = 'Server error. Check backend logs for details.';
        }
        
        setNotification({ 
          show: true, 
          message: `Error: ${errorMessage}`, 
          type: 'error' 
        });
        setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 8000);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalyticsData();
  }, [dateRange]);
  
  const conversionMetrics = {
    userRetention: 78,
    requestCompletion: completionRate,
    recipeEngagement: 84,
    filterUsage: 92
  };

  const COLORS = ['#2E7D32', '#e91e63', '#9c27b0', '#ff9800', '#1976d2'];

  // Helper function to escape CSV values
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const handleExport = () => {
    // Export analytics data as CSV with specified format
    const exportDate = new Date().toISOString().split('T')[0];
    const dateRangeFormatted = dateRange.replace(/\s+/g, '_').toLowerCase();
    const adminName = 'Administrator'; // Get from localStorage or context if available
    
    // Calculate filter percentages
    const filterRows = filterDistributionData.map(filter => ({
      name: filter.name,
      count: filter.value || 0,
      percentage: totalUses > 0 ? ((filter.value || 0) / totalUses * 100).toFixed(1) : '0.0'
    }));

    // Get most requested ingredient from ingredient trends
    const mostRequestedIngredient = ingredientTrendsData.length > 0 
      ? ingredientTrendsData[0].ingredient || 'N/A'
      : 'N/A';
    
    // Get top filter associated with that ingredient (simplified - use first filter)
    const topFilterAssociated = filterDistributionData.length > 0
      ? filterDistributionData[0].name || 'N/A'
      : 'N/A';

    // Build CSV rows
    const headers = [
      'Report Date Range',
      'Total Dietary Filter Uses',
      'Filter Name',
      'Filter Use Count',
      'Filter Percentage',
      'Total Requests',
      'Request Status',
      'Request Count per Status',
      'Completion Rate',
      'Most Requested Ingredient',
      'Top Filter Associated Ingredient',
      'Exported By (Admin)',
      'Exported Date'
    ];

    // Create rows for each filter
    const csvRows = [headers.map(escapeCSV).join(',')];
    
    // Add filter distribution rows
    filterRows.forEach((filter, index) => {
      const isFirstRow = index === 0;
      csvRows.push([
        isFirstRow ? dateRange : '', // Only show date range in first row
        isFirstRow ? totalUses : '', // Only show total uses in first row
        filter.name,
        filter.count,
        `${filter.percentage}%`,
        isFirstRow ? totalRequests : '', // Only show total requests in first row
        '', // Request status will be in separate rows
        '', // Request count per status will be in separate rows
        isFirstRow ? `${completionRate.toFixed(1)}%` : '', // Only show completion rate in first row
        isFirstRow ? mostRequestedIngredient : '', // Only show in first row
        isFirstRow ? topFilterAssociated : '', // Only show in first row
        isFirstRow ? adminName : '', // Only show in first row
        isFirstRow ? exportDate : '' // Only show in first row
      ].map(escapeCSV).join(','));
    });

    // Add request status rows
    requestStatusData.forEach((status, index) => {
      const isFirstStatusRow = index === 0;
      csvRows.push([
        '', // Empty date range
        '', // Empty total uses
        '', // Empty filter name
        '', // Empty filter count
        '', // Empty filter percentage
        '', // Empty total requests (already shown)
        status.status || 'Unknown',
        status.count || 0,
        '', // Empty completion rate (already shown)
        '', // Empty most requested ingredient
        '', // Empty top filter
        '', // Empty admin name
        '' // Empty export date
      ].map(escapeCSV).join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dishcovery_analytics_report_${dateRangeFormatted}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    setNotification({ show: true, message: 'Analytics exported successfully!', type: 'success' });
    setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 3000);
  };

  const CircularProgress = ({ percentage, label, color, borderColor }) => (
    <div className="circular-progress" style={{ borderLeftColor: borderColor }}>
      <svg viewBox="0 0 120 120" className="progress-ring">
        <circle
          className="progress-ring-bg"
          cx="60"
          cy="60"
          r="50"
        />
        <circle
          className="progress-ring-fill"
          cx="60"
          cy="60"
          r="50"
          style={{
            strokeDasharray: `${2 * Math.PI * 50}`,
            strokeDashoffset: `${2 * Math.PI * 50 * (1 - percentage / 100)}`,
            stroke: color
          }}
        />
      </svg>
      <div className="progress-text">
        <div className="progress-percentage">{percentage}%</div>
        <div className="progress-label">{label}</div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="analytics-content">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <p>Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-content">
      {notification.show && (
        <div className={`analytics-notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Header Controls */}
      <div className="analytics-header">
        <div className="header-left">
          <h2>Analytics Dashboard</h2>
          <p className="subtitle">Comprehensive insights and performance metrics</p>
        </div>
        <div className="header-controls">
          <div className="date-range-selector">
            <label>Date Range:</label>
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="Last 30 Days">Last 30 Days</option>
              <option value="Last 3 Months">Last 3 Months</option>
              <option value="Last 6 Months">Last 6 Months</option>
              <option value="Last Year">Last Year</option>
              <option value="Custom">Custom Range</option>
            </select>
          </div>
          <button className="export-analytics-btn" onClick={handleExport}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
              <path d="M8 15.01l1.41 1.41L11 14.84V19h2v-4.16l1.59 1.59L16 15.01 12.01 11 8 15.01z"/>
            </svg>
            Export Data
          </button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        
        {/* Dietary Filter Distribution - Donut Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>Dietary Filter Distribution</h3>
            <p className="chart-subtitle">Percentage breakdown by filter type</p>
          </div>
          <div className="donut-chart-container">
            <div className="donut-chart" style={{
              background: filterDistributionData.length > 0 ? `conic-gradient(${filterDistributionData.map((item, index) => {
                const startPercent = filterDistributionData.slice(0, index).reduce((sum, i) => sum + i.percentage, 0);
                const endPercent = startPercent + item.percentage;
                return `${COLORS[index % COLORS.length]} ${startPercent}% ${endPercent}%`;
              }).join(', ')})` : 'conic-gradient(#e5e7eb 0% 100%)'
            }}>
              <div className="donut-hole">
                <div className="donut-total">{totalUses.toLocaleString()}</div>
                <div className="donut-label">Total Uses</div>
              </div>
            </div>
          </div>
          <div className="pie-legend">
            {filterDistributionData.map((item, index) => (
              <div key={index} className="pie-legend-item">
                <span className="legend-color" style={{ background: COLORS[index] }}></span>
                <span className="legend-name">{item.name}</span>
                <span className="legend-percentage">{item.percentage}%</span>
                <span className="legend-value">{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Request Status Breakdown */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>Request Status Breakdown</h3>
            <p className="chart-subtitle">Current request pipeline</p>
          </div>
          <div className="status-chart">
            {requestStatusData.map((item, index) => (
              <div key={index} className="status-bar-item">
                <div className="status-info">
                  <span className="status-name">{item.status}</span>
                  <span className="status-count">{item.count} requests</span>
                </div>
                <div className="status-bar-bg">
                  <div 
                    className="status-bar-fill" 
                    style={{ width: `${item.percentage}%`, background: COLORS[index] }}
                  >
                    <span className="bar-percentage">{item.percentage}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="status-summary">
            <div className="summary-stat">
              <div className="summary-number">{totalRequests.toLocaleString()}</div>
              <div className="summary-label">Total Requests</div>
            </div>
            <div className="summary-stat">
              <div className="summary-number">{completionRate}%</div>
              <div className="summary-label">Completion Rate</div>
            </div>
          </div>
        </div>

        {/* Ingredient Request Trends - Line Chart */}
        <div className="chart-card full-width">
          <div className="chart-header">
            <h3>Top Ingredient Request Trends</h3>
            <p className="chart-subtitle">Monthly request patterns for popular ingredients</p>
          </div>
          <div className="line-chart-container">
            {ingredientTrendsData.length > 0 ? (
              <svg viewBox="0 0 500 200" className="line-chart-svg">
                {/* Grid lines */}
                <line x1="50" y1="20" x2="50" y2="170" stroke="#e5e7eb" strokeWidth="1"/>
                <line x1="50" y1="170" x2="480" y2="170" stroke="#e5e7eb" strokeWidth="1"/>
                {[0, 1, 2, 3, 4].map(i => (
                  <line key={i} x1="50" y1={20 + i * 37.5} x2="480" y2={20 + i * 37.5} stroke="#f3f4f6" strokeWidth="1"/>
                ))}
                
                {/* Dynamic ingredient lines */}
                {(() => {
                  // Get all unique ingredient keys from the data (excluding 'month')
                  const ingredientKeys = Object.keys(ingredientTrendsData[0] || {}).filter(key => key !== 'month');
                  
                  // Calculate max value for scaling
                  const maxValue = Math.max(
                    ...ingredientTrendsData.flatMap(month => 
                      ingredientKeys.map(key => month[key] || 0)
                    )
                  ) || 1;
                  
                  // Chart dimensions
                  const chartWidth = 430; // 480 - 50
                  const chartHeight = 150; // 170 - 20
                  const chartStartX = 50;
                  const chartStartY = 20;
                  const chartEndY = 170;
                  
                  // Generate points for each ingredient
                  return ingredientKeys.slice(0, 4).map((ingredientKey, index) => {
                    const points = ingredientTrendsData.map((month, monthIndex) => {
                      const value = month[ingredientKey] || 0;
                      const x = chartStartX + (monthIndex / (ingredientTrendsData.length - 1 || 1)) * chartWidth;
                      const y = chartEndY - (value / maxValue) * chartHeight;
                      return `${x},${y}`;
                    }).join(' ');
                    
                    return (
                      <polyline
                        key={ingredientKey}
                        points={points}
                        fill="none"
                        stroke={COLORS[index % COLORS.length]}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    );
                  });
                })()}
                
                {/* X-axis labels */}
                {ingredientTrendsData.map((month, i) => (
                  <text 
                    key={i} 
                    x={50 + (i / (ingredientTrendsData.length - 1 || 1)) * 430} 
                    y="190" 
                    fontSize="12" 
                    fill="#6b7280" 
                    textAnchor="middle"
                  >
                    {month.month}
                  </text>
                ))}
              </svg>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                No ingredient trend data available
              </div>
            )}
            <div className="line-chart-legend">
              {(() => {
                if (ingredientTrendsData.length === 0) return null;
                const ingredientKeys = Object.keys(ingredientTrendsData[0] || {}).filter(key => key !== 'month');
                return ingredientKeys.slice(0, 4).map((ingredientKey, index) => {
                  // Format ingredient name (replace underscores with spaces, capitalize)
                  const formattedName = ingredientKey
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, l => l.toUpperCase());
                  
                  return (
                    <div key={ingredientKey} className="legend-row">
                      <span 
                        style={{background: COLORS[index % COLORS.length]}} 
                        className="legend-line"
                      ></span>
                      <span>{formattedName}</span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        {/* User Activity by Time */}
        <div className="chart-card full-width">
          <div className="chart-header">
            <h3>User Activity by Time of Day</h3>
            <p className="chart-subtitle">Peak usage hours for optimization</p>
          </div>
          <div className="bar-chart-horizontal">
            {userActivityByHour.map((item, index) => (
              <div key={index} className="h-bar-item">
                <div className="h-bar-label">{item.hour}</div>
                <div className="h-bar-container">
                  <div 
                    className="h-bar-fill" 
                    style={{ width: `${(item.users / 312) * 100}%`, background: '#9c27b0' }}
                  >
                    <span className="h-bar-value">{item.users}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

const Analytics = () => {
  const [logoutNotification, setLogoutNotification] = useState({ show: false, message: '', type: 'info' });

  const handleLogout = async () => {
    try {
      setLogoutNotification({ show: true, message: 'Logging out...', type: 'info' });
      
      // Clear storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Redirect to home
      setTimeout(() => {
        window.location.href = '/user/home';
      }, 1000);
    } catch (error) {
      console.error('Logout error:', error);
      setLogoutNotification({ show: true, message: 'Logout failed. Redirecting...', type: 'error' });
      setTimeout(() => {
        window.location.href = '/user/home';
      }, 1000);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {logoutNotification.show && (
        <div className={`analytics-notification ${logoutNotification.type}`}>
          {logoutNotification.message}
        </div>
      )}
      
      <AdminLayout currentPage="Analytics" onLogout={handleLogout}>
        <AnalyticsContent />
      </AdminLayout>
    </div>
  );
};

export default Analytics;