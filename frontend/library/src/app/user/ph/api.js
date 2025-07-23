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
    
    // First try admin login
    try {
      console.log('👑 Trying admin login...');
      const adminResponse = await fetch(`${API_BASE_URL}/admin/auth/login`, {
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

    // If admin login fails, try regular user login
    try {
      console.log('👤 Trying user login...');
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
      
      return {
        ...userData,
        isAdmin: false,
        redirectTo: '/user/dashboard' // or wherever users should go
      };
    } catch (userError) {
      console.log('❌ User login also failed');
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
    return data;
  },

  getProfile: async () => {
    const token = localStorage.getItem('token');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    
    if (!token) throw new Error('No token found');
    
    const endpoint = isAdmin ? '/admin/auth/profile' : '/users/profile';
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleResponse(response);
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('userType');
  },

  // Helper function to check if current user is admin
  isAdmin: () => {
    return localStorage.getItem('isAdmin') === 'true';
  },

  // Helper function to get user type
  getUserType: () => {
    return localStorage.getItem('userType') || 'user';
  }
};

export default api;