import React from 'react';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v || 0);

interface InventoryItem {
  productId: string;
  productName: string;
  categoryName: string;
  currentStock: number;
  unitPrice: number;
  totalValue: number;
  reorderLevel?: number;
  isLowStock: boolean;
  lastUpdated: string;
}

interface InventoryReportData {
  inventory: InventoryItem[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    limit: number;
  };
  summary: {
    totalProducts: number;
    totalStockValue: number;
    lowStockItems: number;
    totalQuantity: number;
  };
  filters: {
    date: string;
    category?: string;
    lowStockThreshold: number;
  };
}

const InventoryReport: React.FC<{ data: InventoryReportData }> = ({ data }) => {
  const { inventory, summary, filters, pagination } = data || {};

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Inventory Report</h2>
          <div className="text-sm text-gray-600">
            Date: {filters?.date} | Low Stock Threshold: {filters?.lowStockThreshold} units
          </div>
        </div>
        <div className="text-sm text-gray-600">
          Total Products: <span className="font-medium">{summary?.totalProducts || 0}</span>
          <span className="mx-2">|</span>
          Total Stock Value: <span className="font-medium">{formatCurrency(summary?.totalStockValue || 0)}</span>
          <span className="mx-2">|</span>
          Low Stock Items: <span className="font-medium text-red-600">{summary?.lowStockItems || 0}</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-blue-600 text-sm font-medium">Total Products</div>
          <div className="text-2xl font-bold text-blue-700">{summary?.totalProducts || 0}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-green-600 text-sm font-medium">Total Stock Value</div>
          <div className="text-2xl font-bold text-green-700">{formatCurrency(summary?.totalStockValue || 0)}</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="text-orange-600 text-sm font-medium">Total Quantity</div>
          <div className="text-2xl font-bold text-orange-700">{summary?.totalQuantity || 0}</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-600 text-sm font-medium">Low Stock Items</div>
          <div className="text-2xl font-bold text-red-700">{summary?.lowStockItems || 0}</div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
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
                  Current Stock
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Price
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Value
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventory?.map((item, idx) => (
                <tr key={item.productId} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                    <div className="text-xs text-gray-500">{item.productId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {item.categoryName}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {item.currentStock}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                    {formatCurrency(item.totalValue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {item.isLowStock ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Low Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        In Stock
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(item.lastUpdated).toLocaleDateString('en-IN')}
                  </td>
                </tr>
              ))}
              {(!inventory || inventory.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No inventory records found for the selected date.
                  </td>
                </tr>
              )}
            </tbody>
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

export default InventoryReport;
