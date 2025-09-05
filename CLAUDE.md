# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development

```bash
# Start the Next.js development server
npm run dev

# Build the application for production
npm run build

# Start the production server
npm run start

# Run ESLint to check code style
npm run lint
```

### Backend Development

The backend code is in the `backend/` directory. To work with the backend:

```bash
# Navigate to the backend directory
cd backend

# Run the backend server (if you have a start script)
# Note: There's currently no start script defined in the backend package.json
```

## Architecture Overview

This project is a CRM and production management system built with Next.js. It's a web application with authentication, dynamic navigation, and various calculations for manufacturing operations.

### Key Components

1. **Authentication System**
   - `context/AuthContext.jsx` - Provides user authentication context throughout the app
   - `components/ProtectedRoute.jsx` - Higher-order component that restricts access to authenticated users
   - `app/login/page.jsx` - Login page implementation

2. **Layout and Navigation**
   - `components/MainLayout3.tsx` - Main layout with dynamic sidebar navigation and user info
   - `components/Providers.jsx` - Wraps the application with various context providers

3. **API Integration**
   - `api-config.js` - Contains all API endpoints and helper functions for API requests
   - Uses a backend API hosted on Vercel for data operations

4. **Production Calculation Modules**
   - Various calculation components for manufacturing operations (Panel Çit, Galvanizli Tel, Çelik Hasır, etc.)
   - Located in the `components/` directory

### Data Flow

1. User authentication data is stored in `sessionStorage` and managed through `AuthContext`
2. API requests are made with authentication headers using helpers in `api-config.js`
3. Protected routes check for user authentication before rendering
4. The sidebar navigation in `MainLayout3.tsx` changes dynamically based on the current route

### Technologies Used

- **Frontend**: Next.js 13.5.1, React 18.2.0, TypeScript
- **UI**: Tailwind CSS, Radix UI components, Lucide React icons
- **Authentication**: Custom JWT-based auth with session storage
- **API Communication**: Fetch API with custom wrapper functions
- **Backend**: Express.js with PostgreSQL (pg) database

## Common Patterns

1. **Authentication Check**:
   ```jsx
   import { useAuth } from '@/context/AuthContext';
   
   // In component
   const { user, loading } = useAuth();
   
   // Redirect if not authenticated
   if (!user && !loading) {
     router.push('/login');
   }
   ```

2. **Making API Requests**:
   ```jsx
   import { API_URLS, normalizeDecimalValues } from '@/api-config';
   
   // Fetch data
   const fetchData = async () => {
     try {
       const response = await fetch(API_URLS.someEndpoint);
       const data = await response.json();
       // Process data
     } catch (error) {
       console.error('Error fetching data:', error);
     }
   };
   ```

3. **Component Structure**:
   Most components follow the pattern of:
   - Data fetching in useEffect
   - Local state management
   - Form handling with controlled inputs
   - Clean rendering with conditional UI elements
   
4. **Navigation**:
   The application uses Next.js routing with the new app directory structure.

## Important Notes

- The application uses Turkish language throughout the UI
- The backend API is hosted at `https://crm-deneme-backend.vercel.app/api/`
- The application handles decimal value normalization (converting comma separators to periods) via helper functions
- Authentication is required for most routes and is handled via `ProtectedRoute` component