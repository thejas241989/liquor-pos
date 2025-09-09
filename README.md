# 🍷 Liquor POS - Advanced Point of Sale System

A comprehensive Point of Sale (POS) system built with React, TypeScript, and Node.js, specifically designed for liquor stores with advanced inventory management and real-time analytics.

## 🚀 Features

### 🏪 Core POS Functionality
- **Product Sales Processing**: Complete checkout with barcode scanning support
- **Real-time Inventory Updates**: Automatic stock adjustments after each sale
- **Multi-role Authentication**: Admin, Manager, Biller, and Stock Reconciler roles
- **Dynamic Pricing**: Support for various product categories and volumes

### � Advanced User Management
- **Comprehensive User CRUD**: Create, read, update, and delete user accounts
- **Role-based Access Control**: Granular permissions for different user types
- **Advanced Search & Filtering**: Search by username/email, filter by role and status
- **Bulk Operations**: Multi-select users for bulk deletion
- **Real-time Validation**: Form validation with password strength indicators
- **User Activity Tracking**: Monitor user actions and changes
- **Data Export**: Export user data to CSV format
- **Professional UI**: Modern interface with responsive design and visual feedback

### �📊 Advanced Dashboard Analytics
- **Admin Dashboard**: Complete business overview with inventory metrics
- **Biller Dashboard**: Streamlined interface for sales operations
- **Real-time Data Sync**: Live updates across all dashboard components
- **Low Stock Alerts**: Automatic notifications for inventory management

### 💼 Inventory Management
- **Product Catalog**: Comprehensive product management with categories
- **Stock Tracking**: Real-time inventory levels and valuation
- **Category Management**: Organized product categorization
- **Barcode Support**: Efficient product identification and processing

### 🔐 Security & Authentication
- **JWT Token Authentication**: Secure session management
- **Role-based Access Control**: Granular permissions system
- **Token Verification**: Automatic session validation
- **Secure API Endpoints**: Protected backend services
- **Password Security**: Strong password requirements and validation

### 💾 Database Infrastructure
- **MongoDB Integration**: Production-ready MongoDB database
- **Comprehensive Schema**: Complete document models for system functionality
- **Data Integrity**: Schema validation and data consistency
- **Backup Ready**: Structured data for easy backup and recovery

## 🛠 Technical Architecture

### Frontend Stack
- **React 18** with TypeScript for type-safe development
- **React Router DOM** for seamless navigation
- **Tailwind CSS** for modern, responsive UI design
- **Custom Hooks** for reusable state management
- **Context API** for global state management

### Backend Stack
- **Node.js** with Express.js framework
- **MongoDB Database** with comprehensive schemas
- **JWT Authentication** for secure user sessions
- **CORS** enabled for cross-origin requests
- **RESTful API** design with consistent response formatting
- **Data Validation** with express-validator
- **Password Encryption** using bcryptjs

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v16 or higher)
- **MongoDB** (v6.0 or higher)
- **npm or yarn** package manager
- Modern web browser

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/thejas241989/liquor-pos.git
   cd liquor-pos
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   ```bash
   # Install MongoDB if not already installed
   brew install mongodb-community  # On macOS
   
   # Start MongoDB service
   brew services start mongodb-community
   
   # MongoDB will automatically create the database when first used
   ```

4. **Configure environment**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env file with your database credentials
   ```

5. **Start the backend server**
   ```bash
   cd backend
   npm start
   ```
   Backend will run on `http://localhost:5002`

6. **Start the frontend development server**
   ```bash
   npm start
   ```
   Frontend will run on `http://localhost:3000`

### Default Login Credentials
- **Username**: `admin`
- **Password**: `admin123`

## 🔧 Technical Highlights

### Centralized API Service
- Unified endpoint management through `ApiService` class
- Consistent error handling and response formatting
- Automatic authentication header management
- Type-safe API calls throughout the application

### Custom Hooks Architecture
- `useDashboardData()`: Complete dashboard data management
- `useInventorySummary()`: Inventory summary with real-time updates
- Centralized loading and error states
- Reusable logic across components

### Real-time Updates
- Custom event system for cross-component communication
- Automatic inventory synchronization after sales
- Live dashboard updates without page refresh
- Optimistic UI updates for better user experience

## 📋 API Endpoints

### Authentication
- `POST /api/auth/login` - User authentication
- `POST /api/auth/verify` - Token verification

### Users Management
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get specific user (Admin only)
- `POST /api/users` - Create new user (Admin only)
- `PUT /api/users/:id` - Update user (Admin only)
- `DELETE /api/users/:id` - Delete user (Admin only)

### Inventory
- `GET /api/inventory/summary` - Inventory summary statistics
- `GET /api/products` - Product listing with pagination
- `GET /api/categories` - Category management

### Sales
- `POST /api/sales` - Process sales transactions

## 📝 Recent Updates

### v0.2.0 - Advanced User Management System
- ✨ Complete Users management interface with CRUD operations
- 🎯 Advanced search and filtering capabilities
- 📊 User statistics dashboard with role-based metrics
- 🔧 Bulk operations for efficient user management
- 🎨 Modern UI with responsive design and visual feedback
- 📤 CSV export functionality for user data
- 🔐 Enhanced password validation with strength indicators
- 💾 Production MongoDB database integration
- 🔔 Toast notification system for better UX
- 📱 Mobile-responsive design improvements

### v0.1.0 - Major Architecture Overhaul
- ✨ Centralized API service implementation
- 🔧 Custom hooks for better state management
- 📊 Enhanced dashboard with real-time updates
- 🔐 Improved authentication system
- 🎯 Better error handling and loading states
- 🚀 Performance optimizations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

**Thejas Dharmaraj**
- GitHub: [@thejas241989](https://github.com/thejas241989)

## 🙏 Acknowledgments

- React team for the amazing framework
- Tailwind CSS for the utility-first CSS framework
- Node.js community for excellent backend tools
- TypeScript team for making JavaScript better

---

*Built with ❤️ for efficient liquor store management*
