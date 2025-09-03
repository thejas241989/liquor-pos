import React from 'react';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v || 0);

const DailySalesReport: React.FC<{ data: any }> = ({ data }) => {
  const range = data?.range;

  const source = data?.rows || data?.items || data?.transactions || data?.sales || [];
  const rows = (source as any[]).map((r: any) => {
    const quantity = Number(r.quantity ?? r.qty ?? 0);

    const totalFromServer = r.total_amount ?? r.total;
    const priceFromServer = r.unit_price ?? r.price;

    const computedPrice =
      priceFromServer ??
      (totalFromServer !== undefined ? Number(totalFromServer) / (quantity || 1) : undefined);

    const unitPrice = Number((computedPrice ?? 0) as number);

    const computedTotal = totalFromServer ?? (unitPrice * quantity);
    const totalAmount = Number((computedTotal ?? 0) as number);

    return {
      category: r.category ?? r.category_name ?? 'Unknown',
      product: r.product ?? r.product_name ?? r.name ?? '',
      unitPrice,
      quantity,
      totalAmount,
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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">Daily Sales (Category-wise)</h2>
          {range && (
            <div className="text-sm text-gray-600">
              {range.date ? `Date: ${range.date}` : range.start_date && range.end_date ? `From ${range.start_date} to ${range.end_date}` : null}
            </div>
          )}
        </div>
        <div className="text-sm text-gray-600">
          Total Qty: <span className="font-medium">{totals.quantity}</span>
          <span className="mx-2">|</span>
          Total Amount: <span className="font-medium">{formatCurrency(totals.amount)}</span>
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
            {rows.map((r, idx) => (
              <tr key={`${r.product}-${idx}`} className="border-t">
                <td className="px-4 py-2">{idx + 1}</td>
                <td className="px-4 py-2">{r.category}</td>
                <td className="px-4 py-2">{r.product}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(r.unitPrice)}</td>
                <td className="px-4 py-2 text-right">{r.quantity}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(r.totalAmount)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No records</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t bg-gray-50">
              <td className="px-4 py-2 font-semibold" colSpan={4}>Totals</td>
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
