import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

const authenticateToken = (req, res, next) => {
  // 📝 Enhanced logging for debugging
  console.log('🔐 Authentication middleware triggered');
  console.log('📋 Request headers:', {
    authorization: req.headers["authorization"] ? 'Present' : 'Missing',
    'content-type': req.headers["content-type"],
    origin: req.headers.origin,
    'user-agent': req.headers["user-agent"] ? 'Present' : 'Missing'
  });

  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  // 🚨 Enhanced error responses with specific error types
  if (!authHeader) {
    console.log('❌ No authorization header provided');
    return res.status(401).json({ 
      success: false,
      message: "Authorization header required",
      errorType: "MISSING_AUTH_HEADER",
      requiredFormat: "Bearer <token>"
    });
  }

  if (!token) {
    console.log('❌ No token found in authorization header');
    return res.status(401).json({ 
      success: false,
      message: "Access token required",
      errorType: "MISSING_TOKEN",
      providedHeader: authHeader
    });
  }

  // 🔍 Log token info (without exposing the actual token)
  console.log('🎫 Token received:', {
    length: token.length,
    format: token.includes('.') ? 'JWT format' : 'Invalid format',
    parts: token.split('.').length
  });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      // 📊 Detailed error logging
      console.log('❌ JWT verification failed:', {
        error: err.name,
        message: err.message,
        tokenLength: token.length
      });

      // 🎯 Specific error responses based on JWT error type
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false,
          message: "Token has expired. Please log in again.",
          errorType: "EXPIRED_TOKEN",
          expiredAt: err.expiredAt
        });
      } else if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({ 
          success: false,
          message: "Invalid token format or signature",
          errorType: "INVALID_TOKEN",
          details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      } else if (err.name === 'NotBeforeError') {
        return res.status(403).json({ 
          success: false,
          message: "Token not active yet",
          errorType: "TOKEN_NOT_ACTIVE",
          notBefore: err.date
        });
      } else {
        return res.status(403).json({ 
          success: false,
          message: "Token verification failed",
          errorType: "VERIFICATION_FAILED",
          details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      }
    }

    // ✅ Successful authentication
    // ✅ Successful authentication
console.log('✅ Authentication successful for user:', {
  userId: user.userId || user.adminId,
  email: user.email,
  isAdmin: user.isAdmin || false,
  tokenExp: new Date(user.exp * 1000).toISOString()
});

// Ensure compatibility for both user and admin tokens
req.user = {
  userId: user.userId || user.adminId, // Support both user and admin IDs
  adminId: user.adminId,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  username: user.username,
  role: user.role,
  isAdmin: user.isAdmin || false
};

next();
  });
};

// 🛠️ Additional utility function for token validation without middleware
const validateTokenSync = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { valid: true, user: decoded };
  } catch (error) {
    return { 
      valid: false, 
      error: error.name,
      message: error.message 
    };
  }
};

// 🔧 Token generation helper (if needed)
const generateToken = (user) => {
  const payload = {
    userId: user.user_id || user.userId,
    email: user.email,
    firstName: user.first_name || user.firstName,
    lastName: user.last_name || user.lastName
  };

  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: '24h',
    issuer: 'dishcovery-app',
    audience: 'dishcovery-users'
  });
};

// Export as default for your current import syntax
export default authenticateToken;

// Also export utilities as named exports
export { authenticateToken, validateTokenSync, generateToken };