import React from 'react';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v || 0);

interface StockReconciliationItem {
  reconciliationId: string;
  reconciliationDate: string;
  status: 'pending' | 'approved' | 'rejected';
  reconcilerName: string;
  approverName?: string;
  approvedAt?: string;
  productName: string;
  categoryName: string;
  systemStock: number;
  physicalStock: number;
  variance: number;
  unitPrice: number;
  varianceValue: number;
  comments?: string;
}

interface StockReconciliationData {
  reconciliations: StockReconciliationItem[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    limit: number;
  };
  summary: {
    totalReconciliations: number;
    totalVarianceValue: number;
    positiveVariances: number;
    negativeVariances: number;
  };
  filters: {
    startDate: string;
    endDate: string;
    status?: string;
    reconcilierId?: string;
  };
}

const StockReconciliationReport: React.FC<{ data: StockReconciliationData }> = ({ data }) => {
  const { reconciliations, summary, filters, pagination } = data || {};

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status as keyof typeof statusStyles] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getVarianceBadge = (variance: number) => {
    if (variance > 0) {
      return <span className="text-green-600 font-medium">+{variance}</span>;
    } else if (variance < 0) {
      return <span className="text-red-600 font-medium">{variance}</span>;
    } else {
      return <span className="text-gray-600">0</span>;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Stock Reconciliation Report</h2>
          <div className="text-sm text-gray-600">
            Period: {filters?.startDate} to {filters?.endDate}
            {filters?.status && ` | Status: ${filters.status}`}
          </div>
        </div>
        <div className="text-sm text-gray-600">
          Total Reconciliations: <span className="font-medium">{summary?.totalReconciliations || 0}</span>
          <span className="mx-2">|</span>
          Net Variance: <span className="font-medium">{formatCurrency(summary?.totalVarianceValue || 0)}</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-blue-600 text-sm font-medium">Total Reconciliations</div>
          <div className="text-2xl font-bold text-blue-700">{summary?.totalReconciliations || 0}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-green-600 text-sm font-medium">Positive Variances</div>
          <div className="text-2xl font-bold text-green-700">+{summary?.positiveVariances || 0}</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-600 text-sm font-medium">Negative Variances</div>
          <div className="text-2xl font-bold text-red-700">{summary?.negativeVariances || 0}</div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-gray-600 text-sm font-medium">Net Variance Value</div>
          <div className={`text-2xl font-bold ${(summary?.totalVarianceValue || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {formatCurrency(summary?.totalVarianceValue || 0)}
          </div>
        </div>
      </div>

      {/* Reconciliation Table */}
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
                  System Stock
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Physical Stock
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Variance
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Variance Value
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reconciler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reconciliations?.map((item, idx) => (
                <tr key={`${item.reconciliationId}-${item.productName}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(item.reconciliationDate).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                    {item.comments && (
                      <div className="text-xs text-gray-500 truncate max-w-xs" title={item.comments}>
                        {item.comments}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {item.categoryName}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {item.systemStock}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {item.physicalStock}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    {getVarianceBadge(item.variance)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    <span className={item.varianceValue >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(item.varianceValue)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {getStatusBadge(item.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{item.reconcilerName}</div>
                    {item.approverName && (
                      <div className="text-xs text-gray-500">
                        Approved by: {item.approverName}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {(!reconciliations || reconciliations.length === 0) && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    No reconciliation records found for the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
            {summary && (reconciliations?.length || 0) > 0 && (
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                    Net Variance:
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold">
                    {getVarianceBadge(summary.positiveVariances + summary.negativeVariances)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                    {formatCurrency(summary.totalVarianceValue)}
                  </td>
                  <td colSpan={2}></td>
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

export default StockReconciliationReport;
