import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// User roles and permissions
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  OPERATOR: 'operator',
  VIEWER: 'viewer'
};

export const PERMISSIONS = {
  // Tank management
  VIEW_TANKS: 'view_tanks',
  MANAGE_TANKS: 'manage_tanks',
  
  // Product management
  VIEW_PRODUCTS: 'view_products',
  MANAGE_PRODUCTS: 'manage_products',
  
  // Reports
  VIEW_REPORTS: 'view_reports',
  EXPORT_REPORTS: 'export_reports',
  
  // User management
  VIEW_USERS: 'view_users',
  MANAGE_USERS: 'manage_users',
  
  // System settings
  MANAGE_SETTINGS: 'manage_settings'
};

// Role permissions mapping
export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    PERMISSIONS.VIEW_TANKS,
    PERMISSIONS.MANAGE_TANKS,
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.MANAGE_PRODUCTS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.EXPORT_REPORTS,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_SETTINGS
  ],
  [ROLES.MANAGER]: [
    PERMISSIONS.VIEW_TANKS,
    PERMISSIONS.MANAGE_TANKS,
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.MANAGE_PRODUCTS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.EXPORT_REPORTS,
    PERMISSIONS.VIEW_USERS
  ],
  [ROLES.OPERATOR]: [
    PERMISSIONS.VIEW_TANKS,
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.MANAGE_PRODUCTS,
    PERMISSIONS.VIEW_REPORTS
  ],
  [ROLES.VIEWER]: [
    PERMISSIONS.VIEW_TANKS,
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.VIEW_REPORTS
  ]
};

// Generate JWT token
export const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      permissions: ROLE_PERMISSIONS[user.role] || []
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Verify JWT token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Hash password
export const hashPassword = async (password) => {
  return await bcrypt.hash(password, 12);
};

// Compare password
export const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Authentication middleware
export const authenticate = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token.' });
  }

  req.user = decoded;
  next();
};

// Authorization middleware
export const authorize = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const userPermissions = req.user.permissions || [];
    
    if (!userPermissions.includes(requiredPermission)) {
      return res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.',
        required: requiredPermission,
        userRole: req.user.role
      });
    }

    next();
  };
};

// Role-based middleware
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied. Insufficient role.',
        required: allowedRoles,
        userRole: req.user.role
      });
    }

    next();
  };
};