import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Package, AlertCircle, CheckCircle, X, Search, Edit, Trash2 } from 'lucide-react';
import { apiService } from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import AdminNavigation from '../common/AdminNavigation';

interface Product {
  _id: string;
  name: string;
  barcode: string;
  cost_price: number;
  price: number;
  stock_quantity: number;
  category_id: {
    name: string;
  };
}

interface StockInwardItem {
  product_id: string;
  quantity: number;
  cost_per_unit: number;
  supplier_name?: string;
  invoice_number?: string;
  batch_number?: string;
  expiry_date?: string;
  notes?: string;
}

interface StockInwardRecord {
  _id: string;
  product_id: Product;
  quantity: number;
  cost_per_unit: number;
  total_cost: number;
  supplier_name: string;
  invoice_number: string;
  batch_number: string;
  expiry_date: string;
  notes?: string;
  status: string;
  created_by: {
    username: string;
  };
  created_at: string;
}

const StockInward: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'add' | 'history'>('add');
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form states
  const [items, setItems] = useState<StockInwardItem[]>([]);
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  
  // History states
  const [history, setHistory] = useState<StockInwardRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [currentPage] = useState(1);
  // const [totalPages, setTotalPages] = useState(1); // Removed unused variable
  const [editingRecord, setEditingRecord] = useState<StockInwardRecord | null>(null);
  const [editForm, setEditForm] = useState({
    quantity: 0,
    cost_per_unit: 0,
    supplier_name: '',
    invoice_number: '',
    batch_number: '',
    expiry_date: '',
    notes: ''
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await apiService.getProducts();
      if (response.success) {
        setProducts(response.data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const response = await apiService.requestWithParams('/stock/inward', {
        page: currentPage,
        limit: 20
      });
      if (response.message) {
        setHistory(response.data);
        // setTotalPages(response.pagination?.total_pages || 1); // Removed unused variable
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      setError('Failed to fetch stock inward history');
    } finally {
      setHistoryLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchProducts();
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, currentPage, fetchHistory]);

  useEffect(() => {
    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [products, searchTerm]);

  const addItem = (product: Product) => {
    console.log('➕ Adding product to stock inward:', {
      product_id: product._id,
      product_name: product.name,
      cost_price: product.cost_price
    });
    
    const existingItem = items.find(item => item.product_id === product._id);
    if (existingItem) {
      setItems(items.map(item =>
        item.product_id === product._id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setItems([...items, {
        product_id: product._id,
        quantity: 1,
        cost_per_unit: product.cost_price || 0,
        supplier_name: supplierName,
        invoice_number: invoiceNumber
      }]);
    }
  };

  const updateItem = (productId: string, field: keyof StockInwardItem, value: any) => {
    setItems(items.map(item => {
      if (item.product_id === productId) {
        const updatedItem = { ...item, [field]: value };
        
        // If updating product_id, auto-fetch cost from the new product
        if (field === 'product_id') {
          const product = products.find(p => p._id === value);
          if (product && product.cost_price) {
            updatedItem.cost_per_unit = product.cost_price;
          }
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const removeItem = (productId: string) => {
    setItems(items.filter(item => item.product_id !== productId));
  };

  const startEdit = (record: StockInwardRecord) => {
    setEditingRecord(record);
    
    // Auto-fetch current product cost if available
    const product = products.find(p => p._id === record.product_id._id);
    const currentCost = product?.cost_price || record.cost_per_unit;
    
    setEditForm({
      quantity: record.quantity,
      cost_per_unit: currentCost,
      supplier_name: record.supplier_name || '',
      invoice_number: record.invoice_number || '',
      batch_number: record.batch_number || '',
      expiry_date: record.expiry_date ? record.expiry_date.split('T')[0] : '',
      notes: record.notes || ''
    });
  };

  const cancelEdit = () => {
    setEditingRecord(null);
    setEditForm({
      quantity: 0,
      cost_per_unit: 0,
      supplier_name: '',
      invoice_number: '',
      batch_number: '',
      expiry_date: '',
      notes: ''
    });
  };

  const saveEdit = async () => {
    if (!editingRecord) return;

    try {
      setLoading(true);
      const response = await apiService.request(`/stock/inward/${editingRecord._id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm)
      });

      if (response.message) {
        setSuccess('Stock inward record updated successfully');
        setError('');
        fetchHistory(); // Refresh the history
        cancelEdit();
      } else {
        setError(response.error || 'Failed to update record');
      }
    } catch (error) {
      console.error('Error updating record:', error);
      setError('Failed to update stock inward record');
    } finally {
      setLoading(false);
    }
  };

  const deleteRecord = async (recordId: string) => {
    if (!window.confirm('Are you sure you want to delete this stock inward record? This will also reduce the product stock.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.request(`/stock/inward/${recordId}`, {
        method: 'DELETE'
      });

      if (response.message) {
        setSuccess('Stock inward record deleted successfully');
        setError('');
        fetchHistory(); // Refresh the history
      } else {
        setError(response.error || 'Failed to delete record');
      }
    } catch (error) {
      console.error('Error deleting record:', error);
      setError('Failed to delete stock inward record');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      setError('Please add at least one item');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      console.log('🔄 Submitting stock inward with data:', {
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          cost_per_unit: item.cost_per_unit,
          product_name: products.find(p => p._id === item.product_id)?.name || 'Unknown'
        })),
        supplier_name: supplierName,
        invoice_number: invoiceNumber,
        notes
      });
      
      const response = await apiService.request('/stock/inward/bulk', {
        method: 'POST',
        body: JSON.stringify({
          items,
          supplier_name: supplierName,
          invoice_number: invoiceNumber,
          notes
        })
      });

      console.log('📦 Stock inward response:', response);

      if (response.message) {
        const { failed, summary } = response.data;
        
        if (summary.successful_count > 0) {
          setSuccess(`Stock inward recorded successfully! ${summary.successful_count} items processed.`);
          setItems([]);
          setSupplierName('');
          setInvoiceNumber('');
          setNotes('');
          if (activeTab === 'history') {
            fetchHistory();
          }
        }
        
        if (summary.failed_count > 0) {
          console.log('❌ Failed items:', failed);
          const errorMessages = failed.map((f: any) => f.error).join(', ');
          setError(`Some items failed to process: ${errorMessages}`);
        }
        
        if (summary.successful_count === 0 && summary.failed_count > 0) {
          // All items failed
          const errorMessages = failed.map((f: any) => f.error).join(', ');
          setError(`All items failed to process: ${errorMessages}`);
        }
      } else {
        console.log('❌ No success message in response:', response);
        setError('Failed to record stock inward - no success message');
      }
    } catch (error) {
      console.error('❌ Error submitting stock inward:', error);
      setError('Failed to record stock inward');
    } finally {
      setLoading(false);
    }
  };

  const getTotalCost = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.cost_per_unit), 0);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <AdminNavigation currentPage="inventory" />
      
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Stock Inward Management</h1>
          <p className="text-gray-600">Add new stock and track inventory movements</p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('add')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'add'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Package className="w-4 h-4 inline mr-2" />
                Add Stock
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'history'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Package className="w-4 h-4 inline mr-2" />
                History
              </button>
            </nav>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <p className="text-green-800">{success}</p>
            </div>
          </div>
        )}

        {activeTab === 'add' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Product Selection */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Products</h3>
              
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search products by name or barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Product List */}
              <div className="max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 mt-2">Loading products...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredProducts.map((product) => (
                      <div
                        key={product._id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{product.name}</h4>
                          <p className="text-sm text-gray-600">
                            Barcode: {product.barcode} | 
                            Category: {product.category_id?.name} |
                            Current Stock: {product.stock_quantity}
                          </p>
                          <p className="text-sm text-gray-500">
                            Cost: {formatCurrency(product.cost_price || 0)} | 
                            Price: {formatCurrency(product.price)}
                          </p>
                        </div>
                        <button
                          onClick={() => addItem(product)}
                          className="ml-4 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Selected Items</h3>
              
              {items.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No items selected</p>
                  <p className="text-sm">Select products from the left to add them here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => {
                    const product = products.find(p => p._id === item.product_id);
                    return (
                      <div key={item.product_id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{product?.name}</h4>
                            <p className="text-sm text-gray-600">Barcode: {product?.barcode}</p>
                          </div>
                          <button
                            onClick={() => removeItem(item.product_id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Quantity
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.product_id, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Cost per Unit
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.cost_per_unit}
                                onChange={(e) => updateItem(item.product_id, 'cost_per_unit', parseFloat(e.target.value) || 0)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const product = products.find(p => p._id === item.product_id);
                                  if (product?.cost_price) {
                                    updateItem(item.product_id, 'cost_per_unit', product.cost_price);
                                  }
                                }}
                                className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                title="Fetch current cost from product"
                              >
                                🔄
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Batch Number (Optional)
                          </label>
                          <input
                            type="text"
                            value={item.batch_number || ''}
                            onChange={(e) => updateItem(item.product_id, 'batch_number', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter batch number"
                          />
                        </div>
                        
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Expiry Date (Optional)
                          </label>
                          <input
                            type="date"
                            value={item.expiry_date || ''}
                            onChange={(e) => updateItem(item.product_id, 'expiry_date', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes (Optional)
                          </label>
                          <textarea
                            value={item.notes || ''}
                            onChange={(e) => updateItem(item.product_id, 'notes', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={2}
                            placeholder="Enter any notes"
                          />
                        </div>
                        
                        <div className="mt-3 text-right">
                          <p className="text-sm text-gray-600">
                            Total: {formatCurrency(item.quantity * item.cost_per_unit)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Common Fields */}
                  <div className="border-t pt-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Supplier Name
                        </label>
                        <input
                          type="text"
                          value={supplierName}
                          onChange={(e) => setSupplierName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter supplier name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Invoice Number
                        </label>
                        <input
                          type="text"
                          value={invoiceNumber}
                          onChange={(e) => setInvoiceNumber(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter invoice number"
                        />
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder="Enter any additional notes"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-semibold text-gray-900">
                        Grand Total: {formatCurrency(getTotalCost())}
                      </div>
                      <button
                        onClick={handleSubmit}
                        disabled={loading || items.length === 0}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                      >
                        {loading ? 'Processing...' : 'Record Stock Inward'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Stock Inward History</h3>
            </div>
            
            {historyLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading history...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cost per Unit
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Cost
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Supplier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {history.map((record) => (
                      <tr key={record._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {record.product_id.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {record.product_id.barcode}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(record.cost_per_unit)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(record.total_cost)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.supplier_name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.invoice_number || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(record.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            record.status === 'approved' 
                              ? 'bg-green-100 text-green-800'
                              : record.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => startEdit(record)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Edit record"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteRecord(record._id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Edit Modal */}
        {editingRecord && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Edit Stock Inward Record
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Product
                    </label>
                    <p className="text-sm text-gray-900">{editingRecord.product_id.name}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editForm.quantity}
                      onChange={(e) => setEditForm({...editForm, quantity: parseInt(e.target.value) || 0})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Cost Per Unit
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.cost_per_unit}
                        onChange={(e) => setEditForm({...editForm, cost_per_unit: parseFloat(e.target.value) || 0})}
                        className="mt-1 block flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const product = products.find(p => p._id === editingRecord?.product_id._id);
                          if (product?.cost_price) {
                            setEditForm({...editForm, cost_per_unit: product.cost_price});
                          }
                        }}
                        className="mt-1 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        title="Fetch current cost from product"
                      >
                        🔄
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Supplier Name
                    </label>
                    <input
                      type="text"
                      value={editForm.supplier_name}
                      onChange={(e) => setEditForm({...editForm, supplier_name: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Invoice Number
                    </label>
                    <input
                      type="text"
                      value={editForm.invoice_number}
                      onChange={(e) => setEditForm({...editForm, invoice_number: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Batch Number
                    </label>
                    <input
                      type="text"
                      value={editForm.batch_number}
                      onChange={(e) => setEditForm({...editForm, batch_number: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={editForm.expiry_date}
                      onChange={(e) => setEditForm({...editForm, expiry_date: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Notes
                    </label>
                    <textarea
                      value={editForm.notes}
                      onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                      rows={3}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockInward;
