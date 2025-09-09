import React, { useState, useEffect } from 'react';
import { Package, Plus, TrendingUp, AlertTriangle, DollarSign, BarChart3, FileText, RefreshCw } from 'lucide-react';
import PageHeader from '../common/PageHeader';
import AdminNavigation from '../common/AdminNavigation';
import { apiService } from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import StockInward from './StockInward';
import StockReconciliation from './StockReconciliation';

interface Product {
  _id: string;
  name: string;
  barcode: string;
  category_id: string;
  price: number;
  cost_price: number;
  stock_quantity: number;
  min_stock_level: number;
  status: string;
  category?: {
    name: string;
  };
}

interface InventorySummary {
  total_products: number;
  active_products: number;
  total_categories: number;
  low_stock_items: number;
  total_inventory_value: number;
  total_cost_value: number;
}

const InventoryManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'low-stock' | 'stock-inward' | 'reconciliation'>('overview');

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch products
      const productsResponse = await apiService.getProducts();
      if (productsResponse.success) {
        setProducts(productsResponse.data || []);
      }

      // Fetch inventory summary
      const summaryResponse = await apiService.getInventorySummary();
      if (summaryResponse.success) {
        setSummary(summaryResponse.data);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const lowStockProducts = products.filter(product => 
    product.stock_quantity <= product.min_stock_level
  );

  const getHeaderActions = () => (
    <>
      <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
        <BarChart3 className="w-4 h-4" />
        Generate Report
      </button>
      <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
        <Plus className="w-4 h-4" />
        Add Stock
      </button>
    </>
  );

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading inventory data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h3 className="text-lg font-semibold text-red-800">Error Loading Inventory</h3>
          </div>
          <p className="text-red-700 mb-4">{error}</p>
          <button 
            onClick={fetchInventoryData}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <PageHeader
        title="Inventory Management"
        description="Manage stock levels, track inventory value, and monitor low stock items"
        icon={<Package className="w-8 h-8 text-blue-600" />}
        actions={getHeaderActions()}
      />

      <AdminNavigation currentPage="inventory" />

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">{summary.total_products}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inventory Value</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.total_inventory_value)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cost Value</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(summary.total_cost_value)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                <p className="text-2xl font-bold text-red-600">{summary.low_stock_items}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'products'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Products ({products.length})
            </button>
            <button
              onClick={() => setActiveTab('low-stock')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'low-stock'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Low Stock ({lowStockProducts.length})
            </button>
            <button
              onClick={() => setActiveTab('stock-inward')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'stock-inward'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Stock Inward
            </button>
            <button
              onClick={() => setActiveTab('reconciliation')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reconciliation'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Reconciliation
            </button>
          </nav>
        </div>

    <div className="p-6">
          {activeTab === 'overview' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory Overview</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Top Products by Stock Value</h4>
                  <div className="space-y-2">
                    {products
                      .sort((a, b) => (b.stock_quantity * b.price) - (a.stock_quantity * a.price))
                      .slice(0, 5)
                      .map((product) => (
                        <div key={product._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{product.name}</p>
                            <p className="text-sm text-gray-600">{product.stock_quantity} units</p>
                          </div>
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(product.stock_quantity * product.price)}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Low Stock Alerts</h4>
                  <div className="space-y-2">
                    {lowStockProducts.slice(0, 5).map((product) => (
                      <div key={product._id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-200">
                        <div>
                          <p className="font-medium text-red-900">{product.name}</p>
                          <p className="text-sm text-red-600">
                            {product.stock_quantity} / {product.min_stock_level} units
                          </p>
                        </div>
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      </div>
                    ))}
                    {lowStockProducts.length === 0 && (
                      <p className="text-gray-500 text-center py-4">No low stock items</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">All Products</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Value
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product) => (
                      <tr key={product._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500">{product.barcode}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {product.category?.name || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {product.stock_quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {formatCurrency(product.price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                          {formatCurrency(product.stock_quantity * product.price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {product.stock_quantity <= product.min_stock_level ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              In Stock
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'low-stock' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Low Stock Items</h3>
              {lowStockProducts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Current Stock
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Min Level
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {lowStockProducts.map((product) => (
                        <tr key={product._id} className="bg-red-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-red-900">{product.name}</div>
                              <div className="text-sm text-red-600">{product.barcode}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-900 font-medium">
                            {product.stock_quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-900">
                            {product.min_stock_level}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-900">
                            {formatCurrency(product.price)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700">
                              Reorder
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Low Stock Items</h3>
                  <p className="text-gray-600">All products are well stocked!</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'stock-inward' && (
            <StockInward />
          )}

          {activeTab === 'reconciliation' && (
            <StockReconciliation />
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryManagement;
