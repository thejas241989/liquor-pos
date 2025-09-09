import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';

const ApiDebug: React.FC = () => {
  const [inventoryData, setInventoryData] = useState<any>(null);
  const [productsData, setProductsData] = useState<any>(null);
  const [categoriesData, setCategoriesData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testAPIs = async () => {
      try {
        setLoading(true);
        console.log('🔍 Testing API endpoints...');

        // Test inventory summary
        try {
          const inventoryResponse = await apiService.getInventorySummary();
          console.log('📊 Inventory Summary Response:', inventoryResponse);
          setInventoryData(inventoryResponse);
        } catch (err) {
          console.error('❌ Inventory Summary Error:', err);
          setInventoryData({ error: String(err) });
        }

        // Test products
        try {
          const productsResponse = await apiService.getProducts({ limit: 5 });
          console.log('📦 Products Response:', productsResponse);
          setProductsData(productsResponse);
        } catch (err) {
          console.error('❌ Products Error:', err);
          setProductsData({ error: String(err) });
        }

        // Test categories
        try {
          const categoriesResponse = await apiService.getCategories();
          console.log('🏷️ Categories Response:', categoriesResponse);
          setCategoriesData(categoriesResponse);
        } catch (err) {
          console.error('❌ Categories Error:', err);
          setCategoriesData({ error: String(err) });
        }

      } catch (error) {
        console.error('❌ General API Error:', error);
        setError(String(error));
      } finally {
        setLoading(false);
      }
    };

    testAPIs();
  }, []);

  if (loading) {
    return <div className="p-6">🔄 Testing API endpoints...</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">🔍 API Debug Dashboard</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>General Error:</strong> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory Summary */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">📊 Inventory Summary</h2>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
            {JSON.stringify(inventoryData, null, 2)}
          </pre>
        </div>

        {/* Products */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">📦 Products (First 5)</h2>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
            {JSON.stringify(productsData, null, 2)}
          </pre>
        </div>

        {/* Categories */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">🏷️ Categories</h2>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-96">
            {JSON.stringify(categoriesData, null, 2)}
          </pre>
        </div>
      </div>

      {/* Quick Stats */}
      {inventoryData?.data && (
        <div className="mt-6 bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">📈 Quick Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Total Products</div>
              <div className="text-2xl font-bold text-blue-600">
                {inventoryData.data.total_products || 0}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Categories</div>
              <div className="text-2xl font-bold text-purple-600">
                {inventoryData.data.total_categories || 0}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Inventory Value</div>
              <div className="text-2xl font-bold text-green-600">
                ₹{(inventoryData.data.total_inventory_value || 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Low Stock Items</div>
              <div className="text-2xl font-bold text-red-600">
                {inventoryData.data.low_stock_items || 0}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 text-sm text-gray-600">
        <p>🔗 API Base URL: {window.location.protocol}//{window.location.hostname}:5002/api</p>
        <p>🌐 Current URL: {window.location.href}</p>
        <p>🕒 Last Updated: {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
};

export default ApiDebug;
