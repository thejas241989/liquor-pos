import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import PageHeader from '../common/PageHeader';
import { apiService } from '../../services/api';
import DailySalesReport from './DailySalesReport';
import TopProductsReport from './TopProductsReport';
import InventoryReport from './InventoryReport';
import DayWiseSalesReport from './DayWiseSalesReport';
import StockReconciliationReport from './StockReconciliationReport';
import BillerPerformanceReport from './BillerPerformanceReport';

const ReportDetail: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      // Extract query parameters from URL
      const searchParams = new URLSearchParams(location.search);
      const params: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        params[key] = value;
      });

      const resp = await apiService.getReport(reportId || '', params);
      if (!resp.success) throw new Error(resp.error || 'Failed to load report');
      setData(resp.data || resp);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reportId) fetchReport();
  }, [reportId, location.search]);

  // Auto-refresh for daily sales report every 30 seconds
  useEffect(() => {
    if (reportId === 'daily-sales') {
      const interval = setInterval(() => {
        fetchReport();
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [reportId, location.search]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <PageHeader
        title={`Report: ${reportId}`}
        description={`View generated data for the ${reportId} report`}
      />

      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-gray-600">
            Last updated: {lastRefresh.toLocaleTimeString()}
            {reportId === 'daily-sales' && (
              <span className="ml-2 text-green-600">(Auto-refreshes every 30s)</span>
            )}
          </div>
          <button
            onClick={fetchReport}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        
        {loading && <div>Loading report...</div>}
        {error && <div className="text-red-600">{error}</div>}
        {!loading && !error && (
          <div>
            {reportId === 'daily-sales' && <DailySalesReport data={data} />}
            {reportId === 'top-products' && <TopProductsReport data={data} />}
            {reportId === 'inventory' && <InventoryReport data={data} />}
            {reportId === 'day-wise-sales' && <DayWiseSalesReport data={data} />}
            {reportId === 'stock-reconciliation' && <StockReconciliationReport data={data} />}
            {reportId === 'current-stock' && <InventoryReport data={data} />}
            {reportId === 'biller-performance' && <BillerPerformanceReport data={data} />}
            {reportId === 'monthly-sales' && <DailySalesReport data={data} />}
            {!['daily-sales','inventory','day-wise-sales','stock-reconciliation','current-stock','top-products','biller-performance','monthly-sales'].includes(reportId || '') && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Raw Data</h3>
                <pre className="text-sm whitespace-pre-wrap text-gray-700 bg-white p-4 rounded border overflow-auto max-h-96">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportDetail;
