// Match backend permissions configuration
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

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  OPERATOR: 'operator',
  VIEWER: 'viewer'
};

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

export const roleDescriptions = {
  [ROLES.ADMIN]: 'Full system access and user management',
  [ROLES.MANAGER]: 'Tank and product management, user viewing',
  [ROLES.OPERATOR]: 'Basic tank operations and reporting',
  [ROLES.VIEWER]: 'View-only access to tanks and reports'
};