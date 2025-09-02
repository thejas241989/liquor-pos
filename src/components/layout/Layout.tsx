import React, { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
  title: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNavItems = () => {
    const baseItems = [
      { label: 'Dashboard', path: `/${user?.role}` }
    ];

    switch (user?.role) {
      case 'admin':
        return [
          ...baseItems,
          { label: 'POS', path: '/pos' },
          { label: 'Products', path: '/products' },
          { label: 'Inventory', path: '/inventory' },
          { label: 'Reports', path: '/reports' },
        ];
      case 'manager':
        return [
          ...baseItems,
          { label: 'POS', path: '/pos' },
          { label: 'Products', path: '/products' },
          { label: 'Inventory', path: '/inventory' },
          { label: 'Reports', path: '/reports' },
        ];
      case 'biller':
        return [
          ...baseItems,
          { label: 'POS', path: '/pos' },
        ];
      case 'stock_reconciler':
        return [
          ...baseItems,
          { label: 'Inventory', path: '/inventory' },
        ];
      default:
        return baseItems;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-blue-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-white text-xl font-bold">Liquor Store POS</h1>
              <div className="hidden md:block ml-10">
                <div className="flex items-baseline space-x-4">
                  {getNavItems().map((item) => (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className="text-blue-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-blue-100 text-sm">
                Welcome, {user?.username} ({user?.role})
              </span>
              <button
                onClick={handleLogout}
                className="bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-800 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-semibold">{title}</h1>
              {/* Manage Categories link removed per request */}
            </div>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
};

export default Layout;
