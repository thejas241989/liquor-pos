import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Download, RefreshCw } from 'lucide-react';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v || 0);

interface DailySalesReportData {
  rows: Array<{
    category: string;
    product: string;
    unitPrice: number;
    quantity: number;
    totalAmount: number;
  }>;
  range: {
    date?: string;
    start_date?: string;
    end_date?: string;
  };
  summary: {
    total_quantity: number;
    total_amount: number;
    total_products: number;
    total_categories: number;
  };
}

const DailySalesReport: React.FC<{ data?: any }> = ({ data: initialData }) => {
  const [reportData, setReportData] = useState<DailySalesReportData | null>(initialData || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  
  // Date range state - default to current date
  const [useDateRange, setUseDateRange] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Sales data state - removed unused variable

  const transformSalesData = (salesData: any[], currentUseDateRange: boolean, currentSelectedDate: string, currentStartDate: string, currentEndDate: string) => {
    // Aggregate data by category and product
    const productMap = new Map<string, {
      category: string;
      product: string;
      unitPrice: number;
      quantity: number;
      totalAmount: number;
    }>();

    let totalQuantity = 0;
    let totalAmount = 0;

    salesData.forEach((sale) => {
      sale.items.forEach((item: any) => {
        const product = item.product_id;
        const category = product?.category_id;
        const categoryName = category?.name || 'Unknown';
        const productName = product?.name || 'Unknown Product';
        const unitPrice = product?.price || 0;
        const quantity = item.quantity || 0;
        const lineTotal = item.line_total || 0;

        // Create unique key for category + product combination
        const key = `${categoryName}|${productName}`;

        if (productMap.has(key)) {
          // Update existing entry
          const existing = productMap.get(key)!;
          existing.quantity += quantity;
          existing.totalAmount += lineTotal;
        } else {
          // Create new entry
          productMap.set(key, {
            category: categoryName,
            product: productName,
            unitPrice,
            quantity,
            totalAmount: lineTotal
          });
        }

        totalQuantity += quantity;
        totalAmount += lineTotal;
      });
    });

    // Convert map to array and sort by category, then product
    const aggregatedRows = Array.from(productMap.values()).sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.product.localeCompare(b.product);
    });

    // Get unique categories count
    const uniqueCategories = new Set(aggregatedRows.map(row => row.category)).size;

    return {
      rows: aggregatedRows,
      range: currentUseDateRange ? { start_date: currentStartDate, end_date: currentEndDate } : { date: currentSelectedDate },
      summary: {
        total_quantity: totalQuantity,
        total_amount: totalAmount,
        total_products: aggregatedRows.length,
        total_categories: uniqueCategories
      }
    };
  };

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Fetch raw sales data instead of aggregated report
      let url = 'http://localhost:5002/api/sales?';
      if (useDateRange) {
        url += `start_date=${startDate}&end_date=${endDate}`;
      } else {
        url += `date=${selectedDate}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          // If it's not JSON, use the text as error message
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const responseText = await response.text();

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError);
        console.error('❌ Response Text:', responseText);
        const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parse error';
        throw new Error(`Invalid JSON response: ${errorMessage}. Response: ${responseText.substring(0, 200)}...`);
      }

      if (data.success && data.data) {
        // Transform raw sales data into the expected format
        const transformedData = transformSalesData(data.data, useDateRange, selectedDate, startDate, endDate);
        setReportData(transformedData);
        setSuccess(`Daily sales report generated successfully - ${data.data.length} transactions found`);
      } else {
        throw new Error(data.message || 'Failed to fetch sales data');
      }
    } catch (err) {
      console.error('❌ Error fetching report:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [useDateRange, selectedDate, startDate, endDate]);

  // Auto-fetch on component mount and when date parameters change
  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Use reportData if available, otherwise fall back to initialData
  const data = reportData || initialData;
  const range = data?.range;

  const source = data?.rows || data?.items || data?.transactions || data?.sales || [];
  const rows = (source as any[]).map((r: any) => {
    // API returns data in correct format, but handle fallbacks for compatibility
    const quantity = Number(r.quantity ?? r.qty ?? 0);
    const unitPrice = Number(r.unitPrice ?? r.unit_price ?? r.price ?? 0);
    const totalAmount = Number(r.totalAmount ?? r.total_amount ?? r.total ?? 0);

    return {
      category: r.category ?? r.category_name ?? 'Unknown',
      product: r.product ?? r.product_name ?? r.name ?? '',
      unitPrice,
      quantity,
      totalAmount
    };
  });

  const totals = rows.reduce(
    (acc, r) => {
      acc.quantity += r.quantity || 0;
      acc.amount += r.totalAmount || 0;
      return acc;
    },
    { quantity: 0, amount: 0 }
  );

  const exportToCSV = () => {
    if (rows.length === 0) return;

    const headers = ['SI No', 'Category', 'Product', 'Unit Price', 'Quantity', 'Total Amount'];
    const csvContent = [
      headers.join(','),
      ...rows.map((row, index) => [
        index + 1,
        `"${row.category}"`,
        `"${row.product}"`,
        row.unitPrice,
        row.quantity,
        row.totalAmount
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-sales-report-${useDateRange ? `${startDate}-to-${endDate}` : selectedDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Date Range Controls */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="useDateRange"
              checked={useDateRange}
              onChange={(e) => setUseDateRange(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="useDateRange" className="text-sm font-medium text-gray-700">
              Use Date Range
            </label>
          </div>

          {!useDateRange ? (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <label htmlFor="selectedDate" className="text-sm font-medium text-gray-700">
                Date:
              </label>
              <input
                type="date"
                id="selectedDate"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              />
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <label htmlFor="startDate" className="text-sm font-medium text-gray-700">
                  From:
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="endDate" className="text-sm font-medium text-gray-700">
                  To:
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
          )}

          <button
            onClick={fetchReport}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Generate Report'}
          </button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}
      </div>

      {/* Report Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">Daily Sales Report (Category-wise)</h2>
          {range && (
            <div className="text-sm text-gray-600">
              {range.date ? `Date: ${range.date}` : range.start_date && range.end_date ? `From ${range.start_date} to ${range.end_date}` : null}
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  Total Categories: <span className="font-medium">{data?.summary?.total_categories || 0}</span>
                  <span className="mx-2">|</span>
                  Total Products: <span className="font-medium">{data?.summary?.total_products || 0}</span>
                  <span className="mx-2">|</span>
                  Total Qty: <span className="font-medium">{totals.quantity}</span>
                  <span className="mx-2">|</span>
                  Total Amount: <span className="font-medium">{formatCurrency(totals.amount)}</span>
                </div>
          <button
            onClick={exportToCSV}
            disabled={rows.length === 0}
            className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left">SI No</th>
                    <th className="px-4 py-2 text-left">Category</th>
                    <th className="px-4 py-2 text-left">Product</th>
                    <th className="px-4 py-2 text-right">Unit Price</th>
                    <th className="px-4 py-2 text-right">Quantity</th>
                    <th className="px-4 py-2 text-right">Total Amount</th>
                  </tr>
                </thead>
          <tbody>
            {rows.map((r, idx) => {
              const isFirstInCategory = idx === 0 || rows[idx - 1].category !== r.category;
              
              return (
                <tr 
                  key={`${r.category}-${r.product}-${idx}`} 
                  className={`border-t hover:bg-gray-50 ${isFirstInCategory ? 'border-t-2 border-gray-300 bg-gray-50' : ''}`}
                >
                  <td className="px-4 py-2">{idx + 1}</td>
                  <td className="px-4 py-2 font-medium">{r.category}</td>
                  <td className="px-4 py-2">{r.product}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(r.unitPrice)}</td>
                  <td className="px-4 py-2 text-right">{r.quantity}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatCurrency(r.totalAmount)}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No sales records found</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t bg-gray-50">
              <td className="px-4 py-2 font-semibold" colSpan={3}>Totals</td>
              <td className="px-4 py-2 text-right font-semibold">{totals.quantity}</td>
              <td className="px-4 py-2 text-right font-semibold">{formatCurrency(totals.amount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

    </div>
  );
};

export default DailySalesReport;
