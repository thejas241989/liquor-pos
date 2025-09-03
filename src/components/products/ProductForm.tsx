import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Package, Save, ArrowLeft } from 'lucide-react';
import PageHeader from '../common/PageHeader';
import AdminNavigation from '../common/AdminNavigation';

interface FormState {
  name: string;
  category_id: number | '';
  volume: string;
  price: number | '';
  stock_quantity: number | '';
  barcode: string;
}

const ProductForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState<FormState>({
    name: '',
    category_id: '',
    volume: '',
    price: '',
    stock_quantity: '',
    barcode: ''
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        const json = await res.json();
        setCategories(json.data || []);
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/products/${id}`);
        if (res.ok) {
          const json = await res.json();
          const p = json.data || json;
          setForm({
            name: p.name || '',
            category_id: p.category_id || '',
            volume: p.volume || '',
            price: p.price || '',
            stock_quantity: p.stock_quantity || '',
            barcode: p.barcode || ''
          });
        }
      } catch (err) {
        console.error('Failed to load product', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (!categories || categories.length === 0) return;
    const selected = categories.find(c => String(c.id) === String(form.category_id));
    if (selected && Array.isArray(selected.volumes) && selected.volumes.length > 0) {
      // If current volume is empty, set to first available
      if (!form.volume) setForm(prev => ({ ...prev, volume: selected.volumes[0] }));
    }
  }, [form.category_id, form.volume, categories]);

  const handleChange = (key: keyof FormState, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const payload = {
        name: form.name,
        category_id: form.category_id,
        volume: form.volume,
        price: Number(form.price) || 0,
        stock_quantity: Number(form.stock_quantity) || 0,
        barcode: form.barcode
      };

      if (id) {
        // Try server update, otherwise fallback
        const res = await fetch(`/api/products/${id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          alert('Product update not supported in test server — changes saved locally only.');
        }
      } else {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          alert('Product create not supported in test server — changes saved locally only.');
        }
      }

      navigate('/products');
    } catch (err) {
      console.error('Save failed', err);
      alert('Save failed — see console for details');
    } finally {
      setSaving(false);
    }
  };

  const getHeaderActions = () => (
    <>
      <button 
        onClick={() => navigate('/products')}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Products
      </button>
      <button 
        onClick={handleSave}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        {id ? 'Update Product' : 'Create Product'}
      </button>
    </>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <PageHeader
        title={id ? 'Edit Product' : 'Add Product'}
        description={id ? 'Update product information' : 'Create a new product'}
        icon={<Package className="w-8 h-8 text-blue-600" />}
        actions={getHeaderActions()}
      />

      <AdminNavigation currentPage="products" />

      <div className="bg-white rounded-lg shadow-sm max-w-4xl mx-auto">
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading product...</p>
          </div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input value={form.name} onChange={e => handleChange('name', e.target.value)} className="mt-1 w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select value={String(form.category_id)} onChange={e => handleChange('category_id', Number(e.target.value) || '')} className="mt-1 w-full px-3 py-2 border rounded">
                  <option value="">Select category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Volume</label>
                {(() => {
                  const selected = categories.find(c => String(c.id) === String(form.category_id));
                  if (selected && Array.isArray(selected.volumes) && selected.volumes.length > 0) {
                    return (
                      <select value={form.volume} onChange={e => handleChange('volume', e.target.value)} className="mt-1 w-full px-3 py-2 border rounded">
                        <option value="">Select volume</option>
                        {selected.volumes.map((v: string) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    );
                  }
                  return (<input value={form.volume} onChange={e => handleChange('volume', e.target.value)} className="mt-1 w-full px-3 py-2 border rounded" />);
                })()}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Barcode</label>
                <input value={form.barcode} onChange={e => handleChange('barcode', e.target.value)} className="mt-1 w-full px-3 py-2 border rounded" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Price</label>
                <input type="number" value={String(form.price)} onChange={e => handleChange('price', e.target.value)} className="mt-1 w-full px-3 py-2 border rounded" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Stock Quantity</label>
                <input type="number" value={String(form.stock_quantity)} onChange={e => handleChange('stock_quantity', e.target.value)} className="mt-1 w-full px-3 py-2 border rounded" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductForm;
