import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Package, 
  DollarSign, 
  AlertTriangle, 
  FileText, 
  TrendingUp,
  ShoppingCart,
  Clock,
  UserCheck,
  RefreshCw
} from 'lucide-react';
import PageHeader from '../common/PageHeader';
import AdminNavigation from '../common/AdminNavigation';
import { formatCurrency } from '../../utils/formatCurrency';
import { useDashboardData } from '../../hooks/useDashboard';

const ManagerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { stats, loading, error, refetch } = useDashboardData();

  // Debug logging

  const getHeaderActions = () => (
    <>
      <button 
        onClick={refetch}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        Refresh
      </button>
      <button 
        onClick={() => navigate('/reports')}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
      >
        <FileText className="w-4 h-4" />
        Reports
      </button>
      <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
        <TrendingUp className="w-4 h-4" />
        Analytics
      </button>
    </>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <PageHeader
        title="Manager Dashboard"
        description="Manage operations and oversee business performance"
        icon={<UserCheck className="w-8 h-8 text-blue-600" />}
        actions={getHeaderActions()}
      />

      <AdminNavigation currentPage="dashboard" />

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
            <button 
              onClick={refetch}
              className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Debug Info */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-yellow-800 mb-2">🔍 Debug Info</h4>
        <div className="text-sm text-yellow-700">
          <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
          <p><strong>Error:</strong> {error || 'None'}</p>
          <p><strong>Stats:</strong> {JSON.stringify(stats)}</p>
          <p><strong>API URL:</strong> http://localhost:5002/api</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Inventory Value</p>
              <p className="text-2xl font-bold text-green-600">
                {loading ? (
                  <span className="animate-pulse bg-gray-200 rounded w-20 h-8 block"></span>
                ) : (
                  formatCurrency(stats.totalInventoryValue)
                )}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-blue-600">
                {loading ? (
                  <span className="animate-pulse bg-gray-200 rounded w-12 h-8 block"></span>
                ) : (
                  stats.totalProducts
                )}
              </p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock Alerts</p>
              <p className="text-2xl font-bold text-red-600">
                {loading ? (
                  <span className="animate-pulse bg-gray-200 rounded w-8 h-8 block"></span>
                ) : (
                  stats.lowStockItems
                )}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Categories</p>
              <p className="text-2xl font-bold text-purple-600">
                {loading ? (
                  <span className="animate-pulse bg-gray-200 rounded w-8 h-8 block"></span>
                ) : (
                  stats.totalCategories
                )}
              </p>
            </div>
            <Users className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Management Actions */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Management Actions
          </h3>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button 
              onClick={() => navigate('/products')}
              className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-left"
            >
              <Package className="w-6 h-6 text-blue-600" />
              <div>
                <div className="font-medium text-blue-900">Manage Products</div>
                <div className="text-sm text-blue-700">Add, edit, and organize products</div>
              </div>
            </button>
            
            <button 
              onClick={() => navigate('/inventory')}
              className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-left"
            >
              <ShoppingCart className="w-6 h-6 text-green-600" />
              <div>
                <div className="font-medium text-green-900">Stock Management</div>
                <div className="text-sm text-green-700">Monitor inventory levels</div>
              </div>
            </button>
            
            <button className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors text-left">
              <Clock className="w-6 h-6 text-yellow-600" />
              <div>
                <div className="font-medium text-yellow-900">Approve Indents</div>
                <div className="text-sm text-yellow-700">Review pending requests</div>
              </div>
            </button>
            
            <button 
              onClick={() => navigate('/reports')}
              className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors text-left"
            >
              <FileText className="w-6 h-6 text-purple-600" />
              <div>
                <div className="font-medium text-purple-900">Sales Reports</div>
                <div className="text-sm text-purple-700">View detailed analytics</div>
              </div>
            </button>
            
            <button 
              onClick={() => navigate('/users')}
              className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors text-left"
            >
              <Users className="w-6 h-6 text-indigo-600" />
              <div>
                <div className="font-medium text-indigo-900">Staff Management</div>
                <div className="text-sm text-indigo-700">Manage team members</div>
              </div>
            </button>
            
            <button className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-left">
              <TrendingUp className="w-6 h-6 text-gray-600" />
              <div>
                <div className="font-medium text-gray-900">Business Analytics</div>
                <div className="text-sm text-gray-700">Performance insights</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
