'use client';
import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/adminlayout';
import './styles.css';

// // 🧪 TEMPORARY BYPASS FOR TESTING - REMOVE IN PRODUCTION  
// const BYPASS_AUTH_FOR_TESTING = true;

// const getAuthToken = () => {
//   if (BYPASS_AUTH_FOR_TESTING) {
//     console.warn('⚠️ BYPASSING AUTH FOR TESTING - REMOVE IN PRODUCTION');
//     return 'test-token';
//   }
  
//   const token = localStorage.getItem('token');
//   // ... rest of existing getAuthToken code stays the same
// };

const DietaryRestrictionsManagementContent = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRestriction, setSelectedRestriction] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const restrictionsPerPage = 10;

  const [restrictions, setRestrictions] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 🔐 ENHANCED TOKEN MANAGEMENT
  const getAuthToken = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('⚠️ No authentication token found');
      return null;
    }
    
    // Basic token validation
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      if (payload.exp && payload.exp < currentTime) {
        console.warn('⚠️ Token has expired');
        handleAuthError('Token expired');
        return null;
      }
      
      console.log('✅ Token is valid');
      return token;
    } catch (error) {
      console.error('❌ Invalid token format:', error);
      handleAuthError('Invalid token format');
      return null;
    }
  };

  // 🚨 ENHANCED ERROR HANDLING
  const handleAuthError = (message) => {
    console.error('🔐 Authentication Error:', message);
    
    // Clear invalid token
    localStorage.removeItem('token');
    
    // Show user-friendly message
    setError(`Authentication failed: ${message}. Please log in again.`);
    
    // Redirect to login after a delay
    setTimeout(() => {
      window.location.href = '/login'; // Adjust path as needed
    }, 3000);
  };

  // 🔧 ENHANCED API CALL WRAPPER
  const makeAuthenticatedRequest = async (url, options = {}) => {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('No valid authentication token');
    }

    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const requestOptions = { ...defaultOptions, ...options };
    
    console.log(`🌐 Making request to: ${url}`);
    console.log('📋 Request headers:', requestOptions.headers);

    try {
      const response = await fetch(url, requestOptions);
      
      // Handle different response status codes
      if (response.status === 401) {
        throw new Error('Invalid or expired token');
      } else if (response.status === 403) {
        throw new Error('Access forbidden - insufficient permissions');
      } else if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Request failed:', error);
      
      // Handle specific authentication errors
      if (error.message.includes('token') || error.message.includes('401') || error.message.includes('403')) {
        handleAuthError(error.message);
      }
      
      throw error;
    }
  };

  // Form state for adding/editing restrictions
  const [formData, setFormData] = useState({
    name: '',
    category: 'Allergies', // Changed from 'Medical' to 'Allergies'
    description: '',
    status: 'Active',
    visibility: 'Public',
  });

  const categories = ['Allergies', 'Health Conditions', 'Dietary Lifestyle'].sort();
  const statuses = ['Active', 'Inactive'];

  // 🔄 ENHANCED DATA LOADING
  useEffect(() => {
    loadDataFromAPI();
  }, []);

  const loadDataFromAPI = async () => {
    try {
      setLoading(true);
      setError(''); // Clear previous errors
      console.log('📥 Loading data from API...');
      
      // Load restrictions with enhanced error handling
      try {
        const restrictionsData = await makeAuthenticatedRequest('http://localhost:5000/api/dietary-restrictions/admin');
        
        if (restrictionsData.success) {
          setRestrictions(restrictionsData.data);
          console.log('✅ Loaded restrictions from database');
        } else {
          throw new Error(restrictionsData.message || 'Failed to load restrictions');
        }
      } catch (error) {
        console.error('❌ Error loading restrictions:', error);
        setError(`Failed to load restrictions: ${error.message}`);
      }

      // Load pending requests with enhanced error handling
      try {
        const pendingData = await makeAuthenticatedRequest('http://localhost:5000/api/dietary-restrictions/admin/pending-requests');
        
        if (pendingData.success) {
          setPendingRequests(pendingData.data);
          console.log('✅ Loaded pending requests from database');
        } else {
          console.warn('⚠️ Could not load pending requests:', pendingData.message);
          // Don't set error for pending requests as it's not critical
        }
      } catch (error) {
        console.warn('⚠️ Error loading pending requests:', error);
        // Don't set error for pending requests as it's not critical
      }

    } catch (error) {
      console.error('❌ Critical error loading data:', error);
      setError('Failed to load data. Please refresh the page or try logging in again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRestriction = () => {
    setSelectedRestriction(null);
    resetForm();
    setShowAddModal(true);
  };

  const handleEditRestriction = (restriction) => {
    setSelectedRestriction(restriction);
    setFormData({
      name: restriction.name,
      category: restriction.category,
      description: restriction.description,
      status: restriction.status,
      visibility: restriction.visibility || 'Public',
    });
    setShowEditModal(true);
  };

  // 🗑️ ENHANCED DELETE WITH AUTH
  const handleDeleteRestriction = async (restrictionId) => {
    if (!window.confirm('Are you sure you want to delete this restriction?')) {
      return;
    }

    try {
      console.log(`🗑️ Deleting restriction ID: ${restrictionId}`);
      
      const result = await makeAuthenticatedRequest(
        `http://localhost:5000/api/dietary-restrictions/admin/${restrictionId}`,
        { method: 'DELETE' }
      );

      if (result.success) {
        console.log('✅ Restriction deleted successfully');
        alert(result.message);
        loadDataFromAPI(); // Reload data
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('❌ Error deleting restriction:', error);
      alert(`Failed to delete restriction: ${error.message}`);
    }
  };

  // ✅ ENHANCED APPROVE REQUEST WITH AUTH
  const handleApproveRequest = async (request) => {
    try {
      console.log('✅ Approving request:', request);
      
      const result = await makeAuthenticatedRequest(
        'http://localhost:5000/api/dietary-restrictions/admin',
        {
          method: 'POST',
          body: JSON.stringify({
            name: request.name,
            category: 'Custom',
            description: request.suggestedDescription,
            status: 'Active'
          })
        }
      );

      if (result.success) {
        console.log('✅ Request approved successfully');
        alert(`Restriction "${request.name}" has been approved and added.`);
        loadDataFromAPI(); // Reload data
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('❌ Error approving request:', error);
      alert(`Failed to approve request: ${error.message}`);
    }
  };

  const handleRejectRequest = (requestId) => {
    if (window.confirm('Are you sure you want to reject this request?')) {
      setPendingRequests(pendingRequests.filter((r) => r.id !== requestId));
    }
  };

  // 💾 ENHANCED FORM SUBMIT WITH AUTH
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
  // 🔍 DEBUG: Log what we're sending
  console.log('🚀 Form Data Being Sent:', formData);
  console.log('📍 API Endpoint:', selectedRestriction 
    ? `http://localhost:5000/api/dietary-restrictions/admin/${selectedRestriction.id}`
    : 'http://localhost:5000/api/dietary-restrictions/admin');

    try {
      console.log('💾 Submitting form to API...');
      
      const url = selectedRestriction 
        ? `http://localhost:5000/api/dietary-restrictions/admin/${selectedRestriction.id}`
        : 'http://localhost:5000/api/dietary-restrictions/admin';
      
      const method = selectedRestriction ? 'PUT' : 'POST';

      const result = await makeAuthenticatedRequest(url, {
        method,
        body: JSON.stringify(formData)
      });

      if (result.success) {
        console.log('✅ Form submitted successfully');
        alert(selectedRestriction ? 'Restriction updated successfully!' : 'Restriction created successfully!');
        
        // Close modals and reload data
        setShowAddModal(false);
        setShowEditModal(false);
        resetForm();
        loadDataFromAPI();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('❌ Error submitting form:', error);
      alert(`Failed to save restriction: ${error.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'Allergies',  // ✅ FIXED TO MATCH DATABASE
      description: '',
      status: 'Active',
      visibility: 'Public',
    });
    setSelectedRestriction(null);
  };
  
  const filteredRestrictions = restrictions.filter((restriction) => {
    const matchesSearch = restriction.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || restriction.category === categoryFilter;
    const matchesStatus = statusFilter === 'All' || restriction.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Pagination logic
  const indexOfLastRestriction = currentPage * restrictionsPerPage;
  const indexOfFirstRestriction = indexOfLastRestriction - restrictionsPerPage;
  const currentRestrictions = filteredRestrictions.slice(indexOfFirstRestriction, indexOfLastRestriction);
  const totalPages = Math.ceil(filteredRestrictions.length / restrictionsPerPage);

  // 🔐 ENHANCED LOADING STATE WITH AUTH CHECK
  if (loading) {
    return (
      <div className="main-content">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <div style={{ textAlign: 'center' }}>
            <p>Loading dietary restrictions...</p>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
              Verifying authentication...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 🚨 ENHANCED ERROR STATE
  if (error) {
    return (
      <div className="main-content">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ 
            background: '#fee', 
            border: '1px solid #fcc', 
            borderRadius: '8px', 
            padding: '20px',
            maxWidth: '500px',
            margin: '0 auto'
          }}>
            <h3 style={{ color: '#c33', marginBottom: '10px' }}>⚠️ Authentication Error</h3>
            <p style={{ color: '#c33', marginBottom: '20px' }}>{error}</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                onClick={loadDataFromAPI} 
                style={{ 
                  padding: '10px 20px', 
                  background: '#2E7D32', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Retry
              </button>
              <button 
                onClick={() => window.location.href = '/login'} 
                style={{ 
                  padding: '10px 20px', 
                  background: '#1976D2', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Icons Components
  const SearchIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    </svg>
  );

  const PlusIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
    </svg>
  );

  const EditIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  );

  const DeleteIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
  );

  const CloseIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  );

  return (
    <div className="main-content">
      {/* Overview Panel */}
      <div className="controls-container">
        <div className="status-filters">
          <span className="filter-label">Total Restrictions:</span>
          <span>{restrictions.length}</span>
        </div>
        <div className="status-filters">
          <span className="filter-label">Most Used:</span>
          <span>
            {restrictions.sort((a, b) => b.usedBy - a.usedBy)[0]?.name || 'None'}
          </span>
        </div>
        <div className="status-filters">
          <span className="filter-label">Recently Added:</span>
          <span>
            {restrictions.sort((a, b) => new Date(b.lastEdited) - new Date(a.lastEdited))[0]?.name || 'None'}
          </span>
        </div>
        <button className="export-btn" onClick={handleAddRestriction}>
          <PlusIcon />
          Add Restriction
        </button>
      </div>

      {/* Filters */}
      <div className="controls-container">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search restrictions..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="search-btn">
            <SearchIcon />
          </button>
        </div>
        <div className="status-filters">
          <span className="filter-label">Status:</span>
          <button
            className={`filter-btn ${statusFilter === 'All' ? 'active' : ''}`}
            onClick={() => setStatusFilter('All')}
          >
            All
          </button>
          {statuses.map((status) => (
            <button
              key={status}
              className={`filter-btn ${statusFilter === status ? 'active' : ''}`}
              onClick={() => setStatusFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>
        <div className="date-range">
          <span className="filter-label">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="date-select"
          >
            <option value="All">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <button
          className="export-btn"
          onClick={() => {
            const csvContent = [
              ['ID', 'Name', 'Category', 'Description', 'Status', 'Used By', 'Last Edited', 'Last Edited By'],
              ...restrictions.map((r) => [
                r.id,
                r.name,
                r.category,
                r.description,
                r.status,
                r.usedBy,
                r.lastEdited,
                r.lastEditedBy,
              ]),
            ]
              .map((row) => row.join(','))
              .join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'restrictions.csv';
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Export to CSV
        </button>
      </div>

      {/* Restriction List Table */}
      <div className="recipe-display list">
        {currentRestrictions.length === 0 ? (
          <div className="no-recipes">
            <p>No restrictions found matching your criteria.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Restriction Name</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Category</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Description</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Used By</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentRestrictions.map((restriction) => (
                <tr
                  key={restriction.id}
                  style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                  onClick={() => handleEditRestriction(restriction)}
                >
                  <td style={{ padding: '12px', color: '#1f2937' }}>{restriction.name}</td>
                  <td style={{ padding: '12px', color: '#64748b' }}>{restriction.category}</td>
                  <td style={{ padding: '12px', color: '#64748b' }}>{restriction.description}</td>
                  <td style={{ padding: '12px' }}>
                    <span
                      className={`verification-badge ${restriction.status === 'Active' ? 'verified' : 'ai'}`}
                    >
                      {restriction.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: '#64748b' }}>{restriction.usedBy} users</td>
                  <td style={{ padding: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      className="btn-edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditRestriction(restriction);
                      }}
                      style={{ padding: '6px 12px', minWidth: '80px' }}
                    >
                      <EditIcon />
                      Edit
                    </button>
                    <button
                      className="btn-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRestriction(restriction.id);
                      }}
                      style={{ padding: '6px 12px', minWidth: '80px' }}
                    >
                      <DeleteIcon />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            style={{
              padding: '8px 16px',
              background: currentPage === 1 ? '#e5e7eb' : '#2E7D32',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            }}
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            style={{
              padding: '8px 16px',
              background: currentPage === totalPages ? '#e5e7eb' : '#2E7D32',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            }}
          >
            Next
          </button>
        </div>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="controls-container" style={{ marginTop: '30px' }}>
          <h3>Pending User Requests</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Requested Term</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>User</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Date Submitted</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Suggested Description</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingRequests.map((request) => (
                <tr key={request.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px', color: '#1f2937' }}>{request.name}</td>
                  <td style={{ padding: '12px', color: '#64748b' }}>{request.user}</td>
                  <td style={{ padding: '12px', color: '#64748b' }}>{request.dateSubmitted}</td>
                  <td style={{ padding: '12px', color: '#64748b' }}>{request.suggestedDescription}</td>
                  <td style={{ padding: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      className="btn-edit"
                      onClick={() => handleApproveRequest(request)}
                      style={{ padding: '6px 12px', minWidth: '80px' }}
                    >
                      <EditIcon />
                      Approve
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleRejectRequest(request.id)}
                      style={{ padding: '6px 12px', minWidth: '80px' }}
                    >
                      <DeleteIcon />
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Restriction Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Restriction</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="recipe-form">
              <div className="form-section">
                <label className="form-label">Restriction Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-section">
                <label className="form-label">Category *</label>
                <select
                  className="form-select"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-section">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                />
              </div>
              <div className="form-section">
                <label className="form-label">Status *</label>
                <select
                  className="form-select"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-section">
                <label className="form-label">Visibility *</label>
                <select
                  className="form-select"
                  value={formData.visibility}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                >
                  <option value="Public">Public</option>
                  <option value="Admin-only">Admin-only</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Add Restriction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Restriction Modal */}
      {showEditModal && selectedRestriction && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Restriction</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="recipe-form">
              <div className="form-section">
                <label className="form-label">Restriction Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-section">
                <label className="form-label">Category *</label>
                <select
                  className="form-select"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-section">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                />
              </div>
              <div className="form-section">
                <label className="form-label">Status *</label>
                <select
                  className="form-select"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-section">
                <label className="form-label">Visibility *</label>
                <select
                  className="form-select"
                  value={formData.visibility}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                >
                  <option value="Public">Public</option>
                  <option value="Admin-only">Admin-only</option>
                </select>
              </div>
              <div className="form-section">
                <label className="form-label">Merge with Existing Restriction (Optional)</label>
                <select
                  className="form-select"
                  onChange={(e) => {
                    if (e.target.value && window.confirm('Are you sure you want to merge this restriction?')) {
                      const targetRestriction = restrictions.find((r) => r.id === parseInt(e.target.value));
                      if (targetRestriction) {
                        setRestrictions(
                          restrictions
                            .map((r) =>
                              r.id === targetRestriction.id
                                ? {
                                    ...r,
                                    usedBy: r.usedBy + selectedRestriction.usedBy,
                                    changeLog: [
                                      ...r.changeLog,
                                      {
                                        date: new Date().toISOString().split('T')[0],
                                        by: 'Admin',
                                        change: `Merged with ${selectedRestriction.name}`,
                                      },
                                    ],
                                  }
                                : r
                            )
                            .filter((r) => r.id !== selectedRestriction.id)
                        );
                        setShowEditModal(false);
                        resetForm();
                      }
                    }
                  }}
                >
                  <option value="">Select restriction to merge with</option>
                  {restrictions
                    .filter((r) => r.id !== selectedRestriction.id)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="form-section">
                <label className="form-label">Change Log</label>
                <ul style={{ padding: '0', listStyle: 'none' }}>
                  {selectedRestriction.changeLog?.map((log, index) => (
                    <li key={index} style={{ color: '#64748b', marginBottom: '8px' }}>
                      {log.date} - {log.by}: {log.change}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Update Restriction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const DietaryRestrictionsManagement = () => {
  return (
    <AdminLayout currentPage="Dietary Restrictions">
      <DietaryRestrictionsManagementContent />
    </AdminLayout>
  );
};

export default DietaryRestrictionsManagement;