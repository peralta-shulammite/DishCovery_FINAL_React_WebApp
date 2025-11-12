'use client';
import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/adminlayout';
import { adminUsersAPI } from './api';
import './styles.css';

// API Base URL - automatically detects environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [bulkMessageText, setBulkMessageText] = useState('');

  // API Data States
  const [users, setUsers] = useState([]);
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    newUsers: 0,
    inactiveUsers: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch users from database
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await adminUsersAPI.getAllUsers();

      if (data.success) {
        setUsers(data.users || []);
        setUserStats(data.stats || {
          totalUsers: 0,
          activeUsers: 0,
          newUsers: 0,
          inactiveUsers: 0
        });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Update selectedUser when users data changes (e.g., after refresh)
  useEffect(() => {
    if (selectedUser && selectedUser.id && users.length > 0) {
      const updatedUser = users.find(u => u.id === selectedUser.id);
      if (updatedUser) {
        // Preserve notes if they exist in selectedUser but not in updatedUser
        setSelectedUser({
          ...updatedUser,
          notes: selectedUser.notes || updatedUser.notes || ''
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users]);

  const inactiveUsers = users.filter(u => u.status === 'Inactive').slice(0, 3);

  const filteredUsers = users.filter(user => {
    const matchesStatus = statusFilter === 'All' || user.status === statusFilter;
    const matchesSearch = searchTerm === '' || 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.restrictions.some(r => r.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    // First, sort by status (Active first, then Inactive)
    const statusOrder = { 'Active': 1, 'Inactive': 2 };
    const statusDiff = (statusOrder[a.status] || 999) - (statusOrder[b.status] || 999);
    if (statusDiff !== 0) {
      return statusDiff;
    }
    
    // If status is the same, sort by the selected field
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
          if (time === 'Never') return Infinity; // Never comes last
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

  // Pagination logic
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = sortedUsers.slice(startIndex, endIndex);

  // Selection state
  const isAllSelected = paginatedUsers.length > 0 && selectedUsers.length === paginatedUsers.length;
  const isIndeterminate = selectedUsers.length > 0 && selectedUsers.length < paginatedUsers.length;

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedUsers([]); // Clear selections when filters change
  }, [statusFilter, searchTerm, sortBy, sortOrder]);

  const getStatusColor = (status) => {
    switch(status) {
      case 'Active': return 'status-completed';
      case 'Inactive': return 'status-pending';
      default: return 'status-pending';
    }
  };

  const handleViewUser = async (user) => {
    // Always fetch the latest user data from the API to ensure we have the most up-to-date information
    try {
      const data = await adminUsersAPI.getAllUsers();
      if (data.success) {
        const latestUser = data.users.find(u => u.id === user.id) || user;
        setSelectedUser({
          ...latestUser,
          notes: latestUser.notes || '' // Ensure notes field exists
        });
      } else {
        // Fallback to using the user from the list
        const latestUser = users.find(u => u.id === user.id) || user;
        setSelectedUser({
          ...latestUser,
          notes: latestUser.notes || '' // Ensure notes field exists
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Fallback to using the user from the list
      const latestUser = users.find(u => u.id === user.id) || user;
      setSelectedUser({
        ...latestUser,
        notes: latestUser.notes || '' // Ensure notes field exists
      });
    }
  };

  const handleMessageUser = (user) => {
    // Always use the latest user data from the users array to ensure we have the most up-to-date information
    const latestUser = users.find(u => u.id === user.id) || user;
    setSelectedUser(latestUser);
    setMessageText(''); // Clear previous message
    setBulkMessageText(''); // Clear bulk message
    setShowMessageModal(true);
  };

  const handleSendMessage = async () => {
    if (selectedUser && selectedUser.id === 'bulk') {
      await handleBulkSendMessageSubmit();
      return;
    }

    if (!selectedUser || !selectedUser.id) {
      alert('No user selected.');
      return;
    }

    const messageToSend = selectedUser.id === 'bulk' ? bulkMessageText : messageText;

    if (!messageToSend.trim()) {
      alert('Please enter a message.');
      return;
    }

    try {
      // For single user, we'll use the bulk message API with a single user ID
      // This saves the notification to the database (cloudbase/database)
      const result = await adminUsersAPI.bulkSendMessage([selectedUser.id], messageToSend);
      if (result.success) {
        alert(`Message sent to ${selectedUser.username || 'user'} successfully!`);
        setShowMessageModal(false);
        setMessageText('');
        setBulkMessageText('');
        // Don't clear selectedUser if modal is still open - keep it for viewing
        // setSelectedUser(null);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert(`Error sending message: ${error.message}`);
    }
  };

  const handleActivateUser = async (userId, username) => {
    if (!confirm(`Are you sure you want to activate user "${username}"?`)) {
      return;
    }

    try {
      const result = await adminUsersAPI.activateUser(userId);
      if (result.success) {
        alert('User activated successfully!');
        await fetchUsers(); // Refresh the list
        // Update selected user if modal is open
        if (selectedUser && selectedUser.id === userId) {
          const updatedUsers = await adminUsersAPI.getAllUsers();
          if (updatedUsers.success) {
            const updatedUser = updatedUsers.users.find(u => u.id === userId);
            if (updatedUser) {
              setSelectedUser(updatedUser);
            }
          }
        }
        // Remove from selected users if in bulk selection
        setSelectedUsers(selectedUsers.filter(id => id !== userId));
      }
    } catch (error) {
      alert(`Failed to activate user: ${error.message}`);
    }
  };

  const handleDeactivateUser = async (userId, username) => {
    if (!confirm(`Are you sure you want to deactivate user "${username}"?`)) {
      return;
    }

    try {
      const result = await adminUsersAPI.deactivateUser(userId);
      if (result.success) {
        alert('User deactivated successfully!');
        await fetchUsers(); // Refresh the list
        // Update selected user if modal is open
        if (selectedUser && selectedUser.id === userId) {
          const updatedUsers = await adminUsersAPI.getAllUsers();
          if (updatedUsers.success) {
            const updatedUser = updatedUsers.users.find(u => u.id === userId);
            if (updatedUser) {
              setSelectedUser(updatedUser);
            }
          }
        }
        // Remove from selected users if in bulk selection
        setSelectedUsers(selectedUsers.filter(id => id !== userId));
      }
    } catch (error) {
      alert(`Failed to deactivate user: ${error.message}`);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!confirm(`⚠️ WARNING: Are you sure you want to permanently delete user "${username}"?\n\nThis action cannot be undone and will delete all user data including:\n- Profile information\n- Dietary preferences\n- Feedback history\n- Saved recipes\n\nType the username to confirm deletion.`)) {
      return;
    }

    const confirmation = prompt(`Type "${username}" to confirm deletion:`);
    if (confirmation !== username) {
      alert('Deletion cancelled: Username did not match');
      return;
    }

    try {
      console.log(`🗑️ Attempting to delete user ${userId} (${username})...`);
      const result = await adminUsersAPI.deleteUser(userId);
      
      if (result && result.success) {
        console.log('✅ User deleted successfully');
        alert('User deleted successfully!');
        await fetchUsers(); // Refresh the list
        setSelectedUsers(selectedUsers.filter(id => id !== userId));
      } else {
        console.error('❌ Delete user returned unsuccessful result:', result);
        alert(`Failed to delete user: ${result?.message || 'Unknown error occurred'}`);
      }
    } catch (error) {
      console.error('❌ Error in handleDeleteUser:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      
      // Show user-friendly error message
      const errorMessage = error.message || 'Failed to delete user. Please try again or contact support if the problem persists.';
      alert(`Failed to delete user: ${errorMessage}`);
    }
  };

  // Bulk selection handlers
  const handleSelectUser = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === paginatedUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(paginatedUsers.map(u => u.id));
    }
  };

  // Bulk action handlers
  const handleBulkSendMessage = () => {
    if (selectedUsers.length === 0) {
      alert('Please select at least one user.');
      return;
    }
    setShowBulkActionModal(false);
    setShowMessageModal(true);
    setSelectedUser({ id: 'bulk', username: `${selectedUsers.length} users` });
  };

  const handleBulkSendReminder = async () => {
    if (selectedUsers.length === 0) {
      alert('Please select at least one user.');
      return;
    }

    const inactiveSelected = users.filter(u => selectedUsers.includes(u.id) && u.status === 'Inactive');
    if (inactiveSelected.length === 0) {
      alert('No inactive users selected. Reminders are only sent to inactive users.');
      return;
    }

    try {
      const result = await adminUsersAPI.bulkSendReminder(selectedUsers);
      if (result.success) {
        alert(`Reminders sent to ${inactiveSelected.length} inactive user(s).`);
        setShowBulkActionModal(false);
        setSelectedUsers([]);
      }
    } catch (error) {
      console.error('Error sending reminders:', error);
      alert(`Error sending reminders: ${error.message}`);
    }
  };

  const handleBulkDeactivate = () => {
    if (selectedUsers.length === 0) {
      alert('Please select at least one user.');
      return;
    }
    setConfirmAction({
      type: 'deactivate',
      count: selectedUsers.length,
      handler: async () => {
        try {
          const result = await adminUsersAPI.bulkDeactivateUsers(selectedUsers);
          if (result.success) {
            alert(`${selectedUsers.length} user(s) deactivated successfully.`);
            await fetchUsers();
            setShowBulkActionModal(false);
            setSelectedUsers([]);
          }
        } catch (error) {
          console.error('Error deactivating users:', error);
          alert(`Error deactivating users: ${error.message}`);
        }
      }
    });
    setShowConfirmModal(true);
    setShowBulkActionModal(false);
  };

  const handleBulkDelete = () => {
    if (selectedUsers.length === 0) {
      alert('Please select at least one user.');
      return;
    }
    setConfirmAction({
      type: 'delete',
      count: selectedUsers.length,
      handler: async () => {
        try {
          const result = await adminUsersAPI.bulkDeleteUsers(selectedUsers);
          if (result.success) {
            alert(`${selectedUsers.length} user(s) deleted successfully.`);
            await fetchUsers();
            setShowBulkActionModal(false);
            setSelectedUsers([]);
          }
        } catch (error) {
          console.error('Error deleting users:', error);
          alert(`Error deleting users: ${error.message}`);
        }
      }
    });
    setShowConfirmModal(true);
    setShowBulkActionModal(false);
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
    // Export all filtered/sorted users as CSV
    const headers = [
      'User ID',
      'Full Name',
      'Email',
      'Date Joined',
      'Number of Recipes Submitted',
      'Favorite Count',
      'Last Login',
      'Status',
      'Medical Conditions'
      // 'Dietary Lifestyle' removed - category removed
    ];

    const csvRows = [
      headers.map(escapeCSV).join(','),
      ...sortedUsers.map(u => {
        // Get full name from username or email
        const fullName = u.username || u.email?.split('@')[0] || 'N/A';
        const recipesSubmitted = u.recipesViewed || 0; // Using recipesViewed as submitted count
        const favoriteCount = u.recipesSaved || 0;
        const lastLogin = u.lastActive || 'Never';
        const medicalConditions = (u.medicalConditions || []).join('; ') || 'None';
        // dietaryLifestyle removed - category removed

        return [
          u.id,
          fullName,
          u.email,
          u.joinedDate,
          recipesSubmitted,
          favoriteCount,
          lastLogin,
          u.status,
          medicalConditions
          // dietaryLifestyle removed
        ].map(escapeCSV).join(',');
      })
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    alert(`Exported ${sortedUsers.length} user(s) successfully as CSV.`);
  };

  const handleBulkExport = () => {
    if (selectedUsers.length === 0) {
      alert('Please select at least one user.');
      return;
    }

    const selectedUsersData = users.filter(u => selectedUsers.includes(u.id));
    const exportData = {
      users: selectedUsersData.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        status: u.status,
        lastActive: u.lastActive,
        joinedDate: u.joinedDate,
        restrictions: u.restrictions
      })),
      exportDate: new Date().toISOString(),
      totalUsers: selectedUsersData.length
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    alert(`Exported ${selectedUsers.length} user(s) successfully.`);
    setShowBulkActionModal(false);
  };

  const handleConfirmAction = async () => {
    if (confirmAction && confirmAction.handler) {
      await confirmAction.handler();
    }
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  const handleBulkSendMessageSubmit = async () => {
    if (!bulkMessageText.trim()) {
      alert('Please enter a message.');
      return;
    }

    try {
      const result = await adminUsersAPI.bulkSendMessage(selectedUsers, bulkMessageText);
      if (result.success) {
        alert(`Message sent to ${selectedUsers.length} user(s).`);
        setShowMessageModal(false);
        setBulkMessageText('');
        setSelectedUsers([]);
        setSelectedUser(null);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert(`Error sending message: ${error.message}`);
    }
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

  // Loading State
  if (loading) {
    return (
      <div className="users-content">
        <div className="loading-container" style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #2E7D32',
            borderRadius: '50%',
            width: '60px',
            height: '60px',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ color: '#666', fontSize: '16px' }}>Loading users...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="users-content">
        <div className="error-container" style={{
          background: '#ffebee',
          border: '1px solid #ef5350',
          borderRadius: '8px',
          padding: '20px',
          margin: '20px',
          textAlign: 'center'
        }}>
          <h3 style={{ color: '#c62828', marginBottom: '10px' }}>Error Loading Users</h3>
          <p style={{ color: '#666' }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '15px',
              padding: '10px 20px',
              background: '#2E7D32',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="users-content">
      {/* Page Header */}
      {/* Enhanced Page Header */}
      <div className="page-header-enhanced">
        <div className="header-content">
          <div className="header-text">
            <h1 className="page-title">User Management</h1>
            <p className="page-description">Manage user accounts, monitor activity, and maintain a healthy app environment</p>
          </div>
          <div className="header-actions">
            <button 
              className="bulk-action-btn" 
              onClick={() => {
                if (selectedUsers.length === 0) {
                  alert('Please select at least one user first.');
                  return;
                }
                setShowBulkActionModal(true);
              }}
            >
              <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              Bulk Actions {selectedUsers.length > 0 && `(${selectedUsers.length})`}
            </button>
          </div>
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
              <label className="filter-label">Search Users</label>
              <div className="search-input-container" style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                <input
                  type="text"
                  placeholder="Search by username, email, or restrictions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input-field"
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 15px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'Poppins, sans-serif'
                  }}
                />
                <svg 
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '20px',
                    height: '20px',
                    color: '#64748b',
                    pointerEvents: 'none'
                  }}
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                >
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
              </div>
            </div>
            
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
            <button className="export-btn" onClick={handleExportData}>
              <ExportIcon />
              Export Data
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
              <button 
                className="table-action-btn" 
                title="Bulk Actions"
                onClick={() => {
                  if (selectedUsers.length === 0) {
                    alert('Please select at least one user first.');
                    return;
                  }
                  setShowBulkActionModal(true);
                }}
                style={{ 
                  background: selectedUsers.length > 0 ? '#2E7D32' : 'transparent',
                  color: selectedUsers.length > 0 ? 'white' : 'inherit'
                }}
              >
                <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </button>
            </div>
          </div>
          
          <div className="enhanced-table-container">
            <table className="enhanced-table">
              <thead>
                <tr>
                  <th className="checkbox-col">
                    <input 
                      type="checkbox" 
                      className="table-checkbox" 
                      checked={isAllSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = isIndeterminate;
                      }}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th style={{ textAlign: 'center', width: '60px' }}>#</th>
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
                {paginatedUsers.map((user, index) => {
                  const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                  <tr 
                    key={user.id} 
                    className="table-row"
                    onClick={() => handleViewUser(user)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <input 
                        type="checkbox" 
                        className="table-checkbox" 
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: '600', fontSize: '14px', color: '#64748b' }}>
                      {rowNumber}
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
                          <div className="user-meta">
                            {(user.dietaryLifestyle && user.dietaryLifestyle.length > 0) || (user.excludedIngredients && user.excludedIngredients.length > 0)
                              ? (user.dietaryLifestyle || user.excludedIngredients || []).slice(0, 2).join(', ')
                              : user.medicalConditions && user.medicalConditions.length > 0
                              ? user.medicalConditions.slice(0, 2).join(', ')
                              : 'No preferences'}
                          </div>
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
                        <button 
                          className="action-btn-small view" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewUser(user);
                          }} 
                          title="View Profile"
                        >
                          <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                          </svg>
                        </button>
                        <button 
                          className="action-btn-small message" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMessageUser(user);
                          }} 
                          title="Send Message"
                        >
                          <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                          </svg>
                        </button>
                        <button 
                          className="action-btn-small danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteUser(user.id, user.username);
                          }}
                          title="Delete User"
                        >
                          <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination-container" style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              marginTop: '20px',
              padding: '20px 0'
            }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  background: currentPage === 1 ? '#f3f4f6' : 'white',
                  color: currentPage === 1 ? '#9ca3af' : '#374151',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontFamily: 'Poppins, sans-serif',
                  fontSize: '14px'
                }}
              >
                Previous
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first page, last page, current page, and pages around current
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        background: currentPage === page ? '#2E7D32' : 'white',
                        color: currentPage === page ? 'white' : '#374151',
                        cursor: 'pointer',
                        fontFamily: 'Poppins, sans-serif',
                        fontSize: '14px',
                        fontWeight: currentPage === page ? '600' : '400'
                      }}
                    >
                      {page}
                    </button>
                  );
                } else if (
                  page === currentPage - 2 ||
                  page === currentPage + 2
                ) {
                  return (
                    <span key={page} style={{ padding: '0 4px', color: '#9ca3af' }}>
                      ...
                    </span>
                  );
                }
                return null;
              })}
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  background: currentPage === totalPages ? '#f3f4f6' : 'white',
                  color: currentPage === totalPages ? '#9ca3af' : '#374151',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontFamily: 'Poppins, sans-serif',
                  fontSize: '14px'
                }}
              >
                Next
              </button>
            </div>
          )}
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
                src={selectedUser?.profilePicture || `https://ui-avatars.com/api/?name=${selectedUser?.username || 'User'}&background=2E7D32&color=fff`}
                alt={selectedUser?.username || 'User'}
                className="modal-profile-pic"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/80x80/2E7D32/ffffff?text=' + (selectedUser?.username?.charAt(0) || 'U').toUpperCase();
                }}
              />
              <div className="modal-user-details">
                <h2 className="user-username">@{selectedUser?.username || 'Unknown'}</h2>
                <div className="user-meta">
                  <span className="user-email">{selectedUser?.email || 'No email'}</span>
                  <span className={`user-status-badge ${selectedUser?.status === 'Active' ? 'active' : 'inactive'}`}>
                    {selectedUser?.status || 'Unknown'}
                  </span>
                </div>
                <div className="user-timestamps">
                  <span className="timestamp-item">
                    <span className="label">Joined</span>
                    <span className="value">{selectedUser?.joinedDate || 'Unknown'}</span>
                  </span>
                  <span className="timestamp-divider">•</span>
                  <span className="timestamp-item">
                    <span className="label">Last Active</span>
                    <span className="value">{selectedUser?.lastActive || 'Never'}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="profile-sections-grid">
              <div className="profile-card">
                <h3 className="card-title">Dietary & Preferences</h3>
                <div className="card-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="preference-group-fixed">
                    <h3 className="preference-group-label" style={{ 
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#2E7D32',
                      fontFamily: 'Poppins, sans-serif',
                      margin: '0 0 8px 0'
                    }}>Medical Conditions</h3>
                    <div className="tags-container-fixed" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selectedUser?.medicalConditions && selectedUser.medicalConditions.length > 0 ? (
                        selectedUser.medicalConditions.map((condition) => (
                          <div 
                            key={condition} 
                            className="tag-fixed medical-tag-fixed" 
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '10px',
                              fontWeight: '500',
                              background: 'rgba(211, 47, 47, 0.1)',
                              color: '#D32F2F',
                              border: '1px solid rgba(211, 47, 47, 0.2)'
                            }}
                          >
                            <span>{condition}</span>
                          </div>
                        ))
                      ) : (
                        <span style={{ color: '#999', fontSize: '14px' }}>No medical conditions set</span>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              <div className="profile-card">
                <h3 className="card-title">Activity Summary</h3>
                <div className="card-content">
                  <div className="stats-grid">
                    <div className="stat-item">
                      <span className="stat-number">{selectedUser?.recipesViewed || 0}</span>
                      <span className="stat-label">Recipes Viewed</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-number">{selectedUser?.recipesSaved || 0}</span>
                      <span className="stat-label">Recipes Saved</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-number">{selectedUser?.ingredientsScanned || 0}</span>
                      <span className="stat-label">Ingredients Scanned</span>
                    </div>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Last Recipe</span>
                    <span className="info-value">
                      {selectedUser?.lastRecipe && selectedUser.lastRecipe !== 'N/A' 
                        ? `"${selectedUser.lastRecipe}"` 
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Feedback Submitted</span>
                    <span className="info-value">{selectedUser?.feedbackSubmitted ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>

            </div>

            <div className="modal-actions-improved">
              <button 
                className="action-btn-improved primary" 
                onClick={() => selectedUser && handleMessageUser(selectedUser)}
                disabled={!selectedUser}
              >
                Send Notification
              </button>
              {selectedUser?.status === 'Active' ? (
                <button 
                  className="action-btn-improved warning"
                  onClick={() => selectedUser && handleDeactivateUser(selectedUser.id, selectedUser.username)}
                  disabled={!selectedUser}
                >
                  Deactivate User
                </button>
              ) : (
                <button 
                  className="action-btn-improved success"
                  onClick={() => selectedUser && handleActivateUser(selectedUser.id, selectedUser.username)}
                  disabled={!selectedUser}
                >
                  Activate User
                </button>
              )}
              <button 
                className="action-btn-improved danger"
                onClick={() => selectedUser && handleDeleteUser(selectedUser.id, selectedUser.username)}
                disabled={!selectedUser}
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
                setMessageText('');
                setBulkMessageText('');
                // Don't clear selectedUser - keep modal open for viewing
                // setSelectedUser(null);
              }}
            >
              <CloseIcon />
            </button>
            
            <div className="message-modal-header">
              <h3 className="message-modal-title">Send Notification</h3>
              <p className="message-modal-subtitle">Send a message to this user</p>
            </div>

            {selectedUser && selectedUser.id !== 'bulk' && (
              <div className="message-recipient-info">
                <div className="recipient-label">To:</div>
                <div className="recipient-details">
                  <img 
                    src={selectedUser?.profilePicture || `https://ui-avatars.com/api/?name=${selectedUser?.username || 'User'}&background=2E7D32&color=fff`}
                    alt={selectedUser?.username || 'User'}
                    className="recipient-avatar"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/40x40/2E7D32/ffffff?text=' + (selectedUser?.username?.charAt(0) || 'U').toUpperCase();
                    }}
                  />
                  <div className="recipient-info">
                    <span className="recipient-username">@{selectedUser?.username || 'Unknown'}</span>
                    <span className="recipient-email">{selectedUser?.email || 'No email'}</span>
                  </div>
                </div>
              </div>
            )}
            {selectedUser && selectedUser.id === 'bulk' && (
              <div className="message-recipient-info">
                <div className="recipient-label">To:</div>
                <div className="recipient-details">
                  <div className="recipient-info">
                    <span className="recipient-username">{selectedUsers.length} selected user{selectedUsers.length !== 1 ? 's' : ''}</span>
                    <span className="recipient-email">Bulk notification</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="message-input-container-improved">
              <label htmlFor="message-text" className="message-label">Message</label>
              <textarea
                id="message-text"
                value={selectedUser && selectedUser.id === 'bulk' ? bulkMessageText : messageText}
                onChange={(e) => {
                  if (selectedUser && selectedUser.id === 'bulk') {
                    setBulkMessageText(e.target.value);
                  } else {
                    setMessageText(e.target.value);
                  }
                }}
                placeholder="Type your message here..."
                rows={6}
                className="message-textarea-improved"
              />
              <div className="character-count">
                {(selectedUser && selectedUser.id === 'bulk' ? bulkMessageText : messageText).length} characters
              </div>
            </div>

            <div className="message-modal-actions-improved">
              <button 
                className="message-btn cancel"
                onClick={() => {
                  setShowMessageModal(false);
                  setMessageText('');
                  setBulkMessageText('');
                  // Don't clear selectedUser - keep modal open for viewing
                  // setSelectedUser(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="message-btn send" 
                onClick={handleSendMessage}
                disabled={!selectedUser || !((selectedUser.id === 'bulk' ? bulkMessageText : messageText).trim())}
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
                <button 
                  className="bulk-option-btn"
                  onClick={handleBulkSendMessage}
                  disabled={selectedUsers.length === 0}
                  style={{ opacity: selectedUsers.length === 0 ? 0.5 : 1, cursor: selectedUsers.length === 0 ? 'not-allowed' : 'pointer' }}
                >
                  <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                  </svg>
                  <span>Send Message</span>
                  <span className="option-description">Send notification to selected users</span>
                </button>
                <button 
                  className="bulk-option-btn"
                  onClick={handleBulkSendReminder}
                  disabled={selectedUsers.length === 0}
                  style={{ opacity: selectedUsers.length === 0 ? 0.5 : 1, cursor: selectedUsers.length === 0 ? 'not-allowed' : 'pointer' }}
                >
                  <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  <span>Send Reminder</span>
                  <span className="option-description">Send activity reminder to inactive users</span>
                </button>
              </div>

              <div className="bulk-option-group">
                <h4>Account Management</h4>
                
                <button 
                  className="bulk-option-btn danger"
                  onClick={handleBulkDelete}
                  disabled={selectedUsers.length === 0}
                  style={{ opacity: selectedUsers.length === 0 ? 0.5 : 1, cursor: selectedUsers.length === 0 ? 'not-allowed' : 'pointer' }}
                >
                  <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                  <span>Delete Users</span>
                  <span className="option-description">Permanently remove selected accounts</span>
                </button>
              </div>

              <div className="bulk-option-group">
                <h4>Data Export</h4>
                <button 
                  className="bulk-option-btn"
                  onClick={handleBulkExport}
                  disabled={selectedUsers.length === 0}
                  style={{ opacity: selectedUsers.length === 0 ? 0.5 : 1, cursor: selectedUsers.length === 0 ? 'not-allowed' : 'pointer' }}
                >
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
                <span>{selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected</span>
              </div>
              <button 
                className="cancel-btn"
                onClick={() => {
                  setShowBulkActionModal(false);
                  setSelectedUsers([]);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && confirmAction && (
        <div className="modal-overlay">
          <div className="bulk-action-modal" style={{ maxWidth: '400px' }}>
            <button 
              className="modal-close-btn"
              onClick={() => {
                setShowConfirmModal(false);
                setConfirmAction(null);
              }}
            >
              <CloseIcon />
            </button>
            
            <div className="bulk-modal-header">
              <div className="bulk-modal-icon" style={{ background: confirmAction.type === 'delete' ? 'linear-gradient(135deg, #fee2e2, #fecaca)' : 'linear-gradient(135deg, #fef3c7, #fde68a)' }}>
                <svg className="icon" viewBox="0 0 24 24" fill="currentColor" style={{ color: confirmAction.type === 'delete' ? '#dc2626' : '#d97706' }}>
                  {confirmAction.type === 'delete' ? (
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  ) : (
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17h2v-2h-2v2zm1-4c.55 0 1-.45 1-1V8c0-.55-.45-1-1-1s-1 .45-1 1v6c0 .55.45 1 1 1z"/>
                  )}
                </svg>
              </div>
              <h3>{confirmAction.type === 'delete' ? 'Delete Users' : 'Deactivate Users'}</h3>
              <p>
                {confirmAction.type === 'delete' 
                  ? `Are you sure you want to permanently delete ${confirmAction.count} user${confirmAction.count !== 1 ? 's' : ''}? This action cannot be undone.`
                  : `Are you sure you want to deactivate ${confirmAction.count} user${confirmAction.count !== 1 ? 's' : ''}?`
                }
              </p>
            </div>

            <div className="bulk-modal-footer" style={{ justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                className="cancel-btn"
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmAction(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="cancel-btn"
                onClick={handleConfirmAction}
                style={{
                  background: confirmAction.type === 'delete' ? '#dc2626' : '#d97706',
                  color: 'white',
                  border: 'none'
                }}
              >
                {confirmAction.type === 'delete' ? 'Delete' : 'Deactivate'}
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
