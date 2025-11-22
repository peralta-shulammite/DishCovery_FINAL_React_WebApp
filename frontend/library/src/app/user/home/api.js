// api.js - Enhanced Authentication API with Google OAuth
// Fix: Use correct backend URL for Vercel deployment
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // For localhost testing, always use localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
  }
  // Use environment variable for production/Vercel deployment
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json();
    // Special handling for Google OAuth accounts - don't log error to console
    if (errorData.useGoogleLogin || errorData.message?.includes('Google')) {
      const error = new Error(errorData.message || 'Something went wrong');
      error.isGoogleAuthError = true; // Flag for special handling
      throw error;
    }
    throw new Error(errorData.message || 'Something went wrong');
  }
  return response.json();
};

const api = {
  // ===================================================
  // GOOGLE OAUTH
  // ===================================================
  
  signInWithGoogle: (mode = 'login') => {  
    const state = btoa(JSON.stringify({  
      mode: 'login',  
      nonce: Math.random().toString(36).substring(2)  
    }));  
    console.log('Clicking LOGIN with Google');  
    window.location.href = `${API_BASE_URL}/auth/google?state=${state}`;  
  },  
  
  signUpWithGoogle: () => {  
    const state = btoa(JSON.stringify({  
      mode: 'signup',  
      nonce: Math.random().toString(36).substring(2)  
    }));  
    console.log('Clicking SIGNUP with Google');  
    window.location.href = `${API_BASE_URL}/auth/google?state=${state}`;  
  },  

  // ===================================================
  // STANDARD AUTHENTICATION
  // ===================================================
  
  signIn: async (email, password) => {
    // Normalize email: trim whitespace and convert to lowercase
    email = email ? email.trim().toLowerCase() : '';
    console.log('🔐 Smart login attempt for:', email);
    
    // ✅ First, check if email is user or admin by querying database
    let accountType = null;
    try {
      const typeCheck = await api.checkEmailType(email);
      accountType = typeCheck.accountType || null;
      console.log(`📧 Email account type: ${accountType}`);
    } catch (typeError) {
      console.warn('⚠️ Could not determine account type, will try both:', typeError.message);
    }
    
    // If account type is determined, try that first
    if (accountType === 'admin') {
      try {
        console.log('👑 Trying admin login (account type: admin)...');
        
        const adminResponse = await fetch(`${API_BASE_URL}/admin-auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (adminResponse.ok) {
          const adminData = await adminResponse.json();
          console.log('✅ Admin login successful:', adminData);
          
          // ✅ SECURITY FIX: Only store token
          localStorage.setItem('token', adminData.token);
          
          return {
            ...adminData,
            isAdmin: true,
            redirectTo: '/admin/dashboard'
          };
        } else {
          const errorData = await adminResponse.json();
          throw new Error(errorData.message || 'Admin login failed');
        }
      } catch (adminError) {
        console.log('❌ Admin login failed:', adminError.message);
        throw adminError; // Don't fallback to user if account type is admin
      }
    } else if (accountType === 'user') {
      try {
        console.log('👤 Trying user login (account type: user)...');
        
        const userResponse = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        // ✅ FLEXIBLE LOGIN: Handle "No password set" error for Google users
        if (!userResponse.ok) {
          const errorData = await userResponse.json();
          if (errorData.noPasswordSet || errorData.canCreatePassword) {
            // Throw error with special flag for Option 3
            const error = new Error(errorData.message || 'No password set');
            error.noPasswordSet = true;
            error.canCreatePassword = true;
            throw error;
          }
          throw new Error(errorData.message || 'Login failed');
        }

        const userData = await userResponse.json();
        console.log('✅ User login successful:', userData);
        
        // ✅ VALIDATE TOKEN BEFORE STORING
        if (!userData.token || typeof userData.token !== 'string' || userData.token.length < 20) {
          console.error('❌ Invalid token received from server:', {
            hasToken: !!userData.token,
            tokenType: typeof userData.token,
            tokenLength: userData.token?.length
          });
          throw new Error('Invalid token received from server. Please try again.');
        }

        // ✅ VALIDATE JWT FORMAT
        const tokenParts = userData.token.split('.');
        if (tokenParts.length !== 3) {
          console.error('❌ Invalid JWT format:', {
            parts: tokenParts.length,
            tokenLength: userData.token.length
          });
          throw new Error('Invalid token format. Please try again.');
        }
        
        // ✅ SECURITY FIX: Only store token after validation
        localStorage.setItem('token', userData.token);
        
        return {
          ...userData,
          isAdmin: false,
          redirectTo: '/user/dashboard'
        };
      } catch (userError) {
        console.log('❌ User login failed:', userError.message);
        throw userError; // Don't fallback to admin if account type is user
      }
    } else {
      // Account type not determined - try both (fallback behavior)
      console.log('🔄 Account type unknown, trying user login first...');
      
      try {
        console.log('👤 Trying user login...');
        
        const userResponse = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        // ✅ FLEXIBLE LOGIN: Handle "No password set" error for Google users
        if (!userResponse.ok) {
          const errorData = await userResponse.json();
          if (errorData.noPasswordSet || errorData.canCreatePassword) {
            // Throw error with special flag for Option 3
            const error = new Error(errorData.message || 'No password set');
            error.noPasswordSet = true;
            error.canCreatePassword = true;
            throw error;
          }
          
          // If user login fails, try admin as fallback
          console.log('🔄 User login failed, trying admin login...');
          try {
            const adminResponse = await fetch(`${API_BASE_URL}/admin-auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password }),
            });

            if (adminResponse.ok) {
              const adminData = await adminResponse.json();
              console.log('✅ Admin login successful (last resort)');
              
              // ✅ SECURITY FIX: Only store token
              localStorage.setItem('token', adminData.token);
              
              return {
                ...adminData,
                isAdmin: true,
                redirectTo: '/admin/dashboard'
              };
            } else {
              const adminErrorData = await adminResponse.json();
              throw new Error(adminErrorData.message || 'Admin login failed');
            }
          } catch (adminError) {
            console.log('❌ Admin login also failed:', adminError.message);
            throw new Error(errorData.message || 'Login failed');
          }
        }

        // User login successful
        const userData = await userResponse.json();
        console.log('✅ User login successful:', userData);
        
        // ✅ VALIDATE TOKEN BEFORE STORING
        if (!userData.token || typeof userData.token !== 'string' || userData.token.length < 20) {
          console.error('❌ Invalid token received from server:', {
            hasToken: !!userData.token,
            tokenType: typeof userData.token,
            tokenLength: userData.token?.length
          });
          throw new Error('Invalid token received from server. Please try again.');
        }

        // ✅ VALIDATE JWT FORMAT
        const tokenParts = userData.token.split('.');
        if (tokenParts.length !== 3) {
          console.error('❌ Invalid JWT format:', {
            parts: tokenParts.length,
            tokenLength: userData.token.length
          });
          throw new Error('Invalid token format. Please try again.');
        }
        
        // ✅ SECURITY FIX: Only store token after validation
        localStorage.setItem('token', userData.token);
        
        return {
          ...userData,
          isAdmin: false,
          redirectTo: '/user/dashboard'
        };
      } catch (userError) {
        console.log('❌ User login failed:', userError.message);
        throw userError;
      }
    }
  },

  signUp: async (firstName, lastName, email, password) => {
    // Normalize email: trim whitespace and convert to lowercase
    email = email ? email.trim().toLowerCase() : '';
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, password }),
      });
      
      const data = await handleResponse(response);
      
      if (data.requiresVerification) {
        sessionStorage.setItem('pendingVerificationEmail', email);
      }
      
      return data;
    } catch (error) {
      console.error('❌ Sign up error:', error);
      throw error;
    }
  },

  verify: async (email, verificationCode) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode }),
      });
      
      const data = await handleResponse(response);
      console.log('✅ Email verified successfully');
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('isAdmin', 'false');
      localStorage.setItem('userType', 'user');
      localStorage.setItem('userId', data.user.userId);
      localStorage.setItem('userEmail', data.user.email);
      
      sessionStorage.removeItem('pendingVerificationEmail');
      sessionStorage.removeItem('pendingGoogleAuth');
      
      return data;
    } catch (error) {
      console.error('❌ Verification error:', error);
      throw error;
    }
  },

  resendVerificationCode: async (email) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await handleResponse(response);
      console.log('✅ Verification code resent');
      return data;
    } catch (error) {
      console.error('❌ Resend code error:', error);
      throw error;
    }
  },

  // ===================================================
  // FORGOT PASSWORD & RESET PASSWORD
  // ===================================================
  
  // Check email account type (user or admin)
  checkEmailType: async (email) => {
    try {
      console.log('🔍 Checking email account type for:', email);
      
      const response = await fetch(`${API_BASE_URL}/auth/check-email-type`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to check email type');
      }
      
      const data = await response.json();
      console.log(`✅ Email account type: ${data.accountType}`);
      return data;
    } catch (error) {
      console.error('❌ Check email type error:', error);
      throw error;
    }
  },

  forgotPassword: async (email) => {
    try {
      console.log('🔑 Requesting password reset for:', email);
      
      // ✅ First, check if email is user or admin by querying database
      let accountType = 'user'; // default
      try {
        const typeCheck = await api.checkEmailType(email);
        accountType = typeCheck.accountType || 'user';
        console.log(`📧 Email belongs to: ${accountType} account`);
      } catch (typeError) {
        console.warn('⚠️ Could not determine account type, defaulting to user:', typeError.message);
      }
      
      // Route to appropriate endpoint based on account type
      if (accountType === 'admin') {
        console.log('👑 Sending admin password reset request...');
        const adminResponse = await fetch(`${API_BASE_URL}/admin-auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        });
        
        if (!adminResponse.ok) {
          const errorData = await adminResponse.json();
          throw new Error(errorData.message || 'Failed to request admin password reset');
        }
        
        const adminData = await adminResponse.json();
        console.log('✅ [ADMIN] Password reset code sent');
        return { ...adminData, isAdmin: true };
      }
      
      // User forgot password
      console.log('👤 Sending user password reset request...');
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to request password reset');
      }
      
      const data = await response.json();
      console.log('✅ Password reset/creation code sent');
      return data; // Returns isPasswordCreation flag if applicable
    } catch (error) {
      console.error('❌ Forgot password error:', error);
      throw error;
    }
  },

  resetPassword: async (email, code, newPassword) => {
    try {
      console.log('🔑 Resetting password for:', email);
      
      // ✅ Check if this is an admin email by querying database
      let accountType = 'user'; // default
      try {
        const typeCheck = await api.checkEmailType(email);
        accountType = typeCheck.accountType || 'user';
        console.log(`📧 Email belongs to: ${accountType} account`);
      } catch (typeError) {
        console.warn('⚠️ Could not determine account type, defaulting to user:', typeError.message);
      }
      
      // Route to appropriate endpoint based on account type
      if (accountType === 'admin') {
        console.log('👑 Resetting admin password...');
        const adminResponse = await fetch(`${API_BASE_URL}/admin-auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: email.trim(), 
            code: code.trim(), 
            newPassword 
          }),
        });
        
        if (!adminResponse.ok) {
          const errorData = await adminResponse.json();
          throw new Error(errorData.message || 'Failed to reset admin password');
        }
        
        const adminData = await adminResponse.json();
        console.log('✅ Admin password reset successful');
        return adminData;
      }
      
      // User password reset
      console.log('👤 Resetting user password...');
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim(), 
          code: code.trim(), 
          newPassword 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reset password');
      }
      
      const data = await response.json();
      console.log('✅ Password reset/creation successful');
      return data; // Returns isPasswordCreation flag if applicable
    } catch (error) {
      console.error('❌ Reset password error:', error);
      throw error;
    }
  },

  // Admin forgot password
  adminForgotPassword: async (email) => {
    try {
      console.log('🔑 [ADMIN] Requesting password reset for:', email);
      
      const response = await fetch(`${API_BASE_URL}/admin-auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to request password reset');
      }
      
      const data = await response.json();
      console.log('✅ [ADMIN] Password reset code sent');
      return data;
    } catch (error) {
      console.error('❌ [ADMIN] Forgot password error:', error);
      throw error;
    }
  },

  // Admin reset password
  adminResetPassword: async (email, code, newPassword) => {
    try {
      console.log('🔑 [ADMIN] Resetting password for:', email);
      
      const response = await fetch(`${API_BASE_URL}/admin-auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim(), 
          code: code.trim(), 
          newPassword 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reset password');
      }
      
      const data = await response.json();
      console.log('✅ [ADMIN] Password reset successful');
      return data;
    } catch (error) {
      console.error('❌ [ADMIN] Reset password error:', error);
      throw error;
    }
  },

  // Get user profile (check if logged in)
  getProfile: async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No token found');
      }

      // ✅ SECURITY FIX: Use verifyToken to get user role from database
      const user = await api.verifyToken();
      
      const endpoint = user.isAdmin ? '/admin-auth/profile' : '/user-profile/info';

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // Silently handle 404 errors (expected when token is invalid)
        if (response.status === 404) {
          throw new Error('Token verification failed');
        }
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      return data.data || data; // Handle different response formats
    } catch (error) {
      // Only log unexpected errors
      if (error.message !== 'No token found' && error.message !== 'Token verification failed') {
        console.error('❌ Get profile error:', error);
      }
      throw error;
    }
  },

  // ========================================
  // 🔐 SECURITY: VERIFY TOKEN & GET USER ROLE
  // ========================================
  verifyToken: async () => {
    // ✅ iOS FIX: Check localStorage availability first
    let token;
    try {
      token = localStorage.getItem('token');
    } catch (e) {
      // iOS Safari private browsing or storage quota exceeded
      console.warn('⚠️ localStorage not available (iOS private browsing?):', e.message);
      throw new Error('Storage not available');
    }
    
    if (!token) {
      throw new Error('No token found');
    }
    
    try {
      // ✅ iOS FIX: Create abort controller for timeout (AbortSignal.timeout not available in all browsers)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${API_BASE_URL}/auth/verify-token`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Handle 404 - check if it's "endpoint not found" (HTML) or "user not found" (JSON)
      if (response.status === 404) {
        const contentType = response.headers.get('content-type');
        
        // If it's JSON, it's "user not found" from backend
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            if (errorData.message === 'User not found') {
              console.warn('⚠️ User not found in database (might be after signup) - keeping session');
              // Don't clear token - user might be created but not yet synced
              throw new Error('User not found in database');
            }
          } catch (parseError) {
            // If JSON parse fails, treat as endpoint not found
            console.warn('⚠️ Verify-token endpoint not found (404) - backend might be updating. Keeping session.');
            throw new Error('Backend endpoint not found');
          }
        } else {
          // HTML response = endpoint not found
          console.warn('⚠️ Verify-token endpoint not found (404 HTML) - backend might be updating. Keeping session.');
          throw new Error('Backend endpoint not found');
        }
      }
      
      if (!response.ok) {
        // Only clear token on actual auth failures (401, 403)
        if (response.status === 401 || response.status === 403) {
          try {
            localStorage.removeItem('token');
          } catch (e) {
            console.warn('⚠️ Could not clear token (storage issue):', e.message);
          }
          throw new Error('Token verification failed');
        }
        // For other errors (500, 502, etc.), don't clear token - might be temporary server issue
        throw new Error('Server error during verification');
      }
      
      const data = await response.json();
      if (data.success && data.user) {
        console.log('✅ Valid token found, user is logged in!');
        return data.user; // { userId, email, firstName, lastName, isAdmin, isGoogleUser }
      } else {
        try {
          localStorage.removeItem('token');
        } catch (e) {
          console.warn('⚠️ Could not clear token (storage issue):', e.message);
        }
        throw new Error('Invalid token response');
      }
    } catch (error) {
      // ✅ iOS FIX: Distinguish between network errors and auth failures
      const isNetworkError = error.name === 'AbortError' || 
                            error.name === 'TypeError' || 
                            error.message.includes('fetch') ||
                            error.message.includes('network') ||
                            error.message.includes('Failed to fetch') ||
                            error.message === 'Server error during verification';
      
      // Only clear token on actual auth failures, NOT network errors
      if (!isNetworkError && (error.message === 'Token verification failed' || error.message === 'Invalid token response')) {
        try {
          localStorage.removeItem('token');
        } catch (e) {
          console.warn('⚠️ Could not clear token (storage issue):', e.message);
        }
      }
      
      // Re-throw with network error flag for caller to handle
      if (isNetworkError) {
        const networkError = new Error('Network error during token verification');
        networkError.isNetworkError = true;
        networkError.originalError = error;
        throw networkError;
      }
      
      // Only log unexpected errors (not network errors, not expected auth errors)
      if (error.message !== 'Token verification failed' && error.message !== 'No token found' && 
          error.message !== 'Backend endpoint not found' && error.message !== 'User not found in database' &&
          error.message !== 'Storage not available') {
        console.error('❌ Token verification error:', error);
      }
      throw error;
    }
  },

  logout: async () => {
    const token = localStorage.getItem('token');
    
    console.log('🚪 Logging out user...');

    try {
      // ✅ SECURITY FIX: Use user logout endpoint (works for both)
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        console.log('✅ Server logout successful');
      } else {
        console.warn('⚠️ Server logout failed, continuing with client cleanup');
      }
    } catch (error) {
      console.warn('⚠️ Server logout error:', error.message);
    }

    // ✅ SECURITY FIX: Clear ALL localStorage (including any leftover sensitive data)
    localStorage.clear();
    sessionStorage.clear();

    // Clear Service Worker cache to remove any cached user data
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'caches' in window) {
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('🗑️ Clearing Service Worker cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        console.log('✅ Service Worker cache cleared');
      }).catch((error) => {
        console.warn('⚠️ Failed to clear Service Worker cache:', error);
      });
    }

    console.log('✅ Client-side cleanup completed');

    if (typeof window !== 'undefined') {
      console.log('🏠 Redirecting to home page...');
      window.location.href = '/user/home';
    }

    return { success: true, message: 'Logout successful' };
  },

  // ✅ SECURITY FIX: These functions now use verifyToken instead of localStorage
  isAdmin: async () => {
    try {
      const user = await api.verifyToken();
      return user.isAdmin;
    } catch {
      return false;
    }
  },

  getUserType: async () => {
    try {
      const user = await api.verifyToken();
      return user.isAdmin ? 'admin' : 'user';
    } catch {
      return 'user';
    }
  },

  getCurrentUser: async () => {
    try {
      const user = await api.verifyToken();
      return {
        ...user,
        hasToken: true
      };
    } catch {
      return {
        hasToken: false
      };
    }
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  }
};

export default api;