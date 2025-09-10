import React, { useState } from 'react';
import { FileText, Download, TrendingUp, Package, DollarSign, BarChart3 } from 'lucide-react';
import PageHeader from '../common/PageHeader';
import AdminNavigation from '../common/AdminNavigation';
import { useNavigate } from 'react-router-dom';

const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const [reportType, setReportType] = useState('');
  const [dateRange, setDateRange] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleGenerateReport = () => {
    if (!reportType) return;
    
    let url = `/reports/${reportType}`;
    const params = new URLSearchParams();
    
    if (dateRange === 'custom' && startDate && endDate) {
      params.set('start_date', startDate);
      params.set('end_date', endDate);
    } else if (dateRange !== 'today') {
      const today = new Date();
      let start: Date;
      
      switch (dateRange) {
        case 'week':
          start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          start = new Date(today.getFullYear(), today.getMonth(), 1);
          break;
        case 'quarter':
          const quarter = Math.floor(today.getMonth() / 3);
          start = new Date(today.getFullYear(), quarter * 3, 1);
          break;
        case 'year':
          start = new Date(today.getFullYear(), 0, 1);
          break;
        default:
          start = today;
      }
      
      params.set('start_date', start.toISOString().split('T')[0]);
      params.set('end_date', today.toISOString().split('T')[0]);
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    navigate(url);
  };
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
            <button onClick={() => navigate('/reports/daily-sales')} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="font-medium text-gray-900">Daily Sales Report</div>
              <div className="text-sm text-gray-600">View today's sales performance</div>
            </button>
            <button onClick={() => navigate('/reports/monthly-sales')} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="font-medium text-gray-900">Monthly Sales Summary</div>
              <div className="text-sm text-gray-600">Monthly revenue and trends</div>
            </button>
            <button onClick={() => navigate('/reports/top-products')} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="font-medium text-gray-900">Top Selling Products</div>
              <div className="text-sm text-gray-600">Best performing items</div>
            </button>
            <button onClick={() => navigate('/reports/biller-performance')} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
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
            <button onClick={() => navigate('/reports/inventory')} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="font-medium text-gray-900">Inventory Report</div>
              <div className="text-sm text-gray-600">Complete stock levels with values</div>
            </button>
            <button onClick={() => navigate('/reports/day-wise-sales')} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="font-medium text-gray-900">Day-Wise Master Report</div>
              <div className="text-sm text-gray-600">Daily stock movements and sales</div>
            </button>
            <button onClick={() => navigate('/reports/stock-reconciliation')} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="font-medium text-gray-900">Stock Reconciliation</div>
              <div className="text-sm text-gray-600">Physical vs system stock variances</div>
            </button>
            <button onClick={() => navigate('/reports/current-stock')} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="font-medium text-gray-900">Current Stock Levels</div>
              <div className="text-sm text-gray-600">Real-time inventory status</div>
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
            <button onClick={() => navigate('/reports/revenue-summary')} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="font-medium text-gray-900">Revenue Summary</div>
              <div className="text-sm text-gray-600">Income analysis and trends</div>
            </button>
            <button onClick={() => navigate('/reports/tax-reports')} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="font-medium text-gray-900">Tax Reports</div>
              <div className="text-sm text-gray-600">Tax calculation and filing</div>
            </button>
            <button onClick={() => navigate('/reports/profit-analysis')} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="font-medium text-gray-900">Profit Analysis</div>
              <div className="text-sm text-gray-600">P&L statements</div>
            </button>
            <button onClick={() => navigate('/reports/payment-methods')} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
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
            <button onClick={() => navigate('/reports/customer-analytics')} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="font-medium text-gray-900">Customer Analytics</div>
              <div className="text-sm text-gray-600">Customer behavior insights</div>
            </button>
            <button onClick={() => navigate('/reports/sales-trends')} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="font-medium text-gray-900">Sales Trends</div>
              <div className="text-sm text-gray-600">Historical sales patterns</div>
            </button>
            <button onClick={() => navigate('/reports/performance-metrics')} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="font-medium text-gray-900">Performance Metrics</div>
              <div className="text-sm text-gray-600">KPI tracking and analysis</div>
            </button>
            <button onClick={() => navigate('/reports/seasonal-analysis')} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
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
            <select 
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Report Type</option>
              <option value="daily-sales">Daily Sales Report</option>
              <option value="monthly-sales">Monthly Sales</option>
              <option value="top-products">Top Products</option>
              <option value="current-stock">Current Stock</option>
              <option value="revenue-summary">Revenue Summary</option>
              <option value="biller-performance">Biller Performance</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          {dateRange === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          )}
          <div className="flex items-end">
            <button 
              onClick={handleGenerateReport}
              disabled={!reportType}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
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
