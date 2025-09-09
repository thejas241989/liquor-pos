import React from 'react';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v || 0);

interface DayWiseSalesItem {
  date: string;
  productName: string;
  categoryName: string;
  openingStock: number;
  stockInward: number;
  soldQuantity: number;
  closingStock: number;
  averageSellingPrice: number;
  totalSalesValue: number;
}

interface DayWiseSalesData {
  reports: DayWiseSalesItem[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    limit: number;
  };
  summary: {
    totalSoldQuantity: number;
    totalSalesValue: number;
    totalStockInward: number;
  };
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

const DayWiseSalesReport: React.FC<{ data: DayWiseSalesData }> = ({ data }) => {
  const { reports, summary, dateRange, pagination } = data || {};

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Day-Wise Sales Report</h2>
          <div className="text-sm text-gray-600">
            Period: {dateRange?.startDate} to {dateRange?.endDate}
          </div>
        </div>
        <div className="text-sm text-gray-600">
          Total Sold: <span className="font-medium">{summary?.totalSoldQuantity || 0} units</span>
          <span className="mx-2">|</span>
          Total Sales: <span className="font-medium">{formatCurrency(summary?.totalSalesValue || 0)}</span>
          <span className="mx-2">|</span>
          Total Inward: <span className="font-medium">{summary?.totalStockInward || 0} units</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-blue-600 text-sm font-medium">Total Quantity Sold</div>
          <div className="text-2xl font-bold text-blue-700">{summary?.totalSoldQuantity || 0}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-green-600 text-sm font-medium">Total Sales Value</div>
          <div className="text-2xl font-bold text-green-700">{formatCurrency(summary?.totalSalesValue || 0)}</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="text-orange-600 text-sm font-medium">Stock Inward</div>
          <div className="text-2xl font-bold text-orange-700">{summary?.totalStockInward || 0}</div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Opening Stock
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock Inward
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sold Qty
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Closing Stock
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Price
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sales Value
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports?.map((item, idx) => (
                <tr key={`${item.date}-${item.productName}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(item.date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {item.categoryName}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {item.openingStock}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-600 font-medium">
                    +{item.stockInward}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600 font-medium">
                    -{item.soldQuantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 font-medium">
                    {item.closingStock}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {formatCurrency(item.averageSellingPrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                    {formatCurrency(item.totalSalesValue)}
                  </td>
                </tr>
              ))}
              {(!reports || reports.length === 0) && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    No sales records found for the selected date range.
                  </td>
                </tr>
              )}
            </tbody>
            {summary && (reports?.length || 0) > 0 && (
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                    Totals:
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-red-600">
                    -{summary.totalSoldQuantity}
                  </td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                    {formatCurrency(summary.totalSalesValue)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Previous
              </button>
              <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing page <span className="font-medium">{pagination.currentPage}</span> of{' '}
                  <span className="font-medium">{pagination.totalPages}</span> 
                  {' '}({pagination.totalRecords} total records)
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                    Previous
                  </button>
                  <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DayWiseSalesReport;
