'use client';
import React, { useState } from 'react';
import AdminLayout from '../../components/adminlayout';
import './styles.css';

const SettingsContent = () => {
  // General Settings
  const [defaultLanguage, setDefaultLanguage] = useState('English');
  const [timezone, setTimezone] = useState('GMT+8 (Asia/Manila)');
  const [websiteUrl, setWebsiteUrl] = useState('https://dishcovery.com');
  const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState('https://dishcovery.com/privacy');
  const [autoLogoutTimer, setAutoLogoutTimer] = useState(15);

  // User & Account Settings
  const [allowAnonymousFeedback, setAllowAnonymousFeedback] = useState(true);
  const [enableGoogleAppleLogin, setEnableGoogleAppleLogin] = useState(false);
  const [autoDeactivateDays, setAutoDeactivateDays] = useState(90);
  const [inactivityMessage, setInactivityMessage] = useState(
    'Your account has been inactive for a while. Please log in to continue enjoying DishCovery!'
  );

  // Content Rules & Control
  const [ingredientGuidelines, setIngredientGuidelines] = useState('Use lowercase, no brand names');
  const [restrictRecipeSubmissions, setRestrictRecipeSubmissions] = useState(false);
  const [flagWords, setFlagWords] = useState('spam, profanity');
  const [allowAiRecipes, setAllowAiRecipes] = useState(true);
  const [restrictDoctorTag, setRestrictDoctorTag] = useState(true);

  // Notifications & Emails
  const [notificationTriggers, setNotificationTriggers] = useState({
    newFeedback: true,
    ingredientRequests: false,
    flaggedContent: true
  });
  const [emailTemplates, setEmailTemplates] = useState({
    inactivityReminder: 'Dear {user}, your account has been inactive for {days} days...',
    feedbackResponse: 'Thank you for your feedback, {user}. We have reviewed your submission...',
    recipeApproval: 'Congratulations, {user}! Your recipe "{recipe}" has been approved...'
  });
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [templateText, setTemplateText] = useState('');

  // Appearance
  const [theme, setTheme] = useState('Light');
  const [logoFile, setLogoFile] = useState(null);
  const [welcomeText, setWelcomeText] = useState('Welcome to DishCovery Admin Dashboard v1.0');

  // Data & Maintenance Tools
  const [isSuperAdmin] = useState(false); // Simulate super admin status
  const lastBackupTimestamp = 'July 5, 2025 – 10:30 PM';
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const openTemplateModal = (templateKey) => {
    setSelectedTemplate(templateKey);
    setTemplateText(emailTemplates[templateKey]);
    setIsModalOpen(true);
  };

  const saveTemplate = () => {
    if (templateText.trim() && selectedTemplate) {
      setEmailTemplates(prev => ({
        ...prev,
        [selectedTemplate]: templateText
      }));
      setIsModalOpen(false);
      setSelectedTemplate(null);
      setTemplateText('');
      console.log('Template saved:', { template: selectedTemplate, text: templateText });
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTemplate(null);
    setTemplateText('');
  };

  const saveSettings = () => {
    console.log('Settings saved:', {
      general: { defaultLanguage, timezone, websiteUrl, privacyPolicyUrl, autoLogoutTimer },
      userAccount: { allowAnonymousFeedback, enableGoogleAppleLogin, autoDeactivateDays, inactivityMessage },
      contentRules: { ingredientGuidelines, restrictRecipeSubmissions, flagWords, allowAiRecipes, restrictDoctorTag },
      notifications: notificationTriggers,
      appearance: { theme, logoFile, welcomeText },
      maintenance: { maintenanceMode }
    });
  };

  const exportData = (type) => {
    console.log(`Exporting ${type} as CSV...`);
  };

  const clearCache = () => {
    if (isSuperAdmin) {
      console.log('Cache cleared and settings reset to default.');
    }
  };

  // Icons
  const SaveIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
    </svg>
  );

  const CloseIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>
  );

  const EditIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
    </svg>
  );

  const DownloadIcon = () => (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
    </svg>
  );

  return (
    <div className="main-content">
      <h1 className="settings-title">Settings</h1>

      {/* General Settings */}
      <div className="settings-section">
        <h2 className="section-title">General Settings</h2>
        <div className="settings-grid">
          <div className="setting-group">
            <label>Default Language</label>
            <select value={defaultLanguage} onChange={(e) => setDefaultLanguage(e.target.value)}>
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
              <option>Tagalog</option>
            </select>
          </div>
          <div className="setting-group">
            <label>Timezone</label>
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              <option>GMT+8 (Asia/Manila)</option>
              <option>GMT+0 (UTC)</option>
              <option>GMT-5 (EST)</option>
              <option>GMT+1 (CET)</option>
            </select>
          </div>
          <div className="setting-group">
            <label>Support Email</label>
            <div className="display-text">support@dishcovery.com</div>
          </div>
          <div className="setting-group">
            <label>Website URL</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://dishcovery.com"
            />
          </div>
          <div className="setting-group">
            <label>Privacy Policy URL</label>
            <input
              type="url"
              value={privacyPolicyUrl}
              onChange={(e) => setPrivacyPolicyUrl(e.target.value)}
              placeholder="https://dishcovery.com/privacy"
            />
          </div>
          <div className="setting-group">
            <label>Auto Logout Timer (minutes)</label>
            <input
              type="number"
              value={autoLogoutTimer}
              onChange={(e) => setAutoLogoutTimer(Number(e.target.value))}
              min="1"
              placeholder="15"
            />
          </div>
        </div>
      </div>

      {/* User & Account Settings */}
      <div className="settings-section">
        <h2 className="section-title">User & Account Settings</h2>
        <div className="settings-grid">
          <div className="setting-group toggle-group">
            <label>Allow Anonymous Feedback</label>
            <input
              type="checkbox"
              checked={allowAnonymousFeedback}
              onChange={(e) => setAllowAnonymousFeedback(e.target.checked)}
            />
          </div>
          <div className="setting-group toggle-group">
            <label>Enable Google / Apple Login</label>
            <input
              type="checkbox"
              checked={enableGoogleAppleLogin}
              onChange={(e) => setEnableGoogleAppleLogin(e.target.checked)}
            />
          </div>
          <div className="setting-group">
            <label>Auto-Deactivate Users After (days)</label>
            <input
              type="number"
              value={autoDeactivateDays}
              onChange={(e) => setAutoDeactivateDays(Number(e.target.value))}
              min="1"
              placeholder="90"
            />
          </div>
          <div className="setting-group">
            <label>Default Inactivity Notification Message</label>
            <textarea
              value={inactivityMessage}
              onChange={(e) => setInactivityMessage(e.target.value)}
              rows={3}
              placeholder="Enter inactivity message..."
            />
          </div>
        </div>
      </div>

      {/* Content Rules & Control */}
      <div className="settings-section">
        <h2 className="section-title">Content Rules & Control</h2>
        <div className="settings-grid">
          <div className="setting-group">
            <label>Ingredient Naming Guidelines</label>
            <textarea
              value={ingredientGuidelines}
              onChange={(e) => setIngredientGuidelines(e.target.value)}
              rows={3}
              placeholder="Use lowercase, no brand names"
            />
          </div>
          <div className="setting-group toggle-group">
            <label>Restrict Recipe Submissions to Verified Users</label>
            <input
              type="checkbox"
              checked={restrictRecipeSubmissions}
              onChange={(e) => setRestrictRecipeSubmissions(e.target.checked)}
            />
          </div>
          <div className="setting-group">
            <label>Flag Words for Auto-Moderation</label>
            <input
              type="text"
              value={flagWords}
              onChange={(e) => setFlagWords(e.target.value)}
              placeholder="spam, profanity"
            />
          </div>
          <div className="setting-group toggle-group">
            <label>Allow AI-generated Recipes</label>
            <input
              type="checkbox"
              checked={allowAiRecipes}
              onChange={(e) => setAllowAiRecipes(e.target.checked)}
            />
          </div>
          <div className="setting-group toggle-group">
            <label>Restrict “Checked by Doctor/Nutritionist” Tag</label>
            <input
              type="checkbox"
              checked={restrictDoctorTag}
              onChange={(e) => setRestrictDoctorTag(e.target.checked)}
            />
          </div>
        </div>
      </div>

      {/* Notifications & Emails */}
      <div className="settings-section">
        <h2 className="section-title">Notifications & Emails</h2>
        <div className="settings-grid">
          <div className="setting-group">
            <label>Admin Notification Triggers</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={notificationTriggers.newFeedback}
                  onChange={(e) => setNotificationTriggers(prev => ({
                    ...prev,
                    newFeedback: e.target.checked
                  }))}
                />
                New Feedback Received
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={notificationTriggers.ingredientRequests}
                  onChange={(e) => setNotificationTriggers(prev => ({
                    ...prev,
                    ingredientRequests: e.target.checked
                  }))}
                />
                Ingredient/Restriction Requests
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={notificationTriggers.flaggedContent}
                  onChange={(e) => setNotificationTriggers(prev => ({
                    ...prev,
                    flaggedContent: e.target.checked
                  }))}
                />
                Flagged Recipe or User
              </label>
            </div>
          </div>
          <div className="setting-group">
            <label>Email Templates</label>
            <div className="template-buttons">
              <button
                className="action-btn secondary"
                onClick={() => openTemplateModal('inactivityReminder')}
              >
                <EditIcon />
                Edit Inactivity Reminder
              </button>
              <button
                className="action-btn secondary"
                onClick={() => openTemplateModal('feedbackResponse')}
              >
                <EditIcon />
                Edit Feedback Response
              </button>
              <button
                className="action-btn secondary"
                onClick={() => openTemplateModal('recipeApproval')}
              >
                <EditIcon />
                Edit Recipe Approval
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="settings-section">
        <h2 className="section-title">Appearance</h2>
        <div className="settings-grid">
          <div className="setting-group">
            <label>Admin Panel Theme</label>
            <select value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option>Light</option>
              <option>Dark</option>
              <option>Auto</option>
            </select>
          </div>
          <div className="setting-group">
            <label>Upload Admin Panel Logo / Icon</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setLogoFile(e.target.files[0])}
            />
          </div>
          <div className="setting-group">
            <label>Custom Welcome Text</label>
            <input
              type="text"
              value={welcomeText}
              onChange={(e) => setWelcomeText(e.target.value)}
              placeholder="Welcome to DishCovery Admin Dashboard"
            />
          </div>
        </div>
      </div>

      {/* Data & Maintenance Tools */}
      <div className="settings-section">
        <h2 className="section-title">Data & Maintenance Tools</h2>
        <div className="settings-grid">
          <div className="setting-group">
            <label>Data Export</label>
            <div className="template-buttons">
              <button className="action-btn secondary" onClick={() => exportData('Users')}>
                <DownloadIcon />
                Export Users (.CSV)
              </button>
              <button className="action-btn secondary" onClick={() => exportData('Recipes')}>
                <DownloadIcon />
                Export Recipes (.CSV)
              </button>
              <button className="action-btn secondary" onClick={() => exportData('Ingredients')}>
                <DownloadIcon />
                Export Ingredients (.CSV)
              </button>
            </div>
          </div>
          <div className="setting-group">
            <label>Clear Cache / Reset Settings</label>
            <button
              className="action-btn danger"
              onClick={clearCache}
              disabled={!isSuperAdmin}
            >
              Clear Cache & Reset
            </button>
            {!isSuperAdmin && (
              <div className="note-text">Available to Super Admins only</div>
            )}
          </div>
          <div className="setting-group toggle-group">
            <label>Enable Maintenance Mode</label>
            <input
              type="checkbox"
              checked={maintenanceMode}
              onChange={(e) => setMaintenanceMode(e.target.checked)}
            />
          </div>
          <div className="setting-group">
            <label>Last Backup Timestamp</label>
            <div className="display-text">{lastBackupTimestamp}</div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="settings-actions">
        <button className="action-btn primary" onClick={saveSettings}>
          <SaveIcon />
          Save Settings
        </button>
      </div>

      {/* Email Template Modal */}
      {isModalOpen && selectedTemplate && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">
                Edit {selectedTemplate.replace(/([A-Z])/g, ' $1').trim()} Template
              </div>
              <button className="close-btn" onClick={closeModal}>
                <CloseIcon />
              </button>
            </div>
            <div className="modal-content">
              <div className="setting-group">
                <label>Template Content</label>
                <textarea
                  value={templateText}
                  onChange={(e) => setTemplateText(e.target.value)}
                  rows={6}
                  placeholder="Enter email template content..."
                />
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="modal-btn primary"
                onClick={saveTemplate}
                disabled={!templateText.trim()}
              >
                <SaveIcon />
                Save Template
              </button>
              <button className="modal-btn secondary" onClick={closeModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Settings = () => {
  return (
    <AdminLayout currentPage="Settings">
      <SettingsContent />
    </AdminLayout>
  );
};

export default Settings;