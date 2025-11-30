'use client';
import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/adminlayout';
import './styles.css';

const AdminManagementPage = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('This Week');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    password: '',
    avatar: null
  });

  // ✅ FIX: Use same pattern as other API files - check Vercel first
  // Extract getApiBaseUrl to component level for reuse
  const getApiBaseUrl = () => {
    if (typeof window !== 'undefined') {
      // For localhost testing, always use localhost
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:5000/api';
      }
    }
    // Use environment variable for production/Vercel deployment
    let baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
    baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    if (!baseUrl.endsWith('/api')) {
      baseUrl = `${baseUrl}/api`;
    }
    return baseUrl;
  };

  // Fetch admins from backend
  const fetchAdmins = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const API_BASE_URL = getApiBaseUrl();
      const fullUrl = `${API_BASE_URL}/admin-auth/list`;

      const token = localStorage.getItem('authToken') || localStorage.getItem('token') || 'test-admin-token';

      console.log('🔍 [ADMIN LIST] Fetching admins from:', fullUrl);

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error(`Server returned non-JSON response. Status: ${response.status}`);
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Failed to fetch admins');
      }

      if (result.success && result.admins) {
        setAdmins(result.admins);
        console.log(`✅ [ADMIN LIST] Loaded ${result.admins.length} admin(s)`);
      } else {
        throw new Error(result.message || 'Failed to fetch admins');
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
      setError(error.message);
      // Set empty array on error so UI doesn't break
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch admins on component mount
  useEffect(() => {
    fetchAdmins();
  }, []);


  const handleAddAdmin = async () => {
    if (!newAdmin.name || !newAdmin.email || !newAdmin.password) {
      alert('Please fill in all fields including password');
      return;
    }

    try {
      const API_BASE_URL = getApiBaseUrl();
      const fullUrl = `${API_BASE_URL}/admin-auth/create`;
      
      const token = localStorage.getItem('authToken') || localStorage.getItem('token') || 'test-admin-token';

      // Split name into firstName and lastName
      const nameParts = newAdmin.name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      console.log('🔍 [ADMIN CREATE] API URL:', fullUrl);
      console.log('🔍 [ADMIN CREATE] Request data:', { firstName, lastName, email: newAdmin.email });

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: firstName,
          lastName: lastName,
          email: newAdmin.email,
          password: newAdmin.password
        })
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error(`Server returned non-JSON response. Status: ${response.status}`);
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Failed to create admin');
      }

      if (result.success && result.admin) {
        // Add the new admin to the list with the admin_id from the backend
        const admin = {
          id: result.admin.adminId, // Use admin_id from backend
          name: `${result.admin.firstName} ${result.admin.lastName}`.trim(),
          email: result.admin.email,
          status: result.admin.status || 'Active',
          lastActive: 'Just now',
          avatar: null,
          createdDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          lastLogin: 'Never',
          activityLogs: ['Account created - Just now']
        };
        // Refresh admins list after creation
        await fetchAdmins();
        
        setNewAdmin({ name: '', email: '', password: '', avatar: null });
        setShowAddModal(false);
        
        // Show verification modal
        setPendingVerificationEmail(result.admin.email);
        setVerificationCode('');
        setVerificationError('');
        setShowVerificationModal(true);
      } else {
        throw new Error(result.message || 'Failed to create admin');
      }
    } catch (error) {
      console.error('Error creating admin:', error);
      alert(`Failed to create admin: ${error.message}`);
    }
  };

  const handleVerifyAdmin = async () => {
    if (!verificationCode || !pendingVerificationEmail) {
      setVerificationError('Please enter the verification code');
      return;
    }

    try {
      const API_BASE_URL = getApiBaseUrl();
      const fullUrl = `${API_BASE_URL}/admin-auth/verify`;

      const token = localStorage.getItem('authToken') || localStorage.getItem('token') || 'test-admin-token';

      console.log('🔍 [ADMIN VERIFY] Verifying admin:', { email: pendingVerificationEmail, code: verificationCode });

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: pendingVerificationEmail,
          code: verificationCode.trim()
        })
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error(`Server returned non-JSON response. Status: ${response.status}`);
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Failed to verify admin');
      }

      if (result.success) {
        // Refresh admins list after verification
        await fetchAdmins();
        
        setShowVerificationModal(false);
        setPendingVerificationEmail('');
        setVerificationCode('');
        setVerificationError('');
        alert('✅ Admin verified successfully! They can now access the admin panel.');
      } else {
        throw new Error(result.message || 'Failed to verify admin');
      }
    } catch (error) {
      console.error('Error verifying admin:', error);
      setVerificationError(error.message);
    }
  };

  const handleEditAdmin = async () => {
    if (!editingAdmin) return;

    // Split name into firstName and lastName
    const nameParts = editingAdmin.name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    if (!firstName || !lastName || !editingAdmin.email) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const API_BASE_URL = getApiBaseUrl();
      const fullUrl = `${API_BASE_URL}/admin-auth/${editingAdmin.id}`;

      const token = localStorage.getItem('authToken') || localStorage.getItem('token') || 'test-admin-token';

      console.log('🔍 [ADMIN UPDATE] Updating admin:', { id: editingAdmin.id, firstName, lastName, email: editingAdmin.email });

      const response = await fetch(fullUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: firstName,
          lastName: lastName,
          email: editingAdmin.email
        })
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error(`Server returned non-JSON response. Status: ${response.status}`);
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Failed to update admin');
      }

      if (result.success) {
        // Refresh admins list after update
        await fetchAdmins();
        setShowEditModal(false);
        setEditingAdmin(null);
        alert('Admin updated successfully!');
      } else {
        throw new Error(result.message || 'Failed to update admin');
      }
    } catch (error) {
      console.error('Error updating admin:', error);
      alert(`Failed to update admin: ${error.message}`);
    }
  };

  const handleDeleteAdmin = async (adminId) => {
    if (!confirm('Are you sure you want to delete this admin? This action cannot be undone.')) {
      return;
    }

    try {
      const API_BASE_URL = getApiBaseUrl();
      const fullUrl = `${API_BASE_URL}/admin-auth/${adminId}`;

      const token = localStorage.getItem('authToken') || localStorage.getItem('token') || 'test-admin-token';

      console.log('🔍 [ADMIN DELETE] Deleting admin:', adminId);

      const response = await fetch(fullUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error(`Server returned non-JSON response. Status: ${response.status}`);
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Failed to delete admin');
      }

      if (result.success) {
        // Refresh admins list after deletion
        await fetchAdmins();
        alert('Admin deleted successfully!');
      } else {
        throw new Error(result.message || 'Failed to delete admin');
      }
    } catch (error) {
      console.error('Error deleting admin:', error);
      alert(`Failed to delete admin: ${error.message}`);
    }
  };

  const handleToggleStatus = async (adminId) => {
    try {
      const API_BASE_URL = getApiBaseUrl();
      const fullUrl = `${API_BASE_URL}/admin-auth/${adminId}/toggle-status`;

      const token = localStorage.getItem('authToken') || localStorage.getItem('token') || 'test-admin-token';

      console.log('🔍 [ADMIN TOGGLE STATUS] Toggling status for admin:', adminId);

      const response = await fetch(fullUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error(`Server returned non-JSON response. Status: ${response.status}`);
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Failed to toggle admin status');
      }

      if (result.success) {
        // Refresh admins list after status change
        await fetchAdmins();
      } else {
        throw new Error(result.message || 'Failed to toggle admin status');
      }
    } catch (error) {
      console.error('Error toggling admin status:', error);
      alert(`Failed to toggle admin status: ${error.message}`);
    }
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getStatusColor = (status) => {
    return status === 'Active' ? 'status-completed' : 'status-pending';
  };

  const EditIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
    </svg>
  );

  const DeleteIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
    </svg>
  );

  const CloseIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>
  );

  const PlusIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
    </svg>
  );

  const ExportIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
      <path d="M8 15.01l1.41 1.41L11 14.84V19h2v-4.16l1.59 1.59L16 15.01 12.01 11 8 15.01z"/>
    </svg>
  );

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
    // Export admins data as CSV
    const filteredAdmins = admins.filter(admin => statusFilter === 'All' || admin.status === statusFilter);
    
    const headers = [
      'Admin ID',
      'Name',
      'Email',
      'Status',
      'Last Active',
      'Created Date',
      'Last Login'
    ];

    const csvRows = [
      headers.map(escapeCSV).join(','),
      ...filteredAdmins.map(admin => [
        admin.id,
        admin.name,
        admin.email,
        admin.status,
        admin.lastActive,
        admin.createdDate,
        admin.lastLogin
      ].map(escapeCSV).join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `admins-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    alert(`Exported ${filteredAdmins.length} admin(s) successfully as CSV.`);
  };

  return (
    <AdminLayout currentPage="Admins">
      <div>
        <div className="page-header-enhanced">
          <div className="header-content">
            <div className="header-text">
              <h1 className="page-title">Admin Management</h1>
              <p className="page-description">Manage administrator accounts and permissions</p>
            </div>
            <div className="header-actions">
              <button className="add-admin-btn" onClick={() => setShowAddModal(true)}>
                <PlusIcon />
                Add New Admin
              </button>
            </div>
          </div>
        </div>

        <div className="controls-section">
          <div className="controls-header">
            <h3>Filter Admins</h3>
          </div>
          
          <div className="controls-container-inner">
            <div className="filter-section">
              <div className="filter-group">
                <span className="filter-label">Status Filter</span>
                <div className="status-filters">
                  <button className={`filter-btn ${statusFilter === 'All' ? 'active' : ''}`} onClick={() => setStatusFilter('All')}>All</button>
                  <button className={`filter-btn ${statusFilter === 'Active' ? 'active' : ''}`} onClick={() => setStatusFilter('Active')}>Active</button>
                  <button className={`filter-btn ${statusFilter === 'Inactive' ? 'active' : ''}`} onClick={() => setStatusFilter('Inactive')}>Inactive</button>
                </div>
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
        
        <div className="admin-table-container">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              Loading admins...
            </div>
          ) : error ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#c33' }}>
              <p>Error loading admins: {error}</p>
              <button 
                onClick={fetchAdmins}
                style={{ 
                  marginTop: '10px', 
                  padding: '8px 16px', 
                  backgroundColor: '#2E7D32', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Retry
              </button>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Profile</th>
                  <th>Last Active</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                      No admins found. Click "+ Add New Admin" to create one.
                    </td>
                  </tr>
                ) : (
                  admins
                    .filter(admin => statusFilter === 'All' || admin.status === statusFilter)
                    .map((admin) => (
                  <tr key={admin.id}>
                    <td>
                      <div className="admin-profile-cell">
                        <div className="admin-avatar-table">
                          {admin.avatar ? <img src={admin.avatar} alt={admin.name} /> : getInitials(admin.name)}
                        </div>
                        <div className="admin-info">
                          <a 
                            className="admin-name-link" 
                            onClick={() => {
                              setSelectedAdmin(admin);
                              setShowDetailModal(true);
                            }}
                          >
                            {admin.name}
                          </a>
                          <div className="admin-email">{admin.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{admin.lastActive}</td>
                    <td>
                      <span className={`status-badge ${getStatusColor(admin.status)}`}>
                        {admin.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="action-btn btn-edit"
                          onClick={() => {
                            setEditingAdmin(admin);
                            setShowEditModal(true);
                          }}
                        >
                          <EditIcon />
                          Edit
                        </button>
                        <button 
                          className="action-btn btn-delete"
                          onClick={() => handleDeleteAdmin(admin.id)}
                        >
                          <DeleteIcon />
                          Delete
                        </button>
                      </div>
                    </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {showAddModal && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2 className="modal-title">Add New Admin</h2>
                <button className="close-btn" onClick={() => setShowAddModal(false)}>
                  <CloseIcon />
                </button>
              </div>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={newAdmin.name}
                  onChange={(e) => setNewAdmin({...newAdmin, name: e.target.value})}
                  placeholder="Enter full name"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input 
                  type="email" 
                  className="form-input"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
                  placeholder="Enter email address"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-input"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})}
                  placeholder="Enter password"
                />
              </div>
              <div className="form-buttons">
                <button className="btn-cancel" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleAddAdmin}>
                  Add Admin
                </button>
              </div>
            </div>
          </div>
        )}

        {showEditModal && editingAdmin && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2 className="modal-title">Edit Admin</h2>
                <button className="close-btn" onClick={() => setShowEditModal(false)}>
                  <CloseIcon />
                </button>
              </div>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={editingAdmin.name}
                  onChange={(e) => setEditingAdmin({...editingAdmin, name: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input 
                  type="email" 
                  className="form-input"
                  value={editingAdmin.email}
                  onChange={(e) => setEditingAdmin({...editingAdmin, email: e.target.value})}
                />
              </div>
              <div className="form-buttons">
                <button className="btn-cancel" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleEditAdmin}>
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {showDetailModal && selectedAdmin && (
          <div className="modal-overlay">
            <div className="modal detail-modal">
              <div className="modal-header">
                <h2 className="modal-title">Admin Details</h2>
                <button className="close-btn" onClick={() => setShowDetailModal(false)}>
                  <CloseIcon />
                </button>
              </div>
              
              <div className="admin-detail-header">
                <div className="admin-avatar-large">
                  {selectedAdmin.avatar ? <img src={selectedAdmin.avatar} alt={selectedAdmin.name} /> : getInitials(selectedAdmin.name)}
                </div>
                <div className="admin-detail-info">
                  <h3>{selectedAdmin.name}</h3>
                  <p>{selectedAdmin.email}</p>
                </div>
              </div>

              <div className="detail-section">
                <h4>Account Information</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <div className="detail-label">Status</div>
                    <div className="detail-value">{selectedAdmin.status}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">Created Date</div>
                    <div className="detail-value">{selectedAdmin.createdDate}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">Last Login</div>
                    <div className="detail-value">{selectedAdmin.lastLogin}</div>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h4>Recent Activity</h4>
                <div className="activity-log">
                  {selectedAdmin.activityLogs.map((log, index) => (
                    <div key={index} className="activity-item">{log}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {showVerificationModal && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2 className="modal-title">Verify Admin Email</h2>
                <button className="close-btn" onClick={() => {
                  setShowVerificationModal(false);
                  setPendingVerificationEmail('');
                  setVerificationCode('');
                  setVerificationError('');
                }}>
                  <CloseIcon />
                </button>
              </div>
              <div style={{ padding: '20px' }}>
                <p style={{ marginBottom: '15px', color: '#666' }}>
                  A verification code has been sent to <strong>{pendingVerificationEmail}</strong>
                </p>
                <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>
                  Please enter the verification code from the email to verify this admin account.
                </p>
                {verificationError && (
                  <div style={{ 
                    padding: '10px', 
                    marginBottom: '15px', 
                    backgroundColor: '#fee', 
                    color: '#c33', 
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}>
                    {verificationError}
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Verification Code</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={verificationCode}
                    onChange={(e) => {
                      // Only allow numbers
                      const value = e.target.value.replace(/\D/g, '');
                      setVerificationCode(value);
                      setVerificationError('');
                    }}
                    placeholder="Enter 6-digit verification code"
                    maxLength="6"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && verificationCode.length === 6) {
                        handleVerifyAdmin();
                      }
                    }}
                    style={{ 
                      fontSize: '18px', 
                      letterSpacing: '4px', 
                      textAlign: 'center',
                      fontWeight: 'bold'
                    }}
                  />
                </div>
                <div className="form-buttons" style={{ marginTop: '20px' }}>
                  <button 
                    className="btn-cancel" 
                    onClick={() => {
                      setShowVerificationModal(false);
                      setPendingVerificationEmail('');
                      setVerificationCode('');
                      setVerificationError('');
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn-primary" 
                    onClick={handleVerifyAdmin}
                    disabled={!verificationCode || verificationCode.length !== 6}
                  >
                    Verify
                  </button>
                </div>
                <p style={{ marginTop: '15px', fontSize: '12px', color: '#888', textAlign: 'center' }}>
                  Didn't receive the code? Check your email spam folder or contact the administrator.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
};

export default AdminManagementPage;