import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Edit, Trash2, Filter, Download, Users, AlertCircle, CheckCircle, XCircle, Keyboard } from 'lucide-react';
import apiService from '../../services/api';
import { useToast } from '../common/Toast';
import { useKeyboardShortcut, useEscapeKey } from '../../hooks/useKeyboardShortcuts';
import PageHeader from '../common/PageHeader';
import AdminNavigation from '../common/AdminNavigation';

type User = {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'manager' | 'biller' | 'stock_reconciler';
  status: string;
  created_at?: string;
  updated_at?: string;
};

type FilterState = {
  role: string;
  status: string;
  search: string;
};

const UsersManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({ role: '', status: '', search: '' });
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Role color mapping for visual distinction
  const getRoleColor = (role: string) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      manager: 'bg-blue-100 text-blue-800',
      biller: 'bg-green-100 text-green-800',
      stock_reconciler: 'bg-yellow-100 text-yellow-800'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  // Status icon mapping
  const getStatusIcon = (status: string) => {
    return status === 'active' ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getUsers();
      if (res.success) {
        setUsers(res.data?.users || res.data || []);
      } else {
        setError(res.error || 'Failed to load users');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Enhanced filtering with search
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesRole = !filters.role || user.role === filters.role;
      const matchesStatus = !filters.status || user.status === filters.status;
      const matchesSearch = !filters.search || 
        user.username.toLowerCase().includes(filters.search.toLowerCase()) ||
        user.email.toLowerCase().includes(filters.search.toLowerCase());
      
      return matchesRole && matchesStatus && matchesSearch;
    });
  }, [users, filters]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this user? This action cannot be undone.')) return;
    
    setLoading(true);
    try {
      const res = await apiService.deleteUser(String(id));
      if (res.success) {
        await fetchUsers();
        showToast('success', 'User deleted successfully');
      } else {
        setError(res.error || 'Failed to delete user');
        showToast('error', res.error || 'Failed to delete user');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      showToast('error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Bulk delete functionality
  const handleBulkDelete = async () => {
    if (selectedUsers.size === 0) return;
    if (!window.confirm(`Delete ${selectedUsers.size} selected users? This action cannot be undone.`)) return;
    
    setLoading(true);
    try {
      const deletePromises = Array.from(selectedUsers).map(id => 
        apiService.deleteUser(String(id))
      );
      await Promise.all(deletePromises);
      setSelectedUsers(new Set());
      await fetchUsers();
      showToast('success', `${selectedUsers.size} users deleted successfully`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete users';
      setError(errorMsg);
      showToast('error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Export users data
  const handleExport = () => {
    const csvContent = [
      ['ID', 'Username', 'Email', 'Role', 'Status', 'Created At'],
      ...filteredUsers.map(user => [
        user.id.toString(),
        user.username,
        user.email,
        user.role,
        user.status,
        user.created_at || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Toggle user selection
  const toggleUserSelection = (userId: number) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  // Select all visible users
  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(user => user.id)));
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcut({
    key: 'n',
    ctrlKey: true,
    callback: () => navigate('/users/new')
  });

  useKeyboardShortcut({
    key: 'f',
    ctrlKey: true,
    callback: () => setShowFilters(!showFilters)
  });

  useKeyboardShortcut({
    key: 'e',
    ctrlKey: true,
    callback: handleExport
  });

  useKeyboardShortcut({
    key: '?',
    shiftKey: true,
    callback: () => setShowShortcuts(!showShortcuts)
  });

  useEscapeKey(() => {
    if (showShortcuts) {
      setShowShortcuts(false);
    } else if (selectedUsers.size > 0) {
      setSelectedUsers(new Set());
    }
  });

  const getHeaderActions = () => (
    <>
      <button
        onClick={() => setShowShortcuts(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        title="Keyboard Shortcuts (Shift + ?)"
      >
        <Keyboard className="w-4 h-4" />
      </button>
      <button
        onClick={handleExport}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        title="Export Users (Ctrl + E)"
      >
        <Download className="w-4 h-4" />
        Export
      </button>
      <button
        onClick={() => navigate('/users/new')}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        title="Create New User (Ctrl + N)"
      >
        <Plus className="w-4 h-4" />
        Create User
      </button>
    </>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <PageHeader
        title="Users Management"
        description="Manage user accounts and permissions"
        icon={<Users className="w-8 h-8 text-blue-600" />}
        actions={getHeaderActions()}
      />

      <AdminNavigation currentPage="users" />

      {/* Filters and Search Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search users by username or email..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            title="Toggle Filters (Ctrl + F)"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={filters.role}
                onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="biller">Biller</option>
                <option value="stock_reconciler">Stock Reconciler</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        )}

        {/* Bulk Actions */}
        {selectedUsers.size > 0 && (
          <div className="mt-4 pt-4 border-t flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {selectedUsers.size} user(s) selected
            </span>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredUsers.length === 0 && !error && (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
          <p className="text-gray-600 mb-4">
            {filters.search || filters.role || filters.status 
              ? "Try adjusting your filters or search terms"
              : "Get started by creating your first user"
            }
          </p>
          {!filters.search && !filters.role && !filters.status && (
            <button
              onClick={() => navigate('/users/new')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
            >
              <Plus className="w-4 h-4" />
              Create User
            </button>
          )}
        </div>
      )}

      {/* Users Table */}
      {filteredUsers.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-800">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.username}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(user.status)}
                        <span className={`text-sm font-medium ${
                          user.status === 'active' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {user.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/users/edit/${user.id}`)}
                          className="flex items-center gap-1 px-3 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="flex items-center gap-1 px-3 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Keyboard className="w-5 h-5" />
                Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Create New User</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl + N</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Toggle Filters</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl + F</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Export Users</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl + E</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Show Shortcuts</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Shift + ?</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Clear Selection</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Esc</kbd>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-gray-500">
                Use these shortcuts to navigate quickly through the interface.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagement;
