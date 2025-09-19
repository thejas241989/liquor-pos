import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ShoppingCart, Search, BarChart3, Shield, Package, FileText, Settings } from 'lucide-react';
import PageHeader from '../common/PageHeader';
import AdminNavigation from '../common/AdminNavigation';
import { formatCurrency } from '../../utils/formatCurrency';
import { apiService } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import PaymentModal from './PaymentModal';

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

const POSScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);


  const getHeaderActions = () => {
    const navigationItems = [
      {
        key: 'dashboard',
        icon: BarChart3,
        label: 'Dashboard',
        route: user?.role === 'admin' ? '/admin' : `/${user?.role}`,
        visible: true,
        color: 'bg-blue-600 hover:bg-blue-700'
      },
      {
        key: 'inventory',
        icon: Package,
        label: 'Inventory',
        route: '/inventory',
        visible: ['admin', 'manager', 'stock_reconciler'].includes(user?.role || ''),
        color: 'bg-green-600 hover:bg-green-700'
      },
      {
        key: 'reports',
        icon: FileText,
        label: 'Reports',
        route: '/reports',
        visible: ['admin', 'manager'].includes(user?.role || ''),
        color: 'bg-orange-600 hover:bg-orange-700'
      },
      {
        key: 'users',
        icon: Shield,
        label: 'Users',
        route: '/users',
        visible: user?.role === 'admin',
        color: 'bg-red-600 hover:bg-red-700'
      },
      {
        key: 'products',
        icon: Settings,
        label: 'Products',
        route: '/products',
        visible: ['admin', 'manager'].includes(user?.role || ''),
        color: 'bg-indigo-600 hover:bg-indigo-700'
      }
    ];

    return (
      <>
        {navigationItems.filter(item => item.visible).map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.route)}
              className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors ${item.color}`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </>
    );
  };

  const searchProducts = useCallback(async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // const token = localStorage.getItem('token');
      let searchUrl = 'http://localhost:5002/api/products/test?limit=50';
      
      if (term) {
        searchUrl += `&search=${encodeURIComponent(term)}`;
      }
      
      const response = await fetch(searchUrl, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        let searchResults = data.data || [];
        
        // Map products to correct structure
        const mappedResults = searchResults.map((product: any) => ({
          ...product,
          id: String(product._id || product.id),
          category: product.category_name || product.category || 'Unknown',
          stock: product.stock_quantity || product.stock || 0,
          stock_quantity: product.stock_quantity || product.stock || 0,
          barcode: product.barcode || ''
        }));

        setSearchResults(mappedResults);
        setSelectedIndex(0); // Select first result by default
      } else {
        // Fallback to local search
        const filtered = products.filter(product =>
          product.name.toLowerCase().includes(term.toLowerCase()) ||
          (product.barcode && product.barcode.includes(term)) ||
          (product.brand && product.brand.toLowerCase().includes(term.toLowerCase()))
        );
        setSearchResults(filtered);
        setSelectedIndex(0); // Select first result by default
      }
    } catch (error) {
      console.error('Search error:', error);
      // Fallback to local search
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(term.toLowerCase()) ||
        (product.barcode && product.barcode.includes(term)) ||
        (product.brand && product.brand.toLowerCase().includes(term.toLowerCase()))
      );
      setSearchResults(filtered);
    } finally {
      setIsSearching(false);
    }
  }, [products]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(() => {
      searchProducts(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchProducts]);

  // Ensure search input stays focused
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      // Don't focus search input if payment modal is open
      if (showPaymentModal) {
        return;
      }
      
      // Don't focus search input if clicking on modal elements
      const target = event.target as Element;
      if (target && (target.closest('#payment-modal') || target.closest('.modal'))) {
        return;
      }
      
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    };

    // Focus input when component mounts or when search results change
    if (searchInputRef.current && !showPaymentModal) {
      searchInputRef.current.focus();
    }

    // Add click listener to refocus input
    document.addEventListener('click', handleClick);
    
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [searchResults, showPaymentModal]);

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

            // Categories are not needed for POS functionality

          } catch (categoryError) {
            console.warn('Failed to fetch categories:', categoryError);
            // Categories are not needed for POS functionality

          }
          
          setProducts(mappedProducts);
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

          // Categories are not needed for POS functionality
          setProducts(mappedProducts);
          return;
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
      
      if (allProducts.length > 0) {
        // Map products to correct structure
        const productsList = allProducts.map((product: any) => ({
          ...product,
          id: String(product._id || product.id), // Use _id if available, fallback to id
          category: product.category_name || product.category,
          stock: product.stock_quantity || product.stock || 0,
          barcode: product.barcode || '' // Ensure barcode is always a string
        }));
        
        // Categories are not needed for POS functionality
        
        setProducts(productsList);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectProduct = (product: Product) => {
    addToCart(product);
    setSearchTerm(''); // Clear search after selection
    setSearchResults([]); // Clear search results
    setSelectedIndex(-1); // Reset selection
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {

    switch (e.key) {
      case 'Enter':
        e.preventDefault();

        if (searchResults.length > 0 && selectedIndex >= 0 && selectedIndex < searchResults.length) {
          selectProduct(searchResults[selectedIndex]);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();

        if (searchResults.length > 0) {
          setSelectedIndex(prev => {
            const newIndex = prev < searchResults.length - 1 ? prev + 1 : 0;

            return newIndex;
          });
        }
        break;
      case 'ArrowUp':
        e.preventDefault();

        if (searchResults.length > 0) {
          setSelectedIndex(prev => {
            const newIndex = prev > 0 ? prev - 1 : searchResults.length - 1;

            return newIndex;
          });
        }
        break;
      case 'Escape':
        e.preventDefault();

        setSearchTerm('');
        setSearchResults([]);
        setSelectedIndex(-1);
        break;
    }
  };

  const addToCart = (product: Product) => {

    const availableStock = product.stock_quantity || product.stock || 0;

    if (availableStock <= 0) {

      alert('Product is out of stock!');
      return;
    }

    const existingItem = cart.find(item => item.product.id === product.id);

    if (existingItem) {
      if (existingItem.quantity >= availableStock) {

        alert(`Cannot add more. Only ${availableStock} items available.`);
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
    const total = subtotal;
    return { subtotal, total };
  };

  const completeSale = () => {
    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }
    setShowPaymentModal(true);
  };

  const handlePaymentComplete = async (paymentData: any) => {
    try {
      // Build items payload (use product id and quantity)
      const itemsPayload = cart.map(item => ({ 
        id: item.product.id, // Keep as string for MongoDB ObjectId compatibility
        quantity: item.quantity 
      }));

      console.log('Processing sale with items:', itemsPayload, 'and payment:', paymentData);

      // Try test server format first
      const response = await fetch('http://localhost:5002/api/sales', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          items: itemsPayload,
          payment_method: paymentData.payment_method,
          payment_details: paymentData
        })
      });

      if (response.ok) {
        const result = await response.json();

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

        window.dispatchEvent(new CustomEvent('inventoryUpdated', { 
          detail: { summary, soldItems } 
        }));

        // Show success message based on payment method
        let successMessage = 'Sale completed successfully!';
        if (paymentData.payment_method === 'cash' && paymentData.change_returned > 0) {
          successMessage += ` Change to return: ${formatCurrency(paymentData.change_returned)}`;
        } else if (paymentData.payment_method === 'credit') {
          successMessage += ' Credit sale recorded.';
        } else if (paymentData.payment_method === 'upi') {
          successMessage += ' UPI payment completed.';
        }

        alert(successMessage);
        setShowPaymentModal(false);
        clearCart();
        return;
      }

      // Fallback to apiService if test server format fails
      const result = await apiService.processSale(itemsPayload, paymentData);

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

      window.dispatchEvent(new CustomEvent('inventoryUpdated', { 
        detail: { summary, soldItems } 
      }));

      // Show success message based on payment method
      let successMessage = 'Sale completed successfully!';
      if (paymentData.payment_method === 'cash' && paymentData.change_returned > 0) {
        successMessage += ` Change to return: ${formatCurrency(paymentData.change_returned)}`;
      } else if (paymentData.payment_method === 'credit') {
        successMessage += ' Credit sale recorded.';
      } else if (paymentData.payment_method === 'upi') {
        successMessage += ' UPI payment completed.';
      }

      alert(successMessage);
      setShowPaymentModal(false);
      clearCart();
    } catch (error) {
      console.error('Error completing sale:', error);
      alert('Error completing sale. Please check your connection and try again.');
    }
  };

  const { subtotal, total } = getCartTotals();

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

      <AdminNavigation currentPage="pos" />

      {/* Debug info removed as requested */}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Product Search */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-600" />
                Product Search
              </h3>
              
              {/* Search Input */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search products by name, barcode, or brand..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  autoFocus
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                  {searchResults.map((product, index) => (
                    <div
                      key={product.id}
                      className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                        index === selectedIndex ? 'bg-blue-100 border-blue-300' : ''
                      }`}
                      onClick={() => selectProduct(product)}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-600">{product.volume} • {product.category}</div>
                          <div className="text-sm text-gray-500">
                            Stock: {product.stock_quantity || product.stock || 0}
                            {(product.stock_quantity || product.stock || 0) <= 0 && (
                              <span className="text-red-500 ml-2">• Out of Stock</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">{formatCurrency(product.price)}</div>
                          {index === selectedIndex && (
                            <div className="text-xs text-blue-600">Press Enter to select</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* No Results */}
              {searchTerm && searchResults.length === 0 && !isSearching && (
                <div className="text-center text-gray-500 py-8">
                  <p>No products found for "{searchTerm}"</p>
                  <p className="text-sm">Try a different search term</p>
                </div>
              )}

              {/* Instructions */}
              {!searchTerm && (
                <div className="text-center text-gray-500 py-8">
                  <p className="text-lg font-medium">Search for products to add to cart</p>
                  <p className="text-sm">Type product name, barcode, or brand</p>
                  <div className="text-sm mt-2 space-y-1">
                    <p>• Press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Enter</kbd> to select</p>
                    <p>• Use <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">↑</kbd> <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">↓</kbd> to navigate</p>
                    <p>• Press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Esc</kbd> to clear</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Shopping Cart */}
        <div className="lg:col-span-3">
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

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onComplete={handlePaymentComplete}
        totalAmount={total}
      />
    </div>
  );
};

export default POSScreen;
