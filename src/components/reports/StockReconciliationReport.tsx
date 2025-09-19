import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Download, FileText, AlertTriangle, CheckCircle, Package, DollarSign } from 'lucide-react';
import { apiService } from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';

interface ReconciliationItem {
  si_no: number;
  product_name: string;
  barcode: string;
  system_stock: number;
  physical_stock: number;
  variance: number;
  variance_value: number;
  cost_per_unit: number;
  reason: string;
  reconciled_at: string;
}

interface ReconciliationSummary {
  reconciliation_id: string;
  reconciliation_date: string;
  status: string;
  total_products: number;
  products_reconciled: number;
  total_variance: number;
  variance_value: number;
  reconciled_by: string;
  approved_by?: string;
  approved_at?: string;
  notes: string;
}

interface StockReconciliationData {
  summary: ReconciliationSummary;
  items: ReconciliationItem[];
}

const StockReconciliationReport: React.FC = () => {
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reconciliationId, setReconciliationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState<StockReconciliationData | null>(null);

  const generateReport = useCallback(async () => {
    if (!reportDate) {
      setError('Please select a date');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const params: any = { date: reportDate };
      if (reconciliationId) {
        params.reconciliation_id = reconciliationId;
      }

      const response = await apiService.requestWithParams('/reports/stock-reconciliation', params);

      if (response.message) {
        setReportData(response.data);
      }
    } catch (error: any) {
      console.error('Error generating report:', error);
      if (error.message?.includes('No reconciliation found')) {
        setError('No reconciliation found for the selected date. Please create a reconciliation first.');
      } else {
        setError('Failed to generate stock reconciliation report');
      }
    } finally {
      setLoading(false);
    }
  }, [reportDate, reconciliationId]);

  const exportToCSV = () => {
    if (!reportData) return;

    const headers = [
      'SI No',
      'Product Name',
      'Barcode',
      'System Stock',
      'Physical Stock',
      'Variance',
      'Variance Value',
      'Cost per Unit',
      'Reason',
      'Reconciled At'
    ];

    const csvContent = [
      headers.join(','),
      ...reportData.items.map(item => [
        item.si_no,
        `"${item.product_name}"`,
        `"${item.barcode}"`,
        item.system_stock,
        item.physical_stock,
        item.variance,
        item.variance_value,
        item.cost_per_unit,
        `"${item.reason}"`,
        new Date(item.reconciled_at).toLocaleString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-reconciliation-${reportDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getVarianceColor = (variance: number) => {
    if (variance === 0) return 'text-green-600';
    if (variance > 0) return 'text-blue-600';
    return 'text-red-600';
  };

  const getVarianceIcon = (variance: number) => {
    if (variance === 0) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (variance > 0) return <AlertTriangle className="w-4 h-4 text-blue-600" />;
    return <AlertTriangle className="w-4 h-4 text-red-600" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    generateReport();
  }, [generateReport]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Stock Reconciliation Report</h1>
          <p className="text-gray-600">Physical stock count reconciliation report with variance analysis</p>
        </div>

        {/* Report Controls */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reconciliation Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reconciliation ID (Optional)
                </label>
                <input
                  type="text"
                  value={reconciliationId}
                  onChange={(e) => setReconciliationId(e.target.value)}
                  placeholder="Enter reconciliation ID"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={generateReport}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
            
            {reportData && (
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Generating stock reconciliation report...</p>
            </div>
          </div>
        )}

        {/* Report Content */}
        {reportData && !loading && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Products</p>
                    <p className="text-2xl font-bold text-gray-900">{reportData.summary.total_products}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Reconciled</p>
                    <p className="text-2xl font-bold text-gray-900">{reportData.summary.products_reconciled}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Variance</p>
                    <p className="text-2xl font-bold text-gray-900">{reportData.summary.total_variance}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Variance Value</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(reportData.summary.variance_value)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Report Header */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Stock Reconciliation Report</h2>
                  <div className="mt-2 space-y-1">
                    <p className="text-gray-600">
                      <span className="font-medium">Reconciliation ID:</span> {reportData.summary.reconciliation_id}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">Date:</span> {new Date(reportData.summary.reconciliation_date).toLocaleDateString()}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">Reconciled By:</span> {reportData.summary.reconciled_by}
                    </p>
                    {reportData.summary.approved_by && (
                      <p className="text-gray-600">
                        <span className="font-medium">Approved By:</span> {reportData.summary.approved_by}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(reportData.summary.status)}`}>
                    {reportData.summary.status.toUpperCase()}
                  </span>
                  <p className="text-sm text-gray-500 mt-2">Generated on</p>
                  <p className="text-sm font-medium text-gray-900">{new Date().toLocaleString()}</p>
                </div>
              </div>
              
              {reportData.summary.notes && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Notes:</span> {reportData.summary.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Reconciliation Items Table */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Reconciliation Items</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SI No
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Barcode
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        System Stock
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Physical Stock
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Variance
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Variance Value
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cost per Unit
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reason
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.items.map((item) => (
                      <tr key={item.si_no} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.si_no}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {item.product_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.barcode}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {item.system_stock}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {item.physical_stock}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center">
                            {getVarianceIcon(item.variance)}
                            <span className={`ml-2 text-sm font-medium ${getVarianceColor(item.variance)}`}>
                              {item.variance > 0 ? `+${item.variance}` : item.variance}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          <span className={`font-medium ${getVarianceColor(item.variance)}`}>
                            {formatCurrency(item.variance_value)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatCurrency(item.cost_per_unit)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {item.reason || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={3} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Total
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                        {reportData.items.reduce((sum, item) => sum + item.system_stock, 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                        {reportData.items.reduce((sum, item) => sum + item.physical_stock, 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                        {reportData.summary.total_variance}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                        {formatCurrency(reportData.summary.variance_value)}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!reportData && !loading && !error && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Report Generated</h3>
              <p className="text-gray-600">Select a date and click "Generate Report" to view stock reconciliation data.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockReconciliationReport;