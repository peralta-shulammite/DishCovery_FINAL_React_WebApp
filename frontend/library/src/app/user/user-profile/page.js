'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import './styles.css';
import UserLayout from '../../components/user/userlayout';

export default function UserProfilePage() {
  const dishCoveryTopRef = useRef(null);
  const [dishCoveryIsLoggedIn, setDishCoveryIsLoggedIn] = useState(true);
  const [dishCoveryShowAvatarDropdown, setDishCoveryShowAvatarDropdown] = useState(false);
  const [dishCoveryUser, setDishCoveryUser] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    profilePicture: null,
  });
  const dishCoveryAvatarRef = useRef(null);
  const fileInputRef = useRef(null);

  // Profile editing states
  const [dishCoveryEditingProfile, setDishCoveryEditingProfile] = useState(false);
  const [dishCoveryEditingPreferences, setDishCoveryEditingPreferences] = useState(false);
  const [dishCoveryShowChangePassword, setDishCoveryShowChangePassword] = useState(false);
  const [dishCoveryShowFeedbackModal, setDishCoveryShowFeedbackModal] = useState(false);
  const [dishCoveryShowDeactivateModal, setDishCoveryShowDeactivateModal] = useState(false);

  // Form states
  const [dishCoveryTempFirstName, setDishCoveryTempFirstName] = useState('John');
  const [dishCoveryTempLastName, setDishCoveryTempLastName] = useState('Doe');
  const [dishCoveryTempEmail, setDishCoveryTempEmail] = useState('john.doe@example.com');
  const [dishCoveryCurrentPassword, setDishCoveryCurrentPassword] = useState('');
  const [dishCoveryNewPassword, setDishCoveryNewPassword] = useState('');
  const [dishCoveryConfirmPassword, setDishCoveryConfirmPassword] = useState('');
  const [dishCoveryFeedbackText, setDishCoveryFeedbackText] = useState('');
  const [dishCoveryNotificationsEnabled, setDishCoveryNotificationsEnabled] = useState(true);
  const [dishCoveryDarkMode, setDishCoveryDarkMode] = useState(false);

  // Dietary preferences
  const [dishCoveryMedicalConditions, setDishCoveryMedicalConditions] = useState(['Diabetes', 'Hypertension']);
  const [dishCoveryAllergens, setDishCoveryAllergens] = useState(['Peanuts', 'Shellfish']);
  const [dishCoveryPreferredDiet, setDishCoveryPreferredDiet] = useState(['Vegan', 'Low-Sodium']);

  // Mock data
  const [dishCoveryLastOpenedRecipe] = useState({
    id: 1,
    name: 'Mediterranean Quinoa Bowl',
    time: '25 min',
    difficulty: 'Easy',
    image: 'https://via.placeholder.com/150x100?text=🥗',
    lastOpened: '2025-01-28',
  });

  const [dishCoveryScanHistory] = useState([
    { id: 1, name: 'Tomatoes', date: '2025-01-28' },
    { id: 2, name: 'Chicken Breast', date: '2025-01-27' },
    { id: 3, name: 'Spinach', date: '2025-01-26' },
    { id: 4, name: 'Bell Peppers', date: '2025-01-25' },
    { id: 5, name: 'Avocado', date: '2025-01-24' },
  ]);

  const [dishCoverySavedRecipesPreview] = useState([
    { id: 1, name: 'Mediterranean Quinoa Bowl', time: '25 min', difficulty: 'Easy', image: 'https://via.placeholder.com/80x60?text=🥗' },
    { id: 2, name: 'Grilled Salmon with Herbs', time: '30 min', difficulty: 'Medium', image: 'https://via.placeholder.com/80x60?text=🐟' },
    { id: 3, name: 'Vegetable Stir Fry', time: '20 min', difficulty: 'Easy', image: 'https://via.placeholder.com/80x60?text=🥘' },
  ]);

  const [dishCoveryHoverStates, setDishCoveryHoverStates] = useState({
    logo: false,
    avatar: false,
  });

  const dishCoveryHandleHover = (element, isHover) => {
    setDishCoveryHoverStates((prev) => ({ ...prev, [element]: isHover }));
  };

  const dishCoveryScrollToTop = useCallback(() => {
    dishCoveryTopRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const dishCoveryHandleClickOutside = (event) => {
      if (dishCoveryAvatarRef.current && !dishCoveryAvatarRef.current.contains(event.target)) {
        setDishCoveryShowAvatarDropdown(false);
      }
    };
    document.addEventListener('mousedown', dishCoveryHandleClickOutside);
    return () => document.removeEventListener('mousedown', dishCoveryHandleClickOutside);
  }, []);

  const dishCoveryHandleLogout = () => {
    // api.logout(); // Commented out as it may not exist in your context
    setDishCoveryIsLoggedIn(false);
    setDishCoveryUser(null);
    setDishCoveryShowAvatarDropdown(false);
    window.location.href = '/';
  };

    const dishCoveryHandleSignInClick = () => {
    setDishCoveryShowSignInModal(true);
    setDishCoveryShowMobileMenu(false);
    setDishCoveryError('');
  };

  const dishCoveryHandleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setDishCoveryUser((prev) => ({ ...prev, profilePicture: e.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const dishCoveryHandleSaveProfile = () => {
    setDishCoveryUser((prev) => ({
      ...prev,
      firstName: dishCoveryTempFirstName,
      lastName: dishCoveryTempLastName,
      email: dishCoveryTempEmail,
    }));
    setDishCoveryEditingProfile(false);
  };

  const dishCoveryHandleCancelProfileEdit = () => {
    setDishCoveryTempFirstName(dishCoveryUser.firstName);
    setDishCoveryTempLastName(dishCoveryUser.lastName);
    setDishCoveryTempEmail(dishCoveryUser.email);
    setDishCoveryEditingProfile(false);
  };

  const dishCoveryHandleChangePassword = () => {
    console.log('Password changed');
    setDishCoveryShowChangePassword(false);
    setDishCoveryCurrentPassword('');
    setDishCoveryNewPassword('');
    setDishCoveryConfirmPassword('');
  };

  const dishCoveryHandleSendFeedback = () => {
    console.log('Feedback sent:', dishCoveryFeedbackText);
    setDishCoveryShowFeedbackModal(false);
    setDishCoveryFeedbackText('');
  };

  const dishCoveryHandleDeactivateAccount = () => {
    console.log('Account deactivated');
    setDishCoveryShowDeactivateModal(false);
    dishCoveryHandleLogout();
  };

  const dishCoveryRemoveCondition = (condition) => {
    setDishCoveryMedicalConditions((prev) => prev.filter((c) => c !== condition));
  };

  const dishCoveryRemoveAllergen = (allergen) => {
    setDishCoveryAllergens((prev) => prev.filter((a) => a !== allergen));
  };

  const dishCoveryRemoveDiet = (diet) => {
    setDishCoveryPreferredDiet((prev) => prev.filter((d) => d !== diet));
  };

  const dishCoveryRemoveScanItem = (id) => {
    console.log('Remove scan item:', id);
  };

  return (
    <UserLayout
      isLoggedIn={dishCoveryIsLoggedIn}
      user={dishCoveryUser}
      onSignInClick={dishCoveryHandleSignInClick}
      onLogout={dishCoveryHandleLogout}
    >
      <div ref={dishCoveryTopRef} className="user-profile-container">
        <div className="decorative-circle circle1"></div>
        <div className="decorative-circle circle2"></div>
        <div className="decorative-circle circle3"></div>

        <main className="profile-main-content">
          <div className="profile-layout">
            <div className="left-panel">
              <div className="panel-header">
                <h1 className="panel-title">My Activity</h1>
                <p className="panel-subtitle">Recent activity and account management</p>
              </div>

              <section className="activity-section">
                <h2 className="activity-section-title">
                  <svg className="activity-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  Last Opened Recipe
                </h2>
                <div className="last-recipe-card">
                  <img
                    src={dishCoveryLastOpenedRecipe.image}
                    alt={dishCoveryLastOpenedRecipe.name}
                    className="last-recipe-image"
                  />
                  <div className="last-recipe-info">
                    <h3 className="last-recipe-name">{dishCoveryLastOpenedRecipe.name}</h3>
                    <div className="last-recipe-meta">
                      <span>{dishCoveryLastOpenedRecipe.time}</span>
                      <span>•</span>
                      <span>{dishCoveryLastOpenedRecipe.difficulty}</span>
                    </div>
                    <p className="last-recipe-date">Last opened: {dishCoveryLastOpenedRecipe.lastOpened}</p>
                  </div>
                  <button className="continue-recipe-btn">Continue Recipe</button>
                </div>
              </section>

              <section className="activity-section">
                <div className="section-header-with-action">
                  <h2 className="activity-section-title">
                    <svg className="activity-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                    Saved Recipes
                  </h2>
                  <a href="/favorites" className="view-all-btn">
                    View All
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8.59 16.59L13.17 12L8.59 7.41L10 6l6 6-6 6-1.41-1.41z" />
                    </svg>
                  </a>
                </div>
                <div className="saved-recipes-preview">
                  {dishCoverySavedRecipesPreview.map((recipe) => (
                    <div key={recipe.id} className="preview-recipe-card">
                      <img src={recipe.image} alt={recipe.name} className="preview-recipe-image" />
                      <div className="preview-recipe-info">
                        <h4 className="preview-recipe-name">{recipe.name}</h4>
                        <div className="preview-recipe-meta">
                          <span>{recipe.time}</span>
                          <span>•</span>
                          <span>{recipe.difficulty}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="activity-section">
                <h2 className="activity-section-title">
                  <svg className="activity-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                  </svg>
                  Recent Scans
                </h2>
                <div className="scan-history-list">
                  {dishCoveryScanHistory.map((item) => (
                    <div key={item.id} className="scan-history-item-minimal">
                      <div className="scan-item-details">
                        <span className="scan-item-name">{item.name}</span>
                        <span className="scan-item-date">{item.date}</span>
                      </div>
                      <button
                        className="remove-scan-btn-minimal"
                        onClick={() => dishCoveryRemoveScanItem(item.id)}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="activity-section">
                <h2 className="activity-section-title">
                  <svg className="activity-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 13h-2v-2h2v2zm0-4h-2V7h2v4z" />
                  </svg>
                  Support
                </h2>
                <div className="support-actions">
                  <button
                    className="support-btn feedback-btn"
                    onClick={() => setDishCoveryShowFeedbackModal(true)}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                    </svg>
                    Send Feedback
                  </button>
                  <a href="/help" className="support-link">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z" />
                    </svg>
                    Help & FAQs
                  </a>
                </div>
              </section>

              <section className="activity-section danger-section-minimal">
                <h2 className="activity-section-title danger-title">
                  <svg className="activity-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                  </svg>
                  Danger Zone
                </h2>
                <div className="danger-content-minimal">
                  <div className="danger-item-minimal">
                    <span className="danger-label">Deactivate Account</span>
                    <button
                      className="danger-btn-minimal"
                      onClick={() => setDishCoveryShowDeactivateModal(true)}
                    >
                      Deactivate
                    </button>
                  </div>
                </div>
              </section>
            </div>

            <div className="right-panel">
              <div className="profile-details-card">
                <div className="profile-picture-section-fixed">
                  <div className="profile-picture-large">
                    {dishCoveryUser.profilePicture ? (
                      <img src={dishCoveryUser.profilePicture} alt="Profile" />
                    ) : (
                      <div className="profile-picture-placeholder-large">
                        {dishCoveryUser.firstName?.charAt(0)}
                        {dishCoveryUser.lastName?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <button
                    className="change-picture-btn-fixed"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 4V1h2v3h3v2H5v3H3V6H0V4h3zm3 6V7h3V4h7l1.83 2H21c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V10h3zm7 9c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0-1.8c-1.77 0-3.2-1.43-3.2-3.2 0-1.77 1.43-3.2 3.2-3.2s3.2 1.43 3.2 3.2c0 1.77-1.43 3.2-3.2 3.2z" />
                    </svg>
                    Change Photo
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={dishCoveryHandleProfilePictureChange}
                    style={{ display: 'none' }}
                  />
                </div>

                <div className="user-info-fixed">
                  <div className="user-info-header">
                    <h2 className="fixed-section-title">Personal Information</h2>
                    {!dishCoveryEditingProfile && (
                      <button
                        className="edit-btn-fixed"
                        onClick={() => setDishCoveryEditingProfile(true)}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                        </svg>
                        Edit
                      </button>
                    )}
                  </div>

                  {dishCoveryEditingProfile ? (
                    <div className="edit-form-fixed">
                      <div className="form-group-fixed">
                        <label>First Name</label>
                        <input
                          type="text"
                          value={dishCoveryTempFirstName}
                          onChange={(e) => setDishCoveryTempFirstName(e.target.value)}
                          className="form-input-fixed"
                        />
                      </div>
                      <div className="form-group-fixed">
                        <label>Last Name</label>
                        <input
                          type="text"
                          value={dishCoveryTempLastName}
                          onChange={(e) => setDishCoveryTempLastName(e.target.value)}
                          className="form-input-fixed"
                        />
                      </div>
                      <div className="form-group-fixed">
                        <label>Email Address</label>
                        <input
                          type="email"
                          value={dishCoveryTempEmail}
                          onChange={(e) => setDishCoveryTempEmail(e.target.value)}
                          className="form-input-fixed"
                        />
                      </div>
                      <div className="form-actions-fixed">
                        <button className="save-btn-fixed" onClick={dishCoveryHandleSaveProfile}>
                          Save Changes
                        </button>
                        <button
                          className="cancel-btn-fixed"
                          onClick={dishCoveryHandleCancelProfileEdit}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="user-info-display-fixed">
                      <div className="info-item-fixed">
                        <span className="info-label-fixed">Full Name</span>
                        <span className="info-value-fixed">
                          {dishCoveryUser.firstName} {dishCoveryUser.lastName}
                        </span>
                      </div>
                      <div className="info-item-fixed">
                        <span className="info-label-fixed">Email Address</span>
                        <span className="info-value-fixed">{dishCoveryUser.email}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="dietary-preferences-fixed">
                  <div className="preferences-header">
                    <h2 className="fixed-section-title">Dietary Preferences</h2>
                    <button
                      className="edit-btn-fixed"
                      onClick={() => setDishCoveryEditingPreferences(!dishCoveryEditingPreferences)}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                      </svg>
                      {dishCoveryEditingPreferences ? 'Done' : 'Edit'}
                    </button>
                  </div>

                  <div className="preferences-content-fixed">
                    <div className="preference-group-fixed">
                      <h3 className="preference-group-label">Medical Conditions</h3>
                      <div className="tags-container-fixed">
                        {dishCoveryMedicalConditions.map((condition) => (
                          <div key={condition} className="tag-fixed medical-tag-fixed">
                            <span>{condition}</span>
                            {dishCoveryEditingPreferences && (
                              <button
                                onClick={() => dishCoveryRemoveCondition(condition)}
                                className="tag-remove-fixed"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                        {dishCoveryEditingPreferences && (
                          <button className="add-tag-btn-fixed">+ Add</button>
                        )}
                      </div>
                    </div>

                    <div className="preference-group-fixed">
                      <h3 className="preference-group-label">Allergens</h3>
                      <div className="tags-container-fixed">
                        {dishCoveryAllergens.map((allergen) => (
                          <div key={allergen} className="tag-fixed allergen-tag-fixed">
                            <span>{allergen}</span>
                            {dishCoveryEditingPreferences && (
                              <button
                                onClick={() => dishCoveryRemoveAllergen(allergen)}
                                className="tag-remove-fixed"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                        {dishCoveryEditingPreferences && (
                          <button className="add-tag-btn-fixed">+ Add</button>
                        )}
                      </div>
                    </div>

                    <div className="preference-group-fixed">
                      <h3 className="preference-group-label">Preferred Diet</h3>
                      <div className="tags-container-fixed">
                        {dishCoveryPreferredDiet.map((diet) => (
                          <div key={diet} className="tag-fixed diet-tag-fixed">
                            <span>{diet}</span>
                            {dishCoveryEditingPreferences && (
                              <button
                                onClick={() => dishCoveryRemoveDiet(diet)}
                                className="tag-remove-fixed"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                        {dishCoveryEditingPreferences && (
                          <button className="add-tag-btn-fixed">+ Add</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {dishCoveryShowChangePassword && (
          <div
            className="modal-overlay"
            onClick={() => setDishCoveryShowChangePassword(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button
                className="close-btn"
                onClick={() => setDishCoveryShowChangePassword(false)}
              >
                ×
              </button>
              <h2 className="modal-title">Change Password</h2>
              <p className="modal-subtitle">Enter your current password and new password</p>
              <input
                type="password"
                className="modal-input"
                placeholder="Current Password"
                value={dishCoveryCurrentPassword}
                onChange={(e) => setDishCoveryCurrentPassword(e.target.value)}
              />
              <input
                type="password"
                className="modal-input"
                placeholder="New Password"
                value={dishCoveryNewPassword}
                onChange={(e) => setDishCoveryNewPassword(e.target.value)}
              />
              <input
                type="password"
                className="modal-input"
                placeholder="Confirm New Password"
                value={dishCoveryConfirmPassword}
                onChange={(e) => setDishCoveryConfirmPassword(e.target.value)}
              />
              <button className="modal-signin-btn" onClick={dishCoveryHandleChangePassword}>
                Change Password
              </button>
            </div>
          </div>
        )}

        {dishCoveryShowFeedbackModal && (
          <div
            className="modal-overlay"
            onClick={() => setDishCoveryShowFeedbackModal(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button
                className="close-btn"
                onClick={() => setDishCoveryShowFeedbackModal(false)}
              >
                ×
              </button>
              <h2 className="modal-title">Send Feedback</h2>
              <p className="modal-subtitle">We'd love to hear your thoughts and suggestions</p>
              <textarea
                className="modal-textarea"
                placeholder="Share your feedback..."
                value={dishCoveryFeedbackText}
                onChange={(e) => setDishCoveryFeedbackText(e.target.value)}
                rows="6"
              ></textarea>
              <button className="modal-signin-btn" onClick={dishCoveryHandleSendFeedback}>
                Send Feedback
              </button>
            </div>
          </div>
        )}

        {dishCoveryShowDeactivateModal && (
          <div
            className="modal-overlay"
            onClick={() => setDishCoveryShowDeactivateModal(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button
                className="close-btn"
                onClick={() => setDishCoveryShowDeactivateModal(false)}
              >
                ×
              </button>
              <h2 className="modal-title danger-modal-title">Deactivate Account</h2>
              <p className="modal-subtitle">
                Are you sure you want to deactivate your account? This action cannot be undone
                and all your data will be permanently deleted.
              </p>
              <div className="modal-actions">
                <button
                  className="cancel-btn"
                  onClick={() => setDishCoveryShowDeactivateModal(false)}
                >
                  Cancel
                </button>
                <button className="danger-btn" onClick={dishCoveryHandleDeactivateAccount}>
                  Deactivate Account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
}