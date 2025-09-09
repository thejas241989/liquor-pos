import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Search, Filter, Package } from 'lucide-react';
import PageHeader from '../common/PageHeader';
import { formatCurrency } from '../../utils/formatCurrency';
import { apiService } from '../../services/api';

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
  brand?: string;
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

  const filterProducts = useCallback(async () => {
    console.log('Filtering products with search term:', searchTerm, 'category:', selectedCategory);
    
    if (!searchTerm && !selectedCategory) {
      // If no search term or category, show all products
      console.log('No search criteria, showing all products:', products.length);
      setFilteredProducts(products);
      return;
    }

    try {
      // Use backend search when there's a search term or category
      const token = localStorage.getItem('token');
      let searchUrl = 'http://localhost:5002/api/products/test?limit=100';
      
      if (searchTerm) {
        searchUrl += `&search=${encodeURIComponent(searchTerm)}`;
      }
      
      console.log('Making API search request to:', searchUrl);
      
      const response = await fetch(searchUrl, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        let searchResults = data.data || [];
        console.log('Backend search results:', searchResults.length, 'products');
        
        // Map products to correct structure
        searchResults = searchResults.map((product: any) => ({
          ...product,
          id: String(product._id || product.id),
          category: product.category_name || product.category || 'Unknown',
          stock: product.stock_quantity || product.stock || 0,
          stock_quantity: product.stock_quantity || product.stock || 0,
          barcode: product.barcode || ''
        }));

        // Apply category filter locally if needed
        if (selectedCategory) {
          const beforeFilter = searchResults.length;
          searchResults = searchResults.filter((product: any) =>
            product.category === selectedCategory || product.category_name === selectedCategory
          );
          console.log('Category filter applied:', beforeFilter, '->', searchResults.length);
        }

        console.log('Final filtered results:', searchResults.length, 'products');
        setFilteredProducts(searchResults);
      } else {
        console.log('Backend search failed, falling back to local filtering');
        // Fallback to local filtering if backend search fails
        let filtered = products;
        
        if (searchTerm) {
          filtered = filtered.filter(product =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (product.barcode && product.barcode.includes(searchTerm)) ||
            ((product as any).brand && (product as any).brand.toLowerCase().includes(searchTerm.toLowerCase()))
          );
        }
        
        if (selectedCategory) {
          filtered = filtered.filter(product =>
            product.category === selectedCategory || product.category_name === selectedCategory
          );
        }
        
        console.log('Local filter results:', filtered.length, 'products');
        setFilteredProducts(filtered);
      }
    } catch (error) {
      console.error('Search error:', error);
      // Fallback to local filtering
      let filtered = products;
      
      if (searchTerm) {
        filtered = filtered.filter(product =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (product.barcode && product.barcode.includes(searchTerm)) ||
          ((product as any).brand && (product as any).brand.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }
      
      if (selectedCategory) {
        filtered = filtered.filter(product =>
          product.category === selectedCategory || product.category_name === selectedCategory
        );
      }
      
      console.log('Fallback filter results:', filtered.length, 'products');
      setFilteredProducts(filtered);
    }
  }, [products, searchTerm, selectedCategory]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(() => {
      filterProducts();
    }, 300); // Wait 300ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [filterProducts]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Try to fetch from test server first
      try {
        const productsResponse = await fetch('http://localhost:5002/api/products/test', {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          console.log('Products response from test endpoint:', productsData);
          
          // Handle test server response format
          let productsList = [];
          if (productsData.data && Array.isArray(productsData.data)) {
            productsList = productsData.data;
          } else if (Array.isArray(productsData)) {
            productsList = productsData;
          }
          
          console.log('Raw products list:', productsList);
          
          // Map products to correct structure
          const mappedProducts = productsList.map((product: any) => ({
            ...product,
            id: String(product._id || product.id), // Use _id if available, fallback to id
            category: product.category_name || product.category || 'Unknown',
            stock: product.stock_quantity || product.stock || 0,
            stock_quantity: product.stock_quantity || product.stock || 0,
            barcode: product.barcode || '' // Ensure barcode is always a string
          }));
          
          console.log('Mapped products:', mappedProducts);
          console.log('Sample product:', mappedProducts[0]);
          
          // Fetch categories from test endpoint or authenticated endpoint
          try {
            let categoriesResponse = await fetch('http://localhost:5002/api/categories/test', {
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            // If the test endpoint fails, try with authentication
            if (!categoriesResponse.ok) {
              categoriesResponse = await fetch('http://localhost:5002/api/categories', {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
            }

            let categoriesList = [];
            if (categoriesResponse.ok) {
              const categoriesData = await categoriesResponse.json();
              console.log('Categories response:', categoriesData);
              
              if (categoriesData.data && Array.isArray(categoriesData.data)) {
                // Map MongoDB categories to the correct structure
                categoriesList = categoriesData.data.map((cat: any) => ({
                  id: String(cat._id || cat.id),
                  name: cat.name,
                  description: cat.description || ''
                }));
              } else if (Array.isArray(categoriesData)) {
                categoriesList = categoriesData.map((cat: any) => ({
                  id: String(cat._id || cat.id),
                  name: cat.name,
                  description: cat.description || ''
                }));
              }
            }
            
            setCategories(categoriesList);
            console.log('Categories loaded:', categoriesList.length);
          } catch (categoryError) {
            console.warn('Failed to fetch categories:', categoryError);
            // Extract unique categories from products as fallback
            const uniqueCategories = Array.from(new Set(mappedProducts.map((p: any) => p.category)))
              .filter(Boolean)
              .map((name, index) => ({ id: String(index + 1), name: String(name), description: '' }));
            setCategories(uniqueCategories);
            console.log('Using categories from products:', uniqueCategories);
          }
          
          setProducts(mappedProducts);
          setFilteredProducts(mappedProducts);
          setLoading(false);
          return;
        }
      } catch (testError) {
        console.warn('Test endpoint not available, trying authenticated endpoint:', testError);
      }
      
      // Try authenticated endpoint with token
      try {
        const productsResponse = await fetch('http://localhost:5002/api/products', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          console.log('Products response:', productsData);
          
          // Handle test server response format
          let productsList = [];
          if (productsData.data && Array.isArray(productsData.data)) {
            productsList = productsData.data;
          } else if (Array.isArray(productsData)) {
            productsList = productsData;
          }
          
          // Map products to correct structure
          const mappedProducts = productsList.map((product: any) => ({
            ...product,
            id: String(product._id || product.id), // Use _id if available, fallback to id
            category: product.category_name || product.category || 'Unknown',
            stock: product.stock_quantity || product.stock || 0,
            stock_quantity: product.stock_quantity || product.stock || 0,
            barcode: product.barcode || '' // Ensure barcode is always a string
          }));
          
          console.log('Mapped products:', mappedProducts);
          console.log('Sample product:', mappedProducts[0]);
          
          // Fetch categories
          try {
            const categoriesResponse = await fetch('http://localhost:5002/api/categories', {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            let categoriesList = [];
            if (categoriesResponse.ok) {
              const categoriesData = await categoriesResponse.json();
              console.log('Categories response:', categoriesData);
              
              if (categoriesData.data && Array.isArray(categoriesData.data)) {
                categoriesList = categoriesData.data;
              } else if (Array.isArray(categoriesData)) {
                categoriesList = categoriesData;
              }
            }
            
            setProducts(mappedProducts);
            setCategories(categoriesList);
            setFilteredProducts(mappedProducts);
            return;
          } catch (categoryError) {
            console.warn('Failed to fetch categories:', categoryError);
            setProducts(mappedProducts);
            setFilteredProducts(mappedProducts);
            return;
          }
        }
      } catch (testServerError) {
        console.warn('Test server not available, trying paginated API:', testServerError);
      }
      
      // Fallback to paginated API approach
      let allProducts: any[] = [];
      let currentPage = 1;
      let totalPages = 1;
      
      do {
        const productsResponse = await fetch(`http://localhost:5002/api/products?page=${currentPage}&limit=100`, {
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
      const categoriesResponse = await fetch('http://localhost:5002/api/categories', {
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
          id: String(product._id || product.id), // Use _id if available, fallback to id
          category: product.category_name || product.category,
          stock: product.stock_quantity || product.stock || 0,
          barcode: product.barcode || '' // Ensure barcode is always a string
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

  const addToCart = (product: Product) => {
    console.log('Adding product to cart:', product);
    console.log('Current cart:', cart);
    
    const availableStock = product.stock_quantity || product.stock || 0;
    console.log('Available stock:', availableStock);
    
    if (availableStock <= 0) {
      console.log('Product out of stock, showing alert');
      alert('Product is out of stock!');
      return;
    }

    const existingItem = cart.find(item => item.product.id === product.id);
    console.log('Existing item in cart:', existingItem);
    
    if (existingItem) {
      if (existingItem.quantity >= availableStock) {
        console.log('Cannot add more, showing alert');
        alert(`Cannot add more. Only ${availableStock} items available.`);
        return;
      }
      
      console.log('Updating existing item quantity');
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * product.price }
          : item
      ));
    } else {
      console.log('Adding new item to cart');
      setCart([...cart, { 
        product, 
        quantity: 1, 
        subtotal: product.price 
      }]);
    }
    console.log('Cart update completed');
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find(p => p.id === productId);
    const availableStock = product ? (product.stock_quantity || product.stock || 0) : 0;
    
    if (product && quantity > availableStock) {
      alert(`Cannot add more. Only ${availableStock} items available.`);
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

  const completeSale = async () => {
    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }

    const { total } = getCartTotals();
    const saleItems = cart.map(item => `${item.quantity}x ${item.product.name}`).join(', ');

    if (!window.confirm(`Complete sale for ${formatCurrency(total)}?\nItems: ${saleItems}`)) return;

    try {
      // Build items payload (use product id and quantity)
      const itemsPayload = cart.map(item => ({ 
        id: item.product.id, // Keep as string for MongoDB ObjectId compatibility
        quantity: item.quantity 
      }));

      // Try test server format first
      const response = await fetch('http://localhost:5002/api/sales', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items: itemsPayload })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Sale result:', result);
        
        const { soldItems, data } = result;
        const summary = data?.summary;
        
        // Update local products stock based on soldItems from server
        if (soldItems && Array.isArray(soldItems)) {
          const updatedProducts = products.map(p => {
            const sold = soldItems.find((s: any) => String(s.id) === String(p.id));
            if (sold) {
              return { 
                ...p, 
                stock: Math.max(0, (p.stock || 0) - sold.quantity),
                stock_quantity: Math.max(0, (p.stock_quantity || 0) - sold.quantity)
              };
            }
            return p;
          });
          setProducts(updatedProducts);
        }

        // Dispatch event with summary and sold items so dashboards can update
        console.log('📡 Dispatching inventory update event with:', { summary, soldItems });
        window.dispatchEvent(new CustomEvent('inventoryUpdated', { 
          detail: { summary, soldItems } 
        }));

        alert('Sale completed successfully!');
        clearCart();
        return;
      }

      // Fallback to apiService if test server format fails
      const result = await apiService.processSale(itemsPayload);

      if (!result.success) {
        alert(`Failed to complete sale: ${result.error}`);
        return;
      }

      const { soldItems, summary } = result.data;
      
      // Update local products stock based on soldItems from server
      if (soldItems && Array.isArray(soldItems)) {
        const updatedProducts = products.map(p => {
          const sold = soldItems.find((s: any) => String(s.id) === String(p.id));
          if (sold) {
            return { 
              ...p, 
              stock: Math.max(0, (p.stock || 0) - sold.quantity),
              stock_quantity: Math.max(0, (p.stock_quantity || 0) - sold.quantity)
            };
          }
          return p;
        });
        setProducts(updatedProducts);
      }

      // Dispatch event with summary and sold items so dashboards can update
      console.log('📡 Dispatching inventory update event with:', { summary, soldItems });
      window.dispatchEvent(new CustomEvent('inventoryUpdated', { 
        detail: { summary, soldItems } 
      }));

      alert('Sale completed successfully!');
      clearCart();
    } catch (error) {
      console.error('Error completing sale:', error);
      alert('Error completing sale. Please check your connection and try again.');
    }
  };

  const { subtotal, tax, total } = getCartTotals();

  const getHeaderActions = () => (
    <>
      <button 
        onClick={() => {
          // Trigger initialization of products from ProductManagement
          window.dispatchEvent(new CustomEvent('initializeProducts'));
          // Refresh the data after a short delay
          setTimeout(() => {
            fetchData();
          }, 1000);
        }}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Package className="w-4 h-4" />
        Initialize Products
      </button>
      <button 
        onClick={fetchData}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
      >
        <Filter className="w-4 h-4" />
        Refresh
      </button>
      <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
        <Package className="w-4 h-4" />
        Inventory
      </button>
    </>
  );

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <PageHeader
          title="Point of Sale"
          description="Process customer transactions and sales"
          icon={<ShoppingCart className="w-8 h-8 text-green-600" />}
          actions={getHeaderActions()}
        />
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading POS system...</div>
        </div>
      </div>
    );
  }
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <PageHeader
        title="Point of Sale"
        description="Process customer transactions and sales"
        icon={<ShoppingCart className="w-8 h-8 text-green-600" />}
        actions={getHeaderActions()}
      />

      {/* Debug Info (can remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm">
          <strong>Debug:</strong> Products: {products.length}, Filtered: {filteredProducts.length}, Categories: {categories.length}
          {products.length === 0 && (
            <span className="text-red-600 ml-2">- No products loaded. Try "Initialize Products" button.</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Search and Selection */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-600" />
                Product Search
              </h3>
              <div className="flex gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search products by name, barcode, or brand..."
                    value={searchTerm}
                    onChange={(e) => {
                      console.log('Search term changed:', e.target.value);
                      setSearchTerm(e.target.value);
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-green-600" />
                Products ({filteredProducts.length} of {products.length})
              </h3>
            {products.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p className="text-lg font-medium">No products loaded</p>
                <p className="text-sm mb-4">Click "Initialize Products" to load the product catalog</p>
                <button 
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('initializeProducts'));
                    setTimeout(() => fetchData(), 1000);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Initialize Products
                </button>
              </div>
            ) : filteredProducts.length > 0 ? (
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
                      <span className={`text-sm ${(product.stock_quantity || product.stock || 0) < 10 ? 'text-red-500' : 'text-gray-500'}`}>
                        Stock: {product.stock_quantity || product.stock || 0}
                      </span>
                    </div>
                    {(product.stock_quantity || product.stock || 0) <= 0 && (
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
    </div>
  );
};

export default POSScreen;
