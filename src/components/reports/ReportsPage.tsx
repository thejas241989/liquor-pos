import React from 'react';
import { FileText, Download, TrendingUp, Package, DollarSign, BarChart3 } from 'lucide-react';
import PageHeader from '../common/PageHeader';
import AdminNavigation from '../common/AdminNavigation';

const ReportsPage: React.FC = () => {
  const getHeaderActions = () => (
    <>
      <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
        <Download className="w-4 h-4" />
        Export All
      </button>
      <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
        <BarChart3 className="w-4 h-4" />
        Custom Report
      </button>
    </>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <PageHeader
        title="Business Reports"
        description="View and generate business analytics and reports"
        icon={<FileText className="w-8 h-8 text-orange-600" />}
        actions={getHeaderActions()}
      />

      <AdminNavigation currentPage="reports" />

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {/* Sales Reports */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-8 h-8 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Sales Reports</h3>
          </div>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="font-medium text-gray-900">Daily Sales Report</div>
              <div className="text-sm text-gray-600">View today's sales performance</div>
            </button>
            <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="font-medium text-gray-900">Monthly Sales Summary</div>
              <div className="text-sm text-gray-600">Monthly revenue and trends</div>
            </button>
            <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="font-medium text-gray-900">Top Selling Products</div>
              <div className="text-sm text-gray-600">Best performing items</div>
            </button>
            <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="font-medium text-gray-900">Biller Performance</div>
              <div className="text-sm text-gray-600">Staff sales metrics</div>
            </button>
          </div>
        </div>

        {/* Inventory Reports */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <Package className="w-8 h-8 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Inventory Reports</h3>
          </div>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="font-medium text-gray-900">Current Stock Levels</div>
              <div className="text-sm text-gray-600">Real-time inventory status</div>
            </button>
            <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="font-medium text-gray-900">Low Stock Alert</div>
              <div className="text-sm text-gray-600">Items requiring restock</div>
            </button>
            <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="font-medium text-gray-900">Stock Movement</div>
              <div className="text-sm text-gray-600">Inventory flow analysis</div>
            </button>
            <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="font-medium text-gray-900">Reconciliation Report</div>
              <div className="text-sm text-gray-600">Inventory reconciliation</div>
            </button>
          </div>
        </div>

        {/* Financial Reports */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-8 h-8 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Financial Reports</h3>
          </div>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="font-medium text-gray-900">Revenue Summary</div>
              <div className="text-sm text-gray-600">Income analysis and trends</div>
            </button>
            <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="font-medium text-gray-900">Tax Reports</div>
              <div className="text-sm text-gray-600">Tax calculation and filing</div>
            </button>
            <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="font-medium text-gray-900">Profit Analysis</div>
              <div className="text-sm text-gray-600">P&L statements</div>
            </button>
            <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="font-medium text-gray-900">Payment Methods</div>
              <div className="text-sm text-gray-600">Payment method breakdown</div>
            </button>
          </div>
        </div>

        {/* Analytics */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-8 h-8 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">Analytics</h3>
          </div>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="font-medium text-gray-900">Customer Analytics</div>
              <div className="text-sm text-gray-600">Customer behavior insights</div>
            </button>
            <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="font-medium text-gray-900">Sales Trends</div>
              <div className="text-sm text-gray-600">Historical sales patterns</div>
            </button>
            <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="font-medium text-gray-900">Performance Metrics</div>
              <div className="text-sm text-gray-600">KPI tracking and analysis</div>
            </button>
            <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="font-medium text-gray-900">Seasonal Analysis</div>
              <div className="text-sm text-gray-600">Seasonal trend analysis</div>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Report Generation */}
      <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-6 h-6 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900">Quick Report Generation</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">Select Report Type</option>
              <option value="sales">Sales Report</option>
              <option value="inventory">Inventory Report</option>
              <option value="financial">Financial Report</option>
              <option value="analytics">Analytics Report</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              <BarChart3 className="w-4 h-4" />
              Generate Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
