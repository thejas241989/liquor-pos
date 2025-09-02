import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../layout/Layout';
import { formatCurrency } from '../../utils/formatCurrency';
import { useInventorySummary } from '../../hooks/useDashboard';

const BillerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { summary, loading, error, refetch } = useInventorySummary();

  if (loading) {
    return (
      <Layout title="Biller Dashboard">
        <div className="flex justify-center items-center h-64">
          <div className="animate-pulse">
            <div className="text-lg text-gray-600">Loading inventory summary...</div>
            <div className="mt-2 text-sm text-gray-400">Please wait...</div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Biller Dashboard">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading inventory</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
              <button 
                onClick={refetch}
                className="mt-3 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Biller Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Dashboard Cards */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Total Inventory Value</h3>
          <p className="text-3xl font-bold text-green-600">{
            loading ? 'Loading...' : formatCurrency(Number(summary?.total_inventory_value || 0))
          }</p>
          <p className="text-sm text-gray-500">Value of all stocked items</p>
          {/* Debug info */}
          {!loading && (
            <div className="text-xs text-gray-400 mt-1">
              Debug: {summary ? `Value: ${summary.total_inventory_value}` : 'No summary data'}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Total Products</h3>
          <p className="text-3xl font-bold text-blue-600">{loading ? '—' : (summary?.total_products ?? 0)}</p>
          <p className="text-sm text-gray-500">SKUs in inventory</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Low Stock Items</h3>
          <p className="text-3xl font-bold text-purple-600">{loading ? '—' : (summary?.low_stock_items ?? 0)}</p>
          <p className="text-sm text-gray-500">Items at or below minimum level</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={() => navigate('/pos')}
            className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors text-lg font-medium"
          >
            🛒 Start New Sale
          </button>
          <button 
            onClick={() => navigate('/reports')}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
          >
            📊 View My Sales
          </button>
          <button 
            onClick={() => navigate('/products')}
            className="bg-orange-600 text-white px-6 py-3 rounded-md hover:bg-orange-700 transition-colors"
          >
            🔍 Search Products
          </button>
        </div>
      </div>

      {/* Recent Sales */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Recent Sales</h3>
        <div className="text-center text-gray-500 py-8">
          <p>No sales recorded today</p>
          <p className="text-sm">Start your first sale to see data here</p>
        </div>
      </div>
    </Layout>
  );
};

export default BillerDashboard;
