import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, AlertTriangle, Package, Calendar, FileText, Search } from 'lucide-react';
import { apiService } from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import AdminNavigation from '../common/AdminNavigation';

interface Product {
  _id: string;
  name: string;
  barcode: string;
  cost_price: number;
}

interface ReconciliationItem {
  product_id: Product;
  system_stock: number;
  physical_stock: number;
  variance: number;
  variance_value: number;
  cost_per_unit: number;
  reason: string;
  reconciled_at: string;
}

interface Reconciliation {
  _id: string;
  reconciliation_id: string;
  date: string;
  status: string;
  total_products: number;
  products_reconciled: number;
  total_variance: number;
  variance_value: number;
  reconciled_by: {
    username: string;
  };
  approved_by?: {
    username: string;
  };
  approved_at?: string;
  notes: string;
  reconciliation_items: ReconciliationItem[];
}

const StockReconciliation: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'reconcile' | 'history'>('create');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Create reconciliation states
  const [reconciliationDate, setReconciliationDate] = useState('');
  const [currentReconciliation, setCurrentReconciliation] = useState<Reconciliation | null>(null);
  
  // Reconcile states
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredItems, setFilteredItems] = useState<ReconciliationItem[]>([]);
  
  // History states
  const [history, setHistory] = useState<Reconciliation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [currentPage] = useState(1);

  useEffect(() => {
    if (currentReconciliation) {
      const filtered = currentReconciliation.reconciliation_items.filter(item =>
        item.product_id.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.product_id.barcode.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredItems(filtered);
    }
  }, [currentReconciliation, searchTerm]);

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const response = await apiService.requestWithParams('/stock/reconciliation', {
        page: currentPage,
        limit: 20
      });
      if (response.message) {
        setHistory(response.data);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      setError('Failed to fetch reconciliation history');
    } finally {
      setHistoryLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, currentPage, fetchHistory]);

  const createReconciliation = async () => {
    if (!reconciliationDate) {
      setError('Please select a date for reconciliation');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const response = await apiService.request('/stock/reconciliation/create', {
        method: 'POST',
        body: JSON.stringify({ date: reconciliationDate })
      });

      if (response.message) {
        setCurrentReconciliation(response.data);
        setActiveTab('reconcile');
        setSuccess('Reconciliation created successfully! You can now start reconciling items.');
      }
    } catch (error: any) {
      console.error('Error creating reconciliation:', error);
      if (error.message?.includes('already exists')) {
        setError('A reconciliation already exists for this date. Please select a different date.');
      } else {
        setError('Failed to create reconciliation');
      }
    } finally {
      setLoading(false);
    }
  };

  const updatePhysicalStock = async (productId: string, physicalStock: number, reason: string = '') => {
    if (!currentReconciliation) return;

    try {
      const response = await apiService.request(
        `/stock/reconciliation/${currentReconciliation.reconciliation_id}/product/${productId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ physical_stock: physicalStock, reason })
        }
      );

      if (response.message) {
        // Update local state
        const updatedItems = currentReconciliation.reconciliation_items.map(item =>
          item.product_id._id === productId
            ? {
                ...item,
                physical_stock: physicalStock,
                variance: physicalStock - item.system_stock,
                variance_value: (physicalStock - item.system_stock) * item.cost_per_unit,
                reason,
                reconciled_at: new Date().toISOString()
              }
            : item
        );

        setCurrentReconciliation({
          ...currentReconciliation,
          reconciliation_items: updatedItems,
          products_reconciled: updatedItems.filter(item => item.physical_stock > 0).length
        });

        setSuccess('Physical stock updated successfully');
      }
    } catch (error) {
      console.error('Error updating physical stock:', error);
      setError('Failed to update physical stock');
    }
  };

  const finalizeReconciliation = async () => {
    if (!currentReconciliation) return;

    try {
      setLoading(true);
      setError('');
      
      const response = await apiService.request(
        `/stock/reconciliation/${currentReconciliation.reconciliation_id}/finalize`,
        {
          method: 'PUT',
          body: JSON.stringify({ notes: currentReconciliation.notes })
        }
      );

      if (response.message) {
        setSuccess('Reconciliation finalized successfully!');
        setCurrentReconciliation(null);
        setActiveTab('create');
        setReconciliationDate('');
        fetchHistory();
      }
    } catch (error) {
      console.error('Error finalizing reconciliation:', error);
      setError('Failed to finalize reconciliation');
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <AdminNavigation currentPage="inventory" />
      
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Stock Reconciliation</h1>
          <p className="text-gray-600">Perform physical stock counts and reconcile with system records</p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('create')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'create'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Calendar className="w-4 h-4 inline mr-2" />
                Create
              </button>
              {currentReconciliation && (
                <button
                  onClick={() => setActiveTab('reconcile')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'reconcile'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Package className="w-4 h-4 inline mr-2" />
                  Reconcile
                </button>
              )}
              <button
                onClick={() => setActiveTab('history')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'history'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                History
              </button>
            </nav>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
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

        {activeTab === 'create' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Reconciliation</h3>
            
            <div className="max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reconciliation Date
              </label>
              <input
                type="date"
                value={reconciliationDate}
                onChange={(e) => setReconciliationDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                max={new Date().toISOString().split('T')[0]}
              />
              <p className="text-sm text-gray-500 mt-1">
                Select the date for which you want to perform stock reconciliation
              </p>
            </div>
            
            <div className="mt-6">
              <button
                onClick={createReconciliation}
                disabled={loading || !reconciliationDate}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Creating...' : 'Create Reconciliation'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'reconcile' && currentReconciliation && (
          <div className="space-y-6">
            {/* Reconciliation Summary */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Reconciliation: {currentReconciliation.reconciliation_id}
                </h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  currentReconciliation.status === 'in_progress'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {currentReconciliation.status}
                </span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {currentReconciliation.total_products}
                  </div>
                  <div className="text-sm text-blue-600">Total Products</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {currentReconciliation.products_reconciled}
                  </div>
                  <div className="text-sm text-green-600">Reconciled</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {currentReconciliation.total_variance}
                  </div>
                  <div className="text-sm text-yellow-600">Total Variance</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatCurrency(currentReconciliation.variance_value)}
                  </div>
                  <div className="text-sm text-purple-600">Variance Value</div>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search products by name or barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Reconciliation Items */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Reconciliation Items</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        System Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Physical Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Variance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Variance Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredItems.map((item) => (
                      <tr key={item.product_id._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {item.product_id.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {item.product_id.barcode}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.system_stock}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.physical_stock || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getVarianceIcon(item.variance)}
                            <span className={`ml-2 text-sm font-medium ${getVarianceColor(item.variance)}`}>
                              {item.variance > 0 ? `+${item.variance}` : item.variance}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(item.variance_value)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <button
                            onClick={() => {
                              const physicalStock = prompt(
                                `Enter physical stock count for ${item.product_id.name}:`,
                                item.physical_stock?.toString() || ''
                              );
                              if (physicalStock !== null) {
                                const count = parseInt(physicalStock);
                                if (!isNaN(count) && count >= 0) {
                                  const reason = prompt('Enter reason for variance (optional):') || '';
                                  updatePhysicalStock(item.product_id._id, count, reason);
                                }
                              }
                            }}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Update
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Finalize Button */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Finalize Reconciliation</h3>
                  <p className="text-sm text-gray-600">
                    Once all items are reconciled, you can finalize the reconciliation
                  </p>
                </div>
                <button
                  onClick={finalizeReconciliation}
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Finalizing...' : 'Finalize Reconciliation'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Reconciliation History</h3>
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
                        Reconciliation ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Products
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reconciled
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Variance Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reconciled By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {history.map((reconciliation) => (
                      <tr key={reconciliation._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {reconciliation.reconciliation_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(reconciliation.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            reconciliation.status === 'approved' 
                              ? 'bg-green-100 text-green-800'
                              : reconciliation.status === 'in_progress'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {reconciliation.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {reconciliation.total_products}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {reconciliation.products_reconciled}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(reconciliation.variance_value)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {reconciliation.reconciled_by.username}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StockReconciliation;
