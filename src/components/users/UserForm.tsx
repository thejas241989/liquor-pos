import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, X, User, Mail, Lock, Shield, Activity, AlertCircle, CheckCircle } from 'lucide-react';
import apiService from '../../services/api';
import { useToast } from '../common/Toast';
import { useAuth } from '../../contexts/AuthContext';

const roles = [
  { value: 'admin', label: 'Administrator', description: 'Full system access' },
  { value: 'manager', label: 'Manager', description: 'Store management access' },
  { value: 'biller', label: 'Biller', description: 'Sales and billing access' },
  { value: 'stock_reconciler', label: 'Stock Reconciler', description: 'Inventory management access' }
];

type FormState = {
  username: string;
  email: string;
  password: string;
  role: string;
  status: string;
};

type ValidationErrors = {
  username?: string;
  email?: string;
  password?: string;
  role?: string;
};

const UserForm: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { isAuthenticated, hasRole } = useAuth();

  const [state, setState] = useState<FormState>({ 
    username: '', 
    email: '', 
    password: '', 
    role: 'biller', 
    status: 'active' 
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const { showToast } = useToast();

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated || !hasRole('admin')) {
      showToast('error', 'You need to be logged in as an admin to access this page.');
      navigate('/login');
      return;
    }
  }, [isAuthenticated, hasRole, navigate, showToast]);

  useEffect(() => {
    if (isEdit && id) {
      (async () => {
        setLoading(true);
        const res = await apiService.getUser(id);
        if (res.success) {
          const user = res.data;
          setState({
            username: user.username || '',
            email: user.email || '',
            password: '',
            role: user.role || 'biller',
            status: user.status || 'active'
          });
        } else {
          setError(res.error || 'Failed to load user');
        }
        setLoading(false);
      })();
    }
  }, [id, isEdit]);

  // Real-time validation
  const validateField = (name: string, value: string): string | undefined => {
    switch (name) {
      case 'username':
        if (value.length < 3) return 'Username must be at least 3 characters';
        if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Username can only contain letters, numbers, and underscores';
        break;
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
        break;
      case 'password':
        if (!isEdit && value.length < 6) return 'Password must be at least 6 characters';
        if (value && value.length > 0 && value.length < 6) return 'Password must be at least 6 characters';
        break;
      default:
        return undefined;
    }
    return undefined;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setState(prev => ({ ...prev, [name]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[name as keyof ValidationErrors]) {
      setValidationErrors(prev => ({ ...prev, [name]: undefined }));
    }
    
    // Real-time validation
    const error = validateField(name, value);
    if (error) {
      setValidationErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    
    errors.username = validateField('username', state.username);
    errors.email = validateField('email', state.email);
    if (!isEdit || state.password) {
      errors.password = validateField('password', state.password);
    }
    
    // Remove undefined errors
    Object.keys(errors).forEach(key => {
      if (!errors[key as keyof ValidationErrors]) {
        delete errors[key as keyof ValidationErrors];
      }
    });
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      let res;
      if (isEdit && id) {
        const payload: any = { 
          username: state.username, 
          email: state.email, 
          role: state.role, 
          status: state.status 
        };
        if (state.password) payload.password = state.password;
        res = await apiService.updateUser(id, payload);
      } else {
        res = await apiService.createUser({ 
          username: state.username, 
          email: state.email, 
          password: state.password, 
          role: state.role, 
          status: state.status 
        });
      }

      if (res.success) {
        showToast('success', `User ${isEdit ? 'updated' : 'created'} successfully`);
        setTimeout(() => navigate('/users'), 1000);
      } else {
        // Handle authentication errors specifically
        if (res.error?.toLowerCase().includes('token') || res.error?.toLowerCase().includes('access denied')) {
          showToast('error', 'Your session has expired. Please log in again.');
          setTimeout(() => navigate('/login'), 2000);
        } else {
          setError(res.error || `Failed to ${isEdit ? 'update' : 'create'} user`);
          showToast('error', res.error || `Failed to ${isEdit ? 'update' : 'create'} user`);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      // Handle authentication errors specifically
      if (errorMessage.toLowerCase().includes('token') || errorMessage.toLowerCase().includes('access denied')) {
        showToast('error', 'Your session has expired. Please log in again.');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(errorMessage);
        showToast('error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
    if (score <= 4) return { score, label: 'Medium', color: 'bg-yellow-500' };
    return { score, label: 'Strong', color: 'bg-green-500' };
  };

  if (loading && isEdit) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading user details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/users')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Users
          </button>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <User className="w-8 h-8 text-blue-600" />
            {isEdit ? 'Edit User' : 'Create New User'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEdit ? 'Update user information and permissions' : 'Add a new user to the system'}
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Username
              </label>
              <input
                name="username"
                value={state.username}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  validationErrors.username ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Enter username"
                required
              />
              {validationErrors.username && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {validationErrors.username}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-1" />
                Email Address
              </label>
              <input
                name="email"
                type="email"
                value={state.email}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  validationErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Enter email address"
                required
              />
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {validationErrors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Lock className="w-4 h-4 inline mr-1" />
                Password 
                {isEdit && <span className="text-xs text-gray-500 ml-1">(leave blank to keep current)</span>}
              </label>
              <input
                name="password"
                type="password"
                value={state.password}
                onChange={handleChange}
                onFocus={() => setShowPasswordRequirements(true)}
                onBlur={() => setShowPasswordRequirements(false)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  validationErrors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder={isEdit ? "Enter new password (optional)" : "Enter password"}
                {...(!isEdit && { required: true })}
              />
              
              {/* Password Strength Indicator */}
              {state.password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${getPasswordStrength(state.password).color}`}
                        style={{ width: `${(getPasswordStrength(state.password).score / 6) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-medium text-gray-600">
                      {getPasswordStrength(state.password).label}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Password Requirements */}
              {(showPasswordRequirements || validationErrors.password) && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-gray-700 mb-2">Password requirements:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li className="flex items-center gap-1">
                      {state.password.length >= 6 ? (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      ) : (
                        <X className="w-3 h-3 text-gray-400" />
                      )}
                      At least 6 characters
                    </li>
                    <li className="flex items-center gap-1">
                      {/[A-Z]/.test(state.password) ? (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      ) : (
                        <X className="w-3 h-3 text-gray-400" />
                      )}
                      One uppercase letter
                    </li>
                    <li className="flex items-center gap-1">
                      {/[0-9]/.test(state.password) ? (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      ) : (
                        <X className="w-3 h-3 text-gray-400" />
                      )}
                      One number
                    </li>
                  </ul>
                </div>
              )}
              
              {validationErrors.password && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {validationErrors.password}
                </p>
              )}
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Shield className="w-4 h-4 inline mr-1" />
                Role
              </label>
              <select
                name="role"
                value={state.role}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {roles.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label} - {role.description}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {roles.find(r => r.value === state.role)?.description}
              </p>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Activity className="w-4 h-4 inline mr-1" />
                Status
              </label>
              <select
                name="status"
                value={state.status}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="active">Active - User can log in and access the system</option>
                <option value="inactive">Inactive - User account is disabled</option>
              </select>
            </div>

            {/* Form Actions */}
            <div className="flex gap-4 pt-4 border-t">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {loading ? 'Saving...' : (isEdit ? 'Update User' : 'Create User')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/users')}
                className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserForm;
