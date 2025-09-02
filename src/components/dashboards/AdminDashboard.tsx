import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../layout/Layout';
import { formatCurrency } from '../../utils/formatCurrency';
import { useDashboardData } from '../../hooks/useDashboard';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { stats, products, categories, loading, error, refetch } = useDashboardData();

  if (loading) {
    return (
      <Layout title="Admin Dashboard">
        <div className="flex justify-center items-center h-64">
          <div className="animate-pulse">
            <div className="text-lg text-gray-600">Loading dashboard data...</div>
            <div className="mt-2 text-sm text-gray-400">Please wait...</div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Admin Dashboard">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading dashboard</h3>
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
    <Layout title="Admin Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Dashboard Cards */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Total Inventory Value</h3>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(stats.totalInventoryValue)}</p>
          {/* Debug info */}
          {!loading && (
            <div className="text-xs text-gray-400 mt-1">
              Debug: Value: {stats.totalInventoryValue}
            </div>
          )}
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Products</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.totalProducts}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Low Stock Items</h3>
          <p className="text-3xl font-bold text-orange-600">{stats.lowStockItems}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Categories</h3>
          <p className="text-3xl font-bold text-purple-600">{stats.totalCategories}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
            onClick={() => navigate('/pos')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Start Billing
          </button>
          <button 
            onClick={() => navigate('/products')}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
          >
            Add Product
          </button>
          <button 
            onClick={() => navigate('/inventory')}
            className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors"
          >
            Stock Intake
          </button>
          <button 
            onClick={() => navigate('/reports')}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
          >
            View Reports
          </button>
        </div>
      </div>

      {/* Categories Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Product Categories</h3>
          <div className="space-y-2">
            {Array.isArray(categories) && categories.length > 0 ? (
              <>
                {categories.slice(0, 6).map((category) => (
                  <div key={category.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <span className="font-medium">{category.name}</span>
                    <span className="text-sm text-gray-500">
                      {Array.isArray(products) ? products.filter(p => p.category === category.name).length : 0} items
                    </span>
                  </div>
                ))}
                {categories.length > 6 && (
                  <div className="text-center pt-2">
                    <span className="text-sm text-blue-600">+{categories.length - 6} more categories</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4 text-gray-500">No categories available</div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Recent Products</h3>
          <div className="space-y-2">
            {Array.isArray(products) && products.length > 0 ? (
              <>
                {products.slice(0, 6).map((product) => (
                  <div key={product.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <div>
                      <span className="font-medium block">{product.name}</span>
                      <span className="text-sm text-gray-500">{product.volume} • {product.category}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold block">{formatCurrency(product.price)}</span>
                      <span className={`text-sm ${product.stock < 10 ? 'text-red-500' : 'text-green-500'}`}>
                        Stock: {product.stock}
                      </span>
                    </div>
                  </div>
                ))}
                {products.length > 6 && (
                  <div className="text-center pt-2">
                    <span className="text-sm text-blue-600">+{products.length - 6} more products</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4 text-gray-500">No products available</div>
            )}
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {stats.lowStockItems > 0 && Array.isArray(products) && (
        <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-red-700 mb-4">⚠️ Low Stock Alert</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.filter(p => p.stock < 10).slice(0, 6).map((product) => (
              <div key={product.id} className="bg-white p-3 rounded border border-red-200">
                <div className="font-medium">{product.name}</div>
                <div className="text-sm text-gray-600">{product.volume}</div>
                <div className="text-sm text-red-600 font-semibold">Only {product.stock} left</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AdminDashboard;
