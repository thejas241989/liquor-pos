import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Plus, Search, Filter, Edit, Trash2, Tag, BarChart3 } from 'lucide-react';
import PageHeader from '../common/PageHeader';
import AdminNavigation from '../common/AdminNavigation';
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
  volumes?: string[];
}

interface Volume {
  id: string;
  size: string;
  unit: string; // ml, L, oz, etc.
  categoryId?: string;
}

const ProductManagement: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'volumes'>('products');
  
  // Category management states
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  
  // Volume management states
  const [showVolumeForm, setShowVolumeForm] = useState(false);
  const [editingVolume, setEditingVolume] = useState<Volume | null>(null);
  const [volumeForm, setVolumeForm] = useState({ size: '', unit: 'ml', categoryId: '' });

  useEffect(() => {
    fetchData();
    initializeVolumes();
    
    // Listen for product initialization requests from POS
    const handleInitializeProducts = () => {
      if (categories.length === 0) {
        initializeCategories();
      }
      if (products.length === 0) {
        initializeIndianProducts();
      }
    };
    
    window.addEventListener('initializeProducts', handleInitializeProducts);
    
    return () => {
      window.removeEventListener('initializeProducts', handleInitializeProducts);
    };
  }, []);

  // Initialize categories and products after loading is complete
  useEffect(() => {
    if (!loading) {
      if (categories.length === 0) {
        initializeCategories();
      }
      if (products.length === 0) {
        initializeIndianProducts();
      }
    }
  }, [loading, categories.length, products.length]);

  const initializeCategories = () => {
    // Initialize some default categories if none exist
    const defaultCategories: Category[] = [
      { id: '1', name: 'Indian Whisky', description: 'Premium Indian whisky and blended spirits' },
      { id: '2', name: 'Indian Rum', description: 'White, dark, and spiced Indian rum varieties' },
      { id: '3', name: 'Indian Vodka', description: 'Premium Indian vodka brands' },
      { id: '4', name: 'Indian Gin', description: 'Craft Indian gin selection' },
      { id: '5', name: 'Indian Beer', description: 'Local Indian beer collection' },
      { id: '6', name: 'Indian Wine', description: 'Indian red, white, and rosé wine selection' },
      { id: '7', name: 'Feni & Regional', description: 'Traditional Indian spirits like Feni' },
      { id: '8', name: 'Indian Brandy', description: 'Indian brandy and cognac' },
    ];
    
    // Set default categories immediately if none exist
    setCategories(prev => prev.length === 0 ? defaultCategories : prev);
  };

  const initializeVolumes = () => {
    // Initialize some common volumes
    const defaultVolumes: Volume[] = [
      { id: '1', size: '50', unit: 'ml' },
      { id: '2', size: '90', unit: 'ml' },
      { id: '3', size: '180', unit: 'ml' },
      { id: '4', size: '375', unit: 'ml' },
      { id: '5', size: '750', unit: 'ml' },
      { id: '6', size: '1', unit: 'L' },
      { id: '7', size: '330', unit: 'ml' }, // Beer bottles
      { id: '8', size: '650', unit: 'ml' }, // Beer bottles
      { id: '9', size: '500', unit: 'ml' }, // Wine bottles
    ];
    setVolumes(defaultVolumes);
  };

  const initializeIndianProducts = () => {
    // Indian Liquor Products with all volumes
    const volumes = ['50ml', '90ml', '180ml', '375ml', '750ml'];
    const beerVolumes = ['330ml', '650ml'];
    const wineVolumes = ['375ml', '750ml'];
    
    const indianProducts: Product[] = [
      // Indian Whisky
      ...volumes.map((vol, index) => ({
        id: `iw1-${index}-${Date.now()}`,
        name: `Royal Challenge ${vol}`,
        category: 'Indian Whisky',
        category_name: 'Indian Whisky',
        price: vol === '50ml' ? 60 : vol === '90ml' ? 120 : vol === '180ml' ? 240 : vol === '375ml' ? 480 : 960,
        stock: 50,
        stock_quantity: 50,
        barcode: `RC${vol.replace('ml', '')}${index}${Date.now()}`,
        volume: vol,
        alcohol_content: 42.8,
        cost: vol === '50ml' ? 45 : vol === '90ml' ? 90 : vol === '180ml' ? 180 : vol === '375ml' ? 360 : 720,
        min_stock_level: 10,
        status: 'active'
      })),
      
      ...volumes.map((vol, index) => ({
        id: `iw2-${index}-${Date.now()}`,
        name: `Blenders Pride ${vol}`,
        category: 'Indian Whisky',
        category_name: 'Indian Whisky',
        price: vol === '50ml' ? 70 : vol === '90ml' ? 140 : vol === '180ml' ? 280 : vol === '375ml' ? 560 : 1120,
        stock: 50,
        stock_quantity: 50,
        barcode: `BP${vol.replace('ml', '')}${index}${Date.now()}`,
        volume: vol,
        alcohol_content: 42.8,
        cost: vol === '50ml' ? 52 : vol === '90ml' ? 105 : vol === '180ml' ? 210 : vol === '375ml' ? 420 : 840,
        min_stock_level: 10,
        status: 'active'
      })),

      ...volumes.map((vol, index) => ({
        id: `iw3-${index}-${Date.now()}`,
        name: `McDowell's No.1 ${vol}`,
        category: 'Indian Whisky',
        category_name: 'Indian Whisky',
        price: vol === '50ml' ? 55 : vol === '90ml' ? 110 : vol === '180ml' ? 220 : vol === '375ml' ? 440 : 880,
        stock: 50,
        stock_quantity: 50,
        barcode: `MD${vol.replace('ml', '')}${index}${Date.now()}`,
        volume: vol,
        alcohol_content: 42.8,
        cost: vol === '50ml' ? 41 : vol === '90ml' ? 82 : vol === '180ml' ? 165 : vol === '375ml' ? 330 : 660,
        min_stock_level: 10,
        status: 'active'
      })),

      ...volumes.map((vol, index) => ({
        id: `iw4-${index}-${Date.now()}`,
        name: `Imperial Blue ${vol}`,
        category: 'Indian Whisky',
        category_name: 'Indian Whisky',
        price: vol === '50ml' ? 65 : vol === '90ml' ? 130 : vol === '180ml' ? 260 : vol === '375ml' ? 520 : 1040,
        stock: 50,
        stock_quantity: 50,
        barcode: `IB${vol.replace('ml', '')}${index}${Date.now()}`,
        volume: vol,
        alcohol_content: 42.8,
        cost: vol === '50ml' ? 49 : vol === '90ml' ? 98 : vol === '180ml' ? 195 : vol === '375ml' ? 390 : 780,
        min_stock_level: 10,
        status: 'active'
      })),

      // Indian Rum
      ...volumes.map((vol, index) => ({
        id: `ir1-${index}-${Date.now()}`,
        name: `Old Monk ${vol}`,
        category: 'Indian Rum',
        category_name: 'Indian Rum',
        price: vol === '50ml' ? 45 : vol === '90ml' ? 90 : vol === '180ml' ? 180 : vol === '375ml' ? 360 : 720,
        stock: 50,
        stock_quantity: 50,
        barcode: `OM${vol.replace('ml', '')}${index}${Date.now()}`,
        volume: vol,
        alcohol_content: 42.8,
        cost: vol === '50ml' ? 34 : vol === '90ml' ? 68 : vol === '180ml' ? 135 : vol === '375ml' ? 270 : 540,
        min_stock_level: 10,
        status: 'active'
      })),

      ...volumes.map((vol, index) => ({
        id: `ir2-${index}-${Date.now()}`,
        name: `Captain Morgan Rum ${vol}`,
        category: 'Indian Rum',
        category_name: 'Indian Rum',
        price: vol === '50ml' ? 65 : vol === '90ml' ? 130 : vol === '180ml' ? 260 : vol === '375ml' ? 520 : 1040,
        stock: 50,
        stock_quantity: 50,
        barcode: `CMR${vol.replace('ml', '')}${index}${Date.now()}`,
        volume: vol,
        alcohol_content: 37.5,
        cost: vol === '50ml' ? 49 : vol === '90ml' ? 98 : vol === '180ml' ? 195 : vol === '375ml' ? 390 : 780,
        min_stock_level: 10,
        status: 'active'
      })),

      // Indian Vodka
      ...volumes.map((vol, index) => ({
        id: `iv1-${index}-${Date.now()}`,
        name: `Smirnoff Vodka ${vol}`,
        category: 'Indian Vodka',
        category_name: 'Indian Vodka',
        price: vol === '50ml' ? 75 : vol === '90ml' ? 150 : vol === '180ml' ? 300 : vol === '375ml' ? 600 : 1200,
        stock: 50,
        stock_quantity: 50,
        barcode: `SMV${vol.replace('ml', '')}${index}${Date.now()}`,
        volume: vol,
        alcohol_content: 40,
        cost: vol === '50ml' ? 56 : vol === '90ml' ? 112 : vol === '180ml' ? 225 : vol === '375ml' ? 450 : 900,
        min_stock_level: 10,
        status: 'active'
      })),

      ...volumes.map((vol, index) => ({
        id: `iv2-${index}-${Date.now()}`,
        name: `Magic Moments Vodka ${vol}`,
        category: 'Indian Vodka',
        category_name: 'Indian Vodka',
        price: vol === '50ml' ? 50 : vol === '90ml' ? 100 : vol === '180ml' ? 200 : vol === '375ml' ? 400 : 800,
        stock: 50,
        stock_quantity: 50,
        barcode: `MMV${vol.replace('ml', '')}${index}${Date.now()}`,
        volume: vol,
        alcohol_content: 40,
        cost: vol === '50ml' ? 37 : vol === '90ml' ? 75 : vol === '180ml' ? 150 : vol === '375ml' ? 300 : 600,
        min_stock_level: 10,
        status: 'active'
      })),

      // Indian Gin
      ...volumes.map((vol, index) => ({
        id: `ig1-${index}-${Date.now()}`,
        name: `Bombay Sapphire Gin ${vol}`,
        category: 'Indian Gin',
        category_name: 'Indian Gin',
        price: vol === '50ml' ? 80 : vol === '90ml' ? 160 : vol === '180ml' ? 320 : vol === '375ml' ? 640 : 1280,
        stock: 50,
        stock_quantity: 50,
        barcode: `BSG${vol.replace('ml', '')}${index}${Date.now()}`,
        volume: vol,
        alcohol_content: 40,
        cost: vol === '50ml' ? 60 : vol === '90ml' ? 120 : vol === '180ml' ? 240 : vol === '375ml' ? 480 : 960,
        min_stock_level: 10,
        status: 'active'
      })),

      // Indian Beer
      ...beerVolumes.map((vol, index) => ({
        id: `ib1-${index}-${Date.now()}`,
        name: `Kingfisher Beer ${vol}`,
        category: 'Indian Beer',
        category_name: 'Indian Beer',
        price: vol === '330ml' ? 120 : 200,
        stock: 50,
        stock_quantity: 50,
        barcode: `KFB${vol.replace('ml', '')}${index}${Date.now()}`,
        volume: vol,
        alcohol_content: 4.8,
        cost: vol === '330ml' ? 90 : 150,
        min_stock_level: 20,
        status: 'active'
      })),

      ...beerVolumes.map((vol, index) => ({
        id: `ib2-${index}-${Date.now()}`,
        name: `Haywards 5000 Beer ${vol}`,
        category: 'Indian Beer',
        category_name: 'Indian Beer',
        price: vol === '330ml' ? 100 : 170,
        stock: 50,
        stock_quantity: 50,
        barcode: `H5K${vol.replace('ml', '')}${index}${Date.now()}`,
        volume: vol,
        alcohol_content: 7,
        cost: vol === '330ml' ? 75 : 128,
        min_stock_level: 20,
        status: 'active'
      })),

      ...beerVolumes.map((vol, index) => ({
        id: `ib3-${index}-${Date.now()}`,
        name: `Foster's Beer ${vol}`,
        category: 'Indian Beer',
        category_name: 'Indian Beer',
        price: vol === '330ml' ? 110 : 180,
        stock: 50,
        stock_quantity: 50,
        barcode: `FSB${vol.replace('ml', '')}${index}${Date.now()}`,
        volume: vol,
        alcohol_content: 4.8,
        cost: vol === '330ml' ? 82 : 135,
        min_stock_level: 20,
        status: 'active'
      })),

      // Indian Wine
      ...wineVolumes.map((vol, index) => ({
        id: `iw5-${index}-${Date.now()}`,
        name: `Sula Sauvignon Blanc ${vol}`,
        category: 'Indian Wine',
        category_name: 'Indian Wine',
        price: vol === '375ml' ? 450 : 900,
        stock: 50,
        stock_quantity: 50,
        barcode: `SSB${vol.replace('ml', '')}${index}${Date.now()}`,
        volume: vol,
        alcohol_content: 12.5,
        cost: vol === '375ml' ? 338 : 675,
        min_stock_level: 10,
        status: 'active'
      })),

      ...wineVolumes.map((vol, index) => ({
        id: `iw6-${index}-${Date.now()}`,
        name: `Grover Zampa La Reserve ${vol}`,
        category: 'Indian Wine',
        category_name: 'Indian Wine',
        price: vol === '375ml' ? 550 : 1100,
        stock: 50,
        stock_quantity: 50,
        barcode: `GZR${vol.replace('ml', '')}${index}${Date.now()}`,
        volume: vol,
        alcohol_content: 13,
        cost: vol === '375ml' ? 412 : 825,
        min_stock_level: 10,
        status: 'active'
      })),

      // Feni & Regional
      ...volumes.slice(0, 3).map((vol, index) => ({
        id: `fr1-${index}-${Date.now()}`,
        name: `Cashew Feni ${vol}`,
        category: 'Feni & Regional',
        category_name: 'Feni & Regional',
        price: vol === '50ml' ? 40 : vol === '90ml' ? 80 : 160,
        stock: 50,
        stock_quantity: 50,
        barcode: `CF${vol.replace('ml', '')}${index}${Date.now()}`,
        volume: vol,
        alcohol_content: 43,
        cost: vol === '50ml' ? 30 : vol === '90ml' ? 60 : 120,
        min_stock_level: 5,
        status: 'active'
      })),

      ...volumes.slice(0, 3).map((vol, index) => ({
        id: `fr2-${index}-${Date.now()}`,
        name: `Mahua ${vol}`,
        category: 'Feni & Regional',
        category_name: 'Feni & Regional',
        price: vol === '50ml' ? 35 : vol === '90ml' ? 70 : 140,
        stock: 50,
        stock_quantity: 50,
        barcode: `MH${vol.replace('ml', '')}${index}${Date.now()}`,
        volume: vol,
        alcohol_content: 40,
        cost: vol === '50ml' ? 26 : vol === '90ml' ? 52 : 105,
        min_stock_level: 5,
        status: 'active'
      })),

      // Indian Brandy
      ...volumes.map((vol, index) => ({
        id: `ib4-${index}-${Date.now()}`,
        name: `Mansion House Brandy ${vol}`,
        category: 'Indian Brandy',
        category_name: 'Indian Brandy',
        price: vol === '50ml' ? 50 : vol === '90ml' ? 100 : vol === '180ml' ? 200 : vol === '375ml' ? 400 : 800,
        stock: 50,
        stock_quantity: 50,
        barcode: `MHB${vol.replace('ml', '')}${index}${Date.now()}`,
        volume: vol,
        alcohol_content: 42.8,
        cost: vol === '50ml' ? 37 : vol === '90ml' ? 75 : vol === '180ml' ? 150 : vol === '375ml' ? 300 : 600,
        min_stock_level: 10,
        status: 'active'
      })),

      ...volumes.map((vol, index) => ({
        id: `ib5-${index}-${Date.now()}`,
        name: `Honey Bee Brandy ${vol}`,
        category: 'Indian Brandy',
        category_name: 'Indian Brandy',
        price: vol === '50ml' ? 45 : vol === '90ml' ? 90 : vol === '180ml' ? 180 : vol === '375ml' ? 360 : 720,
        stock: 50,
        stock_quantity: 50,
        barcode: `HBB${vol.replace('ml', '')}${index}${Date.now()}`,
        volume: vol,
        alcohol_content: 42.8,
        cost: vol === '50ml' ? 34 : vol === '90ml' ? 68 : vol === '180ml' ? 135 : vol === '375ml' ? 270 : 540,
        min_stock_level: 10,
        status: 'active'
      }))
    ];

    // Add products to existing list
    setProducts(prev => [...prev, ...indianProducts]);
  };

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
      
      // Fetch categories - with fallback
      let categoriesList = [];
      try {
        const categoriesResponse = await fetch('http://localhost:5001/api/categories', {
          headers
        });

        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          
          console.log('Categories data from API:', categoriesData);
          
          // Handle categories
          if (categoriesData.data && Array.isArray(categoriesData.data)) {
            categoriesList = categoriesData.data;
          } else if (Array.isArray(categoriesData)) {
            categoriesList = categoriesData;
          }
        }
      } catch (categoryError) {
        console.warn('Failed to fetch categories from API:', categoryError);
      }

      // Map products to correct structure
      const productsList = allProducts.map((product: any) => ({
        ...product,
        category: product.category_name || product.category,
        stock: product.stock_quantity || product.stock || 0
      }));
      
      setProducts(productsList);
      setCategories(categoriesList);
      
      console.log('All products data:', allProducts);
      console.log('Categories loaded:', categoriesList);
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
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

  // Category Management Functions
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Try API first, fallback to local storage
      try {
        const method = editingCategory ? 'PUT' : 'POST';
        const url = editingCategory 
          ? `http://localhost:5001/api/categories/${editingCategory.id}`
          : 'http://localhost:5001/api/categories';

        const response = await fetch(url, {
          method,
          headers,
          body: JSON.stringify(categoryForm)
        });

        if (response.ok) {
          const savedCategory = await response.json();
          if (editingCategory) {
            setCategories(prev => prev.map(cat => 
              cat.id === editingCategory.id ? { ...savedCategory.data || savedCategory } : cat
            ));
          } else {
            setCategories(prev => [...prev, savedCategory.data || savedCategory]);
          }
          resetCategoryForm();
          alert(editingCategory ? 'Category updated successfully' : 'Category created successfully');
          return;
        }
      } catch (apiError) {
        console.warn('API not available, using local storage:', apiError);
      }

      // Fallback to local management
      const newCategory = {
        id: editingCategory?.id || Date.now().toString(),
        name: categoryForm.name,
        description: categoryForm.description
      };

      if (editingCategory) {
        setCategories(prev => prev.map(cat => 
          cat.id === editingCategory.id ? newCategory : cat
        ));
      } else {
        setCategories(prev => [...prev, newCategory]);
      }
      
      resetCategoryForm();
      alert(editingCategory ? 'Category updated successfully (local)' : 'Category created successfully (local)');
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Error saving category');
    }
  };

  const handleCategoryEdit = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({ name: category.name, description: category.description });
    setShowCategoryForm(true);
  };

  const handleCategoryDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Try API first, fallback to local storage
      try {
        const response = await fetch(`http://localhost:5001/api/categories/${id}`, {
          method: 'DELETE',
          headers
        });

        if (response.ok) {
          setCategories(prev => prev.filter(cat => cat.id !== id));
          alert('Category deleted successfully');
          return;
        }
      } catch (apiError) {
        console.warn('API not available, using local deletion:', apiError);
      }

      // Fallback to local deletion
      setCategories(prev => prev.filter(cat => cat.id !== id));
      alert('Category deleted successfully (local)');
    } catch (error) {
      console.error('Error deleting category:', error);
      setCategories(prev => prev.filter(cat => cat.id !== id));
      alert('Category removed locally');
    }
  };

  const resetCategoryForm = () => {
    setCategoryForm({ name: '', description: '' });
    setEditingCategory(null);
    setShowCategoryForm(false);
  };

  // Volume Management Functions
  const handleVolumeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newVolume = {
        id: editingVolume?.id || Date.now().toString(),
        size: volumeForm.size,
        unit: volumeForm.unit,
        categoryId: volumeForm.categoryId
      };

      if (editingVolume) {
        setVolumes(prev => prev.map(vol => 
          vol.id === editingVolume.id ? newVolume : vol
        ));
      } else {
        setVolumes(prev => [...prev, newVolume]);
      }
      
      resetVolumeForm();
      alert(editingVolume ? 'Volume updated successfully' : 'Volume created successfully');
    } catch (error) {
      console.error('Error saving volume:', error);
      alert('Error saving volume');
    }
  };

  const handleVolumeEdit = (volume: Volume) => {
    setEditingVolume(volume);
    setVolumeForm({ 
      size: volume.size, 
      unit: volume.unit, 
      categoryId: volume.categoryId || '' 
    });
    setShowVolumeForm(true);
  };

  const handleVolumeDelete = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this volume?')) return;
    setVolumes(prev => prev.filter(vol => vol.id !== id));
    alert('Volume deleted successfully');
  };

  const resetVolumeForm = () => {
    setVolumeForm({ size: '', unit: 'ml', categoryId: '' });
    setEditingVolume(null);
    setShowVolumeForm(false);
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

  const getHeaderActions = () => (
    <>
      <button 
        onClick={() => {
          initializeIndianProducts();
          alert('Indian liquor products added successfully!');
        }}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        <Package className="w-4 h-4" />
        Add Indian Products
      </button>
      <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
        <Filter className="w-4 h-4" />
        Filter
      </button>
      <button 
        onClick={() => navigate('/products/new')}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Product
      </button>
    </>
  );

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <PageHeader
          title="Product Management"
          description="Manage your product inventory"
          icon={<Package className="w-8 h-8 text-blue-600" />}
          actions={getHeaderActions()}
        />
        <AdminNavigation currentPage="products" />
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading products...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <PageHeader
        title="Product Management"
        description="Manage your product inventory, categories, and volumes"
        icon={<Package className="w-8 h-8 text-blue-600" />}
        actions={getHeaderActions()}
      />

      <AdminNavigation currentPage="products" />

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('products')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'products'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Products
              </div>
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'categories'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Categories
              </div>
            </button>
            <button
              onClick={() => setActiveTab('volumes')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'volumes'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Volumes
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Products Tab */}
      {activeTab === 'products' && (
        <>
          {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{products.length}</p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-red-600">{products.filter(p => p.stock < 10).length}</p>
            </div>
            <Package className="w-8 h-8 text-red-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Categories</p>
              <p className="text-2xl font-bold text-green-600">{categories.length}</p>
            </div>
            <Filter className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Filtered Results</p>
              <p className="text-2xl font-bold text-purple-600">{filteredProducts.length}</p>
            </div>
            <Search className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search products by name or barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="md:w-64">
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div className="p-6">
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
                        <button 
                          onClick={() => handleEdit(product.id)} 
                          className="text-indigo-600 hover:text-indigo-900 mr-3 font-medium"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(product.id)} 
                          className="text-red-600 hover:text-red-900 font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium">No products found</p>
              {searchTerm || selectedCategory ? (
                <p className="text-sm mt-1">Try adjusting your search or filter criteria</p>
              ) : (
                <p className="text-sm mt-1">Add your first product to get started</p>
              )}
              {!searchTerm && !selectedCategory && (
                <button 
                  onClick={() => navigate('/products/new')}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  Add Product
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      </>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          {/* Category Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Categories</h3>
              <button
                onClick={() => setShowCategoryForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Category
              </button>
            </div>

            {/* Category Form */}
            {showCategoryForm && (
              <form onSubmit={handleCategorySubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-md font-medium mb-4">
                  {editingCategory ? 'Edit Category' : 'Add New Category'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingCategory ? 'Update' : 'Create'} Category
                  </button>
                  <button
                    type="button"
                    onClick={resetCategoryForm}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Categories Table */}
            <div className="overflow-x-auto">
              {categories.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {categories.map((category) => (
                      <tr key={category.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{category.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{category.description}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleCategoryEdit(category)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleCategoryDelete(category.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8">
                  <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900">No categories found</p>
                  <p className="text-sm text-gray-600 mt-1">Create your first category to get started</p>
                  <button
                    onClick={() => setShowCategoryForm(true)}
                    className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    Add Category
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Volumes Tab */}
      {activeTab === 'volumes' && (
        <div className="space-y-6">
          {/* Volume Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Volumes</h3>
              <button
                onClick={() => setShowVolumeForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Volume
              </button>
            </div>

            {/* Volume Form */}
            {showVolumeForm && (
              <form onSubmit={handleVolumeSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-md font-medium mb-4">
                  {editingVolume ? 'Edit Volume' : 'Add New Volume'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                    <input
                      type="text"
                      value={volumeForm.size}
                      onChange={(e) => setVolumeForm(prev => ({ ...prev, size: e.target.value }))}
                      placeholder="e.g., 750, 1.5, 12"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                    <select
                      value={volumeForm.unit}
                      onChange={(e) => setVolumeForm(prev => ({ ...prev, unit: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="ml">ml</option>
                      <option value="L">L</option>
                      <option value="oz">oz</option>
                      <option value="cl">cl</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category (Optional)</label>
                    <select
                      value={volumeForm.categoryId}
                      onChange={(e) => setVolumeForm(prev => ({ ...prev, categoryId: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Categories</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingVolume ? 'Update' : 'Create'} Volume
                  </button>
                  <button
                    type="button"
                    onClick={resetVolumeForm}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Volumes Table */}
            <div className="overflow-x-auto">
              {volumes.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Volume
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {volumes.map((volume) => (
                      <tr key={volume.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {volume.size} {volume.unit}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {volume.categoryId 
                              ? categories.find(cat => cat.id === volume.categoryId)?.name || 'Unknown'
                              : 'All Categories'
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleVolumeEdit(volume)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleVolumeDelete(volume.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900">No volumes found</p>
                  <p className="text-sm text-gray-600 mt-1">Create your first volume to get started</p>
                  <button
                    onClick={() => setShowVolumeForm(true)}
                    className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    Add Volume
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;
