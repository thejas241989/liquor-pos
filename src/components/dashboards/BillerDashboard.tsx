import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  DollarSign, 
  Package, 
  Clock, 
  CreditCard, 
  AlertCircle,
  RefreshCw,
  Receipt,
  HelpCircle
} from 'lucide-react';
import PageHeader from '../common/PageHeader';
import { formatCurrency } from '../../utils/formatCurrency';
import { useInventorySummary } from '../../hooks/useDashboard';

const BillerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { summary, loading, error, refetch } = useInventorySummary();

  const getHeaderActions = () => (
    <>
      <button 
        onClick={() => navigate('/inventory')}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
      >
        <Package className="w-4 h-4" />
        Check Stock
      </button>
      <button 
        onClick={() => navigate('/pos')}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        <ShoppingCart className="w-4 h-4" />
        Start POS
      </button>
    </>
  );

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <PageHeader
          title="Biller Dashboard"
          description="Point of Sale operations and inventory status"
          icon={<Receipt className="w-8 h-8 text-green-600" />}
          actions={getHeaderActions()}
        />
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <div className="text-lg text-gray-600">Loading inventory summary...</div>
            <div className="mt-2 text-sm text-gray-400">Please wait...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <PageHeader
          title="Biller Dashboard"
          description="Point of Sale operations and inventory status"
          icon={<Receipt className="w-8 h-8 text-green-600" />}
          actions={getHeaderActions()}
        />
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error loading inventory</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
              <button 
                onClick={refetch}
                className="mt-3 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const retailValue = summary?.total_inventory_value ?? 0;
  const costValue = summary?.total_cost_value ?? 0;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <PageHeader
        title="Biller Dashboard"
        description="Point of Sale operations and inventory status"
        icon={<Receipt className="w-8 h-8 text-green-600" />}
        actions={getHeaderActions()}
      />

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Inventory Value</p>
              <div className="flex flex-col">
                <div className="text-2xl font-bold text-green-600">{loading ? 'Loading...' : formatCurrency(Number(costValue || 0))}</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Cost Value</span>
                  <span title="Cost value = sum of (product cost × current stock). Represents inventory carrying value." className="inline-block">
                    <HelpCircle className="w-4 h-4 text-gray-400" />
                  </span>
                </div>
                <div className="text-sm text-gray-500 mt-1 flex items-center">
                  <span>Retail: {formatCurrency(Number(retailValue || 0))}</span>
                  <span title="Retail value = sum of (selling price × current stock). Useful for revenue estimation." className="inline-block ml-2">
                    <HelpCircle className="w-4 h-4 text-gray-400" />
                  </span>
                </div>
              </div>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-blue-600">{loading ? '—' : (summary?.total_products ?? 0)}</p>
              <p className="text-xs text-gray-500">SKUs in inventory</p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-red-600">{loading ? '—' : (summary?.low_stock_items ?? 0)}</p>
              <p className="text-xs text-gray-500">Need restocking</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-green-600" />
            Quick Actions
          </h3>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button 
              onClick={() => navigate('/pos')}
              className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-left"
            >
              <CreditCard className="w-6 h-6 text-green-600" />
              <div>
                <div className="font-medium text-green-900">Start POS</div>
                <div className="text-sm text-green-700">Process sales</div>
              </div>
            </button>
            
            <button 
              onClick={() => navigate('/inventory')}
              className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-left"
            >
              <Package className="w-6 h-6 text-blue-600" />
              <div>
                <div className="font-medium text-blue-900">Check Inventory</div>
                <div className="text-sm text-blue-700">View stock levels</div>
              </div>
            </button>
            
            <button className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors text-left">
              <Clock className="w-6 h-6 text-orange-600" />
              <div>
                <div className="font-medium text-orange-900">Pending Orders</div>
                <div className="text-sm text-orange-700">View queue</div>
              </div>
            </button>
            
            <button 
              onClick={refetch}
              className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-left"
            >
              <RefreshCw className="w-6 h-6 text-gray-600" />
              <div>
                <div className="font-medium text-gray-900">Refresh Data</div>
                <div className="text-sm text-gray-700">Update inventory</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillerDashboard;
