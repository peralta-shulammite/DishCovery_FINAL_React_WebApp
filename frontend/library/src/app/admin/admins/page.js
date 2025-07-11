'use client';
import React, { useState } from 'react';
import './styles.css'; // Import the CSS file

const AdminManagementPage = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('This Week');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  // Sample admin data
  const [admins, setAdmins] = useState([
    {
      id: 1,
      name: 'Sarah Johnson',
      email: 'sarah.johnson@dishcovery.com',
      role: 'Super Admin',
      status: 'Active',
      lastActive: '2 hours ago',
      avatar: null,
      createdDate: 'Jan 15, 2024',
      lastLogin: 'Today at 2:30 PM',
      activityLogs: [
        'Added new dietary restriction "FODMAP-Free" - Today at 1:45 PM',
        'Approved ingredient "Tempeh" - Yesterday at 3:22 PM',
        'Updated user permissions - July 8, 2025 at 10:15 AM'
      ]
    },
    {
      id: 2,
      name: 'Mike Chen',
      email: 'mike.chen@dishcovery.com',
      role: 'Content Admin',
      status: 'Active',
      lastActive: '1 day ago',
      avatar: null,
      createdDate: 'Feb 3, 2024',
      lastLogin: 'Yesterday at 4:15 PM',
      activityLogs: [
        'Reviewed recipe "Thai Green Curry" - Yesterday at 4:10 PM',
        'Added ingredient "Dragon Fruit" - July 9, 2025 at 2:30 PM'
      ]
    },
    {
      id: 3,
      name: 'Emma Wilson',
      email: 'emma.wilson@dishcovery.com',
      role: 'Moderator',
      status: 'Active',
      lastActive: '3 hours ago',
      avatar: null,
      createdDate: 'Mar 12, 2024',
      lastLogin: 'Today at 11:20 AM',
      activityLogs: [
        'Resolved user feedback ticket #245 - Today at 11:15 AM',
        'Moderated recipe review - Today at 9:45 AM'
      ]
    },
    {
      id: 4,
      name: 'David Brown',
      email: 'david.brown@dishcovery.com',
      role: 'Viewer',
      status: 'Inactive',
      lastActive: '2 weeks ago',
      avatar: null,
      createdDate: 'Apr 8, 2024',
      lastLogin: 'June 28, 2025 at 3:45 PM',
      activityLogs: [
        'Viewed dashboard analytics - June 28, 2025 at 3:40 PM'
      ]
    }
  ]);

  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Viewer',
    avatar: null
  });

  const roles = ['Super Admin', 'Content Admin', 'Moderator', 'Viewer'];
  
  const permissions = {
    'Super Admin': {
      dashboard: true, users: true, recipes: true, ingredients: true, 
      dietaryRestrictions: true, feedback: true, adminManagement: true
    },
    'Content Admin': {
      dashboard: true, users: true, recipes: true, ingredients: true, 
      dietaryRestrictions: true, feedback: true, adminManagement: false
    },
    'Moderator': {
      dashboard: true, users: true, recipes: true, ingredients: false, 
      dietaryRestrictions: false, feedback: true, adminManagement: false
    },
    'Viewer': {
      dashboard: true, users: false, recipes: false, ingredients: false, 
      dietaryRestrictions: false, feedback: false, adminManagement: false
    }
  };

  const handleAddAdmin = () => {
    if (newAdmin.name && newAdmin.email && newAdmin.role) {
      const admin = {
        id: admins.length + 1,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
        status: 'Active',
        lastActive: 'Just now',
        avatar: newAdmin.avatar,
        createdDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        lastLogin: 'Never',
        activityLogs: ['Account created - Just now']
      };
      setAdmins([...admins, admin]);
      setNewAdmin({ name: '', email: '', password: '', role: 'Viewer', avatar: null });
      setShowAddModal(false);
    }
  };

  const handleEditAdmin = () => {
    if (editingAdmin) {
      setAdmins(admins.map(admin => 
        admin.id === editingAdmin.id ? editingAdmin : admin
      ));
      setShowEditModal(false);
      setEditingAdmin(null);
    }
  };

  const handleDeleteAdmin = (adminId) => {
    if (confirm('Are you sure you want to delete this admin?')) {
      setAdmins(admins.filter(admin => admin.id !== adminId));
    }
  };

  const handleToggleStatus = (adminId) => {
    setAdmins(admins.map(admin => 
      admin.id === adminId 
        ? { ...admin, status: admin.status === 'Active' ? 'Inactive' : 'Active' }
        : admin
    ));
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getStatusColor = (status) => {
    return status === 'Active' ? 'status-completed' : 'status-pending';
  };

  const getRoleColor = (role) => {
    switch(role) {
      case 'Super Admin': return 'priority-high';
      case 'Content Admin': return 'priority-medium';
      case 'Moderator': return 'priority-medium';
      case 'Viewer': return 'priority-low';
      default: return 'priority-low';
    }
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

  const MenuIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
    </svg>
  );

  const PlusIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
    </svg>
  );

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

  return (
    <div className={`dashboard-container ${!sidebarVisible ? 'sidebar-hidden' : ''}`}>
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <button className="hamburger-menu" onClick={toggleSidebar}>
            <MenuIcon />
          </button>
          <h2 className="header-app-name">DishCovery</h2>
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
          <div className="nav-item">
            <span className="nav-icon"><DashboardIcon /></span>
            <span className="nav-text">Dashboard</span>
          </div>
          
          <div className="nav-section-header">Account Management</div>
          <div className="nav-item">
            <span className="nav-icon"><UsersIcon /></span>
            <span className="nav-text">Users</span>
          </div>
          <div className="nav-item active">
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
        {/* Page Header */}
        <div className="page-header">
          <h1 className="page-title">Admin Management</h1>
          <button className="add-admin-btn" onClick={() => setShowAddModal(true)}>
            <PlusIcon />
            Add New Admin
          </button>
        </div>

        {/* Controls */}
        <div className="controls-container">
          <div className="status-filters">
            <span className="filter-label">Status:</span>
            <button className={`filter-btn ${statusFilter === 'All' ? 'active' : ''}`} onClick={() => setStatusFilter('All')}>All</button>
            <button className={`filter-btn ${statusFilter === 'Active' ? 'active' : ''}`} onClick={() => setStatusFilter('Active')}>Active</button>
            <button className={`filter-btn ${statusFilter === 'Inactive' ? 'active' : ''}`} onClick={() => setStatusFilter('Inactive')}>Inactive</button>
          </div>
          <button className="permissions-btn" onClick={() => setShowPermissionsModal(true)}>
            Manage Permissions
          </button>
        </div>

        {/* Admin Table */}
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Profile</th>
                <th>Role</th>
                <th>Last Active</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins
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
                  <td>
                    <span className={`priority-badge ${getRoleColor(admin.role)}`}>
                      {admin.role}
                    </span>
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
                        className="action-btn btn-toggle"
                        onClick={() => handleToggleStatus(admin.id)}
                      >
                        {admin.status === 'Active' ? 'Deactivate' : 'Activate'}
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Admin Modal */}
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
            <div className="form-group">
              <label className="form-label">Role</label>
              <select 
                className="form-select"
                value={newAdmin.role}
                onChange={(e) => setNewAdmin({...newAdmin, role: e.target.value})}
              >
                {roles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
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

      {/* Edit Admin Modal */}
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
            <div className="form-group">
              <label className="form-label">Role</label>
              <select 
                className="form-select"
                value={editingAdmin.role}
                onChange={(e) => setEditingAdmin({...editingAdmin, role: e.target.value})}
              >
                {roles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
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

      {/* Admin Detail Modal */}
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
                  <div className="detail-label">Role</div>
                  <div className="detail-value">{selectedAdmin.role}</div>
                </div>
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

      {/* Permissions Management Modal */}
      {showPermissionsModal && (
        <div className="modal-overlay">
          <div className="modal permissions-modal">
            <div className="modal-header">
              <h2 className="modal-title">Role Permissions</h2>
              <button className="close-btn" onClick={() => setShowPermissionsModal(false)}>
                <CloseIcon />
              </button>
            </div>
            
            <table className="permissions-table">
              <thead>
                <tr>
                  <th>Section</th>
                  <th>Viewer</th>
                  <th>Moderator</th>
                  <th>Content Admin</th>
                  <th>Super Admin</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="permission-section">Dashboard</td>
                  <td><input type="checkbox" className="permission-check" checked={permissions['Viewer'].dashboard} readOnly /></td>
                  <td><input type="checkbox" className="permission-check" checked={permissions['Moderator'].dashboard} readOnly /></td>
                  <td><input type="checkbox" className="permission-check" checked={permissions['Content Admin'].dashboard} readOnly /></td>
                  <td><input type="checkbox" className="permission-check" checked={permissions['Super Admin'].dashboard} readOnly /></td>
                </tr>
                <tr>
                  <td className="permission-section">Users</td>
                  <td><input type="checkbox" className="permission-check" checked={permissions['Viewer'].users} readOnly /></td>
                  <td><input type="checkbox" className="permission-check" checked={permissions['Moderator'].users} readOnly /></td>
                  <td><input type="checkbox" className="permission-check" checked={permissions['Content Admin'].users} readOnly /></td>
                  <td><input type="checkbox" className="permission-check" checked={permissions['Super Admin'].users} readOnly /></td>
                </tr>
                <tr>
                  <td className="permission-section">Recipes</td>
                  <td><input type="checkbox" className="permission-check" checked={permissions['Viewer'].recipes} readOnly /></td>
                  <td><input type="checkbox" className="permission-check" checked={permissions['Moderator'].recipes} readOnly /></td>
                  <td><input type="checkbox" className="permission-check" checked={permissions['Content Admin'].recipes} readOnly /></td>
                  <td><input type="checkbox" className="permission-check" checked={permissions['Super Admin'].recipes} readOnly /></td>
                </tr>
                <tr>
                  <td className="permission-section">Ingredients</td>
                  <td><input type="checkbox" className="permission-check" checked={permissions['Viewer'].ingredients} readOnly /></td>
                  <td><input type="checkbox" className="permission-check" checked={permissions['Moderator'].ingredients} readOnly /></td>
                  <td><input type="checkbox" className="permission-check" checked={permissions['Content Admin'].ingredients} readOnly /></td>
                  <td><input type="checkbox" className="permission-check" checked={permissions['Super Admin'].ingredients} readOnly /></td>
                </tr>
                <tr>
                  <td className="permission-section">Dietary Restrictions</td>
                  <td><input type="checkbox" className="permission-check" checked={permissions['Viewer'].dietaryRestrictions} readOnly /></td>
                  <td><input type="checkbox" className="permission-check" checked={permissions['Moderator'].dietaryRestrictions} readOnly /></td>
                  <td><input type="checkbox" className="permission-check" checked={permissions['Content Admin'].dietaryRestrictions} readOnly /></td>
                  <td><input type="checkbox" className="permission-check" checked={permissions['Super Admin'].dietaryRestrictions} readOnly /></td>
                </tr>
                <tr>
                  <td className="permission-section">Feedback</td>
                  <td><input type="checkbox" className="permission-check" checked={permissions['Viewer'].feedback} readOnly /></td>
                  <td><input type="checkbox" className="permission-check" checked={permissions['Moderator'].feedback} readOnly /></td>
                  <td><input type="checkbox" className="permission-check" checked={permissions['Content Admin'].feedback} readOnly /></td>
                  <td><input type="checkbox" className="permission-check" checked={permissions['Super Admin'].feedback} readOnly /></td>
                </tr>
                <tr>
                  <td className="permission-section">Admin Management</td>
                  <td><input type="checkbox" className="permission-check" checked={permissions['Viewer'].adminManagement} readOnly /></td>
                  <td><input type="checkbox" className="permission-check" checked={permissions['Moderator'].adminManagement} readOnly /></td>
                  <td><input type="checkbox" className="permission-check" checked={permissions['Content Admin'].adminManagement} readOnly /></td>
                  <td><input type="checkbox" className="permission-check" checked={permissions['Super Admin'].adminManagement} readOnly /></td>
                </tr>
              </tbody>
            </table>
            
            <div className="form-buttons">
              <button className="btn-primary" onClick={() => setShowPermissionsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagementPage;