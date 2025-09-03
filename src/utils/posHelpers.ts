// POS Helper functions
export interface CartItem {
  product: {
    id: string;
    name: string;
    price: number;
    stock: number;
    volume: string;
    category: string;
  };
  quantity: number;
  subtotal: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  volume: string;
  barcode: string;
}

// Calculate cart totals
export const calculateCartTotals = (cart: CartItem[], taxRate: number = 0.1) => {
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  
  return { subtotal, tax, total };
};

// Format cart items for display
export const formatCartSummary = (cart: CartItem[]) => {
  return cart.map(item => `${item.quantity}x ${item.product.name}`).join(', ');
};

// Validate stock availability
export const validateStockAvailability = (cart: CartItem[]): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  cart.forEach(item => {
    if (item.product.stock < item.quantity) {
      errors.push(`Insufficient stock for ${item.product.name}. Available: ${item.product.stock}, Required: ${item.quantity}`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Search products by name or barcode
export const searchProducts = (products: Product[], searchTerm: string): Product[] => {
  if (!searchTerm.trim()) return products;
  
  const term = searchTerm.toLowerCase();
  return products.filter(product => 
    product.name.toLowerCase().includes(term) ||
    product.barcode.includes(searchTerm) ||
    product.category.toLowerCase().includes(term)
  );
};

// Filter products by category
export const filterProductsByCategory = (products: Product[], category: string): Product[] => {
  if (!category) return products;
  return products.filter(product => product.category === category);
};

// Generate receipt data
export const generateReceiptData = (cart: CartItem[], customerInfo?: { name?: string; phone?: string }) => {
  const { subtotal, tax, total } = calculateCartTotals(cart);
  
  return {
    items: cart.map(item => ({
      name: item.product.name,
      volume: item.product.volume,
      quantity: item.quantity,
      unitPrice: item.product.price,
      subtotal: item.subtotal
    })),
    subtotal,
    tax,
    total,
    customer: customerInfo,
    timestamp: new Date().toISOString(),
    itemCount: cart.reduce((sum, item) => sum + item.quantity, 0)
  };
};

// Validate barcode format (basic validation)
export const isValidBarcode = (barcode: string): boolean => {
  // Basic validation - should be alphanumeric and at least 4 characters
  return /^[A-Za-z0-9]{4,}$/.test(barcode);
};

// Check if product is in stock
export const isProductInStock = (product: Product): boolean => {
  return product.stock > 0;
};

// Check if product is low stock (below 10)
export const isProductLowStock = (product: Product): boolean => {
  return product.stock > 0 && product.stock < 10;
};
