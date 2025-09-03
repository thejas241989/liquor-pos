import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff, User, Lock, Shield } from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Role-based dashboard routing
  function getDefaultRedirect(role?: string): string {
    switch (role) {
      case 'admin': return '/admin';
      case 'manager': return '/manager';
      case 'biller': return '/biller';
      case 'stock_reconciler': return '/stock-reconciler';
      default: return '/login';
    }
  }

  // Pre-filled credentials for different roles
  const roleCredentials = {
    admin: { username: 'admin', password: 'admin123', description: 'Full system access' },
    manager: { username: 'manager', password: 'manager123', description: 'Operations management' },
    biller: { username: 'biller', password: 'biller123', description: 'POS operations' },
    stock_reconciler: { username: 'reconciler', password: 'reconciler123', description: 'Stock reconciliation' }
  };

  // Auto-fill credentials based on role selection
  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    const credentials = roleCredentials[role as keyof typeof roleCredentials];
    if (credentials) {
      setUsername(credentials.username);
      setPassword(credentials.password);
      setError(null);
    }
  };

  useEffect(() => {
    // Clear form when component mounts
    setUsername('');
    setPassword('');
    setError(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const success = await login(username.trim(), password);
      
      if (success) {
        // Login successful, wait a moment for context to update then navigate
        setTimeout(() => {
          setLoading(false);
        }, 100);
      } else {
        setError('Invalid credentials. Please check your username and password.');
        setLoading(false);
      }
    } catch (error) {
      setError('Login failed. Please try again.');
      setLoading(false);
    }
  };

  // Redirect if already authenticated
  if (isAuthenticated && user) {
    return <Navigate to={getDefaultRedirect(user.role)} replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            Liquor Store POS
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to access your dashboard
          </p>
        </div>

        {/* Role Selection */}
          <div className="bg-white rounded-lg shadow-md p-6 animate-fadeIn">
            <h3 className="text-lg font-medium text-gray-900 mb-4 text-center">Quick Login Access</h3>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {Object.entries(roleCredentials).map(([role, creds]) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleRoleSelect(role)}
                  className={`p-3 rounded-lg border text-left transition-all transform hover:scale-105 ${
                    selectedRole === role
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-sm font-medium text-gray-900 capitalize">
                    {role.replace('_', ' ')}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {creds.description}
                  </div>
                  {selectedRole === role && (
                    <div className="text-xs text-blue-600 mt-1 font-medium">
                      ✓ Selected
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Click any role above to auto-fill credentials
              </p>
            </div>
          </div>

        {/* Login Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 animate-shake">
                <div className="text-red-800 text-sm flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || !username.trim() || !password.trim()}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign in to Dashboard'
                )}
              </button>
            </div>

            {/* Demo credentials info */}
            <div className="bg-gray-50 rounded-lg p-4 border">
              <div className="text-center">
                <div className="text-sm font-medium text-gray-700 mb-2">Demo System - Available Accounts</div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-left">
                      <span className="font-medium text-blue-600">Admin:</span> admin / admin123
                    </div>
                    <div className="text-left">
                      <span className="font-medium text-green-600">Manager:</span> manager / manager123
                    </div>
                    <div className="text-left">
                      <span className="font-medium text-purple-600">Biller:</span> biller / biller123
                    </div>
                    <div className="text-left">
                      <span className="font-medium text-orange-600">Reconciler:</span> reconciler / reconciler123
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
