import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Users, UserPlus, Edit2, Save, X, UserCheck, Lock, Shield } from 'lucide-react';
import axios from '../utils/axios';
import { ROLES, PERMISSIONS, ROLE_PERMISSIONS } from '../config/permissions';

const UserManagement = () => {
  const [users, setUsers] = useState([]);  // Initialize as empty array
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [error, setError] = useState(null);
  const [showPermissions, setShowPermissions] = useState(null);
  const { mode } = useSelector((state) => state.theme);
  const { user: currentUser } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'viewer'
  });

  // Replace the hardcoded roles object
  const roles = {
    [ROLES.ADMIN]: 'Administrator',
    [ROLES.MANAGER]: 'Manager',
    [ROLES.OPERATOR]: 'Operator',
    [ROLES.VIEWER]: 'Viewer'
  };

  const roleDescriptions = {
    [ROLES.ADMIN]: 'Full system access and user management',
    [ROLES.MANAGER]: 'Tank and product management, user viewing',
    [ROLES.OPERATOR]: 'Basic tank operations and reporting',
    [ROLES.VIEWER]: 'View-only access to tanks and reports'
  };

  const roleColors = {
    admin: 'text-red-400',
    manager: 'text-blue-400',
    operator: 'text-green-400',
    viewer: 'text-gray-400'
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/users');
      // Ensure response.data is an array
      setUsers(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch users');
      setUsers([]); // Reset to empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await axios.post('/api/auth/register', formData);
      setShowAddUser(false);
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'viewer'
      });
      fetchUsers();
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleUpdate = async (userId, newRole) => {
    try {
      setIsLoading(true);
      await axios.put(`/api/users/${userId}/role`, { role: newRole });
      fetchUsers();
      setEditingUser(null);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user role');
    } finally {
      setIsLoading(false);
    }
  };

  const baseClasses = mode === 'dark' 
    ? 'bg-gray-800 border-gray-700 text-white' 
    : 'bg-white border-gray-300 text-gray-900';

  const inputClasses = mode === 'dark'
    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500';

  // Add permission checking helper
  const hasPermission = (permission) => {
    return currentUser?.permissions?.includes(permission);
  };

  const RolePermissionsModal = ({ role, onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className={`relative w-full max-w-md p-6 rounded-lg shadow-lg ${baseClasses}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-400" />
            <span>{ROLES[role]} Permissions</span>
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-gray-400 mb-4">{roleDescriptions[role]}</p>
        <div className="space-y-2">
          {ROLE_PERMISSIONS[role].map(permission => (
            <div key={permission} className="flex items-center space-x-2 text-sm">
              <Lock className="h-4 w-4 text-green-400" />
              <span>{permission}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200
          ${mode === 'dark' 
            ? 'bg-gray-700 hover:bg-gray-600 text-white' 
            : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
          }
        `}
      >
        <Users className="h-4 w-4" />
        <span className="text-sm font-medium">Manage Users</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsOpen(false)} />
          <div className={`relative w-full max-w-3xl max-h-[80vh] overflow-y-auto rounded-lg border shadow-lg ${baseClasses}`}>
            <div className="sticky top-0 p-6 border-b border-gray-600 bg-inherit">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-400" />
                  <span>User Management</span>
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className={`p-1 rounded hover:bg-gray-700 text-gray-400`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {currentUser?.role === 'admin' && hasPermission(PERMISSIONS.MANAGE_USERS) && (
                <button
                  onClick={() => setShowAddUser(!showAddUser)}
                  className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Add User</span>
                </button>
              )}
            </div>

            <div className="p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-500 bg-opacity-10 border border-red-500 text-red-500 rounded">
                  {error}
                </div>
              )}

              {showAddUser && (
                <form onSubmit={handleSubmit} className="mb-6 p-4 border border-gray-600 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">First Name</label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-md ${inputClasses}`}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Last Name</label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-md ${inputClasses}`}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-md ${inputClasses}`}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Password</label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-md ${inputClasses}`}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Role</label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-md ${inputClasses}`}
                      >
                        {Object.entries(roles).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-1">Role & Permissions</label>
                    <div className="space-y-2">
                      {Object.entries(ROLES).map(([key, value]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id={`role-${value}`}
                            name="role"
                            value={value}
                            checked={formData.role === value}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="text-blue-500"
                          />
                          <label htmlFor={`role-${value}`} className="flex-1">
                            <span className={`font-medium ${roleColors[value]}`}>{ROLES[key]}</span>
                            <p className="text-sm text-gray-400">{roleDescriptions[value]}</p>
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowPermissions(value)}
                            className="p-1 text-gray-400 hover:text-gray-300"
                          >
                            <Shield className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowAddUser(false)}
                      className="px-4 py-2 border border-gray-600 rounded-md hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isLoading ? 'Creating...' : 'Create User'}
                    </button>
                  </div>
                </form>
              )}

              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
                  <p className="mt-2 text-gray-400">Loading users...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8 text-red-400">
                  {error}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`border-b ${mode === 'dark' ? 'border-gray-600' : 'border-gray-300'}`}>
                        <th className="text-left py-3 px-4">Name</th>
                        <th className="text-left py-3 px-4">Email</th>
                        <th className="text-left py-3 px-4">Role</th>
                        <th className="text-left py-3 px-4">Status</th>
                        {currentUser?.role === 'admin' && (
                          <th className="text-left py-3 px-4">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(users) && users.length > 0 ? (
                        users.map((user) => (
                          <tr key={user.id} className={`border-b ${mode === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                            <td className="py-3 px-4">{user.first_name} {user.last_name}</td>
                            <td className="py-3 px-4">{user.email}</td>
                            <td className="py-3 px-4">
                              {editingUser === user.id ? (
                                <div className="flex items-center space-x-2">
                                  <select
                                    value={user.role}
                                    onChange={(e) => handleRoleUpdate(user.id, e.target.value)}
                                    className={`px-2 py-1 border rounded ${inputClasses}`}
                                    disabled={!hasPermission(PERMISSIONS.MANAGE_USERS)}
                                  >
                                    {Object.entries(ROLES).map(([key, value]) => (
                                      <option key={value} value={value}>{ROLES[key]}</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => setEditingUser(null)}
                                    className="p-1 text-gray-400 hover:text-gray-300"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <span className={roleColors[user.role]}>{roles[user.role]}</span>
                                  <button
                                    onClick={() => setShowPermissions(user.role)}
                                    className="p-1 text-gray-400 hover:text-gray-300"
                                  >
                                    <Shield className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center space-x-1 ${user.is_active ? 'text-green-400' : 'text-red-400'}`}>
                                <UserCheck className="h-4 w-4" />
                                <span>{user.is_active ? 'Active' : 'Inactive'}</span>
                              </span>
                            </td>
                            {currentUser?.role === 'admin' && (
                              <td className="py-3 px-4">
                                <button
                                  onClick={() => setEditingUser(user.id)}
                                  className="p-1 text-gray-400 hover:text-gray-300"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="text-center py-4 text-gray-400">
                            No users found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showPermissions && (
        <RolePermissionsModal
          role={showPermissions}
          onClose={() => setShowPermissions(null)}
        />
      )}
    </div>
  );
};

export default UserManagement;