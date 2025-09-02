import React, { useEffect, useState } from 'react';
import Layout from '../layout/Layout';
import { formatCurrency } from '../../utils/formatCurrency';
import { useNavigate } from 'react-router-dom';

interface Category {
  id: string | number;
  name: string;
  description?: string;
  parent_id?: string | number | null;
  volumes?: string[];
}

const CategoryManagement: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [volumesInput, setVolumesInput] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        const json = await res.json();
        const list = Array.isArray(json) ? json : (json.categories && Array.isArray(json.categories)) ? json.categories : (json.data && Array.isArray(json.data)) ? json.data : [];
        if (mounted) setCategories(list);
      } catch (err) {
        console.error('Failed to load categories', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchCategories();
    return () => { mounted = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Name is required');

    const volumes = volumesInput.split(',').map(v => v.trim()).filter(Boolean);
    const payload: any = { name: name.trim(), description: description.trim() };
    if (parentId) payload.parent_id = parentId;
    if (volumes.length) payload.volumes = volumes;

    setSaving(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const created = await res.json();
        // Normalise response
        const newCat = created?.data || created?.category || created || {};
        setCategories(prev => [newCat, ...prev]);
        setName('');
        setDescription('');
        setParentId(null);
        setVolumesInput('');
        alert('Category created');
      } else {
        const err = await res.text();
        console.error('Create failed', err);
        alert('Failed to create category');
      }
    } catch (err) {
      console.error('Network error', err);
      alert('Network error creating category');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title="Category Management">
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-700">Manage Categories & Volumes</h3>
          <div className="flex gap-2">
            <button onClick={() => navigate('/products')} className="px-3 py-1 bg-gray-100 rounded">Back to Products</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Parent Category (optional)</label>
            <select value={parentId ?? ''} onChange={(e) => setParentId(e.target.value || null)} className="mt-1 block w-full border rounded px-3 py-2">
              <option value="">— None —</option>
              {categories.map(cat => (
                <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Volumes (comma separated) — e.g. 750ml, 375ml, 180ml</label>
            <input value={volumesInput} onChange={(e) => setVolumesInput(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" placeholder="750ml, 375ml" />
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button type="submit" disabled={saving} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              {saving ? 'Saving...' : 'Create Category'}
            </button>
          </div>
        </form>

        <div>
          <h4 className="text-md font-semibold mb-2">Existing Categories</h4>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <div className="space-y-2">
              {categories.length === 0 && <div className="text-gray-500">No categories</div>}
              {categories.map(cat => (
                <div key={cat.id} className="p-3 border rounded flex justify-between items-center">
                  <div>
                    <div className="font-medium">{cat.name}</div>
                    <div className="text-sm text-gray-500">{cat.description || '—'}</div>
                    {Array.isArray(cat.volumes) && cat.volumes.length > 0 && (
                      <div className="text-sm text-gray-600 mt-1">Volumes: {cat.volumes.join(', ')}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CategoryManagement;
