// api.js - Enhanced Authentication API with Google OAuth
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json();
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
    window.location.href = `${API_BASE_URL}/api/auth/google?state=${state}`;  
  },  
  
  signUpWithGoogle: () => {  
    const state = btoa(JSON.stringify({  
      mode: 'signup',  
      nonce: Math.random().toString(36).substring(2)  
    }));  
    console.log('Clicking SIGNUP with Google');  
    window.location.href = `${API_BASE_URL}/api/auth/google?state=${state}`;  
  },  

  // ===================================================
  // STANDARD AUTHENTICATION
  // ===================================================
  
  signIn: async (email, password) => {
    console.log('🔐 Smart login attempt for:', email);
    
    const isLikelyAdmin = email.includes('admin') || email.endsWith('@dishcovery.com');
    
    if (isLikelyAdmin) {
      try {
        console.log('👑 Trying admin login first (admin-like email)...');
        
        const adminResponse = await fetch(`${API_BASE_URL}/api/admin-auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (adminResponse.ok) {
          const adminData = await adminResponse.json();
          console.log('✅ Admin login successful:', adminData);
          
          localStorage.setItem('token', adminData.token);
          localStorage.setItem('isAdmin', 'true');
          localStorage.setItem('userType', 'admin');
          localStorage.setItem('userId', adminData.user?.adminId || adminData.admin?.adminId);
          localStorage.setItem('userEmail', adminData.user?.email || adminData.admin?.email);
          
          return {
            ...adminData,
            isAdmin: true,
            redirectTo: '/admin/dashboard'
          };
        }
      } catch (adminError) {
        console.log('⚠️ Admin login error:', adminError.message);
      }
    }

    try {
      console.log('👤 Trying user login...');
      
      const userResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const userData = await handleResponse(userResponse);
      console.log('✅ User login successful:', userData);
      
      localStorage.setItem('token', userData.token);
      localStorage.setItem('isAdmin', 'false');
      localStorage.setItem('userType', 'user');
      localStorage.setItem('userId', userData.user.userId);
      localStorage.setItem('userEmail', userData.user.email);
      
      return {
        ...userData,
        isAdmin: false,
        redirectTo: '/user/dashboard'
      };
    } catch (userError) {
      console.log('❌ User login failed:', userError.message);
      
      if (!isLikelyAdmin) {
        try {
          console.log('🔄 Last resort: trying admin login...');
          const adminResponse = await fetch(`${API_BASE_URL}/api/admin-auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          if (adminResponse.ok) {
            const adminData = await adminResponse.json();
            console.log('✅ Admin login successful (last resort)');
            
            localStorage.setItem('token', adminData.token);
            localStorage.setItem('isAdmin', 'true');
            localStorage.setItem('userType', 'admin');
            localStorage.setItem('userId', adminData.user?.adminId || adminData.admin?.adminId);
            localStorage.setItem('userEmail', adminData.user?.email || adminData.admin?.email);
            
            return {
              ...adminData,
              isAdmin: true,
              redirectTo: '/admin/dashboard'
            };
          }
        } catch (lastResortError) {
          console.log('❌ Admin login also failed');
        }
      }
      
      throw userError;
    }
  },

  signUp: async (firstName, lastName, email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
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
      const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
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
      const response = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
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

  getProfile: async () => {
    const token = localStorage.getItem('token');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    
    if (!token) throw new Error('No token found');
    
    const endpoint = isAdmin ? '/api/admin-auth/profile' : '/api/users/profile';
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleResponse(response);
  },

  logout: async () => {
    const token = localStorage.getItem('token');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    const userId = localStorage.getItem('userId');
    const userType = localStorage.getItem('userType');
    
    console.log('🚪 Logging out user...', { isAdmin, userId, userType });

    try {
      const endpoint = isAdmin ? '/api/admin-auth/logout' : '/api/auth/logout';
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
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

    const itemsToRemove = [
      'token', 
      'isAdmin', 
      'userType', 
      'userId', 
      'userEmail',
      'googleAuth',
      'userPreferences',
      'lastActivity'
    ];
    
    itemsToRemove.forEach(item => {
      localStorage.removeItem(item);
    });

    sessionStorage.clear();

    console.log('✅ Client-side cleanup completed');

    if (typeof window !== 'undefined') {
      console.log('🏠 Redirecting to home page...');
      window.location.href = '/user/home';
    }

    return { success: true, message: 'Logout successful' };
  },

  isAdmin: () => {
    return localStorage.getItem('isAdmin') === 'true';
  },

  getUserType: () => {
    return localStorage.getItem('userType') || 'user';
  },

  getCurrentUser: () => {
    return {
      userId: localStorage.getItem('userId'),
      email: localStorage.getItem('userEmail'),
      isAdmin: localStorage.getItem('isAdmin') === 'true',
      userType: localStorage.getItem('userType'),
      isGoogleAuth: localStorage.getItem('googleAuth') === 'true',
      hasToken: !!localStorage.getItem('token')
    };
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  }
};

export default api;