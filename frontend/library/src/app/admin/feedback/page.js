'use client';
import React, { useState } from 'react';
import AdminLayout from '../../components/adminlayout';
import './styles.css';

const FeedbackManagementContent = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [markAsResolved, setMarkAsResolved] = useState(false);
  const [sendAsNotification, setSendAsNotification] = useState(true);
  
  // Filter states
  const [sortBy, setSortBy] = useState('newest');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Sample feedback data with actual dates
  const [feedbackList, setFeedbackList] = useState([
    {
      id: 1,
      username: 'healthylife',
      isAnonymous: false,
      avatar: 'HL',
      timestamp: '2 minutes ago',
      fullTimestamp: 'July 11, 2025 at 2:30 PM',
      dateCreated: new Date('2025-07-11T14:30:00'),
      message: 'I love the new recipe suggestions! However, I noticed that some gluten-free recipes still contain ingredients with gluten. Could you please review and update the dietary filters? Also, it would be great to have more vegan protein options.',
      preview: 'I love the new recipe suggestions! However, I noticed that some gluten-free recipes still contain...',
      isRead: false,
      isReplied: false,
      priority: 'High'
    },
    {
      id: 2,
      username: 'Anonymous',
      isAnonymous: true,
      avatar: 'AN',
      timestamp: '15 minutes ago',
      fullTimestamp: 'July 11, 2025 at 2:17 PM',
      dateCreated: new Date('2025-07-11T14:17:00'),
      message: 'The app crashes when I try to save recipes to my favorites. This happens every time on my iPhone.',
      preview: 'The app crashes when I try to save recipes to my favorites. This happens every time...',
      isRead: true,
      isReplied: false,
      priority: 'High'
    },
    {
      id: 3,
      username: 'cookingmama',
      isAnonymous: false,
      avatar: 'CM',
      timestamp: '1 hour ago',
      fullTimestamp: 'July 11, 2025 at 1:32 PM',
      dateCreated: new Date('2025-07-11T13:32:00'),
      message: 'Amazing app! My family loves trying new recipes. Could you add a meal planning feature?',
      preview: 'Amazing app! My family loves trying new recipes. Could you add a meal planning...',
      isRead: true,
      isReplied: true,
      priority: 'Medium'
    },
    {
      id: 4,
      username: 'fitnessfanatic',
      isAnonymous: false,
      avatar: 'FF',
      timestamp: '3 hours ago',
      fullTimestamp: 'July 11, 2025 at 11:32 AM',
      dateCreated: new Date('2025-07-11T11:32:00'),
      message: 'The calorie counting seems off for some recipes. Please check the nutritional information accuracy.',
      preview: 'The calorie counting seems off for some recipes. Please check the nutritional...',
      isRead: true,
      isReplied: false,
      priority: 'Medium'
    },
    {
      id: 5,
      username: 'Anonymous',
      isAnonymous: true,
      avatar: 'AN',
      timestamp: '5 hours ago',
      fullTimestamp: 'July 11, 2025 at 9:32 AM',
      dateCreated: new Date('2025-07-11T09:32:00'),
      message: 'Love the interface design, very clean and intuitive!',
      preview: 'Love the interface design, very clean and intuitive!',
      isRead: true,
      isReplied: true,
      priority: 'Low'
    },
    {
      id: 6,
      username: 'veganvibes',
      isAnonymous: false,
      avatar: 'VV',
      timestamp: '1 day ago',
      fullTimestamp: 'July 10, 2025 at 2:32 PM',
      dateCreated: new Date('2025-07-10T14:32:00'),
      message: 'More vegan dessert recipes would be fantastic. The current selection is quite limited.',
      preview: 'More vegan dessert recipes would be fantastic. The current selection is quite...',
      isRead: true,
      isReplied: false,
      priority: 'Low'
    }
  ]);

  // Calculate stats
  const totalFeedback = feedbackList.length;
  const totalReplied = feedbackList.filter(feedback => feedback.isReplied).length;
  const totalUnread = feedbackList.filter(feedback => !feedback.isRead).length;
  const latestFeedback = feedbackList[0];

  // Filter and sort feedback
  const getFilteredAndSortedFeedback = () => {
    let filtered = feedbackList.filter(feedback => {
      const matchesSearch = feedback.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feedback.message.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPriority = priorityFilter === 'all' || feedback.priority === priorityFilter;
      let matchesStatus = true;
      if (statusFilter === 'read') matchesStatus = feedback.isRead;
      else if (statusFilter === 'unread') matchesStatus = !feedback.isRead;
      else if (statusFilter === 'replied') matchesStatus = feedback.isReplied;
      else if (statusFilter === 'unreplied') matchesStatus = !feedback.isReplied;
      let matchesDate = true;
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        matchesDate = matchesDate && feedback.dateCreated >= fromDate;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && feedback.dateCreated <= toDate;
      }
      return matchesSearch && matchesPriority && matchesStatus && matchesDate;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.dateCreated - a.dateCreated;
        case 'oldest':
          return a.dateCreated - b.dateCreated;
        case 'priority':
          const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'unread':
          return b.isRead - a.isRead;
        default:
          return b.dateCreated - a.dateCreated;
      }
    });

    return filtered;
  };

  const filteredFeedback = getFilteredAndSortedFeedback();

  const openModal = (feedback) => {
    setSelectedFeedback(feedback);
    setIsModalOpen(true);
    setReplyText('');
    setMarkAsResolved(false);
    setSendAsNotification(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedFeedback(null);
    setReplyText('');
  };

  const markAsRead = (id) => {
    setFeedbackList(prev => prev.map(feedback =>
      feedback.id === id ? { ...feedback, isRead: true } : feedback
    ));
  };

  const markAsUnread = (id) => {
    setFeedbackList(prev => prev.map(feedback =>
      feedback.id === id ? { ...feedback, isRead: false } : feedback
    ));
  };

  const deleteFeedback = (id) => {
    setFeedbackList(prev => prev.filter(feedback => feedback.id !== id));
    if (selectedFeedback && selectedFeedback.id === id) {
      closeModal();
    }
  };

  const sendReply = () => {
    if (replyText.trim()) {
      setFeedbackList(prev => prev.map(feedback =>
        feedback.id === selectedFeedback.id 
          ? { ...feedback, isReplied: true, isRead: true }
          : feedback
      ));
      closeModal();
      console.log('Reply sent:', {
        feedbackId: selectedFeedback.id,
        reply: replyText,
        markAsResolved,
        sendAsNotification
      });
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'High': return 'priority-high';
      case 'Medium': return 'priority-medium';
      case 'Low': return 'priority-low';
      default: return 'priority-medium';
    }
  };

  const clearFilters = () => {
    setSortBy('newest');
    setPriorityFilter('all');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
  };

  // Icons
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
      {/* Simple Stats */}
      <div className="simple-stats">
        <div className="stat-card">
          <FeedbackIcon />
          <div className="stat-content">
            <div className="stat-number">{totalFeedback}</div>
            <div className="stat-label">Total Feedback</div>
          </div>
        </div>
        <div className="stat-card">
          <RepliedIcon />
          <div className="stat-content">
            <div className="stat-number">{totalReplied}</div>
            <div className="stat-label">Replied</div>
          </div>
        </div>
        <div className="stat-card">
          <UnreadIcon />
          <div className="stat-content">
            <div className="stat-number">{totalUnread}</div>
            <div className="stat-label">Unread</div>
          </div>
        </div>
        <div className="stat-card">
          <FeedbackIcon />
          <div className="stat-content">
            <div className="stat-number">
              {latestFeedback ? `@${latestFeedback.username}` : 'None'}
            </div>
            <div className="stat-label">
              {latestFeedback ? latestFeedback.timestamp : 'No recent feedback'}
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="filters-header">
          <div className="filters-title">
            <FilterIcon />
            <span>Filters</span>
          </div>
          <div className="search-container">
            <input 
              type="text" 
              placeholder="Search feedback..." 
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="search-btn">
              <SearchIcon />
            </button>
          </div>
          <button className="clear-filters-btn" onClick={clearFilters}>
            Clear All
          </button>
        </div>
        
        <div className="filters-grid">
          <div className="filter-group">
            <label>Sort By:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="priority">Priority (High to Low)</option>
              <option value="unread">Unread First</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Priority:</label>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="all">All Priorities</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Status:</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
              <option value="replied">Replied</option>
              <option value="unreplied">Not Replied</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>From Date:</label>
            <input 
              type="date" 
              value={dateFrom} 
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <label>To Date:</label>
            <input 
              type="date" 
              value={dateTo} 
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="results-info">
        Showing {filteredFeedback.length} of {totalFeedback} feedback items
      </div>

      {/* Feedback Cards */}
      <div className="feedback-grid">
        {filteredFeedback.map((feedback) => (
          <div key={feedback.id} className={`feedback-card ${!feedback.isRead ? 'unread' : ''}`}>
            <div className="feedback-header">
              <div className="user-info">
                <div className={`user-avatar ${feedback.isAnonymous ? 'anonymous' : ''}`}>
                  {feedback.avatar}
                </div>
                <div className="user-details">
                  <div className="username">{feedback.username}</div>
                  <div className="timestamp">{feedback.timestamp}</div>
                </div>
              </div>
              <div className="feedback-status">
                {!feedback.isRead && <span className="unread-indicator">●</span>}
                <span className={`priority-badge ${getPriorityColor(feedback.priority)}`}>
                  {feedback.priority}
                </span>
                {feedback.isReplied && <span className="replied-badge">✓ Replied</span>}
              </div>
            </div>
            
            <div className="feedback-preview">
              {feedback.preview}
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
                onClick={() => feedback.isRead ? markAsUnread(feedback.id) : markAsRead(feedback.id)}
              >
                {feedback.isRead ? 'Mark Unread' : 'Mark Read'}
              </button>
              <button 
                className="action-btn danger"
                onClick={() => deleteFeedback(feedback.id)}
              >
                <DeleteIcon />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredFeedback.length === 0 && (
        <div className="no-feedback">
          <p>No feedback found matching your criteria.</p>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && selectedFeedback && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div className="modal-user-info">
                <div className={`user-avatar ${selectedFeedback.isAnonymous ? 'anonymous' : ''}`}>
                  {selectedFeedback.avatar}
                </div>
                <div>
                  <div className="modal-username">{selectedFeedback.username}</div>
                  <div className="modal-timestamp">{selectedFeedback.fullTimestamp}</div>
                </div>
              </div>
              <button className="close-btn" onClick={closeModal}>
                <CloseIcon />
              </button>
            </div>
            
            <div className="modal-content">
              <div className="feedback-message">
                {selectedFeedback.message}
              </div>
              
              <div className="reply-section">
                <label htmlFor="reply-text">Your Reply:</label>
                <textarea
                  id="reply-text"
                  className="reply-textarea"
                  placeholder="Type your reply here..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                />
                
                <div className="reply-options">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={markAsResolved}
                      onChange={(e) => setMarkAsResolved(e.target.checked)}
                    />
                    Mark as resolved
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={sendAsNotification}
                      onChange={(e) => setSendAsNotification(e.target.checked)}
                    />
                    Send as in-app notification
                  </label>
                </div>
              </div>
            </div>
            
            <div className="modal-actions">
              <button className="modal-btn primary" onClick={sendReply} disabled={!replyText.trim()}>
                <SendIcon />
                Send Reply
              </button>
              <button className="modal-btn secondary" onClick={closeModal}>
                Cancel
              </button>
              <button 
                className="modal-btn danger" 
                onClick={() => deleteFeedback(selectedFeedback.id)}
              >
                <DeleteIcon />
                Delete Feedback
              </button>
            </div>
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