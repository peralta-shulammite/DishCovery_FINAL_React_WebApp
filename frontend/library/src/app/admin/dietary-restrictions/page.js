'use client';
import React, { useState } from 'react';
import './styles.css';

const DietaryRestrictionsManagement = () => {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRestriction, setSelectedRestriction] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const restrictionsPerPage = 10;

  // Sample restriction data
  const [restrictions, setRestrictions] = useState([
    {
      id: 1,
      name: 'Lactose Intolerant',
      category: 'Medical',
      description: 'Avoids dairy due to intolerance',
      status: 'Active',
      usedBy: 1224,
      lastEdited: '2024-01-15',
      lastEditedBy: 'Admin',
      changeLog: [{ date: '2024-01-15', by: 'Admin', change: 'Created restriction' }],
    },
    {
      id: 2,
      name: 'Halal',
      category: 'Religious',
      description: 'Food must comply with Islamic dietary laws',
      status: 'Active',
      usedBy: 3509,
      lastEdited: '2024-01-20',
      lastEditedBy: 'Admin',
      changeLog: [{ date: '2024-01-20', by: 'Admin', change: 'Created restriction' }],
    },
    {
      id: 3,
      name: 'Gluten-Free',
      category: 'Medical',
      description: 'Avoids gluten due to celiac or sensitivity',
      status: 'Active',
      usedBy: 2841,
      lastEdited: '2024-01-18',
      lastEditedBy: 'Admin',
      changeLog: [{ date: '2024-01-18', by: 'Admin', change: 'Created restriction' }],
    },
    {
      id: 4,
      name: 'No Shellfish',
      category: 'Custom',
      description: 'User-submitted restriction',
      status: 'Pending',
      usedBy: 1,
      lastEdited: '2024-01-22',
      lastEditedBy: 'User123',
      changeLog: [{ date: '2024-01-22', by: 'User123', change: 'Requested restriction' }],
    },
  ]);

  const [pendingRequests, setPendingRequests] = useState([
    {
      id: 5,
      name: 'Low-Sodium',
      user: 'User456',
      dateSubmitted: '2024-01-25',
      suggestedDescription: 'Diet with reduced salt intake',
    },
  ]);

  // Form state for adding/editing restrictions
  const [formData, setFormData] = useState({
    name: '',
    category: 'Medical',
    description: '',
    status: 'Active',
    visibility: 'Public',
  });

  const categories = ['Medical', 'Religious', 'Lifestyle', 'Ethical', 'Custom'].sort();
  const statuses = ['Active', 'Inactive'];

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
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

  const handleDeleteRestriction = (restrictionId) => {
    if (window.confirm('Are you sure you want to delete this restriction?')) {
      setRestrictions(restrictions.filter((r) => r.id !== restrictionId));
    }
  };

  const handleApproveRequest = (request) => {
    const newRestriction = {
      id: Date.now(),
      name: request.name,
      category: 'Custom',
      description: request.suggestedDescription,
      status: 'Active',
      usedBy: 1,
      lastEdited: new Date().toISOString().split('T')[0],
      lastEditedBy: 'Admin',
      changeLog: [{ date: new Date().toISOString().split('T')[0], by: 'Admin', change: 'Approved user request' }],
      visibility: 'Public',
    };
    setRestrictions([...restrictions, newRestriction]);
    setPendingRequests(pendingRequests.filter((r) => r.id !== request.id));
  };

  const handleRejectRequest = (requestId) => {
    if (window.confirm('Are you sure you want to reject this request?')) {
      setPendingRequests(pendingRequests.filter((r) => r.id !== requestId));
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const restrictionData = {
      ...formData,
      id: selectedRestriction ? selectedRestriction.id : Date.now(),
      lastEdited: new Date().toISOString().split('T')[0],
      lastEditedBy: 'Admin',
      changeLog: selectedRestriction
        ? [
            ...selectedRestriction.changeLog,
            {
              date: new Date().toISOString().split('T')[0],
              by: 'Admin',
              change: 'Updated restriction details',
            },
          ]
        : [{ date: new Date().toISOString().split('T')[0], by: 'Admin', change: 'Created restriction' }],
      usedBy: selectedRestriction ? selectedRestriction.usedBy : 0,
    };

    if (selectedRestriction) {
      setRestrictions(restrictions.map((r) => (r.id === selectedRestriction.id ? restrictionData : r)));
      setShowEditModal(false);
    } else {
      setRestrictions([...restrictions, restrictionData]);
      setShowAddModal(false);
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'Medical',
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

  // Icons Components
  const DashboardIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
    </svg>
  );

  const RecipeIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
    </svg>
  );

  const UsersIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 7c0-2.21-1.79-4-4-4S8 4.79 8 7s1.79 4 4 4 4-1.79 4-4zm-4 6c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z" />
    </svg>
  );

  const DietaryIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z" />
    </svg>
  );

  const IngredientsIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4l2-4z" />
      <path d="M8 10c-2 0-4 2-4 4s2 4 4 4h8c2 0 4-2 4-4s-2-4-4-4H8z" />
    </svg>
  );

  const FeedbackIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 13.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1-4.5h-2V6h2v5z" />
    </svg>
  );

  const SettingsIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" />
    </svg>
  );

  const SearchIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    </svg>
  );

  const MenuIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
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
    <div className={`dashboard-container ${!sidebarVisible ? 'sidebar-hidden' : ''}`}>
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <button className="hamburger-menu" onClick={toggleSidebar}>
            <MenuIcon />
          </button>
          <h2 className="app-name header-app-name">DishCovery</h2>
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
          <div className="nav-item">
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
          <div className="nav-item active">
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
                    {selectedRestriction.changeLog.map((log, index) => (
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
    </div>
  );
};

export default DietaryRestrictionsManagement;