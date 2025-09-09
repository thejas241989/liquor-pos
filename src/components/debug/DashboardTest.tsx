import React, { useState } from 'react';
import { useDashboardData } from '../../hooks/useDashboard';
import { formatCurrency } from '../../utils/formatCurrency';

const DashboardTest: React.FC = () => {
  const { stats, products, categories, loading, error, refetch } = useDashboardData();
  const [testEventSent, setTestEventSent] = useState(false);

  const sendTestInventoryUpdate = () => {
    const testSummary = {
      total_products: stats.totalProducts + 1,
      total_categories: stats.totalCategories,
      low_stock_items: stats.lowStockItems + 1,
      total_inventory_value: stats.totalInventoryValue - 1000,
      total_cost_value: stats.totalCostValue - 800,
    };

    const testSoldItems = [
      { id: products[0]?.id, quantity: 1, name: products[0]?.name || 'Test Product' }
    ];

    console.log('🧪 Sending test inventory update event:', { testSummary, testSoldItems });
    
    window.dispatchEvent(new CustomEvent('inventoryUpdated', {
      detail: { summary: testSummary, soldItems: testSoldItems }
    }));

    setTestEventSent(true);
    setTimeout(() => setTestEventSent(false), 3000);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Test Component</h2>
        
        {/* Test Controls */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Test Controls</h3>
          <div className="flex gap-4">
            <button
              onClick={refetch}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
            <button
              onClick={sendTestInventoryUpdate}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Send Test Update Event
            </button>
          </div>
          {testEventSent && (
            <div className="mt-2 text-sm text-green-600">
              ✅ Test event sent! Check if dashboard updates in real-time.
            </div>
          )}
        </div>

        {/* Current Stats */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Current Dashboard Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Total Products</div>
              <div className="text-2xl font-bold text-blue-600">{stats.totalProducts}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Total Categories</div>
              <div className="text-2xl font-bold text-purple-600">{stats.totalCategories}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Low Stock Items</div>
              <div className="text-2xl font-bold text-orange-600">{stats.lowStockItems}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Inventory Value</div>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalInventoryValue)}</div>
            </div>
          </div>
        </div>

        {/* Status Information */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Status Information</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">Loading:</span>
              <span className={`px-2 py-1 rounded text-sm ${loading ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                {loading ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Error:</span>
              <span className={`px-2 py-1 rounded text-sm ${error ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                {error || 'None'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Products Loaded:</span>
              <span className="px-2 py-1 rounded text-sm bg-blue-100 text-blue-800">
                {products.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Categories Loaded:</span>
              <span className="px-2 py-1 rounded text-sm bg-purple-100 text-purple-800">
                {categories.length}
              </span>
            </div>
          </div>
        </div>

        {/* Raw Data */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Raw Data (for debugging)</h3>
          <div className="bg-gray-100 p-4 rounded-lg">
            <pre className="text-sm overflow-auto">
              {JSON.stringify({ stats, products: products.slice(0, 3), categories: categories.slice(0, 3) }, null, 2)}
            </pre>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Testing Instructions</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-700">
            <li>Click "Refresh Data" to manually fetch latest inventory data</li>
            <li>Click "Send Test Update Event" to simulate a sale and test real-time updates</li>
            <li>Open the Admin Dashboard in another tab to see if it updates automatically</li>
            <li>Check browser console for detailed logging of events and data flow</li>
            <li>Make a real sale in POS to test actual real-time updates</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default DashboardTest;
