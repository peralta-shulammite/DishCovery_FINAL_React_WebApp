'use client';
import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/adminlayout';
import './styles.css';

const AnalyticsContent = () => {
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [selectedMetric, setSelectedMetric] = useState('all');
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });

  // Sample data for charts - Replace with actual API calls
  const userGrowthData = [
    { date: 'Week 1', users: 1240, active: 890, new: 85 },
    { date: 'Week 2', users: 1350, active: 920, new: 110 },
    { date: 'Week 3', users: 1480, active: 1050, new: 130 },
    { date: 'Week 4', users: 1620, active: 1150, new: 140 },
    { date: 'Week 5', users: 1750, active: 1280, new: 130 },
    { date: 'Week 6', users: 1876, active: 1420, new: 126 }
  ];

  const filterDistributionData = [
    { name: 'Vegetarian', value: 2341, percentage: 31 },
    { name: 'Gluten-Free', value: 1876, percentage: 25 },
    { name: 'Dairy-Free', value: 1543, percentage: 20 },
    { name: 'Keto', value: 1234, percentage: 16 },
    { name: 'Vegan', value: 987, percentage: 8 }
  ];

  const requestStatusData = [
    { status: 'Completed', count: 456, percentage: 68 },
    { status: 'Processing', count: 142, percentage: 21 },
    { status: 'Pending', count: 73, percentage: 11 }
  ];

  const ingredientTrendsData = [
    { month: 'Jan', chicken: 320, avocado: 280, quinoa: 240, salmon: 200 },
    { month: 'Feb', chicken: 350, avocado: 310, quinoa: 260, salmon: 220 },
    { month: 'Mar', chicken: 380, avocado: 340, quinoa: 290, salmon: 240 },
    { month: 'Apr', chicken: 420, avocado: 370, quinoa: 320, salmon: 270 },
    { month: 'May', chicken: 456, avocado: 398, quinoa: 342, salmon: 289 }
  ];

  const userActivityByHour = [
    { hour: '12am', users: 45 },
    { hour: '3am', users: 23 },
    { hour: '6am', users: 78 },
    { hour: '9am', users: 156 },
    { hour: '12pm', users: 289 },
    { hour: '3pm', users: 234 },
    { hour: '6pm', users: 312 },
    { hour: '9pm', users: 245 }
  ];

  const conversionMetrics = {
    userRetention: 78,
    requestCompletion: 68,
    recipeEngagement: 84,
    filterUsage: 92
  };

  const COLORS = ['#2E7D32', '#e91e63', '#9c27b0', '#ff9800', '#1976d2'];

  const handleExport = () => {
    setNotification({ show: true, message: 'Exporting analytics data...', type: 'info' });
    setTimeout(() => {
      setNotification({ show: true, message: 'Analytics exported successfully!', type: 'success' });
      setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 3000);
    }, 1500);
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
            Export Report
          </button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="kpi-section">
        <h3>Key Performance Indicators</h3>
        <div className="kpi-grid">
          <CircularProgress 
            percentage={conversionMetrics.userRetention} 
            label="User Retention" 
            color="#2E7D32" 
            borderColor="#2E7D32" 
          />
          <CircularProgress 
            percentage={conversionMetrics.requestCompletion} 
            label="Request Completion" 
            color="#e91e63" 
            borderColor="#e91e63" 
          />
          <CircularProgress 
            percentage={conversionMetrics.recipeEngagement} 
            label="Recipe Engagement" 
            color="#9c27b0" 
            borderColor="#9c27b0" 
          />
          <CircularProgress 
            percentage={conversionMetrics.filterUsage} 
            label="Filter Usage" 
            color="#ff9800" 
            borderColor="#ff9800" 
          />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        
        {/* User Growth Over Time - Simple Bar Chart */}
        <div className="chart-card full-width">
          <div className="chart-header">
            <h3>User Growth Over Time</h3>
            <div className="chart-legend-custom">
              <span className="legend-item"><span className="legend-dot" style={{background: '#2E7D32'}}></span> Total Users</span>
              <span className="legend-item"><span className="legend-dot" style={{background: '#e91e63'}}></span> Active Users</span>
              <span className="legend-item"><span className="legend-dot" style={{background: '#9c27b0'}}></span> New Users</span>
            </div>
          </div>
          <div className="simple-chart">
            <div className="chart-bars-container">
              {userGrowthData.map((week, index) => (
                <div key={index} className="chart-bar-group">
                  <div className="bar-stack">
                    <div 
                      className="bar-segment" 
                      style={{ height: `${(week.users / 2000) * 100}%`, background: '#2E7D32', opacity: 0.3 }}
                      title={`Total: ${week.users}`}
                    ></div>
                    <div 
                      className="bar-segment" 
                      style={{ height: `${(week.active / 2000) * 100}%`, background: '#e91e63', opacity: 0.5, position: 'absolute', bottom: 0 }}
                      title={`Active: ${week.active}`}
                    ></div>
                    <div 
                      className="bar-segment" 
                      style={{ height: `${(week.new / 2000) * 100}%`, background: '#9c27b0', position: 'absolute', bottom: 0 }}
                      title={`New: ${week.new}`}
                    ></div>
                  </div>
                  <div className="bar-label">{week.date}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dietary Filter Distribution - Donut Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>Dietary Filter Distribution</h3>
            <p className="chart-subtitle">Percentage breakdown by filter type</p>
          </div>
          <div className="donut-chart-container">
            <div className="donut-chart" style={{
              background: `conic-gradient(
                ${COLORS[0]} 0% 31%,
                ${COLORS[1]} 31% 56%,
                ${COLORS[2]} 56% 76%,
                ${COLORS[3]} 76% 92%,
                ${COLORS[4]} 92% 100%
              )`
            }}>
              <div className="donut-hole">
                <div className="donut-total">7,981</div>
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
              <div className="summary-number">671</div>
              <div className="summary-label">Total Requests</div>
            </div>
            <div className="summary-stat">
              <div className="summary-number">68%</div>
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
            <svg viewBox="0 0 500 200" className="line-chart-svg">
              {/* Grid lines */}
              <line x1="50" y1="20" x2="50" y2="170" stroke="#e5e7eb" strokeWidth="1"/>
              <line x1="50" y1="170" x2="480" y2="170" stroke="#e5e7eb" strokeWidth="1"/>
              {[0, 1, 2, 3, 4].map(i => (
                <line key={i} x1="50" y1={20 + i * 37.5} x2="480" y2={20 + i * 37.5} stroke="#f3f4f6" strokeWidth="1"/>
              ))}
              
              {/* Chicken line */}
              <polyline
                points="50,100 136,85 222,70 308,50 394,35 480,20"
                fill="none"
                stroke="#2E7D32"
                strokeWidth="3"
              />
              {/* Avocado line */}
              <polyline
                points="50,110 136,95 222,80 308,65 394,55 480,40"
                fill="none"
                stroke="#e91e63"
                strokeWidth="3"
              />
              {/* Quinoa line */}
              <polyline
                points="50,120 136,105 222,95 308,80 394,70 480,60"
                fill="none"
                stroke="#9c27b0"
                strokeWidth="3"
              />
              {/* Salmon line */}
              <polyline
                points="50,130 136,120 222,110 308,100 394,90 480,80"
                fill="none"
                stroke="#ff9800"
                strokeWidth="3"
              />
              
              {/* X-axis labels */}
              {['Jan', 'Feb', 'Mar', 'Apr', 'May'].map((month, i) => (
                <text key={month} x={50 + i * 86} y="190" fontSize="12" fill="#6b7280" textAnchor="middle">{month}</text>
              ))}
            </svg>
            <div className="line-chart-legend">
              <div className="legend-row">
                <span style={{background: '#2E7D32'}} className="legend-line"></span>
                <span>Chicken Breast</span>
              </div>
              <div className="legend-row">
                <span style={{background: '#e91e63'}} className="legend-line"></span>
                <span>Avocado</span>
              </div>
              <div className="legend-row">
                <span style={{background: '#9c27b0'}} className="legend-line"></span>
                <span>Quinoa</span>
              </div>
              <div className="legend-row">
                <span style={{background: '#ff9800'}} className="legend-line"></span>
                <span>Salmon</span>
              </div>
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

        {/* Insights & Recommendations */}
        <div className="insights-card full-width">
          <h3>Key Insights & Recommendations</h3>
          <div className="insights-grid">
            <div className="insight-item positive">
              <div className="insight-icon">📈</div>
              <div className="insight-content">
                <h4>Strong User Growth</h4>
                <p>User base increased by 51% over the last 6 weeks. Active users up 60%.</p>
              </div>
            </div>
            <div className="insight-item warning">
              <div className="insight-icon">⚠️</div>
              <div className="insight-content">
                <h4>Peak Hour Load</h4>
                <p>6pm shows highest activity (312 users). Consider scaling server resources.</p>
              </div>
            </div>
            <div className="insight-item info">
              <div className="insight-icon">💡</div>
              <div className="insight-content">
                <h4>Filter Preference Trend</h4>
                <p>Vegetarian filter usage up 40% this month. Recommend adding more vegetarian recipes.</p>
              </div>
            </div>
            <div className="insight-item positive">
              <div className="insight-icon">✅</div>
              <div className="insight-content">
                <h4>High Completion Rate</h4>
                <p>68% request completion rate indicates efficient admin workflow.</p>
              </div>
            </div>
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