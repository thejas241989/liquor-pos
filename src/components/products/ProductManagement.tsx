import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../layout/Layout';
import { formatCurrency } from '../../utils/formatCurrency';

interface Product {
  id: string;
  name: string;
  category: string;
  category_name: string;
  price: number;
  stock: number;
  stock_quantity: number;
  barcode: string;
  volume: string;
  alcohol_content?: number;
  cost?: number;
  min_stock_level?: number;
  status?: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
}

const ProductManagement: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      // Fetch all products (get all pages)
      let allProducts: any[] = [];
      let currentPage = 1;
      let totalPages = 1;
      
      do {
        const productsResponse = await fetch(`http://localhost:5001/api/products?page=${currentPage}&limit=100`, {
          headers
        });
        
        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          if (productsData.data && Array.isArray(productsData.data)) {
            allProducts = allProducts.concat(productsData.data);
            totalPages = productsData.pagination?.total_pages || 1;
          }
        }
        currentPage++;
      } while (currentPage <= totalPages);
      
      // Fetch categories
      const categoriesResponse = await fetch('http://localhost:5001/api/categories', {
        headers
      });

      if (allProducts.length >= 0 && categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        
        console.log('All products data:', allProducts);
        console.log('Categories data:', categoriesData);
        
        // Map products to correct structure
        const productsList = allProducts.map((product: any) => ({
          ...product,
          category: product.category_name || product.category,
          stock: product.stock_quantity || product.stock || 0
        }));
        
        // Handle categories
        let categoriesList = [];
        if (categoriesData.data && Array.isArray(categoriesData.data)) {
          categoriesList = categoriesData.data;
        } else if (Array.isArray(categoriesData)) {
          categoriesList = categoriesData;
        }
        
        setProducts(productsList);
        setCategories(categoriesList);
      } else {
        console.error('Failed to fetch data - products or categories not returned');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handlers for actions
  const handleAdd = () => {
    // navigate to add product page (implement route if needed)
    navigate('/products/new');
  };

  const handleEdit = (id: any) => {
    navigate(`/products/edit/${id}`);
  };

  const handleDelete = async (id: any) => {
    const confirmed = window.confirm('Are you sure you want to delete this product? This action cannot be undone.');
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`http://localhost:5001/api/products/${id}`, {
        method: 'DELETE',
        headers
      });

      if (res.ok) {
        setProducts(prev => prev.filter(p => p.id !== id));
        alert('Product deleted');
      } else {
        // Test server may not implement DELETE; fallback to optimistic removal
        console.warn('Delete request failed or not implemented on server, removing locally');
        setProducts(prev => prev.filter(p => p.id !== id));
        alert('Product removed locally (server delete not implemented)');
      }
    } catch (error) {
      console.error('Delete error:', error);
      // optimistic removal so UI remains usable in test mode
      setProducts(prev => prev.filter(p => p.id !== id));
      alert('Product removed locally');
    }
  };

  // Filter products based on search term and selected category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.barcode.includes(searchTerm);
    const matchesCategory = selectedCategory === '' || 
                           product.category === selectedCategory || 
                           product.category_name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <Layout title="Product Management">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading products...</div>
        </div>
      </Layout>
    );
  }
  return (
    <Layout title="Product Management">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-700">Products ({filteredProducts.length})</h3>
          <button onClick={handleAdd} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
            Add New Product
          </button>
        </div>
        
        <div className="mb-4 flex gap-4">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        
        {filteredProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Volume
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Barcode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{product.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.volume}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(product.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`font-semibold ${product.stock < 10 ? 'text-red-600' : 'text-green-600'}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.barcode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button onClick={() => handleEdit(product.id)} className="text-indigo-600 hover:text-indigo-900 mr-3">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-900">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <p>No products found</p>
            {searchTerm || selectedCategory ? (
              <p className="text-sm">Try adjusting your search or filter criteria</p>
            ) : (
              <p className="text-sm">Add your first product to get started</p>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProductManagement;
