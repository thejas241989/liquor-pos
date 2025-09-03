import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Shield, Package, DollarSign, FileText, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface AdminNavigationProps {
  currentPage?: string;
  onSectionChange?: (section: string) => void;
  isIntegratedDashboard?: boolean;
}

const AdminNavigation: React.FC<AdminNavigationProps> = ({ 
  currentPage, 
  onSectionChange, 
  isIntegratedDashboard = false 
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleNavigation = (section: string, route?: string) => {
    if (isIntegratedDashboard && onSectionChange) {
      onSectionChange(section);
    } else if (route) {
      navigate(route);
    }
  };

  const getNavItemClass = (section: string) => {
    const isActive = currentPage === section || (isIntegratedDashboard && currentPage === section);
    return `flex flex-col items-center p-4 rounded-lg transition-colors group cursor-pointer ${
      isActive 
        ? getActiveColorClass(section)
        : 'bg-gray-50 hover:bg-gray-100'
    }`;
  };

  const getIconClass = (section: string) => {
    const isActive = currentPage === section;
    return `w-8 h-8 mb-2 group-hover:scale-110 transition-transform ${
      isActive ? getActiveIconColor(section) : 'text-gray-600'
    }`;
  };

  const getTextClass = (section: string) => {
    const isActive = currentPage === section;
    return `text-sm font-medium ${
      isActive ? getActiveTextColor(section) : 'text-gray-800'
    }`;
  };

  const getSubTextClass = (section: string) => {
    const isActive = currentPage === section;
    return `text-xs ${
      isActive ? getActiveSubTextColor(section) : 'text-gray-600'
    }`;
  };

  const getActiveColorClass = (section: string) => {
    const colors = {
      dashboard: 'bg-blue-50 hover:bg-blue-100 border-2 border-blue-200',
      inventory: 'bg-green-50 hover:bg-green-100 border-2 border-green-200',
      pos: 'bg-purple-50 hover:bg-purple-100 border-2 border-purple-200',
      reports: 'bg-orange-50 hover:bg-orange-100 border-2 border-orange-200',
      users: 'bg-red-50 hover:bg-red-100 border-2 border-red-200',
      products: 'bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-200'
    };
    return colors[section as keyof typeof colors] || 'bg-gray-50 hover:bg-gray-100';
  };

  const getActiveIconColor = (section: string) => {
    const colors = {
      dashboard: 'text-blue-600',
      inventory: 'text-green-600',
      pos: 'text-purple-600',
      reports: 'text-orange-600',
      users: 'text-red-600',
      products: 'text-indigo-600'
    };
    return colors[section as keyof typeof colors] || 'text-gray-600';
  };

  const getActiveTextColor = (section: string) => {
    const colors = {
      dashboard: 'text-blue-800',
      inventory: 'text-green-800',
      pos: 'text-purple-800',
      reports: 'text-orange-800',
      users: 'text-red-800',
      products: 'text-indigo-800'
    };
    return colors[section as keyof typeof colors] || 'text-gray-800';
  };

  const getActiveSubTextColor = (section: string) => {
    const colors = {
      dashboard: 'text-blue-600',
      inventory: 'text-green-600',
      pos: 'text-purple-600',
      reports: 'text-orange-600',
      users: 'text-red-600',
      products: 'text-indigo-600'
    };
    return colors[section as keyof typeof colors] || 'text-gray-600';
  };

  const navigationItems = [
    {
      key: 'dashboard',
      icon: BarChart3,
      label: 'Dashboard',
      subtitle: 'Analytics & Overview',
      route: user?.role === 'admin' ? '/admin' : `/${user?.role}`,
      visible: true
    },
    {
      key: 'inventory',
      icon: Package,
      label: 'Inventory',
      subtitle: 'Stock Management',
      route: '/inventory',
      visible: ['admin', 'manager', 'stock_reconciler'].includes(user?.role || '')
    },
    {
      key: 'pos',
      icon: DollarSign,
      label: 'POS',
      subtitle: 'Point of Sale',
      route: '/pos',
      visible: ['admin', 'manager', 'biller'].includes(user?.role || '')
    },
    {
      key: 'reports',
      icon: FileText,
      label: 'Reports',
      subtitle: 'Business Reports',
      route: '/reports',
      visible: ['admin', 'manager'].includes(user?.role || '')
    },
    {
      key: 'users',
      icon: Shield,
      label: 'Users',
      subtitle: 'User Management',
      route: '/users',
      visible: user?.role === 'admin'
    },
    {
      key: 'products',
      icon: Settings,
      label: 'Products',
      subtitle: 'Product Config',
      route: '/products',
      visible: ['admin', 'manager'].includes(user?.role || '')
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {navigationItems.filter(item => item.visible).map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.key;
          
          return (
            <div
              key={item.key}
              onClick={() => handleNavigation(item.key, item.route)}
              className={getNavItemClass(item.key)}
            >
              <Icon className={getIconClass(item.key)} />
              <span className={getTextClass(item.key)}>{item.label}</span>
              <span className={getSubTextClass(item.key)}>
                {isActive ? 'Current Section' : item.subtitle}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminNavigation;
