import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../layout/Layout';
import { formatCurrency } from '../../utils/formatCurrency';

const BillerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    const fetchSummary = async () => {
      try {
        const res = await fetch('/api/inventory/summary');
        const json = await res.json();
        if (mounted && json && json.data) {
          setSummary(json.data);
        }
      } catch (err) {
        console.error('Failed to load inventory summary', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchSummary();
    return () => { mounted = false; };
  }, []);

  return (
    <Layout title="Biller Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Dashboard Cards */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Total Inventory Value</h3>
          <p className="text-3xl font-bold text-green-600">{
            loading ? 'Loading...' : formatCurrency(Number(summary?.total_inventory_value || 0))
          }</p>
          <p className="text-sm text-gray-500">Value of all stocked items</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Total Products</h3>
          <p className="text-3xl font-bold text-blue-600">{loading ? '—' : (summary?.total_products ?? 0)}</p>
          <p className="text-sm text-gray-500">SKUs in inventory</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Low Stock Items</h3>
          <p className="text-3xl font-bold text-purple-600">{loading ? '—' : (summary?.low_stock_items ?? 0)}</p>
          <p className="text-sm text-gray-500">Items at or below minimum level</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={() => navigate('/pos')}
            className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors text-lg font-medium"
          >
            🛒 Start New Sale
          </button>
          <button 
            onClick={() => navigate('/reports')}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
          >
            📊 View My Sales
          </button>
          <button 
            onClick={() => navigate('/products')}
            className="bg-orange-600 text-white px-6 py-3 rounded-md hover:bg-orange-700 transition-colors"
          >
            🔍 Search Products
          </button>
        </div>
      </div>

      {/* Recent Sales */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Recent Sales</h3>
        <div className="text-center text-gray-500 py-8">
          <p>No sales recorded today</p>
          <p className="text-sm">Start your first sale to see data here</p>
        </div>
      </div>
    </Layout>
  );
};

export default BillerDashboard;
