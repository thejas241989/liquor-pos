import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Package, 
  DollarSign, 
  AlertTriangle, 
  FileText, 
  TrendingUp,
  ShoppingCart,
  Clock,
  UserCheck
} from 'lucide-react';
import PageHeader from '../common/PageHeader';
import AdminNavigation from '../common/AdminNavigation';
import { formatCurrency } from '../../utils/formatCurrency';

const ManagerDashboard: React.FC = () => {
  const navigate = useNavigate();

  const getHeaderActions = () => (
    <>
      <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
        <FileText className="w-4 h-4" />
        Reports
      </button>
      <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
        <TrendingUp className="w-4 h-4" />
        Analytics
      </button>
    </>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <PageHeader
        title="Manager Dashboard"
        description="Manage operations and oversee business performance"
        icon={<UserCheck className="w-8 h-8 text-blue-600" />}
        actions={getHeaderActions()}
      />

      <AdminNavigation currentPage="dashboard" />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Sales</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(0)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Indents</p>
              <p className="text-2xl font-bold text-orange-600">0</p>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock Alerts</p>
              <p className="text-2xl font-bold text-red-600">0</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Staff</p>
              <p className="text-2xl font-bold text-blue-600">0</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Management Actions */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Management Actions
          </h3>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button 
              onClick={() => navigate('/products')}
              className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-left"
            >
              <Package className="w-6 h-6 text-blue-600" />
              <div>
                <div className="font-medium text-blue-900">Manage Products</div>
                <div className="text-sm text-blue-700">Add, edit, and organize products</div>
              </div>
            </button>
            
            <button 
              onClick={() => navigate('/inventory')}
              className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-left"
            >
              <ShoppingCart className="w-6 h-6 text-green-600" />
              <div>
                <div className="font-medium text-green-900">Stock Management</div>
                <div className="text-sm text-green-700">Monitor inventory levels</div>
              </div>
            </button>
            
            <button className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors text-left">
              <Clock className="w-6 h-6 text-yellow-600" />
              <div>
                <div className="font-medium text-yellow-900">Approve Indents</div>
                <div className="text-sm text-yellow-700">Review pending requests</div>
              </div>
            </button>
            
            <button 
              onClick={() => navigate('/reports')}
              className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors text-left"
            >
              <FileText className="w-6 h-6 text-purple-600" />
              <div>
                <div className="font-medium text-purple-900">Sales Reports</div>
                <div className="text-sm text-purple-700">View detailed analytics</div>
              </div>
            </button>
            
            <button 
              onClick={() => navigate('/users')}
              className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors text-left"
            >
              <Users className="w-6 h-6 text-indigo-600" />
              <div>
                <div className="font-medium text-indigo-900">Staff Management</div>
                <div className="text-sm text-indigo-700">Manage team members</div>
              </div>
            </button>
            
            <button className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-left">
              <TrendingUp className="w-6 h-6 text-gray-600" />
              <div>
                <div className="font-medium text-gray-900">Business Analytics</div>
                <div className="text-sm text-gray-700">Performance insights</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
