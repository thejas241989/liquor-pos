import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardCheck, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Search, 
  FileText,
  Package,
  BarChart3,
  RefreshCw,
  DollarSign
} from 'lucide-react';
import PageHeader from '../common/PageHeader';
import AdminNavigation from '../common/AdminNavigation';
import { useInventorySummary } from '../../hooks/useDashboard';
import { formatCurrency } from '../../utils/formatCurrency';

const StockReconcilerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { summary, loading, error, refetch } = useInventorySummary();

  // Debug logging
  console.log('🔍 Stock Reconciler Dashboard - Summary:', summary);
  console.log('🔍 Stock Reconciler Dashboard - Loading:', loading);
  console.log('🔍 Stock Reconciler Dashboard - Error:', error);

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
      <button 
        onClick={() => navigate('/inventory')}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <ClipboardCheck className="w-4 h-4" />
        Start Reconciliation
      </button>
    </>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <PageHeader
        title="Stock Reconciler Dashboard"
        description="Manage inventory reconciliation and stock verification"
        icon={<ClipboardCheck className="w-8 h-8 text-orange-600" />}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-blue-600">
                {loading ? (
                  <span className="animate-pulse bg-gray-200 rounded w-12 h-8 block"></span>
                ) : (
                  summary?.total_products || 0
                )}
              </p>
              <p className="text-xs text-gray-500">Items to track</p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-orange-600">
                {loading ? (
                  <span className="animate-pulse bg-gray-200 rounded w-8 h-8 block"></span>
                ) : (
                  summary?.low_stock_items || 0
                )}
              </p>
              <p className="text-xs text-gray-500">Need attention</p>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600">
                {loading ? (
                  <span className="animate-pulse bg-gray-200 rounded w-8 h-8 block"></span>
                ) : (
                  summary?.out_of_stock_items || 0
                )}
              </p>
              <p className="text-xs text-gray-500">Critical items</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Inventory Value</p>
              <p className="text-2xl font-bold text-green-600">
                {loading ? (
                  <span className="animate-pulse bg-gray-200 rounded w-20 h-8 block"></span>
                ) : (
                  formatCurrency(summary?.total_inventory_value || 0)
                )}
              </p>
              <p className="text-xs text-gray-500">Total stock worth</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Stock Reconciliation Actions */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-600" />
            Reconciliation Actions
          </h3>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-left">
              <ClipboardCheck className="w-6 h-6 text-blue-600" />
              <div>
                <div className="font-medium text-blue-900">New Reconciliation</div>
                <div className="text-sm text-blue-700">Start stock verification</div>
              </div>
            </button>
            
            <button className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-left">
              <Clock className="w-6 h-6 text-green-600" />
              <div>
                <div className="font-medium text-green-900">View Pending</div>
                <div className="text-sm text-green-700">Review ongoing tasks</div>
              </div>
            </button>
            
            <button className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors text-left">
              <BarChart3 className="w-6 h-6 text-orange-600" />
              <div>
                <div className="font-medium text-orange-900">Reconciliation History</div>
                <div className="text-sm text-orange-700">View past records</div>
              </div>
            </button>
            
            <button 
              onClick={() => navigate('/products')}
              className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors text-left"
            >
              <Search className="w-6 h-6 text-purple-600" />
              <div>
                <div className="font-medium text-purple-900">Search Products</div>
                <div className="text-sm text-purple-700">Find specific items</div>
              </div>
            </button>
            
            <button 
              onClick={() => navigate('/inventory')}
              className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors text-left"
            >
              <Package className="w-6 h-6 text-indigo-600" />
              <div>
                <div className="font-medium text-indigo-900">Current Inventory</div>
                <div className="text-sm text-indigo-700">View stock levels</div>
              </div>
            </button>
            
            <button className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-left">
              <AlertTriangle className="w-6 h-6 text-gray-600" />
              <div>
                <div className="font-medium text-gray-900">Discrepancy Reports</div>
                <div className="text-sm text-gray-700">Review variances</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockReconcilerDashboard;
