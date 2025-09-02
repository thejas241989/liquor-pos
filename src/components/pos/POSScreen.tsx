import React, { useState, useEffect } from 'react';
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
}

interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

interface Category {
  id: string;
  name: string;
  description: string;
}

const POSScreen: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);

  const TAX_RATE = 0.1; // 10% tax

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchTerm, selectedCategory, products]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch all products
      let allProducts: any[] = [];
      let currentPage = 1;
      let totalPages = 1;
      
      do {
        const productsResponse = await fetch(`http://localhost:5001/api/products?page=${currentPage}&limit=100`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
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
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (allProducts.length > 0 && categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        
        // Map products to correct structure
        const productsList = allProducts.map((product: any) => ({
          ...product,
          category: product.category_name || product.category,
          stock: product.stock_quantity || product.stock || 0
        }));
        
        // Handle categories
        const categoriesList = categoriesData.data && Array.isArray(categoriesData.data) 
          ? categoriesData.data 
          : [];
        
        setProducts(productsList);
        setCategories(categoriesList);
        setFilteredProducts(productsList);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;
    
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode.includes(searchTerm)
      );
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(product =>
        product.category === selectedCategory || product.category_name === selectedCategory
      );
    }
    
    setFilteredProducts(filtered);
  };

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert('Product is out of stock!');
      return;
    }

    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        alert(`Cannot add more. Only ${product.stock} items available.`);
        return;
      }
      
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * product.price }
          : item
      ));
    } else {
      setCart([...cart, { 
        product, 
        quantity: 1, 
        subtotal: product.price 
      }]);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find(p => p.id === productId);
    if (product && quantity > product.stock) {
      alert(`Cannot add more. Only ${product.stock} items available.`);
      return;
    }

    setCart(cart.map(item =>
      item.product.id === productId
        ? { ...item, quantity, subtotal: quantity * item.product.price }
        : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const getCartTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const completeSale = () => {
    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }

    const { total } = getCartTotals();
    const saleItems = cart.map(item => `${item.quantity}x ${item.product.name}`).join(', ');
    
    if (window.confirm(`Complete sale for ${formatCurrency(total)}?\nItems: ${saleItems}`)) {
      // Here you would typically send the sale to the backend
      alert('Sale completed successfully!');
      clearCart();
    }
  };

  const { subtotal, tax, total } = getCartTotals();

  if (loading) {
    return (
      <Layout title="Point of Sale">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading POS system...</div>
        </div>
      </Layout>
    );
  }
  return (
    <Layout title="Point of Sale">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Search and Selection */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Product Search</h3>
            <div className="flex gap-4 mb-4">
              <input
                type="text"
                placeholder="Search products by name, barcode, or brand..."
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
            <div className="text-sm text-gray-600 mb-2">
              Found {filteredProducts.length} products
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow mt-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Products</h3>
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => addToCart(product)}
                  >
                    <div className="font-medium text-gray-900 mb-1">{product.name}</div>
                    <div className="text-sm text-gray-600 mb-1">{product.volume} • {product.category}</div>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-green-600">{formatCurrency(product.price)}</span>
                      <span className={`text-sm ${product.stock < 10 ? 'text-red-500' : 'text-gray-500'}`}>
                        Stock: {product.stock}
                      </span>
                    </div>
                    {product.stock <= 0 && (
                      <div className="text-red-500 text-sm font-medium mt-1">Out of Stock</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <p>No products found</p>
                <p className="text-sm">Try adjusting your search criteria</p>
              </div>
            )}
          </div>
        </div>

        {/* Shopping Cart */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow sticky top-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Shopping Cart</h3>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Clear All
                </button>
              )}
            </div>
            
            {cart.length > 0 ? (
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.product.id} className="border-b border-gray-100 pb-3">
                    <div className="font-medium text-gray-900 text-sm">{item.product.name}</div>
                    <div className="text-xs text-gray-600 mb-2">{item.product.volume}</div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="w-6 h-6 bg-gray-200 rounded text-xs hover:bg-gray-300"
                        >
                          -
                        </button>
                        <span className="text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="w-6 h-6 bg-gray-200 rounded text-xs hover:bg-gray-300"
                        >
                          +
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{formatCurrency(item.subtotal)}</div>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8 mb-4">
                <p>Cart is empty</p>
                <p className="text-sm">Click on products to add them</p>
              </div>
            )}
            
            <div className="border-t pt-4">
              <div className="flex justify-between mb-2">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>Tax (10%):</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
            
            <button 
              onClick={completeSale}
              disabled={cart.length === 0}
              className="w-full bg-green-600 text-white px-4 py-3 rounded-md hover:bg-green-700 transition-colors mt-4 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Complete Sale ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default POSScreen;
