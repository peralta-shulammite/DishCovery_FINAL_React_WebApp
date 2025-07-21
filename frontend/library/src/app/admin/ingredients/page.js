'use client';
import React, { useState } from 'react';
import AdminLayout from '../../components/adminlayout';
import './styles.css';

const IngredientManagement = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    title: '',
    message: '',
    action: null,
    type: 'confirm',
  });
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Sample ingredient data
  const [ingredients, setIngredients] = useState([
    {
      id: 1,
      name: 'Chicken Breast',
      category: 'Main Ingredient',
      image: '/api/placeholder/100/100',
      dietaryRestrictions: ['Not vegan', 'Not vegetarian'],
      dietaryLifestyles: ['High-protein', 'Keto'],
      usedInRecipes: 72,
      usersHave: 4300,
      status: 'Active',
      dateAdded: '2024-01-10',
    },
    {
      id: 2,
      name: 'Olive Oil',
      category: 'Condiment',
      image: '/api/placeholder/100/100',
      dietaryRestrictions: [],
      dietaryLifestyles: ['Vegan', 'Gluten-free', 'Mediterranean'],
      usedInRecipes: 48,
      usersHave: 3210,
      status: 'Active',
      dateAdded: '2024-01-12',
    },
    {
      id: 3,
      name: 'Garlic Powder',
      category: 'Spice',
      image: '/api/placeholder/100/100',
      dietaryRestrictions: [],
      dietaryLifestyles: ['Vegan', 'Vegetarian', 'Gluten-free'],
      usedInRecipes: 65,
      usersHave: 2850,
      status: 'Active',
      dateAdded: '2024-01-15',
    },
    {
      id: 4,
      name: 'Soy Sauce',
      category: 'Condiment',
      image: '/api/placeholder/100/100',
      dietaryRestrictions: ['Contains gluten'],
      dietaryLifestyles: ['Vegan', 'Vegetarian'],
      usedInRecipes: 35,
      usersHave: 1950,
      status: 'Inactive',
      dateAdded: '2024-01-08',
    },
  ]);

  // Sample pending ingredients
  const [pendingIngredients, setPendingIngredients] = useState([
    {
      id: 5,
      name: 'Sea Grapes',
      suggestedCategory: 'Main Ingredient',
      user: '@lola_chef',
      image: null,
      dateRequested: '2025-07-05',
      dietaryRestrictions: [],
      dietaryLifestyles: ['Vegan'],
    },
    {
      id: 6,
      name: 'Dragon Fruit',
      suggestedCategory: 'Main Ingredient',
      user: '@tropical_cook',
      image: null,
      dateRequested: '2025-07-03',
      dietaryRestrictions: [],
      dietaryLifestyles: ['Vegan', 'Gluten-free'],
    },
  ]);

  // Form state for adding/editing ingredients
  const [formData, setFormData] = useState({
    name: '',
    category: 'Main Ingredient',
    image: null,
    dietaryRestrictions: [],
    dietaryLifestyles: [],
    status: 'Active',
  });

  const categories = ['Main Ingredient', 'Condiment', 'Spice', 'Additive', 'Other'].sort();
  const dietaryRestrictions = ['Not vegan', 'Not vegetarian', 'Not safe for nut allergy', 'Contains dairy', 'Contains gluten'].sort();
  const dietaryLifestyles = ['Vegan', 'Vegetarian', 'Gluten-free', 'Halal', 'Keto', 'Paleo', 'High-protein', 'Mediterranean'].sort();

  const handleAddIngredient = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleEditIngredient = (ingredient) => {
    setSelectedIngredient(ingredient);
    setFormData({
      name: ingredient.name,
      category: ingredient.category,
      image: ingredient.image,
      dietaryRestrictions: ingredient.dietaryRestrictions || [],
      dietaryLifestyles: ingredient.dietaryLifestyles || [],
      status: ingredient.status,
    });
    setShowEditModal(true);
  };

  const showConfirmation = (title, message, action, type = 'confirm') => {
    setConfirmModalConfig({ title, message, action, type });
    setShowConfirmModal(true);
  };

  const handleDeleteIngredient = (id) => {
    showConfirmation(
      'Delete Ingredient',
      'Are you sure you want to delete this ingredient? This action cannot be undone.',
      () => {
        setIngredients(ingredients.filter((ing) => ing.id !== id));
        setShowConfirmModal(false);
      },
      'delete'
    );
  };

  const handleApprovePending = (pending) => {
    showConfirmation(
      'Approve Ingredient',
      `Are you sure you want to approve "${pending.name}" as an ingredient?`,
      () => {
        const newIngredient = {
          id: Date.now(),
          name: pending.name,
          category: pending.suggestedCategory,
          image: pending.image || '/api/placeholder/100/100',
          dietaryRestrictions: pending.dietaryRestrictions || [],
          dietaryLifestyles: pending.dietaryLifestyles || [],
          usedInRecipes: 0,
          usersHave: 1,
          status: 'Active',
          dateAdded: new Date().toISOString().split('T')[0],
        };
        setIngredients([...ingredients, newIngredient]);
        setPendingIngredients(pendingIngredients.filter((p) => p.id !== pending.id));
        setShowConfirmModal(false);
      },
      'confirm'
    );
  };

  const handleRejectPending = (id) => {
    showConfirmation(
      'Reject Ingredient',
      'Are you sure you want to reject this ingredient request?',
      () => {
        setPendingIngredients(pendingIngredients.filter((p) => p.id !== id));
        setShowConfirmModal(false);
      },
      'delete'
    );
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name.trim()) {
      alert('Please enter an ingredient name');
      return;
    }
    
    // Check for duplicate names (case-insensitive)
    const isDuplicate = ingredients.some(
      (ing) => 
        ing.name.toLowerCase() === formData.name.toLowerCase() && 
        ing.id !== (selectedIngredient?.id || null)
    );
    
    if (isDuplicate) {
      alert('An ingredient with this name already exists');
      return;
    }

    showConfirmation(
      selectedIngredient ? 'Update Ingredient' : 'Add Ingredient',
      selectedIngredient
        ? `Are you sure you want to update "${formData.name}"?`
        : `Are you sure you want to add "${formData.name}" as a new ingredient?`,
      () => {
        const ingredientData = {
          ...formData,
          id: selectedIngredient ? selectedIngredient.id : Date.now(),
          usedInRecipes: selectedIngredient ? selectedIngredient.usedInRecipes : 0,
          usersHave: selectedIngredient ? selectedIngredient.usersHave : 1,
          dateAdded: selectedIngredient ? selectedIngredient.dateAdded : new Date().toISOString().split('T')[0],
        };

        if (selectedIngredient) {
          setIngredients(ingredients.map((ing) => (ing.id === selectedIngredient.id ? ingredientData : ing)));
          setShowEditModal(false);
        } else {
          setIngredients([...ingredients, ingredientData]);
          setShowAddModal(false);
        }
        resetForm();
        setShowConfirmModal(false);
      },
      'confirm'
    );
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'Main Ingredient',
      image: null,
      dietaryRestrictions: [],
      dietaryLifestyles: [],
      status: 'Active',
    });
    setSelectedIngredient(null);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image size must be less than 2MB');
        e.target.value = '';
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
        alert('Only JPG and PNG formats are allowed');
        e.target.value = '';
        return;
      }
      const imageUrl = URL.createObjectURL(file);
      setFormData({ ...formData, image: imageUrl });
    }
  };

  const toggleTag = (tagType, tag) => {
    const currentTags = formData[tagType] || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];
    setFormData({ ...formData, [tagType]: newTags });
  };

  const filteredIngredients = ingredients
    .filter((ing) => {
      const matchesStatus = statusFilter === 'All' || ing.status === statusFilter;
      const matchesCategory = categoryFilter === 'All' || ing.category === categoryFilter;
      return matchesStatus && matchesCategory;
    })
    .sort((a, b) => {
      const valueA = a[sortBy];
      const valueB = b[sortBy];
      const order = sortOrder === 'asc' ? 1 : -1;
      if (typeof valueA === 'string') {
        return valueA.localeCompare(valueB) * order;
      }
      return (valueA - valueB) * order;
    });

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleExportData = () => {
    const dataToExport = {
      ingredients: ingredients,
      pendingIngredients: pendingIngredients,
      exportDate: new Date().toISOString(),
      totalIngredients: ingredients.length,
      activeIngredients: ingredients.filter(ing => ing.status === 'Active').length,
      inactiveIngredients: ingredients.filter(ing => ing.status === 'Inactive').length,
    };
    
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ingredients-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getIngredientStats = () => {
    const totalIngredients = ingredients.length;
    const mostUsed = ingredients.length > 0 
      ? ingredients.sort((a, b) => b.usedInRecipes - a.usedInRecipes)[0] 
      : null;
    const recentlyAdded = ingredients.length > 0 
      ? ingredients.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))[0] 
      : null;
    
    return { totalIngredients, mostUsed, recentlyAdded };
  };

  const { totalIngredients, mostUsed, recentlyAdded } = getIngredientStats();

  // Confirmation Modal Component
  const ConfirmationModal = ({ title, message, onConfirm, onCancel, type }) => (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="confirmation-actions">
          <button className="confirmation-btn cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className={`confirmation-btn confirm ${type}`} onClick={onConfirm}>
            {type === 'delete' ? 'Delete' : type === 'confirm' ? 'Confirm' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );

  // Icons Components
  const PlusIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
    </svg>
  );

  const ModifyIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  );

  const DeleteIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
  );

  const ConfirmIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </svg>
  );

  const RejectIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm4-12l-4 4-4-4-1.41 1.41L10.17 12l-3.58 3.58L8 17l4-4 4 4 1.41-1.41L13.83 12l3.58-3.58L16 7z" />
    </svg>
  );

  const DownloadIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
    </svg>
  );

  return (
    <AdminLayout currentPage="Ingredients">
      <div className="dashboard-container">
        <div className="main-content">
          {/* Overview Panel */}
          <div className="controls-container">
            <div className="status-filters">
              <span className="filter-label">Total Ingredients:</span>
              <span>{totalIngredients}</span>
            </div>
            <div className="status-filters">
              <span className="filter-label">Most Used:</span>
              <span>{mostUsed ? mostUsed.name : 'N/A'}</span>
            </div>
            <div className="status-filters">
              <span className="filter-label">Recently Added:</span>
              <span>{recentlyAdded ? recentlyAdded.name : 'N/A'}</span>
            </div>
            <div className="status-filters">
              <span className="filter-label">Pending Requests:</span>
              <span>{pendingIngredients.length}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="controls-container">
            <div className="status-filters">
              <span className="filter-label">Status:</span>
              <button className={`filter-btn ${statusFilter === 'All' ? 'active' : ''}`} onClick={() => setStatusFilter('All')}>
                All ({ingredients.length})
              </button>
              <button className={`filter-btn ${statusFilter === 'Active' ? 'active' : ''}`} onClick={() => setStatusFilter('Active')}>
                Active ({ingredients.filter(ing => ing.status === 'Active').length})
              </button>
              <button className={`filter-btn ${statusFilter === 'Inactive' ? 'active' : ''}`} onClick={() => setStatusFilter('Inactive')}>
                Inactive ({ingredients.filter(ing => ing.status === 'Inactive').length})
              </button>
            </div>
            <div className="date-range">
              <span className="filter-label">Category:</span>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="date-select">
                <option value="All">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <button className="export-btn" onClick={handleExportData}>
                <DownloadIcon />
                Export Data
              </button>
              <button className="export-btn" onClick={handleAddIngredient}>
                <PlusIcon />
                Add Ingredient
              </button>
            </div>
          </div>

          {/* Ingredient List */}
          <div className="recipe-display list">
            <h3>Ingredients ({filteredIngredients.length})</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden', minWidth: '800px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '12px', textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('image')}>
                      Image {sortBy === 'image' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('name')}>
                      Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('category')}>
                      Category {sortBy === 'category' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>
                      Dietary Info
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('usedInRecipes')}>
                      Used in Recipes {sortBy === 'usedInRecipes' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('usersHave')}>
                      Users Have {sortBy === 'usersHave' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('status')}>
                      Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIngredients.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                        No ingredients found matching your criteria
                      </td>
                    </tr>
                  ) : (
                    filteredIngredients.map((ingredient) => (
                      <tr key={ingredient.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '12px' }}>
                          {ingredient.image ? (
                            <img 
                              src={ingredient.image} 
                              alt={ingredient.name} 
                              style={{ 
                                width: '40px', 
                                height: '40px', 
                                objectFit: 'cover', 
                                borderRadius: '4px',
                                border: '1px solid #e5e7eb'
                              }} 
                            />
                          ) : (
                            <div style={{ 
                              width: '40px', 
                              height: '40px', 
                              background: '#f3f4f6', 
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              color: '#9ca3af'
                            }}>
                              No Image
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px', fontWeight: '500' }}>{ingredient.name}</td>
                        <td style={{ padding: '12px' }}>
                          <span className="meal-type">{ingredient.category}</span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {ingredient.dietaryLifestyles && ingredient.dietaryLifestyles.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                                {ingredient.dietaryLifestyles.slice(0, 2).map((lifestyle) => (
                                  <span key={lifestyle} className="tag dietary" style={{ fontSize: '9px' }}>
                                    {lifestyle}
                                  </span>
                                ))}
                                {ingredient.dietaryLifestyles.length > 2 && (
                                  <span className="tag-more">+{ingredient.dietaryLifestyles.length - 2}</span>
                                )}
                              </div>
                            )}
                            {ingredient.dietaryRestrictions && ingredient.dietaryRestrictions.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                                {ingredient.dietaryRestrictions.slice(0, 1).map((restriction) => (
                                  <span key={restriction} className="tag health" style={{ fontSize: '9px' }}>
                                    {restriction}
                                  </span>
                                ))}
                                {ingredient.dietaryRestrictions.length > 1 && (
                                  <span className="tag-more">+{ingredient.dietaryRestrictions.length - 1}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px', fontWeight: '500', color: '#2E7D32' }}>{ingredient.usedInRecipes}</td>
                        <td style={{ padding: '12px' }}>{ingredient.usersHave.toLocaleString()}</td>
                        <td style={{ padding: '12px' }}>
                          <span className={`verification-badge ${ingredient.status === 'Active' ? 'verified' : 'ai'}`}>
                            {ingredient.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              className="recipe-action-btn edit" 
                              onClick={() => handleEditIngredient(ingredient)}
                              title="Edit ingredient"
                            >
                              <ModifyIcon />
                            </button>
                            <button 
                              className="recipe-action-btn delete" 
                              onClick={() => handleDeleteIngredient(ingredient.id)}
                              title="Delete ingredient"
                            >
                              <DeleteIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending Ingredients */}
          {pendingIngredients.length > 0 && (
            <div className="recipe-display list" style={{ marginTop: '30px' }}>
              <h3>Pending User-Requested Ingredients ({pendingIngredients.length})</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden', minWidth: '700px' }}>
                  <thead>
                    <tr style={{ background: '#fef3c7' }}>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Photo</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Requested By</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Suggested Category</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Date Requested</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingIngredients.map((pending) => (
                      <tr key={pending.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '12px' }}>
                          {pending.image ? (
                            <img 
                              src={pending.image} 
                              alt={pending.name} 
                              style={{ 
                                width: '40px', 
                                height: '40px', 
                                objectFit: 'cover', 
                                borderRadius: '4px',
                                border: '1px solid #e5e7eb'
                              }} 
                            />
                          ) : (
                            <div style={{ 
                              width: '40px', 
                              height: '40px', 
                              background: '#f3f4f6', 
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              color: '#9ca3af',
                              border: '1px dashed #d1d5db'
                            }}>
                              No Image
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px', fontWeight: '500' }}>{pending.name}</td>
                        <td style={{ padding: '12px', color: '#2E7D32' }}>{pending.user}</td>
                        <td style={{ padding: '12px' }}>
                          <span className="meal-type">{pending.suggestedCategory}</span>
                        </td>
                        <td style={{ padding: '12px', color: '#64748b' }}>
                          {new Date(pending.dateRequested).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              className="recipe-action-btn confirm" 
                              onClick={() => handleApprovePending(pending)}
                              title="Approve ingredient"
                            >
                              <ConfirmIcon />
                            </button>
                            <button
                              className="recipe-action-btn edit"
                              onClick={() => {
                                setSelectedIngredient(null);
                                setFormData({
                                  name: pending.name,
                                  category: pending.suggestedCategory,
                                  image: pending.image,
                                  dietaryRestrictions: pending.dietaryRestrictions || [],
                                  dietaryLifestyles: pending.dietaryLifestyles || [],
                                  status: 'Active',
                                });
                                setShowEditModal(true);
                              }}
                              title="Edit before approving"
                            >
                              <ModifyIcon />
                            </button>
                            <button 
                              className="recipe-action-btn delete" 
                              onClick={() => handleRejectPending(pending.id)}
                              title="Reject ingredient"
                            >
                              <RejectIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Add Ingredient Modal */}
          {showAddModal && (
            <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>Add New Ingredient</h2>
                  <button className="modal-close" onClick={() => setShowAddModal(false)}>
                    ×
                  </button>
                </div>
                <form onSubmit={handleFormSubmit} className="recipe-form">
                  <div className="form-section">
                    <label className="form-label">Ingredient Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter ingredient name"
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
                    <label className="form-label">Photo (JPG/PNG, Max 2MB)</label>
                    <input
                      type="file"
                      className="form-input"
                      accept="image/jpeg,image/png,image/jpg"
                      onChange={handleImageUpload}
                    />
                    {formData.image && (
                      <div style={{ marginTop: '10px' }}>
                        <img 
                          src={formData.image} 
                          alt="Preview" 
                          style={{ 
                            width: '100px', 
                            height: '100px', 
                            objectFit: 'cover', 
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb'
                          }} 
                        />
                      </div>
                    )}
                  </div>

                  <div className="form-section">
                    <label className="form-label">Dietary Restrictions</label>
                    <div className="tag-grid">
                      {dietaryRestrictions.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          className={`tag-btn ${formData.dietaryRestrictions.includes(tag) ? 'active' : ''}`}
                          onClick={() => toggleTag('dietaryRestrictions', tag)}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-section">
                    <label className="form-label">Dietary Lifestyles</label>
                    <div className="tag-grid">
                      {dietaryLifestyles.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          className={`tag-btn ${formData.dietaryLifestyles.includes(tag) ? 'active' : ''}`}
                          onClick={() => toggleTag('dietaryLifestyles', tag)}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-section">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="form-actions">
                    <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-submit">
                      Add Ingredient
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Ingredient Modal */}
          {showEditModal && (
            <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>Edit Ingredient</h2>
                  <button className="modal-close" onClick={() => setShowEditModal(false)}>
                    ×
                  </button>
                </div>
                <form onSubmit={handleFormSubmit} className="recipe-form">
                  <div className="form-section">
                    <label className="form-label">Ingredient Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter ingredient name"
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
                    <label className="form-label">Photo (JPG/PNG, Max 2MB)</label>
                    <input
                      type="file"
                      className="form-input"
                      accept="image/jpeg,image/png,image/jpg"
                      onChange={handleImageUpload}
                    />
                    {formData.image && (
                      <div style={{ marginTop: '10px' }}>
                        <img 
                          src={formData.image} 
                          alt="Preview" 
                          style={{ 
                            width: '100px', 
                            height: '100px', 
                            objectFit: 'cover', 
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb'
                          }} 
                        />
                      </div>
                    )}
                  </div>

                  <div className="form-section">
                    <label className="form-label">Dietary Restrictions</label>
                    <div className="tag-grid">
                      {dietaryRestrictions.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          className={`tag-btn ${formData.dietaryRestrictions.includes(tag) ? 'active' : ''}`}
                          onClick={() => toggleTag('dietaryRestrictions', tag)}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-section">
                    <label className="form-label">Dietary Lifestyles</label>
                    <div className="tag-grid">
                      {dietaryLifestyles.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          className={`tag-btn ${formData.dietaryLifestyles.includes(tag) ? 'active' : ''}`}
                          onClick={() => toggleTag('dietaryLifestyles', tag)}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-section">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  {selectedIngredient && (
                    <div className="form-section">
                      <label className="form-label">Merge with Existing Ingredient (Optional)</label>
                      <select
                        className="form-select"
                        onChange={(e) => {
                          if (e.target.value) {
                            showConfirmation(
                              'Merge Ingredient',
                              `Are you sure you want to merge "${formData.name}" with "${e.target.value}"? This will delete the current ingredient and cannot be undone.`,
                              () => {
                                setIngredients(ingredients.filter((ing) => ing.id !== selectedIngredient.id));
                                setShowEditModal(false);
                                resetForm();
                                setShowConfirmModal(false);
                              },
                              'delete'
                            );
                          }
                        }}
                      >
                        <option value="">Select ingredient to merge with</option>
                        {ingredients
                          .filter((ing) => ing.id !== selectedIngredient?.id)
                          .map((ing) => (
                            <option key={ing.id} value={ing.name}>
                              {ing.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  <div className="form-actions">
                    <button type="button" className="btn-cancel" onClick={() => setShowEditModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-submit">
                      {selectedIngredient ? 'Update Ingredient' : 'Add Ingredient'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Confirmation Modal */}
          {showConfirmModal && (
            <ConfirmationModal
              title={confirmModalConfig.title}
              message={confirmModalConfig.message}
              onConfirm={confirmModalConfig.action}
              onCancel={() => setShowConfirmModal(false)}
              type={confirmModalConfig.type}
            />
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default IngredientManagement;