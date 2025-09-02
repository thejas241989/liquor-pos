import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../layout/Layout';
import { formatCurrency } from '../../utils/formatCurrency';

interface DashboardStats {
  totalProducts: number;
  totalCategories: number;
  lowStockItems: number;
  totalInventoryValue: number;
}

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  barcode: string;
  volume: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalCategories: 0,
    lowStockItems: 0,
    totalInventoryValue: 0
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch products
      const productsResponse = await fetch('http://localhost:5001/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Fetch categories
      const categoriesResponse = await fetch('http://localhost:5001/api/categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (productsResponse.ok && categoriesResponse.ok) {
        const productsData = await productsResponse.json();
        const categoriesData = await categoriesResponse.json();
        
        console.log('Products data:', productsData);
        console.log('Categories data:', categoriesData);
        
        // Ensure we have arrays
        const productsList = Array.isArray(productsData) ? productsData : 
                           (productsData.products && Array.isArray(productsData.products)) ? productsData.products : [];
        const categoriesList = Array.isArray(categoriesData) ? categoriesData : 
                              (categoriesData.categories && Array.isArray(categoriesData.categories)) ? categoriesData.categories : [];
        
        setProducts(productsList);
        setCategories(categoriesList);
        
        // Calculate stats
        const totalProducts = productsList.length;
        const lowStockItems = productsList.filter((p: Product) => p.stock < 10).length;
        const totalInventoryValue = productsList.reduce((sum: number, p: Product) => sum + (p.price * p.stock), 0);
        
        setStats({
          totalProducts,
          totalCategories: categoriesList.length,
          lowStockItems,
          totalInventoryValue
        });
      } else {
        console.error('Failed to fetch data:', {
          productsStatus: productsResponse.status,
          categoriesStatus: categoriesResponse.status
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Admin Dashboard">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading dashboard data...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Admin Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Dashboard Cards */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Total Inventory Value</h3>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(stats.totalInventoryValue)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Products</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.totalProducts}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Low Stock Items</h3>
          <p className="text-3xl font-bold text-orange-600">{stats.lowStockItems}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Categories</h3>
          <p className="text-3xl font-bold text-purple-600">{stats.totalCategories}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
            onClick={() => navigate('/pos')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Start Billing
          </button>
          <button 
            onClick={() => navigate('/products')}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
          >
            Add Product
          </button>
          <button 
            onClick={() => navigate('/inventory')}
            className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors"
          >
            Stock Intake
          </button>
          <button 
            onClick={() => navigate('/reports')}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
          >
            View Reports
          </button>
        </div>
      </div>

      {/* Categories Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Product Categories</h3>
          <div className="space-y-2">
            {Array.isArray(categories) && categories.length > 0 ? (
              <>
                {categories.slice(0, 6).map((category) => (
                  <div key={category.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <span className="font-medium">{category.name}</span>
                    <span className="text-sm text-gray-500">
                      {Array.isArray(products) ? products.filter(p => p.category === category.name).length : 0} items
                    </span>
                  </div>
                ))}
                {categories.length > 6 && (
                  <div className="text-center pt-2">
                    <span className="text-sm text-blue-600">+{categories.length - 6} more categories</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4 text-gray-500">No categories available</div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Recent Products</h3>
          <div className="space-y-2">
            {Array.isArray(products) && products.length > 0 ? (
              <>
                {products.slice(0, 6).map((product) => (
                  <div key={product.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <div>
                      <span className="font-medium block">{product.name}</span>
                      <span className="text-sm text-gray-500">{product.volume} • {product.category}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold block">{formatCurrency(product.price)}</span>
                      <span className={`text-sm ${product.stock < 10 ? 'text-red-500' : 'text-green-500'}`}>
                        Stock: {product.stock}
                      </span>
                    </div>
                  </div>
                ))}
                {products.length > 6 && (
                  <div className="text-center pt-2">
                    <span className="text-sm text-blue-600">+{products.length - 6} more products</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4 text-gray-500">No products available</div>
            )}
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {stats.lowStockItems > 0 && Array.isArray(products) && (
        <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-red-700 mb-4">⚠️ Low Stock Alert</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.filter(p => p.stock < 10).slice(0, 6).map((product) => (
              <div key={product.id} className="bg-white p-3 rounded border border-red-200">
                <div className="font-medium">{product.name}</div>
                <div className="text-sm text-gray-600">{product.volume}</div>
                <div className="text-sm text-red-600 font-semibold">Only {product.stock} left</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AdminDashboard;
