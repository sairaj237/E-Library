const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  console.log('=== AUTHENTICATE TOKEN MIDDLEWARE ===');
  console.log('Cookies:', req.cookies);
  console.log('Headers:', req.headers);
  
  // Check for token in cookies first, then fall back to Authorization header
  let token = req.cookies?.token;
  console.log('Token from cookie:', token ? 'Present' : 'Not present');
  
  if (!token) {
    // Fallback to Authorization header for backward compatibility
    const authHeader = req.headers['authorization'];
    console.log('Authorization header:', authHeader || 'Not present');
    token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    console.log('Token from header:', token ? 'Extracted' : 'Not extracted');
  }
  
  if (!token) {
    console.log('No token found in request');
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    console.log('Verifying token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);
    
    // Get user details from database
    console.log('Fetching user from database with ID:', decoded.userId);
    const result = await pool.query(
      'SELECT id, username, email, role, full_name FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (result.rows.length === 0) {
      console.log('User not found in database');
      return res.status(401).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    console.log('User found:', { id: user.id, username: user.username, role: user.role });
    req.user = user;
    next();
  } catch (error) {
    console.log('Error verifying token:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Role-based authorization
const authorizeRoles = (...roles) => {
  // Flatten the roles array in case it's nested
  const requiredRoles = roles.flat();
  
  return (req, res, next) => {
    console.log('=== AUTHORIZE ROLES MIDDLEWARE ===');
    console.log('Required roles:', requiredRoles);
    console.log('User from request:', req.user ? 
      { id: req.user.id, username: req.user.username, role: req.user.role } : 'No user found');
    
    if (!req.user) {
      console.log('No user found in request');
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('Checking if user role', req.user.role, 'is in required roles:', requiredRoles);
    
    if (!requiredRoles.includes(req.user.role)) {
      console.log('User role not authorized. Required one of:', requiredRoles);
      return res.status(403).json({ 
        error: `Access denied. Required one of these roles: ${requiredRoles.join(', ')}` 
      });
    }
    
    console.log('User authorized with role:', req.user.role);
    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles
};

