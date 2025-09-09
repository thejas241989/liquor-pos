import React from 'react';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v || 0);

interface BillerPerformanceItem {
  biller_id: string;
  biller_name: string;
  total_sales: number;
  total_amount: number;
  total_items_sold: number;
  average_sale_amount: number;
}

interface BillerPerformanceData {
  billerPerformance: BillerPerformanceItem[];
  dateRange: {
    start_date: string;
    end_date: string;
  };
  summary: {
    total_billers: number;
    total_sales: number;
    total_amount: number;
  };
}

const BillerPerformanceReport: React.FC<{ data: BillerPerformanceData }> = ({ data }) => {
  const { billerPerformance, summary, dateRange } = data || {};

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Biller Performance Report</h2>
          <div className="text-sm text-gray-600">
            Period: {dateRange?.start_date} to {dateRange?.end_date}
          </div>
        </div>
        <div className="text-sm text-gray-600">
          Total Billers: <span className="font-medium">{summary?.total_billers || 0}</span>
          <span className="mx-2">|</span>
          Total Sales: <span className="font-medium">{summary?.total_sales || 0}</span>
          <span className="mx-2">|</span>
          Total Amount: <span className="font-medium">{formatCurrency(summary?.total_amount || 0)}</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-blue-600 text-sm font-medium">Total Billers</div>
          <div className="text-2xl font-bold text-blue-700">{summary?.total_billers || 0}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-green-600 text-sm font-medium">Total Sales</div>
          <div className="text-2xl font-bold text-green-700">{summary?.total_sales || 0}</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-purple-600 text-sm font-medium">Total Revenue</div>
          <div className="text-2xl font-bold text-purple-700">{formatCurrency(summary?.total_amount || 0)}</div>
        </div>
      </div>

      {/* Performance Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Biller Name
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Sales
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items Sold
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Revenue
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Sale Amount
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {billerPerformance?.map((biller, idx) => {
                const maxAmount = Math.max(...(billerPerformance?.map(b => b.total_amount) || [1]));
                const performancePercentage = (biller.total_amount / maxAmount) * 100;
                
                return (
                  <tr key={biller.biller_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        idx === 0 ? 'bg-yellow-100 text-yellow-800' :
                        idx === 1 ? 'bg-gray-100 text-gray-800' :
                        idx === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        #{idx + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{biller.biller_name}</div>
                      <div className="text-xs text-gray-500">{biller.biller_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {biller.total_sales}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {biller.total_items_sold}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                      {formatCurrency(biller.total_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatCurrency(biller.average_sale_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${performancePercentage}%` }}
                          ></div>
                        </div>
                        <span className="ml-2 text-xs text-gray-500">
                          {performancePercentage.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(!billerPerformance || billerPerformance.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No biller performance data found for the selected date range.
                  </td>
                </tr>
              )}
            </tbody>
            {summary && (billerPerformance?.length || 0) > 0 && (
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={2} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                    Totals:
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                    {summary.total_sales}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                    {billerPerformance?.reduce((sum, b) => sum + b.total_items_sold, 0) || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                    {formatCurrency(summary.total_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                    {formatCurrency(summary.total_amount / (summary.total_sales || 1))}
                  </td>
                  <td className="px-6 py-4"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default BillerPerformanceReport;
