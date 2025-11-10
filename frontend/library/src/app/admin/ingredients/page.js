'use client';
import React, { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Backend API integration - Works for both localhost and Vercel
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
  const API_URL = API_BASE_URL; // ✅ FIXED: No need to append /api again

  const adminIngredientsService = {
    getAuthToken() {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('token');
      }
      return null;
    },

    createHeaders() {
      const token = this.getAuthToken();
      return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      };
    },

    async handleResponse(response) {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      return data;
    },

    async getAllIngredients() {
      const response = await fetch(`${API_URL}/admin/ingredients`, {
        headers: this.createHeaders(),
      });
      return await this.handleResponse(response);
    },

    async createIngredient(ingredientData) {
      const response = await fetch(`${API_URL}/admin/ingredients`, {
        method: 'POST',
        headers: this.createHeaders(),
        body: JSON.stringify(ingredientData)
      });
      return await this.handleResponse(response);
    },

    async updateIngredient(id, ingredientData) {
      const response = await fetch(`${API_URL}/admin/ingredients/${id}`, {
        method: 'PUT',
        headers: this.createHeaders(),
        body: JSON.stringify(ingredientData)
      });
      return await this.handleResponse(response);
    },

    async deleteIngredient(id) {
      const response = await fetch(`${API_URL}/admin/ingredients/${id}`, {
        method: 'DELETE',
        headers: this.createHeaders(),
      });
      return await this.handleResponse(response);
    },

    async approvePendingIngredient(pendingData) {
      const response = await fetch(`${API_URL}/admin/ingredients/approve-pending`, {
        method: 'POST',
        headers: this.createHeaders(),
        body: JSON.stringify(pendingData)
      });
      return await this.handleResponse(response);
    },

    async getPendingIngredients() {
      const response = await fetch(`${API_URL}/admin/ingredients/pending`, {
        headers: this.createHeaders(),
      });
      return await this.handleResponse(response);
    }
  };

  // State for ingredients data
  const [ingredients, setIngredients] = useState([]);
  const [pendingIngredients, setPendingIngredients] = useState([]);

  // Form state for adding/editing ingredients
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    category: 'Main Ingredient',
    image: null,
    imageInputType: 'file', // 'file' or 'url'
    status: 'Active',
  });

  const types = ['Meat', 'Poultry', 'Fish', 'Seafood', 'Protein', 'Vegetable', 'Fruit', 'Grain', 'Dairy', 'Egg', 'Nut', 'Legume', 'Herb & Spice', 'Citrus Fruit', 'Mineral', 'Other'].sort();
  const categories = ['Main Ingredient', 'Condiment', 'Spice', 'Additive', 'Other'].sort();

  // Load ingredients from backend
  useEffect(() => {
    const loadIngredients = async () => {
      try {
        setLoading(true);
        const [ingredientsResult, pendingResult] = await Promise.all([
          adminIngredientsService.getAllIngredients().catch(() => ({ ingredients: [] })),
          adminIngredientsService.getPendingIngredients().catch(() => ({ pendingIngredients: [] }))
        ]);
        
        const loadedIngredients = ingredientsResult.ingredients || [];
        
        // Debug: Log ingredients with missing types (should not happen after backend fix)
        const missingTypes = loadedIngredients.filter(ing => !ing.type);
        if (missingTypes.length > 0) {
          console.warn(`⚠️  ${missingTypes.length} ingredients missing type:`, missingTypes.map(ing => ing.name));
          // Auto-assign default type for any missing types
          missingTypes.forEach(ing => {
            ing.type = 'Other';
          });
        }
        
        setIngredients(loadedIngredients);
        setPendingIngredients(pendingResult.pendingIngredients || []);
      } catch (error) {
        console.error('Error loading ingredients:', error);
        // Fallback to sample data if backend fails
        setIngredients([
          {
            id: 1,
            name: 'Chicken Breast',
            type: 'Poultry',
            category: 'Main Ingredient',
            image: '/api/placeholder/100/100',
            usedInRecipes: 72,
            usersHave: 4300,
            status: 'Active',
            dateAdded: '2024-01-10',
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadIngredients();
  }, []);

  const handleAddIngredient = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleEditIngredient = (ingredient) => {
    setSelectedIngredient(ingredient);
    // Determine if image is a URL or base64
    const isUrl = ingredient.image && (ingredient.image.startsWith('http://') || ingredient.image.startsWith('https://'));
    setFormData({
      name: ingredient.name,
      type: ingredient.type || '',
      category: ingredient.category,
      image: ingredient.image,
      imageInputType: isUrl ? 'url' : 'file',
      status: ingredient.status,
    });
    setShowEditModal(true);
  };

  const showConfirmation = (title, message, action, type = 'confirm') => {
    setConfirmModalConfig({ title, message, action, type });
    setShowConfirmModal(true);
  };

  const handleDeleteIngredient = async (id) => {
    showConfirmation(
      'Delete Ingredient',
      'Are you sure you want to delete this ingredient? This action cannot be undone.',
      async () => {
        try {
          await adminIngredientsService.deleteIngredient(id);
          setIngredients(ingredients.filter(ing => ing.id !== id));
          setShowConfirmModal(false);
        } catch (error) {
          alert('Error deleting ingredient: ' + error.message);
        }
      },
      'delete'
    );
  };

  const handleApprovePending = async (pending) => {
    showConfirmation(
      'Approve Ingredient',
      `Are you sure you want to approve "${pending.name}" as an ingredient?`,
      async () => {
        try {
          const result = await adminIngredientsService.approvePendingIngredient(pending);
          setIngredients([...ingredients, result.ingredient]);
          setPendingIngredients(pendingIngredients.filter(p => p.id !== pending.id));
          setShowConfirmModal(false);
        } catch (error) {
          alert('Error approving ingredient: ' + error.message);
        }
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

  const handleFormSubmit = async (e) => {
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

    try {
      if (selectedIngredient) {
        const result = await adminIngredientsService.updateIngredient(selectedIngredient.id, formData);
        setIngredients(ingredients.map(ing => ing.id === selectedIngredient.id ? result.ingredient : ing));
        setShowEditModal(false);
      } else {
        const result = await adminIngredientsService.createIngredient(formData);
        setIngredients([...ingredients, result.ingredient]);
        setShowAddModal(false);
      }
      resetForm();
    } catch (error) {
      alert('Error saving ingredient: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      category: 'Main Ingredient',
      image: null,
      imageInputType: 'file',
      status: 'Active',
    });
    setSelectedIngredient(null);
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Optimize dimensions for smaller file size (max 600px for better compression)
          const maxDimension = 600;
          if (width > height) {
            if (width > maxDimension) {
              height = (height * maxDimension) / width;
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = (width * maxDimension) / height;
              height = maxDimension;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          // Use better quality settings for smaller file size
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to base64 with optimized quality (0.7 for better compression)
          // This reduces file size significantly while maintaining good visual quality
          const base64 = canvas.toDataURL('image/jpeg', 0.7);
          
          // Check if compressed image is still too large (>3MB base64 = ~2.25MB actual)
          const base64Data = base64.split(',')[1] || '';
          const sizeInBytes = (base64Data.length * 3) / 4;
          const maxSize = 3 * 1024 * 1024; // 3MB
          
          if (sizeInBytes > maxSize) {
            // Try with even lower quality
            const base64Lower = canvas.toDataURL('image/jpeg', 0.6);
            resolve(base64Lower);
          } else {
            resolve(base64);
          }
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Increased limit to 5MB before compression (will be compressed to ~1-2MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB. The image will be compressed automatically.');
        e.target.value = '';
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.type)) {
        alert('Only JPG, PNG, and WebP formats are allowed');
        e.target.value = '';
        return;
      }
      
      try {
        // Show loading state
        const base64Image = await compressImage(file);
        
        // Verify compressed size
        const base64Data = base64Image.split(',')[1] || '';
        const sizeInBytes = (base64Data.length * 3) / 4;
        const sizeInMB = sizeInBytes / 1024 / 1024;
        
        if (sizeInMB > 3) {
          alert(`Warning: Compressed image is still large (${sizeInMB.toFixed(2)}MB). Consider using a smaller image or URL instead.`);
        }
        
        setFormData({ ...formData, image: base64Image, imageInputType: 'file' });
      } catch (error) {
        console.error('Error processing image:', error);
        alert('Failed to process image. Please try again.');
        e.target.value = '';
      }
    }
  };

  const handleImageUrlChange = (e) => {
    const url = e.target.value.trim();
    if (url === '') {
      setFormData({ ...formData, image: null, imageInputType: 'url' });
      return;
    }
    
    // Validate URL format
    try {
      new URL(url);
      // Test if URL is an image by creating an image element
      const img = new Image();
      img.onload = () => {
        setFormData({ ...formData, image: url, imageInputType: 'url' });
      };
      img.onerror = () => {
        alert('Invalid image URL. Please provide a valid image URL.');
        e.target.value = '';
      };
      img.src = url;
    } catch (error) {
      alert('Invalid URL format. Please enter a valid URL (e.g., https://example.com/image.jpg)');
      e.target.value = '';
    }
  };


  const filteredIngredients = ingredients
    .filter((ing) => {
      const matchesStatus = statusFilter === 'All' || ing.status === statusFilter;
      const matchesCategory = categoryFilter === 'All' || ing.category === categoryFilter;
      const matchesSearch = searchTerm === '' || 
        ing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ing.type && ing.type.toLowerCase().includes(searchTerm.toLowerCase())) ||
        ing.category.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesCategory && matchesSearch;
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

  // Pagination logic
  const totalPages = Math.ceil(filteredIngredients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedIngredients = filteredIngredients.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, categoryFilter, searchTerm, sortBy, sortOrder]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
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
    // Export ingredients as CSV with recommended columns
    const headers = [
      'Ingredient Name',
      'Requested Count',
      'Recipes Using It',
      'Related Dietary Filter',
      'Last Updated',
      'Type',
      'Role',
      'Status'
    ];

    const csvRows = [
      headers.map(escapeCSV).join(','),
      ...ingredients.map(ing => {
        const requestedCount = ing.usersHave || 0;
        const recipesUsingIt = ing.usedInRecipes || 0;
        const relatedDietaryFilter = ing.type || 'N/A';
        const lastUpdated = ing.dateAdded || 'N/A';
        const type = ing.type || 'N/A';
        const role = ing.category || 'N/A';

        return [
          ing.name,
          requestedCount,
          recipesUsingIt,
          relatedDietaryFilter,
          lastUpdated,
          type,
          role,
          ing.status
        ].map(escapeCSV).join(',');
      })
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ingredients-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    alert(`Exported ${ingredients.length} ingredient(s) successfully as CSV.`);
  };

  const getIngredientStats = () => {
    const totalIngredients = ingredients.length;
    // CRITICAL FIX: Sort by scanCount (total scans from user_scanned_ingredients) for Most Used
    const mostUsed = ingredients.length > 0 
      ? ingredients
          .filter(ing => (ing.scanCount !== undefined && ing.scanCount !== null) || (ing.usedInRecipes !== undefined && ing.usedInRecipes !== null))
          .sort((a, b) => {
            // Prioritize scanCount, fallback to usedInRecipes
            const aCount = (a.scanCount || 0) > 0 ? a.scanCount : (a.usedInRecipes || 0);
            const bCount = (b.scanCount || 0) > 0 ? b.scanCount : (b.usedInRecipes || 0);
            return bCount - aCount;
          })[0] 
      : null;
    
    return { totalIngredients, mostUsed };
  };

  const { totalIngredients, mostUsed } = getIngredientStats();

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

  if (loading) {
    return (
      <AdminLayout currentPage="Ingredients">
        <div className="dashboard-container">
          <div className="main-content">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
              <div style={{ width: '40px', height: '40px', border: '4px solid rgba(46, 125, 50, 0.1)', borderTop: '4px solid #2E7D32', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }}></div>
              <p>Loading ingredients...</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout currentPage="Ingredients">
      <div className="dashboard-container">
        <div className="main-content">
          {/* Overview Panel */}
          <div className="stats-overview-container" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginBottom: '24px'
          }}>
            <div className="stat-card" style={{
              background: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              textAlign: 'center',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}>
              <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px', fontWeight: '500' }}>Total Ingredients</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#2E7D32' }}>{totalIngredients}</div>
            </div>
            <div className="stat-card" style={{
              background: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              textAlign: 'center',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}>
              <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px', fontWeight: '500' }}>Most Used</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#2E7D32' }}>{mostUsed ? mostUsed.name : 'N/A'}</div>
            </div>
            <div className="stat-card" style={{
              background: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              textAlign: 'center',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}>
              <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px', fontWeight: '500' }}>Pending Requests</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#2E7D32' }}>{pendingIngredients.length}</div>
            </div>
          </div>

          {/* Controls */}
          <div className="controls-container" style={{
            background: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            marginBottom: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div className="filter-group" style={{ width: '100%' }}>
              <label className="filter-label" style={{ 
                display: 'block', 
                marginBottom: '12px', 
                fontWeight: '600', 
                fontSize: '15px',
                color: '#1f2937'
              }}>
                Search Ingredients
              </label>
              <div className="search-input-container" style={{ position: 'relative', width: '100%', maxWidth: '500px' }}>
                <input
                  type="text"
                  placeholder="Search by name or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input-field"
                  style={{
                    width: '100%',
                    padding: '12px 45px 12px 16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontFamily: 'Poppins, sans-serif',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2E7D32';
                    e.target.style.boxShadow = '0 0 0 3px rgba(46, 125, 50, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <svg 
                  style={{
                    position: 'absolute',
                    right: '14px',
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
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', width: '100%' }}>
              <div className="status-filters" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span className="filter-label" style={{ fontWeight: '600', fontSize: '14px', color: '#374151', marginRight: '4px' }}>Status:</span>
                <button className={`filter-btn ${statusFilter === 'All' ? 'active' : ''}`} onClick={() => setStatusFilter('All')} style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  background: statusFilter === 'All' ? '#2E7D32' : 'white',
                  color: statusFilter === 'All' ? 'white' : '#374151',
                  fontWeight: '500',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}>
                  All ({ingredients.length})
                </button>
                <button className={`filter-btn ${statusFilter === 'Active' ? 'active' : ''}`} onClick={() => setStatusFilter('Active')} style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  background: statusFilter === 'Active' ? '#2E7D32' : 'white',
                  color: statusFilter === 'Active' ? 'white' : '#374151',
                  fontWeight: '500',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}>
                  Active ({ingredients.filter(ing => ing.status === 'Active').length})
                </button>
                <button className={`filter-btn ${statusFilter === 'Inactive' ? 'active' : ''}`} onClick={() => setStatusFilter('Inactive')} style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  background: statusFilter === 'Inactive' ? '#2E7D32' : 'white',
                  color: statusFilter === 'Inactive' ? 'white' : '#374151',
                  fontWeight: '500',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}>
                  Inactive ({ingredients.filter(ing => ing.status === 'Inactive').length})
                </button>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto', flexWrap: 'wrap' }}>
                <span className="filter-label" style={{ fontWeight: '600', fontSize: '14px', color: '#374151' }}>Role:</span>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="date-select" style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontSize: '14px',
                  fontFamily: 'Poppins, sans-serif',
                  background: 'white',
                  cursor: 'pointer',
                  minWidth: '160px',
                  transition: 'all 0.2s ease'
                }}>
                  <option value="All">All Roles</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <button className="export-btn" onClick={handleExportData} style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#2E7D32',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(46, 125, 50, 0.2)'
                }}>
                  <DownloadIcon />
                  Export Data
                </button>
              </div>
            </div>
          </div>

          {/* Ingredient List */}
          <div className="recipe-display list" style={{
            background: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
          }}>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: '700', 
              color: '#1f2937', 
              marginBottom: '20px',
              fontFamily: 'Poppins, sans-serif'
            }}>
              Ingredients ({filteredIngredients.length})
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse', 
                background: 'white', 
                borderRadius: '8px', 
                overflow: 'hidden', 
                minWidth: '800px' 
              }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ 
                      padding: '16px 12px', 
                      textAlign: 'center',
                      fontWeight: '600',
                      fontSize: '13px',
                      color: '#374151',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontFamily: 'Poppins, sans-serif',
                      width: '60px'
                    }}>
                      #
                    </th>
                    <th style={{ 
                      padding: '16px 12px', 
                      textAlign: 'left',
                      fontWeight: '600',
                      fontSize: '13px',
                      color: '#374151',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontFamily: 'Poppins, sans-serif',
                      width: '100px'
                    }}>
                      Image
                    </th>
                    <th style={{ 
                      padding: '16px 12px', 
                      textAlign: 'left', 
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '13px',
                      color: '#374151',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontFamily: 'Poppins, sans-serif'
                    }} onClick={() => handleSort('name')}>
                      Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ 
                      padding: '16px 12px', 
                      textAlign: 'left', 
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '13px',
                      color: '#374151',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontFamily: 'Poppins, sans-serif'
                    }} onClick={() => handleSort('type')}>
                      Type {sortBy === 'type' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ 
                      padding: '16px 12px', 
                      textAlign: 'left', 
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '13px',
                      color: '#374151',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontFamily: 'Poppins, sans-serif'
                    }} onClick={() => handleSort('category')}>
                      Role {sortBy === 'category' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ 
                      padding: '16px 12px', 
                      textAlign: 'left', 
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '13px',
                      color: '#374151',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontFamily: 'Poppins, sans-serif'
                    }} onClick={() => handleSort('usedInRecipes')}>
                      Used in Recipes {sortBy === 'usedInRecipes' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ 
                      padding: '16px 12px', 
                      textAlign: 'left', 
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '13px',
                      color: '#374151',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontFamily: 'Poppins, sans-serif'
                    }} onClick={() => handleSort('usersHave')}>
                      Users Have {sortBy === 'usersHave' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ 
                      padding: '16px 12px', 
                      textAlign: 'left', 
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '13px',
                      color: '#374151',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontFamily: 'Poppins, sans-serif'
                    }} onClick={() => handleSort('status')}>
                      Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ 
                      padding: '16px 12px', 
                      textAlign: 'left',
                      fontWeight: '600',
                      fontSize: '13px',
                      color: '#374151',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontFamily: 'Poppins, sans-serif'
                    }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedIngredients.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                        No ingredients found matching your criteria
                      </td>
                    </tr>
                  ) : (
                    paginatedIngredients.map((ingredient, index) => {
                      const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                      return (
                      <tr key={ingredient.id} style={{ 
                        borderBottom: '1px solid #f3f4f6',
                        transition: 'background-color 0.2s ease'
                      }} 
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ 
                          padding: '16px 12px', 
                          textAlign: 'center',
                          fontWeight: '600', 
                          fontSize: '14px', 
                          color: '#64748b',
                          fontFamily: 'Poppins, sans-serif'
                        }}>
                          {rowNumber}
                        </td>
                        <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                          {ingredient.image && !ingredient.image.startsWith('blob:') ? (
                            <img 
                              src={ingredient.image} 
                              alt={ingredient.name}
                              style={{
                                width: '50px',
                                height: '50px',
                                objectFit: 'cover',
                                borderRadius: '6px',
                                border: '1px solid #e5e7eb',
                                cursor: 'pointer'
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                const placeholder = e.target.parentElement.querySelector('.image-placeholder');
                                if (placeholder) {
                                  placeholder.style.display = 'flex';
                                }
                              }}
                              crossOrigin="anonymous"
                            />
                          ) : null}
                          <div 
                            className="image-placeholder"
                            style={{
                              width: '50px',
                              height: '50px',
                              background: '#f3f4f6',
                              borderRadius: '6px',
                              display: ingredient.image ? 'none' : 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              color: '#9ca3af',
                              border: '1px dashed #d1d5db',
                              margin: '0 auto'
                            }}
                          >
                            No Image
                          </div>
                        </td>
                        <td style={{ padding: '16px 12px', fontWeight: '600', fontSize: '14px', color: '#1f2937' }}>{ingredient.name}</td>
                        <td style={{ padding: '16px 12px' }}>
                          {ingredient.type ? (
                            <span className="meal-type" style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              background: '#e0f2fe',
                              color: '#0369a1',
                              fontSize: '12px',
                              fontWeight: '500',
                              display: 'inline-block'
                            }}>{ingredient.type}</span>
                          ) : (
                            <span style={{ 
                              fontSize: '12px', 
                              color: '#9ca3af', 
                              fontStyle: 'italic' 
                            }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '16px 12px' }}>
                          <span className="meal-type" style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            background: '#f0fdf4',
                            color: '#2E7D32',
                            fontSize: '12px',
                            fontWeight: '500',
                            display: 'inline-block'
                          }}>{ingredient.category}</span>
                        </td>
                        <td style={{ padding: '16px 12px', fontWeight: '600', color: '#2E7D32', fontSize: '14px' }}>{ingredient.usedInRecipes || 0}</td>
                        <td style={{ padding: '16px 12px', fontWeight: '500', color: '#64748b', fontSize: '14px' }}>{(ingredient.usersHave || 0).toLocaleString()}</td>
                        <td style={{ padding: '16px 12px' }}>
                          <span className={`verification-badge ${ingredient.status === 'Active' ? 'verified' : 'ai'}`} style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            display: 'inline-block'
                          }}>
                            {ingredient.status}
                          </span>
                        </td>
                        <td style={{ padding: '16px 12px' }}>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
                      );
                    })
                  )}
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
                                  type: pending.type || '',
                                  category: pending.suggestedCategory,
                                  image: pending.image,
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
                    <label className="form-label">Type *</label>
                    <select
                      className="form-select"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      required
                    >
                      <option value="">Select Type</option>
                      {types.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-section">
                    <label className="form-label">Role *</label>
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
                    <label className="form-label">Image</label>
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, imageInputType: 'file', image: null })}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: `1px solid ${formData.imageInputType === 'file' ? '#2E7D32' : '#e5e7eb'}`,
                            background: formData.imageInputType === 'file' ? '#2E7D32' : 'white',
                            color: formData.imageInputType === 'file' ? 'white' : '#374151',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          Upload File
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, imageInputType: 'url', image: null })}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: `1px solid ${formData.imageInputType === 'url' ? '#2E7D32' : '#e5e7eb'}`,
                            background: formData.imageInputType === 'url' ? '#2E7D32' : 'white',
                            color: formData.imageInputType === 'url' ? 'white' : '#374151',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          Use URL
                        </button>
                      </div>
                    </div>
                    
                    {formData.imageInputType === 'file' ? (
                      <div>
                        <input
                          type="file"
                          className="form-input"
                          accept="image/jpeg,image/png,image/jpg"
                          onChange={handleImageUpload}
                        />
                        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                          JPG/PNG, Max 2MB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="url"
                          className="form-input"
                          placeholder="https://example.com/image.jpg"
                          onChange={handleImageUrlChange}
                          defaultValue={formData.image && formData.imageInputType === 'url' ? formData.image : ''}
                        />
                        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                          Enter a valid image URL
                        </p>
                      </div>
                    )}
                    
                    {formData.image && (
                      <div style={{ marginTop: '12px' }}>
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
                          onError={(e) => {
                            e.target.style.display = 'none';
                            if (e.target.nextSibling) {
                              e.target.nextSibling.style.display = 'block';
                            }
                          }}
                        />
                        <div style={{ display: 'none', marginTop: '8px', fontSize: '12px', color: '#ef4444' }}>
                          Failed to load image. Please check the URL or try again.
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, image: null })}
                          style={{
                            marginTop: '8px',
                            padding: '4px 12px',
                            borderRadius: '4px',
                            border: '1px solid #e5e7eb',
                            background: 'white',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Remove Image
                        </button>
                      </div>
                    )}
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
                    <label className="form-label">Type *</label>
                    <select
                      className="form-select"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      required
                    >
                      <option value="">Select Type</option>
                      {types.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-section">
                    <label className="form-label">Role *</label>
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
                    <label className="form-label">Image</label>
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, imageInputType: 'file', image: null })}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: `1px solid ${formData.imageInputType === 'file' ? '#2E7D32' : '#e5e7eb'}`,
                            background: formData.imageInputType === 'file' ? '#2E7D32' : 'white',
                            color: formData.imageInputType === 'file' ? 'white' : '#374151',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          Upload File
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, imageInputType: 'url', image: null })}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: `1px solid ${formData.imageInputType === 'url' ? '#2E7D32' : '#e5e7eb'}`,
                            background: formData.imageInputType === 'url' ? '#2E7D32' : 'white',
                            color: formData.imageInputType === 'url' ? 'white' : '#374151',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          Use URL
                        </button>
                      </div>
                    </div>
                    
                    {formData.imageInputType === 'file' ? (
                      <div>
                        <input
                          type="file"
                          className="form-input"
                          accept="image/jpeg,image/png,image/jpg"
                          onChange={handleImageUpload}
                        />
                        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                          JPG/PNG, Max 2MB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="url"
                          className="form-input"
                          placeholder="https://example.com/image.jpg"
                          onChange={handleImageUrlChange}
                          defaultValue={formData.image && formData.imageInputType === 'url' ? formData.image : ''}
                        />
                        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                          Enter a valid image URL
                        </p>
                      </div>
                    )}
                    
                    {formData.image && (
                      <div style={{ marginTop: '12px' }}>
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
                          onError={(e) => {
                            e.target.style.display = 'none';
                            if (e.target.nextSibling) {
                              e.target.nextSibling.style.display = 'block';
                            }
                          }}
                        />
                        <div style={{ display: 'none', marginTop: '8px', fontSize: '12px', color: '#ef4444' }}>
                          Failed to load image. Please check the URL or try again.
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, image: null })}
                          style={{
                            marginTop: '8px',
                            padding: '4px 12px',
                            borderRadius: '4px',
                            border: '1px solid #e5e7eb',
                            background: 'white',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Remove Image
                        </button>
                      </div>
                    )}
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