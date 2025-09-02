# 🍷 Liquor POS - Advanced Point of Sale System

A comprehensive Point of Sale (POS) system built with React, TypeScript, and Node.js, specifically designed for liquor stores with advanced inventory management and real-time analytics.

## 🚀 Features

### 🏪 Core POS Functionality
- **Product Sales Processing**: Complete checkout with barcode scanning support
- **Real-time Inventory Updates**: Automatic stock adjustments after each sale
- **Multi-role Authentication**: Admin, Manager, Biller, and Stock Reconciler roles
- **Dynamic Pricing**: Support for various product categories and volumes

### 📊 Advanced Dashboard Analytics
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

## 🛠 Technical Architecture

### Frontend Stack
- **React 18** with TypeScript for type-safe development
- **React Router DOM** for seamless navigation
- **Tailwind CSS** for modern, responsive UI design
- **Custom Hooks** for reusable state management
- **Context API** for global state management

### Backend Stack
- **Node.js** with Express.js framework
- **JWT Authentication** for secure user sessions
- **CORS** enabled for cross-origin requests
- **RESTful API** design with consistent response formatting

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager
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

3. **Start the backend server**
   ```bash
   node backend/server-test.js
   ```
   Backend will run on `http://localhost:5001`

4. **Start the frontend development server**
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

### Inventory
- `GET /api/inventory/summary` - Inventory summary statistics
- `GET /api/products` - Product listing with pagination
- `GET /api/categories` - Category management

### Sales
- `POST /api/sales` - Process sales transactions

## 📝 Recent Updates

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
