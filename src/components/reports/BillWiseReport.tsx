import React, { useState, useEffect } from 'react';
import { Calendar, Receipt, CreditCard, Smartphone, Banknote, Download, Search, Filter } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';
import { apiService } from '../../services/api';

interface BillItem {
  _id: string;
  invoice_no: string;
  sale_date: string;
  customer_name?: string;
  customer_phone?: string;
  payment_method: 'cash' | 'upi' | 'credit' | 'mixed';
  payment_status: 'paid' | 'pending' | 'partial';
  payment_details: {
    cash_received?: number;
    change_returned?: number;
    upi_reference?: string;
    credit_customer?: string;
    credit_due_date?: string;
  };
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  items: Array<{
    product_id: {
      _id: string;
      name: string;
      barcode: string;
    };
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  biller_id: {
    _id: string;
    username: string;
  } | null;
}

const BillWiseReport: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [bills, setBills] = useState<BillItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  const fetchBills = async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getReport('bill-wise', { date });
      
      if (response.success) {
        const billsData = response.data?.bills || [];
        setBills(billsData);
      } else {
        setError(response.message || 'Failed to fetch bills');
      }
    } catch (err) {
      setError('Error fetching bills: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      fetchBills(selectedDate);
    }
  }, [selectedDate]);

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <Banknote className="w-4 h-4 text-green-600" />;
      case 'upi':
        return <Smartphone className="w-4 h-4 text-blue-600" />;
      case 'credit':
        return <CreditCard className="w-4 h-4 text-orange-600" />;
      default:
        return <Receipt className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-orange-600 bg-orange-100';
      case 'partial':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredBills = (bills || []).filter(bill => {
    if (!bill) return false;
    
    const matchesSearch = searchTerm === '' || 
      (bill.invoice_no && bill.invoice_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (bill.customer_name && bill.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (bill.customer_phone && bill.customer_phone.includes(searchTerm));
    
    const matchesPayment = paymentFilter === 'all' || bill.payment_method === paymentFilter;
    
    return matchesSearch && matchesPayment;
  });

  const totalAmount = filteredBills.reduce((sum, bill) => sum + (bill?.total_amount || 0), 0);
  const totalBills = filteredBills.length;

  const exportToCSV = () => {
    const csvContent = [
      ['Invoice No', 'Date', 'Customer', 'Phone', 'Payment Method', 'Payment Status', 'Cash Received', 'Change Returned', 'UPI Reference', 'Subtotal', 'Discount', 'Total', 'Items Count', 'Biller', 'Items Details'].join(','),
      ...filteredBills.map(bill => [
        bill?.invoice_no || '',
        bill?.sale_date ? new Date(bill.sale_date).toLocaleDateString() : '',
        bill?.customer_name || '',
        bill?.customer_phone || '',
        bill?.payment_method || '',
        bill?.payment_status || '',
        bill?.payment_details?.cash_received || '',
        bill?.payment_details?.change_returned || '',
        bill?.payment_details?.upi_reference || '',
        bill?.subtotal || 0,
        bill?.discount_amount || 0,
        bill?.total_amount || 0,
        bill?.items?.length || 0,
        bill?.biller_id?.username || 'System',
        bill?.items?.map(item => `${item?.product_id?.name || 'Unknown'} (Qty: ${item?.quantity || 0} @ ${formatCurrency(item?.unit_price || 0)})`).join('; ') || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bill-wise-report-${selectedDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bill-wise Report</h2>
          <p className="text-gray-600">Detailed bill information with payment details</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Search
            </label>
            <input
              type="text"
              placeholder="Invoice, Customer, Phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              Payment Method
            </label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="credit">Credit</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => fetchBills(selectedDate)}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Bills</p>
              <p className="text-2xl font-bold text-gray-900">{totalBills}</p>
            </div>
            <Receipt className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
            </div>
            <Banknote className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Bill</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalBills > 0 ? formatCurrency(totalAmount / totalBills) : formatCurrency(0)}
              </p>
            </div>
            <CreditCard className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading bills...</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => fetchBills(selectedDate)}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="p-6 text-center">
            <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No bills found for the selected date</p>
            <p className="text-sm text-gray-500 mt-2">Date: {selectedDate}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                    Invoice Details
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                    Payment
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">
                    Items
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Biller
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBills.map((bill) => (
                  <tr key={bill?._id || Math.random()} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{bill?.invoice_no || 'N/A'}</div>
                        <div className="text-sm text-gray-500">
                          {bill?.sale_date ? new Date(bill.sale_date).toLocaleString() : 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">
                          {bill?.customer_name || 'Walk-in Customer'}
                        </div>
                        {bill?.customer_phone && (
                          <div className="text-sm text-gray-500">{bill.customer_phone}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getPaymentIcon(bill?.payment_method || 'cash')}
                        <div>
                          <div className="text-sm font-medium text-gray-900 capitalize">
                            {bill?.payment_method || 'N/A'}
                          </div>
                          <div className={`text-xs px-2 py-1 rounded-full inline-block ${getPaymentStatusColor(bill?.payment_status || 'paid')}`}>
                            {bill?.payment_status || 'N/A'}
                          </div>
                          {bill?.payment_method === 'cash' && bill?.payment_details?.cash_received && (
                            <div className="text-xs text-gray-500">
                              Received: {formatCurrency(bill.payment_details.cash_received)}
                              {bill.payment_details.change_returned && bill.payment_details.change_returned > 0 && (
                                <span className="ml-1">Change: {formatCurrency(bill.payment_details.change_returned)}</span>
                              )}
                            </div>
                          )}
                          {bill?.payment_method === 'upi' && bill?.payment_details?.upi_reference && (
                            <div className="text-xs text-gray-500">
                              Ref: {bill.payment_details.upi_reference}
                            </div>
                          )}
                          {bill?.payment_method === 'credit' && bill?.payment_details?.credit_customer && (
                            <div className="text-xs text-gray-500">
                              Customer: {bill.payment_details.credit_customer}
                              {bill.payment_details.credit_due_date && (
                                <div>Due: {new Date(bill.payment_details.credit_due_date).toLocaleDateString()}</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900 mb-2">{bill?.items?.length || 0} items</div>
                      <div className="text-xs text-gray-600 space-y-2">
                        {bill?.items?.map((item, index) => (
                          <div key={index} className="border-l-2 border-blue-200 pl-2">
                            <div className="font-medium text-gray-800">{item?.product_id?.name || 'Unknown'}</div>
                            <div className="flex justify-between text-gray-500 mt-1">
                              <span>Qty: {item?.quantity || 0}</span>
                              <span>@ {formatCurrency(item?.unit_price || 0)}</span>
                            </div>
                            <div className="text-gray-700 font-medium">
                              Total: {formatCurrency(item?.line_total || 0)}
                            </div>
                          </div>
                        )) || <div>No items</div>}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(bill?.total_amount || 0)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Sub: {formatCurrency(bill?.subtotal || 0)}
                        {(bill?.discount_amount || 0) > 0 && ` | Disc: -${formatCurrency(bill.discount_amount)}`}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {bill.biller_id?.username || 'System'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillWiseReport;
