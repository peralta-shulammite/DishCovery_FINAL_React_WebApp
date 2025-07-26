const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Something went wrong');
  }
  return response.json();
};

const api = {
  signIn: async (email, password) => {
    console.log('🔐 Attempting login for:', email);
    
    // SMART LOGIN: Check if email looks like admin first
    const isLikelyAdmin = email.includes('admin') || email.endsWith('@dishcovery.com');
    
    if (isLikelyAdmin) {
      // Try admin login first for admin-like emails
      try {
        console.log('👑 Trying admin login first (admin-like email)...');
        const adminResponse = await fetch(`${API_BASE_URL}/admin-auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (adminResponse.ok) {
          const adminData = await adminResponse.json();
          console.log('✅ Admin login successful');
          
          localStorage.setItem('token', adminData.token);
          localStorage.setItem('isAdmin', 'true');
          localStorage.setItem('userType', 'admin');
          localStorage.setItem('userId', adminData.user.adminId);
          localStorage.setItem('userEmail', adminData.user.email);
          
          return {
            ...adminData,
            isAdmin: true,
            redirectTo: '/admin/dashboard'
          };
        } else {
          console.log('❌ Admin login failed, trying user login...');
        }
      } catch (adminError) {
        console.log('⚠️ Admin login error:', adminError.message);
      }
    }

    // Try regular user login (either as fallback or primary for non-admin emails)
    try {
      console.log('👤 Trying user login for regular user...');
      const userResponse = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const userData = await handleResponse(userResponse);
      console.log('✅ User login successful');
      
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
      
      // If user login fails and we haven't tried admin yet, try admin as last resort
      if (!isLikelyAdmin) {
        try {
          console.log('🔄 Last resort: trying admin login...');
          const adminResponse = await fetch(`${API_BASE_URL}/admin-auth/login`, {
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
            localStorage.setItem('userId', adminData.user.adminId);
            localStorage.setItem('userEmail', adminData.user.email);
            
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
      
      throw new Error('Invalid email or password');
    }
  },

  signUp: async (firstName, lastName, email, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, email, password }),
    });
    return handleResponse(response);
  },

  verify: async (email, verificationCode) => {
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code: verificationCode }),
    });
    const data = await handleResponse(response);
    localStorage.setItem('token', data.token);
    localStorage.setItem('isAdmin', 'false');
    localStorage.setItem('userType', 'user');
    localStorage.setItem('userId', data.user.userId);
    localStorage.setItem('userEmail', data.user.email);
    return data;
  },

  getProfile: async () => {
    const token = localStorage.getItem('token');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    
    if (!token) throw new Error('No token found');
    
    const endpoint = isAdmin ? '/admin-auth/profile' : '/users/profile';
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleResponse(response);
  },

  logout: async (redirectToPH = true) => {
    const token = localStorage.getItem('token');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    const userId = localStorage.getItem('userId');
    const userType = localStorage.getItem('userType');
    
    console.log('🚪 Logging out user...', { isAdmin, userId, userType });

    // If we have a token, try to logout on server side
    if (token && userId) {
      try {
        const endpoint = isAdmin ? '/admin-auth/logout' : '/auth/logout';
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ 
            userId: parseInt(userId),
            userType: userType,
            logoutTime: new Date().toISOString()
          }),
        });

        if (response.ok) {
          console.log('✅ Server-side logout successful');
        } else {
          console.log('⚠️ Server-side logout failed, continuing with client-side cleanup');
        }
      } catch (error) {
        console.log('⚠️ Server-side logout error:', error.message);
      }
    }

    // Clear all localStorage data
    const itemsToRemove = [
      'token', 
      'isAdmin', 
      'userType', 
      'userId', 
      'userEmail',
      'userPreferences',
      'lastActivity'
    ];
    
    itemsToRemove.forEach(item => {
      localStorage.removeItem(item);
    });

    console.log('✅ Client-side cleanup completed');

    if (redirectToPH && typeof window !== 'undefined') {
      setTimeout(() => {
        console.log('🇵🇭 Redirecting to Philippines user page...');
        window.location.href = '/user/ph';
      }, 100);
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
      hasToken: !!localStorage.getItem('token')
    };
  }
};

export default api;