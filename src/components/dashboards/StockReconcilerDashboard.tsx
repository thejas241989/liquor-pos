import React from 'react';
import Layout from '../layout/Layout';

const StockReconcilerDashboard: React.FC = () => {
  return (
    <Layout title="Stock Reconciler Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Dashboard Cards */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Pending Reconciliations</h3>
          <p className="text-3xl font-bold text-orange-600">0</p>
          <p className="text-sm text-gray-500">Items to reconcile</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Completed Today</h3>
          <p className="text-3xl font-bold text-green-600">0</p>
          <p className="text-sm text-gray-500">Reconciliations done</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Discrepancies Found</h3>
          <p className="text-3xl font-bold text-red-600">0</p>
          <p className="text-sm text-gray-500">Items with variance</p>
        </div>
      </div>

      {/* Stock Reconciliation Actions */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Reconciliation Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
            📋 New Reconciliation
          </button>
          <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors">
            ✅ View Pending
          </button>
          <button className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors">
            📊 Reconciliation History
          </button>
          <button className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors">
            🔍 Search Products
          </button>
          <button className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 transition-colors">
            📈 Variance Report
          </button>
          <button className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors">
            🏷️ Barcode Scanner
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Recent Reconciliation Activity</h3>
        <div className="text-center text-gray-500 py-8">
          <p>No reconciliation activities found</p>
          <p className="text-sm">Start reconciling stock to see activity here</p>
        </div>
      </div>
    </Layout>
  );
};

export default StockReconcilerDashboard;
