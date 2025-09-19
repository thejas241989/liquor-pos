import React, { useState, useEffect, useCallback } from 'react';
import { Download, Calendar, TrendingUp, Package, DollarSign, ChevronDown, ChevronRight, Filter } from 'lucide-react';

interface DayWiseSalesReportData {
  report_date: string;
  start_date?: string;
  end_date?: string;
  is_date_range?: boolean;
  summary: {
    total_categories: number;
    total_products: number;
    total_opening_stock: number;
    total_stock_inward: number;
    total_sold_quantity: number;
    total_closing_stock: number;
    total_sales_amount: number;
    total_stock_value: number;
    total_cost: number;
    total_profit: number;
    overall_profit_margin: number;
  };
  categories: Array<{
    category_name: string;
    category_summary: {
      total_products: number;
      total_opening_stock: number;
      total_stock_inward: number;
      total_sold_quantity: number;
      total_closing_stock: number;
      total_sales_amount: number;
      total_stock_value: number;
      total_cost: number;
      total_profit: number;
      avg_profit_margin: number;
    };
    products: Array<{
      si_no: number;
      product_name: string;
      category_name: string;
      opening_stock: number;
      stock_inward: number;
      sold_quantity: number;
      closing_stock: number;
      total_sales_amount: number;
      stock_value: number;
      cost_price: number;
      retail_price: number;
      profit_per_unit: number;
      profit_margin: number;
      total_cost: number;
      total_profit: number;
    }>;
  }>;
}

const DayWiseSalesReport: React.FC = () => {
  const [reportData, setReportData] = useState<DayWiseSalesReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showAllExpanded, setShowAllExpanded] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [useDateRange, setUseDateRange] = useState(false);

  // Helper functions for category management
  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleAllCategories = () => {
    if (showAllExpanded) {
      setExpandedCategories(new Set());
      setShowAllExpanded(false);
    } else {
      const allCategories = new Set(reportData?.categories.map(cat => cat.category_name) || []);
      setExpandedCategories(allCategories);
      setShowAllExpanded(true);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Filter categories based on search
  const filteredCategories = reportData?.categories.filter(category =>
    category.category_name.toLowerCase().includes(categoryFilter.toLowerCase())
  ) || [];

  const generateReport = useCallback(async () => {
    if (!useDateRange && !reportDate) {
      setError('Please select a date');
      return;
    }
    
    if (useDateRange && (!startDate || !endDate)) {
      setError('Please select both start and end dates');
      return;
    }
    
    if (useDateRange && new Date(startDate) > new Date(endDate)) {
      setError('Start date cannot be after end date');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Build query parameters
      let queryParams = `cache=${Date.now()}`;
      if (useDateRange) {
        queryParams += `&start_date=${startDate}&end_date=${endDate}`;

      } else {
        queryParams += `&date=${reportDate}`;

      }
      
      // Use the authenticated endpoint with proper token
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5002/api/reports/day-wise-sales?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();

      if (data.data) {
        setReportData(data.data);

      } else {
        throw new Error(data.message || 'Failed to fetch report data');
      }
    } catch (err) {
      console.error('❌ Error fetching report:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  }, [reportDate, startDate, endDate, useDateRange]);

  useEffect(() => {
    generateReport();
  }, [generateReport]);

  const exportToCSV = () => {
    if (!reportData) return;

    const csvContent = [
      ['Day-wise Sales Report (Categorized)', reportData.report_date],
      [''],
      ['Overall Summary'],
      ['Total Categories', reportData.summary.total_categories || 0],
      ['Total Products', reportData.summary.total_products || 0],
      ['Total Opening Stock', reportData.summary.total_opening_stock || 0],
      ['Total Stock Inward', reportData.summary.total_stock_inward || 0],
      ['Total Sold Quantity', reportData.summary.total_sold_quantity || 0],
      ['Total Closing Stock', reportData.summary.total_closing_stock || 0],
      ['Total Sales Amount', reportData.summary.total_sales_amount || 0],
      ['Total Stock Value', reportData.summary.total_stock_value || 0],
      ['Total Cost', reportData.summary.total_cost || 0],
      ['Total Profit', reportData.summary.total_profit || 0],
      ['Overall Profit Margin (%)', (reportData.summary.overall_profit_margin || 0).toFixed(2)],
      [''],
      ['Category-wise Summary'],
      ['Category Name', 'Products', 'Opening Stock', 'Stock Inward', 'Sold Quantity', 'Closing Stock', 'Sales Amount', 'Stock Value', 'Total Cost', 'Total Profit', 'Avg Profit Margin (%)'],
      ...reportData.categories.map(category => [
        category.category_name || '',
        category.category_summary.total_products || 0,
        category.category_summary.total_opening_stock || 0,
        category.category_summary.total_stock_inward || 0,
        category.category_summary.total_sold_quantity || 0,
        category.category_summary.total_closing_stock || 0,
        category.category_summary.total_sales_amount || 0,
        category.category_summary.total_stock_value || 0,
        category.category_summary.total_cost || 0,
        category.category_summary.total_profit || 0,
        (category.category_summary.avg_profit_margin || 0).toFixed(2)
      ]),
      [''],
      ['Detailed Product Data'],
      ['SI No', 'Product Name', 'Category', 'Opening Stock', 'Stock Inward', 'Sold Quantity', 'Closing Stock', 'Sales Amount', 'Stock Value', 'Cost Price', 'Retail Price', 'Profit Per Unit', 'Profit Margin (%)', 'Total Cost', 'Total Profit'],
      ...reportData.categories.flatMap(category => 
        category.products.map(product => [
          product.si_no || '',
          product.product_name || '',
          product.category_name || '',
          product.opening_stock || 0,
          product.stock_inward || 0,
          product.sold_quantity || 0,
          product.closing_stock || 0,
          product.total_sales_amount || 0,
          product.stock_value || 0,
          product.cost_price || 0,
          product.retail_price || 0,
          product.profit_per_unit || 0,
          (product.profit_margin || 0).toFixed(2),
          product.total_cost || 0,
          product.total_profit || 0
        ])
      )
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = reportData.is_date_range 
      ? `day-wise-sales-${reportData.start_date}-to-${reportData.end_date}.csv`
      : `day-wise-sales-${reportDate}.csv`;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-blue-600" />
              Day-wise Sales Report
            </h1>
            <p className="text-gray-600 mt-1">Daily stock movements and sales analysis</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Date Range Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useDateRange"
                checked={useDateRange}
                onChange={(e) => setUseDateRange(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="useDateRange" className="text-sm text-gray-700">
                Date Range
              </label>
            </div>

            {!useDateRange ? (
              /* Single Date Selection */
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              /* Date Range Selection */
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            
            <button
              onClick={generateReport}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? 'Loading...' : 'Generate Report'}
            </button>
            
            {reportData && (
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 bg-red-500 rounded-full"></div>
            <span className="text-red-800 font-medium">Error</span>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
          <button
            onClick={generateReport}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading report data...</span>
          </div>
        </div>
      )}

      {/* Report Data */}
      {reportData && !loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Filter className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Categories</p>
                  <p className="text-2xl font-bold text-gray-900">{reportData?.summary.total_categories || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Products</p>
                  <p className="text-2xl font-bold text-gray-900">{reportData?.summary.total_products || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Package className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Stock Inward</p>
                  <p className="text-2xl font-bold text-gray-900">{reportData?.summary.total_stock_inward || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Sales</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(reportData?.summary.total_sales_amount || 0)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Stock Value</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(reportData?.summary.total_stock_value || 0)}</p>
                </div>
              </div>
            </div>

            {/* Cost Analysis Cards */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Cost</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(reportData?.summary.total_cost || 0)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Profit</p>
                  <p className={`text-2xl font-bold ${
                    (reportData?.summary.total_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(reportData?.summary.total_profit || 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Profit Margin</p>
                  <p className={`text-2xl font-bold ${
                    (reportData?.summary.overall_profit_margin || 0) >= 30 ? 'text-green-600' : 
                    (reportData?.summary.overall_profit_margin || 0) >= 15 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {(reportData?.summary.overall_profit_margin || 0).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Category Filter and Controls */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter Categories</label>
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={toggleAllCategories}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2"
                >
                  {showAllExpanded ? 'Collapse All' : 'Expand All'}
                </button>
              </div>
            </div>
          </div>

          {/* Categorized Product Details */}
          <div className="space-y-4">
            {filteredCategories.map((category) => (
              <div key={category.category_name} className="bg-white rounded-lg shadow-sm border border-gray-200">
                {/* Category Header */}
                <div 
                  className="px-6 py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleCategory(category.category_name)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expandedCategories.has(category.category_name) ? (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-500" />
                      )}
                      <h3 className="text-lg font-semibold text-gray-900">{category.category_name}</h3>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                        {category.category_summary.total_products} products
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <div className="text-gray-500">Sales</div>
                        <div className="font-semibold text-green-600">{formatCurrency(category.category_summary.total_sales_amount)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-gray-500">Stock Value</div>
                        <div className="font-semibold text-blue-600">{formatCurrency(category.category_summary.total_stock_value)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Category Summary */}
                {expandedCategories.has(category.category_name) && (
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Opening Stock:</span>
                        <span className="ml-2 font-medium">{category.category_summary.total_opening_stock}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Stock Inward:</span>
                        <span className="ml-2 font-medium">{category.category_summary.total_stock_inward}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Sold Quantity:</span>
                        <span className="ml-2 font-medium text-red-600">{category.category_summary.total_sold_quantity}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Closing Stock:</span>
                        <span className="ml-2 font-medium">{category.category_summary.total_closing_stock}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Products Table */}
                {expandedCategories.has(category.category_name) && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SI No</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opening Stock</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Inward</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sold Quantity</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Closing Stock</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Value</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {category.products.map((product) => (
                          <tr key={product.si_no} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.si_no}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.product_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.opening_stock}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.stock_inward}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.sold_quantity}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.closing_stock}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(product.total_sales_amount)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(product.stock_value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* No Data State */}
      {!reportData && !loading && !error && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Report Data</h3>
            <p className="text-gray-600">Select a date and generate a report to view data.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DayWiseSalesReport;
