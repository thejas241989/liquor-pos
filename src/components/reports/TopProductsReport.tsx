import React from 'react';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v);

const TopProductsReport: React.FC<{ data: any }> = ({ data }) => {
  const list = data?.topProducts || data?.top_products || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">Top Products</h2>
          <div className="text-sm text-gray-600">Showing top {list.length} products</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left">#</th>
              <th className="px-4 py-2 text-left">Product</th>
              <th className="px-4 py-2 text-right">Quantity Sold</th>
              <th className="px-4 py-2 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p: any, idx: number) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-2">{idx + 1}</td>
                <td className="px-4 py-2">{p.name || p.product_name || 'Unknown'}</td>
                <td className="px-4 py-2 text-right">{p.total_quantity_sold ?? p.quantity ?? 0}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(p.total_revenue ?? p.revenue ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TopProductsReport;
