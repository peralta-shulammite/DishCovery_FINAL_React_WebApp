'use client';
import React, { useState } from 'react';
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
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

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

  return (
    <AdminLayout currentPage="Admins">
      <div>
        <div className="page-header">
          <h1 className="page-title">Admin Management</h1>
          <button className="add-admin-btn" onClick={() => setShowAddModal(true)}>
            <PlusIcon />
            Add New Admin
          </button>
        </div>

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
    </AdminLayout>
  );
};

export default AdminManagementPage;