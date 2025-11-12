'use client';
import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/adminlayout';
import { adminFeedbackAPI } from './api';
import './styles.css';

const FeedbackManagementContent = () => {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [updateStatusOnReply, setUpdateStatusOnReply] = useState('replied');
  
  // Filter states
  const [sortBy, setSortBy] = useState('newest');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Data states
  const [feedbackList, setFeedbackList] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    replied: 0,
    unread: 0,
    unreplied: 0
  });

  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingModal, setLoadingModal] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  // Pagination
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
    total: 0,
    hasMore: false
  });

  // ========================================
  // 📊 LOAD STATISTICS
  // ========================================
  const loadStats = async () => {
    try {
      const response = await adminFeedbackAPI.getStats();
      if (response && response.success) {
        setStats(response.data);
        console.log('✅ Stats loaded:', response.data);
      }
    } catch (error) {
      console.error('❌ Error loading stats:', error);
    }
  };

  // ========================================
  // 📋 LOAD FEEDBACK LIST
  // ========================================
  const loadFeedback = async () => {
    try {
      setLoading(true);
      const filters = {
        sortBy,
        status: statusFilter,
        fromDate: dateFrom,
        toDate: dateTo,
        search: searchQuery,
        limit: pagination.limit,
        offset: pagination.offset
      };

      const response = await adminFeedbackAPI.getAllFeedback(filters);
      
      if (response && response.success) {
        setFeedbackList(response.data.feedbacks);
        setPagination(response.data.pagination);
        console.log('✅ Feedback loaded:', response.data.feedbacks.length, 'items');
      }
    } catch (error) {
      console.error('❌ Error loading feedback:', error);
      setFeedbackList([]);
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // 🔄 INITIAL LOAD AND REFRESH
  // ========================================
  useEffect(() => {
    loadStats();
    loadFeedback();
  }, [sortBy, statusFilter, dateFrom, dateTo, pagination.offset]);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadFeedback();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ========================================
  // 🔍 OPEN FEEDBACK MODAL
  // ========================================
  const openModal = async (feedback) => {
    try {
      setIsModalOpen(true);
      setLoadingModal(true);
      setReplyText('');
      setUpdateStatusOnReply('replied');

      // Mark as read when opening
      if (!feedback.isRead) {
        await adminFeedbackAPI.markAsRead(feedback.feedbackId);
      }

      // Get full feedback details with all replies
      const response = await adminFeedbackAPI.getFeedbackById(feedback.feedbackId);
      
      if (response && response.success) {
        setSelectedFeedback(response.data);
        console.log('✅ Feedback details loaded:', response.data);
      }
    } catch (error) {
      console.error('❌ Error loading feedback details:', error);
      alert('Failed to load feedback details');
      closeModal();
    } finally {
      setLoadingModal(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedFeedback(null);
    setReplyText('');
    setUpdateStatusOnReply('replied');
  };

  // ========================================
  // 💬 SEND REPLY
  // ========================================
  const sendReply = async () => {
    if (!replyText.trim()) {
      alert('Please enter a reply message');
      return;
    }

    if (replyText.trim().length < 10) {
      alert('Reply must be at least 10 characters long');
      return;
    }

    try {
      setSendingReply(true);
      await adminFeedbackAPI.replyToFeedback(
        selectedFeedback.feedbackId,
        replyText.trim(),
        updateStatusOnReply
      );

      console.log('✅ Reply sent successfully');
      alert('Reply sent successfully!');
      
      // Refresh data
      await loadStats();
      await loadFeedback();
      closeModal();
    } catch (error) {
      console.error('❌ Error sending reply:', error);
      alert(error.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  // ========================================
  // ✅ MARK AS READ
  // ========================================
  const markAsRead = async (feedbackId) => {
    try {
      await adminFeedbackAPI.markAsRead(feedbackId);
      await loadFeedback();
      await loadStats();
      console.log('✅ Marked as read');
    } catch (error) {
      console.error('❌ Error marking as read:', error);
      alert('Failed to mark as read');
    }
  };

  // ========================================
  // ⚪ MARK AS UNREAD
  // ========================================
  const markAsUnread = async (feedbackId) => {
    try {
      await adminFeedbackAPI.markAsUnread(feedbackId);
      await loadFeedback();
      await loadStats();
      console.log('✅ Marked as unread');
    } catch (error) {
      console.error('❌ Error marking as unread:', error);
      alert('Failed to mark as unread');
    }
  };

  // ========================================
  // 🗑️ DELETE FEEDBACK
  // ========================================
  const deleteFeedback = async (feedbackId) => {
    if (!confirm('Are you sure you want to delete this feedback? This action cannot be undone.')) {
      return;
    }

    try {
      await adminFeedbackAPI.deleteFeedback(feedbackId);
      await loadStats();
      await loadFeedback();
      
      if (selectedFeedback && selectedFeedback.feedbackId === feedbackId) {
        closeModal();
      }
      
      console.log('✅ Feedback deleted');
      alert('Feedback deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting feedback:', error);
      alert('Failed to delete feedback');
    }
  };

  // ========================================
  // 🧹 CLEAR FILTERS
  // ========================================
  const clearFilters = () => {
    setSortBy('newest');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  // ========================================
  // 🎨 HELPER FUNCTIONS
  // ========================================

  const formatTimestamp = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get latest feedback for stats display
  const latestFeedback = feedbackList.length > 0 ? feedbackList[0] : null;

  // ========================================
  // 📤 EXPORT DATA
  // ========================================
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
    // Export feedback data as CSV
    const headers = [
      'Feedback ID',
      'User',
      'Subject',
      'Message',
      'Status',
      'Created At',
      'Replied At'
    ];

    const csvRows = [
      headers.map(escapeCSV).join(','),
      ...feedbackList.map(feedback => [
        feedback.feedbackId || feedback.id,
        feedback.user?.fullName || feedback.user?.email || 'N/A',
        feedback.subject || 'N/A',
        feedback.message || 'N/A',
        feedback.status || 'pending',
        feedback.createdAt || 'N/A',
        feedback.repliedAt || 'N/A'
      ].map(escapeCSV).join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `feedback-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    alert(`Exported ${feedbackList.length} feedback item(s) successfully as CSV.`);
  };

  // ========================================
  // 🎯 ICONS
  // ========================================
  const SearchIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
    </svg>
  );

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

  const DeleteIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
    </svg>
  );

  const FilterIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10,18h4v-2h-4v2zM3,6v2h18V6H3zM6,13h12v-2H6V13z"/>
    </svg>
  );

  const FeedbackIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 13.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1-4.5h-2V6h2v5z"/>
    </svg>
  );

  const RepliedIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
    </svg>
  );

  const UnreadIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
    </svg>
  );

return (
    <div className="main-content">
      {/* Enhanced Page Header */}
      <div className="page-header-enhanced">
        <div className="header-content">
          <div className="header-text">
            <h1 className="page-title">Feedback Management</h1>
            <p className="page-description">
              Monitor, respond to, and manage user feedback efficiently
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="stats-overview">
        <div className="stat-item">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Feedback</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.replied}</div>
          <div className="stat-label">Replied</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.unread}</div>
          <div className="stat-label">Unread</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.unreplied}</div>
          <div className="stat-label">Pending Requests</div>
        </div>
      </div>
{/* Enhanced Controls Section */}
    <div className="controls-section">
      <div className="controls-header">
        <h3>Search & Filters</h3>
      </div>
      <div className="controls-container-inner">
        <div className="filters-left">
          <div className="search-section">
            <label className="filter-label">Search Feedback</label>
            <div className="search-container">
              <input
                type="text"
                className="search-input"
                placeholder="Search by user, subject, or message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="search-btn">
                <SearchIcon />
              </button>
            </div>
          </div>
          
          <div className="filter-section">
            <div className="filter-group">
              <label className="filter-label">Sort By</label>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="unread">Unread First</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label className="filter-label">Status</label>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="sort-select"
              >
                <option value="all">All Status</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
                <option value="replied">Replied</option>
                <option value="unreplied">Not Replied</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label className="filter-label">From Date</label>
              <input 
                type="date" 
                value={dateFrom} 
                onChange={(e) => setDateFrom(e.target.value)}
                className="date-select"
              />
            </div>
            
            <div className="filter-group">
              <label className="filter-label">To Date</label>
              <input 
                type="date" 
                value={dateTo} 
                onChange={(e) => setDateTo(e.target.value)}
                className="date-select"
              />
            </div>
          </div>
        </div>
        
        <div className="action-section">
          <button className="clear-filters-btn" onClick={clearFilters}>
            Clear All
          </button>
          <button className="export-btn" onClick={handleExportData}>
            <ExportIcon />
            Export
          </button>
        </div>
      </div>
    </div>

      {/* ========================================
          📝 RESULTS COUNT
          ======================================== */}
      <div className="results-info">
        Showing {feedbackList.length} of {pagination.total} feedback items
      </div>

      {/* ========================================
          📋 FEEDBACK CARDS
          ======================================== */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          Loading feedback...
        </div>
      ) : feedbackList.length === 0 ? (
        <div className="no-feedback">
          <p>No feedback found matching your criteria.</p>
        </div>
      ) : (
        <div className="feedback-grid">
          {feedbackList.map((feedback) => (
            <div key={feedback.feedbackId} className={`feedback-card ${!feedback.isRead ? 'unread' : ''}`}>
              <div className="feedback-header">
                <div className="user-info">
                  <div className="user-avatar">
                    {feedback.user.firstName?.charAt(0)}{feedback.user.lastName?.charAt(0)}
                  </div>
                  <div className="user-details">
                    <div className="username">{feedback.user.fullName}</div>
                    <div className="timestamp">{formatTimestamp(feedback.createdAt)}</div>
                  </div>
                </div>
                <div className="feedback-status">
                  {!feedback.isRead && <span className="unread-indicator">●</span>}
                  {feedback.isReplied && (
                    <span className="replied-badge">
                      ✓ Replied ({feedback.replyCount})
                    </span>
                  )}
                </div>
              </div>
              
              <div className="feedback-preview">
                {feedback.message.length > 150 
                  ? feedback.message.substring(0, 150) + '...' 
                  : feedback.message}
              </div>
              
              <div className="feedback-actions">
                <button 
                  className="action-btn primary"
                  onClick={() => openModal(feedback)}
                >
                  View & Reply
                </button>
                <button 
                  className="action-btn secondary"
                  onClick={() => feedback.isRead ? markAsUnread(feedback.feedbackId) : markAsRead(feedback.feedbackId)}
                >
                  {feedback.isRead ? 'Mark Unread' : 'Mark Read'}
                </button>
                <button 
                  className="action-btn danger"
                  onClick={() => deleteFeedback(feedback.feedbackId)}
                >
                  <DeleteIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================
          🔍 FEEDBACK DETAIL MODAL
          ======================================== */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            {loadingModal ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                Loading feedback details...
              </div>
            ) : selectedFeedback && (
              <>
                <div className="modal-header">
                  <div className="modal-user-info">
                    <div className="user-avatar">
                      {selectedFeedback.user.firstName?.charAt(0)}{selectedFeedback.user.lastName?.charAt(0)}
                    </div>
                    <div>
                      <div className="modal-username">{selectedFeedback.user.fullName}</div>
                      <div className="modal-timestamp">
                        {new Date(selectedFeedback.createdAt).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <div className="modal-timestamp" style={{ fontSize: '12px', marginTop: '4px' }}>
                        {selectedFeedback.user.email}
                      </div>
                    </div>
                  </div>
                  <button className="close-btn" onClick={closeModal}>
                    <CloseIcon />
                  </button>
                </div>
                
                <div className="modal-content">
                  {/* Original Feedback Message */}
                  <div className="feedback-message">
                    <div style={{ 
                      marginBottom: '12px'
                    }}>
                      <strong>User's Feedback:</strong>
                    </div>
                    {selectedFeedback.message}
                  </div>

                  {/* Display All Previous Replies */}
                  {selectedFeedback.replies && selectedFeedback.replies.length > 0 && (
                    <div className="replies-section" style={{ marginTop: '20px' }}>
                      <strong style={{ display: 'block', marginBottom: '12px' }}>
                        Previous Replies ({selectedFeedback.replies.length}):
                      </strong>
                      {selectedFeedback.replies.map((reply) => (
                        <div 
                          key={reply.replyId}
                          style={{
                            background: '#f0f9ff',
                            padding: '12px',
                            borderRadius: '8px',
                            marginBottom: '10px',
                            borderLeft: '3px solid #0284c7'
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '8px',
                            fontSize: '12px',
                            color: '#666'
                          }}>
                            <span style={{ fontWeight: '600', color: '#0284c7' }}>
                              {reply.adminName}
                            </span>
                            <span>{new Date(reply.createdAt).toLocaleString()}</span>
                          </div>
                          <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                            {reply.message}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* New Reply Section */}
                  <div className="reply-section" style={{ marginTop: '20px' }}>
                    <label htmlFor="reply-text">
                      <strong>Your Reply:</strong>
                    </label>
                    <textarea
                      id="reply-text"
                      className="reply-textarea"
                      placeholder="Type your reply here..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={4}
                      disabled={sendingReply}
                    />
                    
                    <div className="reply-options">
                      <label className="checkbox-label">
                        <span style={{ fontWeight: '500', marginRight: '8px' }}>Update status to:</span>
                        <select 
                          value={updateStatusOnReply} 
                          onChange={(e) => setUpdateStatusOnReply(e.target.value)}
                          disabled={sendingReply}
                          style={{ padding: '4px 8px' }}
                        >
                          <option value="pending">Pending</option>
                          <option value="replied">Replied</option>
                          <option value="resolved">Resolved</option>
                          <option value="archived">Archived</option>
                        </select>
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="modal-actions">
                  <button 
                    className="modal-btn primary" 
                    onClick={sendReply} 
                    disabled={!replyText.trim() || sendingReply}
                  >
                    <SendIcon />
                    {sendingReply ? 'Sending...' : 'Send Reply'}
                  </button>
                  <button 
                    className="modal-btn secondary" 
                    onClick={closeModal}
                    disabled={sendingReply}
                  >
                    Cancel
                  </button>
                  <button 
                    className="modal-btn danger" 
                    onClick={() => deleteFeedback(selectedFeedback.feedbackId)}
                    disabled={sendingReply}
                  >
                    <DeleteIcon />
                    Delete Feedback
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const FeedbackManagement = () => {
  return (
    <AdminLayout currentPage="Feedback">
      <FeedbackManagementContent />
    </AdminLayout>
  );
};

export default FeedbackManagement;