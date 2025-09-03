import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, AlertCircle, Plus, DollarSign, Package, FileText, Settings } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';
import { useDashboardData } from '../../hooks/useDashboard';
import PageHeader from '../common/PageHeader';
import AdminNavigation from '../common/AdminNavigation';
import UsersDashboardSection from './UsersDashboardSection';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { stats, products, categories, loading, error, refetch } = useDashboardData();
  const [activeSection, setActiveSection] = useState<'dashboard' | 'users' | 'inventory' | 'reports' | 'pos' | 'products'>('dashboard');

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-800">Error loading dashboard: {error}</span>
          </div>
          <button 
            onClick={refetch}
            className="mt-3 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const getHeaderActions = () => {
    switch (activeSection) {
      case 'pos':
        return (
          <button
            onClick={() => navigate('/pos')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <DollarSign className="w-4 h-4" />
            Start Sale
          </button>
        );
      case 'users':
        return (
          <button
            onClick={() => navigate('/users/new')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create User
          </button>
        );
      case 'products':
        return (
          <button
            onClick={() => navigate('/products/new')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <PageHeader
        title="Admin Dashboard"
        description="System overview and administrative controls"
        icon={<BarChart3 className="w-8 h-8 text-blue-600" />}
        actions={getHeaderActions()}
      />

      <AdminNavigation
        currentPage={activeSection}
        onSectionChange={(section) => setActiveSection(section as any)}
        isIntegratedDashboard={true}
      />

      {/* Conditional Content Based on Active Section */}
      {activeSection === 'users' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <UsersDashboardSection />
        </div>
      )}

      {activeSection === 'dashboard' && (
        <>
          {/* Stats Section */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Overview</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalInventoryValue)}</div>
                <div className="text-sm text-green-600">Total Inventory Value</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.totalProducts}</div>
                <div className="text-sm text-blue-600">Total Products</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{stats.lowStockItems}</div>
                <div className="text-sm text-orange-600">Low Stock Items</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{stats.totalCategories}</div>
                <div className="text-sm text-purple-600">Categories</div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button 
                onClick={() => navigate('/pos')}
                className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <DollarSign className="w-4 h-4" />
                Start Billing
              </button>
              <button 
                onClick={() => navigate('/products')}
                className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Package className="w-4 h-4" />
                Add Product
              </button>
              <button 
                onClick={() => navigate('/inventory')}
                className="flex items-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Package className="w-4 h-4" />
                Stock Intake
              </button>
              <button 
                onClick={() => navigate('/reports')}
                className="flex items-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <FileText className="w-4 h-4" />
                View Reports
              </button>
            </div>
          </div>

          {/* Categories and Products Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Categories</h3>
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

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Products</h3>
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
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Low Stock Alert
              </h3>
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
        </>
      )}

      {/* Other Sections Placeholders */}
      {activeSection === 'inventory' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Inventory Management</h3>
            <p className="text-gray-600 mb-4">Manage your stock levels and inventory</p>
            <button 
              onClick={() => navigate('/inventory')}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Go to Full Inventory
            </button>
          </div>
        </div>
      )}

      {activeSection === 'pos' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Point of Sale</h3>
            <p className="text-gray-600 mb-4">Start billing customers and process sales</p>
            <button 
              onClick={() => navigate('/pos')}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Open POS System
            </button>
          </div>
        </div>
      )}

      {activeSection === 'reports' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Business Reports</h3>
            <p className="text-gray-600 mb-4">View sales, inventory and business analytics</p>
            <button 
              onClick={() => navigate('/reports')}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
            >
              View Reports
            </button>
          </div>
        </div>
      )}

      {activeSection === 'products' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center py-12">
            <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Product Management</h3>
            <p className="text-gray-600 mb-4">Manage your product catalog and categories</p>
            <button 
              onClick={() => navigate('/products')}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Manage Products
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
