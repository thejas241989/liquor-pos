import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, Plus, Edit, Trash2, Folder, FolderOpen } from 'lucide-react';
import PageHeader from '../common/PageHeader';
import AdminNavigation from '../common/AdminNavigation';
import { formatCurrency } from '../../utils/formatCurrency';

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
        const token = localStorage.getItem('token');
        
        // Try test endpoint first
        let res = await fetch('http://localhost:5002/api/categories/test', {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        // If test endpoint fails, try authenticated endpoint
        if (!res.ok && token) {
          res = await fetch('http://localhost:5002/api/categories', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        }

        if (res.ok) {
          const json = await res.json();

          // Map MongoDB categories to correct structure
          let list = [];
          if (json.data && Array.isArray(json.data)) {
            list = json.data.map((cat: any) => ({
              id: String(cat._id || cat.id),
              name: cat.name,
              description: cat.description || ''
            }));
          } else if (Array.isArray(json)) {
            list = json.map((cat: any) => ({
              id: String(cat._id || cat.id),
              name: cat.name,
              description: cat.description || ''
            }));
          }
          
          if (mounted) setCategories(list);
        } else {
          console.error('Failed to load categories - response not ok');
        }
      } catch (err) {
        console.error('Failed to load categories', err);
        if (mounted) setCategories([]);
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
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5002/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
        // Notify other tabs/components that categories changed
        try { localStorage.setItem('categories-updated', String(Date.now())); } catch (e) { /* ignore */ }
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

  const getHeaderActions = () => (
    <>
      <button 
        onClick={() => navigate('/products')} 
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
      >
        Back to Products
      </button>
      <button 
        type="submit"
        form="category-form"
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        <Plus className="w-4 h-4" />
        {saving ? 'Creating...' : 'Add Category'}
      </button>
    </>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <PageHeader
        title="Category Management"
        description="Manage product categories and volumes"
        icon={<Tag className="w-8 h-8 text-purple-600" />}
        actions={getHeaderActions()}
      />

      <AdminNavigation currentPage="categories" />

      {/* Create Category Form */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-purple-600" />
          Create New Category
        </h3>

        <form id="category-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
            <input 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Enter category name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent Category (optional)</label>
            <select 
              value={parentId ?? ''} 
              onChange={(e) => setParentId(e.target.value || null)} 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">— None —</option>
              {categories.map(cat => (
                <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Enter category description"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Volumes (comma separated)
              <span className="text-gray-500 text-sm font-normal"> — e.g. 750ml, 375ml, 180ml</span>
            </label>
            <input 
              value={volumesInput} 
              onChange={(e) => setVolumesInput(e.target.value)} 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500" 
              placeholder="750ml, 375ml, 180ml"
            />
          </div>
        </form>
      </div>

      {/* Existing Categories */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Folder className="w-5 h-5 text-purple-600" />
            Existing Categories ({categories.length})
          </h4>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading categories...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8">
              <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
              <p className="text-gray-600">Create your first category to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map(cat => (
                <div key={cat.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Tag className="w-5 h-5 text-purple-600" />
                      <h5 className="font-medium text-gray-900">{cat.name}</h5>
                    </div>
                  </div>
                  
                  {cat.description && (
                    <p className="text-sm text-gray-600 mb-3">{cat.description}</p>
                  )}
                  
                  {Array.isArray(cat.volumes) && cat.volumes.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-500 mb-2">Available Volumes:</p>
                      <div className="flex flex-wrap gap-1">
                        {cat.volumes.map((volume, idx) => (
                          <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                            {volume}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                    <button className="flex items-center gap-1 px-3 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors">
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button className="flex items-center gap-1 px-3 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors">
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryManagement;
