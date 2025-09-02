# Liquor Store POS - Setup Guide

## Quick Setup Instructions

### 1. Database Setup
```bash
# Create MySQL database
mysql -u root -p
CREATE DATABASE liquor_pos_db;
exit

# Import schema
mysql -u root -p liquor_pos_db < database_schema.sql
```

### 2. Configure Backend
```bash
cd backend
# Update .env file with your database credentials
# Default setup should work with MySQL root user and empty password
```

### 3. Start Backend Server
```bash
cd backend
npm run dev
# Server will start on http://localhost:5000
```

### 4. Configure Tailwind CSS
```bash
# In the root directory
npx tailwindcss init -p
```

Create `tailwind.config.js`:
```js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### 5. Start Frontend
```bash
npm start
# App will open on http://localhost:3000
```

### 6. Default Login
- Username: `admin`
- Password: `admin123`

## Verification Steps

1. ✅ Backend API responds at http://localhost:5000
2. ✅ Frontend loads at http://localhost:3000
3. ✅ Database connection successful
4. ✅ Login works with default credentials
5. ✅ Role-based dashboards load properly

## Troubleshooting

### Database Connection Issues
- Verify MySQL is running
- Check database credentials in `.env`
- Ensure database `liquor_pos_db` exists

### Frontend Build Issues
- Install missing dependencies: `npm install`
- Clear node_modules and reinstall if needed

### Backend API Issues
- Check port 5000 is available
- Verify all backend dependencies installed
- Check console for error messages
