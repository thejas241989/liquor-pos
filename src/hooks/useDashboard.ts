import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';

// Custom hook for dashboard data
export const useDashboardData = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalCategories: 0,
    lowStockItems: 0,
    totalInventoryValue: 0,
  });
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [summaryResponse, productsResponse, categoriesResponse] = await Promise.all([
        apiService.getInventorySummary(),
        apiService.getProducts({ limit: 20 }),
        apiService.getCategories(),
      ]);

      // Process summary data
      const summary = summaryResponse.data || summaryResponse;
      setStats({
        totalProducts: summary.total_products || 0,
        totalCategories: summary.total_categories || 0,
        lowStockItems: summary.low_stock_items || 0,
        totalInventoryValue: summary.total_inventory_value || 0,
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
      const detail = e.detail;
      const summary = detail?.summary || detail;
      const soldItems = detail?.soldItems || [];

      if (summary) {
        setStats(prev => ({
          totalProducts: summary.total_products ?? prev.totalProducts,
          totalCategories: summary.total_categories ?? prev.totalCategories,
          lowStockItems: summary.low_stock_items ?? prev.lowStockItems,
          totalInventoryValue: summary.total_inventory_value ?? prev.totalInventoryValue,
        }));
      }

      if (soldItems.length > 0) {
        setProducts(prevProducts =>
          prevProducts.map(product => {
            const soldItem = soldItems.find((item: any) => String(item.id) === String(product.id));
            if (soldItem) {
              return {
                ...product,
                stock: Math.max(0, product.stock - soldItem.quantity),
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
      const response = await apiService.getInventorySummary();
      setSummary(response.data || response);
    } catch (err) {
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
      const detail = e.detail;
      const summary = detail?.summary || detail;
      if (summary) {
        setSummary(summary);
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
