import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';

// Custom hook for dashboard data
export const useDashboardData = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalCategories: 0,
    lowStockItems: 0,
    totalInventoryValue: 0,
    totalCostValue: 0, // added: cost-based inventory value
  });
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Fetching dashboard data...');

      const [summaryResponse, productsResponse, categoriesResponse] = await Promise.all([
        apiService.getInventorySummary(),
        apiService.getProducts({ limit: 20 }),
        apiService.getCategories(),
      ]);

      console.log('📊 Summary response:', summaryResponse);
      console.log('📦 Products response:', productsResponse);
      console.log('🏷️ Categories response:', categoriesResponse);

      // Process summary data with better error handling
      const summary = summaryResponse.data || summaryResponse;
      console.log('📊 Processing summary data:', summary);
      
      setStats({
        totalProducts: summary.total_products || summary.totalProducts || 0,
        totalCategories: summary.total_categories || summary.totalCategories || 0,
        lowStockItems: summary.low_stock_items || summary.lowStockItems || 0,
        totalInventoryValue: summary.total_inventory_value || summary.totalInventoryValue || 0,
        totalCostValue: summary.total_cost_value || summary.totalCostValue || 0,
      });

      console.log('✅ Dashboard stats updated:', {
        totalProducts: summary.total_products || summary.totalProducts || 0,
        totalCategories: summary.total_categories || summary.totalCategories || 0,
        lowStockItems: summary.low_stock_items || summary.lowStockItems || 0,
        totalInventoryValue: summary.total_inventory_value || summary.totalInventoryValue || 0,
        totalCostValue: summary.total_cost_value || summary.totalCostValue || 0,
      });

      // Process products data
      const productsList = productsResponse.data || [];
      const displayProducts = productsList.map((p: any) => ({
        id: p.id.toString(),
        name: p.name,
        category: p.category_name || 'Unknown',
        price: p.price,
        stock: p.stock_quantity || p.stock || 0,
        barcode: p.barcode,
        volume: p.volume,
      }));
      setProducts(displayProducts);

      // Process categories data
      const categoriesList = categoriesResponse.data || [];
      const displayCategories = categoriesList.map((c: any) => ({
        id: c.id.toString(),
        name: c.name,
        description: c.description || '',
      }));
      setCategories(displayCategories);

    } catch (err) {
      console.error('❌ Dashboard data fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      console.error('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time update handler
  useEffect(() => {
    const handleInventoryUpdate = (e: any) => {
      console.log('🔄 Dashboard received inventory update event:', e.detail);
      const detail = e.detail;
      const summary = detail?.summary || detail;
      const soldItems = detail?.soldItems || [];

      if (summary) {
        console.log('📊 Updating dashboard stats with summary:', summary);
        setStats(prev => ({
          totalProducts: (summary.total_products || summary.totalProducts) ?? prev.totalProducts,
          totalCategories: (summary.total_categories || summary.totalCategories) ?? prev.totalCategories,
          lowStockItems: (summary.low_stock_items || summary.lowStockItems) ?? prev.lowStockItems,
          totalInventoryValue: (summary.total_inventory_value || summary.totalInventoryValue) ?? prev.totalInventoryValue,
          totalCostValue: (summary.total_cost_value || summary.totalCostValue) ?? prev.totalCostValue,
        }));
      }

      if (soldItems.length > 0) {
        console.log('🛒 Updating product stock for sold items:', soldItems);
        setProducts(prevProducts =>
          prevProducts.map(product => {
            const soldItem = soldItems.find((item: any) => String(item.id) === String(product.id));
            if (soldItem) {
              const newStock = Math.max(0, product.stock - soldItem.quantity);
              console.log(`📦 Updated ${product.name} stock: ${product.stock} -> ${newStock}`);
              return {
                ...product,
                stock: newStock,
              };
            }
            return product;
          })
        );
      }
    };

    window.addEventListener('inventoryUpdated', handleInventoryUpdate);
    return () => window.removeEventListener('inventoryUpdated', handleInventoryUpdate);
  }, []);

  return {
    stats,
    products,
    categories,
    loading,
    error,
    refetch: fetchData,
  };
};

// Custom hook for inventory summary (for simpler dashboards)
export const useInventorySummary = () => {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching inventory summary...');
      const response = await apiService.getInventorySummary();
      console.log('📊 Inventory summary response:', response);
      setSummary(response.data || response);
      console.log('✅ Inventory summary updated:', response.data || response);
    } catch (err) {
      console.error('❌ Inventory summary fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch inventory summary');
      console.error('Inventory summary fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Real-time update handler
  useEffect(() => {
    const handleInventoryUpdate = (e: any) => {
      console.log('🔄 Inventory summary received update event:', e.detail);
      const detail = e.detail;
      const summary = detail?.summary || detail;
      if (summary) {
        console.log('📊 Updating inventory summary with:', summary);
        // ensure we include cost value if present
        setSummary((prev: any) => ({ ...(prev || {}), ...summary }));
      }
    };

    window.addEventListener('inventoryUpdated', handleInventoryUpdate);
    return () => window.removeEventListener('inventoryUpdated', handleInventoryUpdate);
  }, []);

  return {
    summary,
    loading,
    error,
    refetch: fetchSummary,
  };
};
