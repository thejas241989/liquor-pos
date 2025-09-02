import React from 'react';
import Layout from '../layout/Layout';

const InventoryManagement: React.FC = () => {
  return (
    <Layout title="Inventory Management">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="font-semibold text-gray-700">Total Products</h4>
          <p className="text-2xl font-bold text-blue-600">0</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="font-semibold text-gray-700">Low Stock Items</h4>
          <p className="text-2xl font-bold text-orange-600">0</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="font-semibold text-gray-700">Out of Stock</h4>
          <p className="text-2xl font-bold text-red-600">0</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-700">Inventory Overview</h3>
          <div className="flex gap-2">
            <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors">
              Stock Intake
            </button>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
              Create Indent
            </button>
            <button className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors">
              Reconciliation
            </button>
          </div>
        </div>
        
        <div className="text-center text-gray-500 py-8">
          <p>No inventory data available</p>
          <p className="text-sm">Add products and stock to see inventory information</p>
        </div>
      </div>
    </Layout>
  );
};

export default InventoryManagement;
