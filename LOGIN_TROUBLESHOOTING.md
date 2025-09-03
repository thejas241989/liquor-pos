# Login Troubleshooting Guide

## Issue: Unable to login to admin dashboard with admin/admin123

### ✅ Backend Status: WORKING
- Test server running on port 5001
- Login endpoint responding correctly
- Credentials verified: `admin / admin123`

### ✅ API Endpoint Test: SUCCESSFUL
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```
**Response**: Login successful with JWT token

### 🔍 Debugging Steps

#### Step 1: Open Browser Console
1. Open http://localhost:3000 in browser
2. Open Developer Tools (F12)
3. Go to Console tab
4. Try logging in with `admin / admin123`
5. Check for any error messages

#### Step 2: Check Network Tab
1. Open Network tab in Developer Tools
2. Try logging in
3. Look for the login request to `/api/auth/login`
4. Check if request is being sent and response received

#### Step 3: Common Issues to Check

**CORS Issues:**
- Check if login request is blocked by CORS
- Backend has CORS enabled for localhost:3000

**Network Connectivity:**
- Ensure both frontend (port 3000) and backend (port 5001) are running
- Check if there are any network errors in console

**Form Validation:**
- Ensure form is submitting correctly
- Check if username/password are being passed correctly

**Authentication Flow:**
- Check if token is being stored in localStorage
- Verify user object is being set correctly

### 🎯 Quick Test Steps

1. **Test Backend Direct:**
   ```bash
   curl -X POST http://localhost:5001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"admin123"}'
   ```

2. **Test from Browser Console:**
   ```javascript
   fetch('http://localhost:5001/api/auth/login', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ username: 'admin', password: 'admin123' })
   })
   .then(res => res.json())
   .then(data => console.log(data))
   .catch(err => console.error(err));
   ```

3. **Check localStorage:**
   ```javascript
   // In browser console after login attempt
   console.log('Token:', localStorage.getItem('token'));
   console.log('User:', localStorage.getItem('user'));
   ```

### 📊 Expected Behavior

**Successful Login Flow:**
1. Enter credentials: `admin / admin123`
2. Click login button
3. API request sent to `http://localhost:5001/api/auth/login`
4. Response received with token and user data
5. Token stored in localStorage
6. Redirect to `/admin` dashboard

### 🔧 Debug Logging Added

Added console logging to:
- `src/contexts/AuthContext.tsx` - Login function
- `src/services/api.ts` - API service login method

Check browser console for debug messages during login attempt.

### 📝 Credentials Confirmation

**Username:** `admin`
**Password:** `admin123`
**Expected Role:** `admin`
**Redirect After Login:** `/admin`

### 🚨 If Still Not Working

1. Clear browser cache and localStorage
2. Restart both frontend and backend servers
3. Check if any proxy/firewall is blocking requests
4. Try in incognito/private browser window
